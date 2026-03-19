#!/bin/bash
set -e

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
PROJECT_DIR=$(dirname "$SCRIPT_DIR")

cd "$PROJECT_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$PROJECT_DIR/backups"
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "💾 Бэкап базы данных..."

# Проверить что postgres-контейнер запущен перед pg_dump
if ! docker compose -f "$PROJECT_DIR/docker-compose.yml" ps postgres 2>/dev/null | grep -q "running"; then
    echo "❌ Контейнер postgres не запущен. Запустите: docker compose up -d"
    exit 1
fi

# Выполнить бэкап: -T обязателен в скриптах (без TTY)
docker compose -f "$PROJECT_DIR/docker-compose.yml" exec -T postgres \
    pg_dump -U op podpisach | gzip > "$BACKUP_FILE"

SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "✅ Бэкап сохранён: $BACKUP_FILE ($SIZE)"

# Ротация: удаление бэкапов старше 30 дней
DELETED=$(find "$BACKUP_DIR" -name "*.sql.gz" -mtime +30 -print -delete | wc -l)
if [ "$DELETED" -gt 0 ]; then
    echo "🗑️  Удалено старых бэкапов (>30 дней): $DELETED"
fi

# Показать список текущих бэкапов
TOTAL=$(find "$BACKUP_DIR" -name "*.sql.gz" | wc -l)
echo "📂 Всего бэкапов: $TOTAL (в $BACKUP_DIR)"
