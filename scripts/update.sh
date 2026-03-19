#!/bin/bash
set -e

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
PROJECT_DIR=$(dirname "$SCRIPT_DIR")

cd "$PROJECT_DIR"

echo "📦 Обновление ПодписачЪ..."
echo "=================================="

# ⚠️ R4: Автобэкап перед обновлением (митигация риска конфликтов миграций)
echo "💾 Автобэкап перед обновлением..."
if "$SCRIPT_DIR/backup.sh"; then
    echo "✅ Бэкап выполнен"
else
    echo "⚠️  Бэкап не удался — продолжаем обновление (проверьте контейнеры)"
fi

echo ""

# Получить обновления из git
echo "📥 Получение обновлений..."
git pull origin main

echo ""

# Пересборка и перезапуск контейнеров
# Миграции применяются автоматически в docker-entrypoint.sh
echo "🐳 Пересборка и перезапуск контейнеров..."
docker compose -f "$PROJECT_DIR/docker-compose.yml" down
docker compose -f "$PROJECT_DIR/docker-compose.yml" up -d --build

echo ""
echo "✅ Обновление завершено!"
echo "   Миграции БД применяются автоматически при старте контейнеров."
echo "   Бэкап сохранён в $PROJECT_DIR/backups/"
