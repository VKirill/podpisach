import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      // adminPasswordHash: null → показывать Setup Wizard
      // sessionSecret и internalApiSecret генерируются автоматически (uuid)
    },
  })
  console.log('✅ Seed: Settings record created')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
