import { MaxApiClient } from './client.js'
import { handleMaxUpdate } from './handlers/memberUpdate.js'
import { logger } from '../utils/logger.js'

const RETRY_DELAY_MS = 5_000

let running = false
let currentClient: MaxApiClient | null = null

export async function startMaxPolling(token: string): Promise<void> {
  if (running) {
    logger.warn('MAX polling already running, ignoring duplicate start')
    return
  }

  currentClient = new MaxApiClient(token)
  running = true

  const me = await currentClient.getMe()
  logger.info({ botName: me.name, botUsername: me.username }, '✅ MAX bot started')

  let marker: string | undefined

  while (running) {
    try {
      const response = await currentClient.getUpdates(marker, 30)

      if (response.marker !== null) {
        marker = response.marker
      }

      for (const update of response.updates ?? []) {
        try {
          await handleMaxUpdate(update)
        } catch (err) {
          logger.error({ err, updateType: update.update_type }, 'Error handling MAX update')
        }
      }
    } catch (err) {
      if (!running) break
      logger.error({ err }, 'MAX polling error, retrying in 5s')
      await sleep(RETRY_DELAY_MS)
    }
  }

  logger.info('MAX polling stopped')
}

export function stopMaxPolling(): void {
  running = false
  currentClient = null
}

export function isMaxPollingRunning(): boolean {
  return running
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
