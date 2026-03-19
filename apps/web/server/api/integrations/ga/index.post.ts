import { z } from 'zod'

const gaConfigSchema = z.object({
  measurementId: z
    .string()
    .regex(/^G-[A-Z0-9]+$/, 'Measurement ID должен быть в формате G-XXXXXXXXXX'),
  apiSecret: z.string().min(1, 'API Secret обязателен'),
})

export default defineEventHandler(async (event) => {
  const { measurementId, apiSecret } = await validateBody(event, gaConfigSchema)

  const integration = await prisma.integration.upsert({
    where: { type: 'google_analytics' },
    create: {
      type: 'google_analytics',
      config: { measurementId, apiSecret },
      isActive: true,
    },
    update: {
      config: { measurementId, apiSecret },
      isActive: true,
    },
    select: {
      id: true,
      type: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return {
    success: true,
    integration: {
      id: integration.id,
      type: integration.type,
      isActive: integration.isActive,
      measurementId,
    },
  }
})
