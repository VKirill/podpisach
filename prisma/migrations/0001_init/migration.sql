Loaded Prisma config from prisma.config.ts.

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('telegram', 'max');

-- CreateEnum
CREATE TYPE "LinkType" AS ENUM ('auto', 'manual');

-- CreateEnum
CREATE TYPE "SubscriberStatus" AS ENUM ('active', 'left', 'kicked', 'banned');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('joined', 'left', 'kicked', 'banned');

-- CreateEnum
CREATE TYPE "IntegrationType" AS ENUM ('yandex_metrika', 'google_analytics');

-- CreateEnum
CREATE TYPE "ConversionStatus" AS ENUM ('pending', 'sent', 'failed');

-- CreateEnum
CREATE TYPE "GoalKey" AS ENUM ('op_visit', 'op_click', 'op_subscribe', 'op_unsubscribe', 'op_resubscribe');

-- CreateTable
CREATE TABLE "Settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "adminPasswordHash" TEXT,
    "sessionSecret" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Moscow',
    "maxCorrelationWindowSec" INTEGER NOT NULL DEFAULT 60,
    "internalApiSecret" TEXT NOT NULL,
    "setupCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bot" (
    "id" SERIAL NOT NULL,
    "platform" "Platform" NOT NULL,
    "token" TEXT NOT NULL,
    "botUsername" TEXT,
    "botName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Channel" (
    "id" SERIAL NOT NULL,
    "botId" INTEGER NOT NULL,
    "platform" "Platform" NOT NULL,
    "platformChatId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "username" TEXT,
    "isPrivate" BOOLEAN NOT NULL DEFAULT true,
    "subscriberCount" INTEGER NOT NULL DEFAULT 0,
    "linkTtlHours" INTEGER NOT NULL DEFAULT 24,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Channel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InviteLink" (
    "id" SERIAL NOT NULL,
    "channelId" INTEGER NOT NULL,
    "visitId" INTEGER,
    "url" TEXT NOT NULL,
    "name" TEXT,
    "type" "LinkType" NOT NULL DEFAULT 'auto',
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmContent" TEXT,
    "utmTerm" TEXT,
    "costAmount" DOUBLE PRECISION,
    "costCurrency" TEXT,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "joinCount" INTEGER NOT NULL DEFAULT 0,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InviteLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Visit" (
    "id" SERIAL NOT NULL,
    "sessionId" TEXT NOT NULL,
    "channelId" INTEGER,
    "platform" "Platform" NOT NULL DEFAULT 'telegram',
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmContent" TEXT,
    "utmTerm" TEXT,
    "yclid" TEXT,
    "gclid" TEXT,
    "referrer" TEXT,
    "pageUrl" TEXT,
    "fingerprint" TEXT,
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Visit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscriber" (
    "id" SERIAL NOT NULL,
    "channelId" INTEGER NOT NULL,
    "inviteLinkId" INTEGER,
    "visitId" INTEGER,
    "platform" "Platform" NOT NULL,
    "platformUserId" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "username" TEXT,
    "attributionConfidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "status" "SubscriberStatus" NOT NULL DEFAULT 'active',
    "subscribedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscriber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionEvent" (
    "id" SERIAL NOT NULL,
    "subscriberId" INTEGER NOT NULL,
    "eventType" "EventType" NOT NULL,
    "rawData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicReport" (
    "id" SERIAL NOT NULL,
    "channelId" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "passwordHash" TEXT,
    "name" TEXT NOT NULL,
    "showSubscriberNames" BOOLEAN NOT NULL DEFAULT false,
    "showUtmDetails" BOOLEAN NOT NULL DEFAULT true,
    "showCosts" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "YandexMetrikaAccount" (
    "id" SERIAL NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientSecret" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "yaLogin" TEXT,
    "isConnected" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "YandexMetrikaAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "YandexMetrikaCounter" (
    "id" SERIAL NOT NULL,
    "accountId" INTEGER NOT NULL,
    "yandexCounterId" TEXT NOT NULL,
    "counterName" TEXT NOT NULL,
    "counterSite" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "YandexMetrikaCounter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannelCounter" (
    "id" SERIAL NOT NULL,
    "channelId" INTEGER NOT NULL,
    "counterId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChannelCounter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannelGoalConfig" (
    "id" SERIAL NOT NULL,
    "channelCounterId" INTEGER NOT NULL,
    "goalKey" "GoalKey" NOT NULL,
    "customName" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "yandexGoalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChannelGoalConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Integration" (
    "id" SERIAL NOT NULL,
    "type" "IntegrationType" NOT NULL,
    "config" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Integration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversion" (
    "id" SERIAL NOT NULL,
    "visitId" INTEGER NOT NULL,
    "subscriberId" INTEGER NOT NULL,
    "integrationId" INTEGER NOT NULL,
    "status" "ConversionStatus" NOT NULL DEFAULT 'pending',
    "errorMessage" TEXT,
    "sentAt" TIMESTAMP(3),
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Conversion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Bot_platform_token_key" ON "Bot"("platform", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Channel_platform_platformChatId_key" ON "Channel"("platform", "platformChatId");

-- CreateIndex
CREATE UNIQUE INDEX "InviteLink_visitId_key" ON "InviteLink"("visitId");

-- CreateIndex
CREATE INDEX "InviteLink_channelId_isRevoked_idx" ON "InviteLink"("channelId", "isRevoked");

-- CreateIndex
CREATE INDEX "InviteLink_expiresAt_idx" ON "InviteLink"("expiresAt");

-- CreateIndex
CREATE INDEX "InviteLink_type_idx" ON "InviteLink"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Visit_sessionId_key" ON "Visit"("sessionId");

-- CreateIndex
CREATE INDEX "Visit_platform_createdAt_idx" ON "Visit"("platform", "createdAt");

-- CreateIndex
CREATE INDEX "Visit_fingerprint_createdAt_idx" ON "Visit"("fingerprint", "createdAt");

-- CreateIndex
CREATE INDEX "Visit_ipHash_createdAt_idx" ON "Visit"("ipHash", "createdAt");

-- CreateIndex
CREATE INDEX "Visit_yclid_idx" ON "Visit"("yclid");

-- CreateIndex
CREATE INDEX "Visit_gclid_idx" ON "Visit"("gclid");

-- CreateIndex
CREATE INDEX "Visit_channelId_createdAt_idx" ON "Visit"("channelId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Subscriber_visitId_key" ON "Subscriber"("visitId");

-- CreateIndex
CREATE INDEX "Subscriber_channelId_status_idx" ON "Subscriber"("channelId", "status");

-- CreateIndex
CREATE INDEX "Subscriber_subscribedAt_idx" ON "Subscriber"("subscribedAt");

-- CreateIndex
CREATE INDEX "Subscriber_inviteLinkId_idx" ON "Subscriber"("inviteLinkId");

-- CreateIndex
CREATE INDEX "Subscriber_platform_platformUserId_idx" ON "Subscriber"("platform", "platformUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscriber_channelId_platform_platformUserId_key" ON "Subscriber"("channelId", "platform", "platformUserId");

-- CreateIndex
CREATE INDEX "SubscriptionEvent_subscriberId_createdAt_idx" ON "SubscriptionEvent"("subscriberId", "createdAt");

-- CreateIndex
CREATE INDEX "SubscriptionEvent_eventType_createdAt_idx" ON "SubscriptionEvent"("eventType", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PublicReport_token_key" ON "PublicReport"("token");

-- CreateIndex
CREATE UNIQUE INDEX "YandexMetrikaCounter_accountId_yandexCounterId_key" ON "YandexMetrikaCounter"("accountId", "yandexCounterId");

-- CreateIndex
CREATE UNIQUE INDEX "ChannelCounter_channelId_counterId_key" ON "ChannelCounter"("channelId", "counterId");

-- CreateIndex
CREATE UNIQUE INDEX "ChannelGoalConfig_channelCounterId_goalKey_key" ON "ChannelGoalConfig"("channelCounterId", "goalKey");

-- CreateIndex
CREATE UNIQUE INDEX "Integration_type_key" ON "Integration"("type");

-- CreateIndex
CREATE INDEX "Conversion_status_idx" ON "Conversion"("status");

-- CreateIndex
CREATE INDEX "Conversion_integrationId_status_idx" ON "Conversion"("integrationId", "status");

-- CreateIndex
CREATE INDEX "Conversion_createdAt_idx" ON "Conversion"("createdAt");

-- AddForeignKey
ALTER TABLE "Channel" ADD CONSTRAINT "Channel_botId_fkey" FOREIGN KEY ("botId") REFERENCES "Bot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InviteLink" ADD CONSTRAINT "InviteLink_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InviteLink" ADD CONSTRAINT "InviteLink_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscriber" ADD CONSTRAINT "Subscriber_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscriber" ADD CONSTRAINT "Subscriber_inviteLinkId_fkey" FOREIGN KEY ("inviteLinkId") REFERENCES "InviteLink"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscriber" ADD CONSTRAINT "Subscriber_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionEvent" ADD CONSTRAINT "SubscriptionEvent_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "Subscriber"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicReport" ADD CONSTRAINT "PublicReport_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "YandexMetrikaCounter" ADD CONSTRAINT "YandexMetrikaCounter_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "YandexMetrikaAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelCounter" ADD CONSTRAINT "ChannelCounter_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelCounter" ADD CONSTRAINT "ChannelCounter_counterId_fkey" FOREIGN KEY ("counterId") REFERENCES "YandexMetrikaCounter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelGoalConfig" ADD CONSTRAINT "ChannelGoalConfig_channelCounterId_fkey" FOREIGN KEY ("channelCounterId") REFERENCES "ChannelCounter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversion" ADD CONSTRAINT "Conversion_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversion" ADD CONSTRAINT "Conversion_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "Subscriber"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversion" ADD CONSTRAINT "Conversion_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

