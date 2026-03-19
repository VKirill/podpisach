#!/bin/sh
set -e

echo "⏳ Ожидание PostgreSQL..."
until pg_isready -h postgres -p 5432 -U op 2>/dev/null; do
  sleep 1
done
echo "✅ PostgreSQL готов"

echo "📦 Применение миграций..."
npx prisma migrate deploy
echo "✅ Миграции применены"

echo "🌱 Seed данных..."
npx prisma db seed 2>/dev/null || true

echo "🚀 Запуск приложения..."
exec "$@"
