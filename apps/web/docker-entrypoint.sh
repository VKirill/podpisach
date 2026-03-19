#!/bin/sh
set -e

echo "⏳ Ожидание PostgreSQL..."
until pg_isready -h postgres -p 5432 -U op 2>/dev/null; do
  sleep 1
done
echo "✅ PostgreSQL готов"

echo "📦 Применение миграций..."
npx prisma migrate deploy --schema prisma/schema.prisma
echo "✅ Миграции применены"

echo "🌱 Инициализация Settings..."
node -e "
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
prisma.settings.upsert({
  where: { id: 1 },
  create: { id: 1, sessionSecret: require('crypto').randomUUID(), internalApiSecret: require('crypto').randomUUID() },
  update: {},
}).then(() => { console.log('✅ Settings ready'); prisma.\$disconnect(); })
.catch(e => { console.error('Settings init error:', e.message); prisma.\$disconnect(); });
" 2>/dev/null || echo "⚠️ Settings init skipped"

echo "🚀 Запуск приложения..."
exec "$@"
