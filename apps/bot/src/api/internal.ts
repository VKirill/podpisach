import http from 'node:http'
import { prisma } from '../utils/prisma.js'
import { logger } from '../utils/logger.js'
import { createInviteLink, revokeInviteLink, type ManualLinkData } from '../telegram/services/linkService.js'
import { createTelegramBot, startBot, stopBot, getBot } from '../telegram/bot.js'
import { decrypt } from '@op/shared'

let server: http.Server | null = null
let isStarting = false

export async function startInternalApi(port = 3001): Promise<void> {
  server = http.createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json')

    // Auth check — read secret per-request (Settings may not exist at startup)
    const settings = await prisma.settings.findFirst({ where: { id: 1 } })
    const secret = settings?.internalApiSecret

    if (!secret) {
      res.writeHead(503)
      res.end(JSON.stringify({ error: 'Service unavailable: settings not initialized' }))
      return
    }

    const authHeader = req.headers['authorization']
    if (authHeader !== `Bearer ${secret}`) {
      res.writeHead(401)
      res.end(JSON.stringify({ error: 'Unauthorized' }))
      return
    }

    try {
      const url = req.url ?? ''
      const method = req.method ?? ''
      const body = method !== 'GET' ? await parseBody(req) : {}

      if (method === 'POST' && url === '/internal/link/create') {
        await handleLinkCreate(res, body)
      } else if (method === 'POST' && url === '/internal/link/revoke') {
        await handleLinkRevoke(res, body)
      } else if (method === 'GET' && url === '/internal/bot/status') {
        await handleBotStatus(res)
      } else if (method === 'POST' && url === '/internal/bot/start') {
        await handleBotStart(res, body, secret)
      } else if (method === 'POST' && url === '/internal/bot/stop') {
        await handleBotStop(res)
      } else {
        res.writeHead(404)
        res.end(JSON.stringify({ error: 'Not found' }))
      }
    } catch (err) {
      logger.error(err, 'Internal API error')
      res.writeHead(500)
      res.end(JSON.stringify({ error: 'Internal server error' }))
    }
  })

  server.listen(port, () => {
    logger.info({ port }, '🔌 Internal API listening')
  })
}

async function handleLinkCreate(
  res: http.ServerResponse,
  body: Record<string, unknown>,
): Promise<void> {
  const bot = getBot()
  if (!bot) {
    res.writeHead(503)
    res.end(JSON.stringify({ error: 'Bot not running' }))
    return
  }

  const channelId = body['channelId'] as number
  const visitId = body['visitId'] as number | undefined

  // Собираем manualData только если visitId не передан (ручная ссылка)
  const manualData: ManualLinkData | undefined =
    visitId === undefined
      ? {
          name: body['name'] as string | undefined,
          utmSource: body['utmSource'] as string | undefined,
          utmMedium: body['utmMedium'] as string | undefined,
          utmCampaign: body['utmCampaign'] as string | undefined,
          utmContent: body['utmContent'] as string | undefined,
          utmTerm: body['utmTerm'] as string | undefined,
          costAmount: body['costAmount'] as number | undefined,
          costCurrency: body['costCurrency'] as string | undefined,
        }
      : undefined

  const result = await createInviteLink(bot, channelId, visitId, manualData)
  if (!result) {
    res.writeHead(429)
    res.end(JSON.stringify({ error: 'Rate limit or channel not found' }))
    return
  }

  res.writeHead(200)
  res.end(JSON.stringify({ inviteUrl: result.url, linkId: result.linkId }))
}

async function handleLinkRevoke(
  res: http.ServerResponse,
  body: Record<string, unknown>,
): Promise<void> {
  const linkId = body['linkId'] as number
  const bot = getBot()
  if (bot) {
    await revokeInviteLink(bot, linkId)
  }
  res.writeHead(200)
  res.end(JSON.stringify({ success: true }))
}

async function handleBotStatus(res: http.ServerResponse): Promise<void> {
  const bot = getBot()
  const channels = await prisma.channel.count({ where: { isActive: true } })
  res.writeHead(200)
  res.end(
    JSON.stringify({
      status: bot ? 'running' : 'waiting',
      telegramConnected: !!bot,
      maxConnected: false, // MAX реализуется позже
      channels,
    }),
  )
}

async function handleBotStart(
  res: http.ServerResponse,
  body: Record<string, unknown>,
  secret: string,
): Promise<void> {
  if (isStarting) {
    res.writeHead(409)
    res.end(JSON.stringify({ error: 'Bot is already starting' }))
    return
  }

  if (getBot()) {
    res.writeHead(409)
    res.end(JSON.stringify({ error: 'Bot is already running' }))
    return
  }

  const botId = body['botId'] as number | undefined
  if (!botId) {
    res.writeHead(400)
    res.end(JSON.stringify({ error: 'botId is required' }))
    return
  }

  const botRecord = await prisma.bot.findFirst({
    where: { id: botId, isActive: true },
    select: { id: true, token: true, platform: true },
  })

  if (!botRecord) {
    res.writeHead(404)
    res.end(JSON.stringify({ error: 'Bot not found' }))
    return
  }

  if (botRecord.platform !== 'telegram') {
    res.writeHead(400)
    res.end(JSON.stringify({ error: 'Only Telegram bots are supported' }))
    return
  }

  isStarting = true
  try {
    const token = decrypt(botRecord.token, secret)
    const gramBot = createTelegramBot(token)
    await startBot(gramBot)
    res.writeHead(200)
    res.end(JSON.stringify({ success: true }))
  } finally {
    isStarting = false
  }
}

async function handleBotStop(res: http.ServerResponse): Promise<void> {
  await stopBot()
  res.writeHead(200)
  res.end(JSON.stringify({ success: true }))
}

function parseBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    let body = ''
    req.on('data', (chunk: Buffer) => {
      body += chunk.toString()
    })
    req.on('end', () => {
      try {
        resolve(JSON.parse(body) as Record<string, unknown>)
      } catch {
        resolve({})
      }
    })
  })
}

export async function stopInternalApi(): Promise<void> {
  if (server) {
    server.close()
    server = null
    logger.info('Internal API stopped')
  }
}
