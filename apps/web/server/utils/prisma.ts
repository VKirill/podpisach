import { PrismaClient } from '@prisma/client'

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined
}

const prismaOptions = {
  datasourceUrl: process.env.DATABASE_URL,
}

let prisma: PrismaClient

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient(prismaOptions)
} else {
  if (!global.__prisma) {
    global.__prisma = new PrismaClient(prismaOptions)
  }
  prisma = global.__prisma
}

export { prisma }
