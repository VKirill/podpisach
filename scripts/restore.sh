#!/bin/bash
set -e

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
PROJECT_DIR=$(dirname "$SCRIPT_DIR")

cd "$PROJECT_DIR"

# Проверка аргумента
if [ -z "$1" ]; then
    echo "Использование: ./scripts/restore.sh <путь-к-бэкапу>"
    echo ""
    echo "Доступные бэкапы:"
    ls -lh "$PROJECT_DIR/backups/"*.sql.gz 2>/dev/null || echo "  Бэкапов нет"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Файл не найден: $BACKUP_FILE"
    exit 1
fi

echo "⚠️  ВНИМАНИЕ: Это перезапишет текущую базу данных!"
echo "   Файл бэкапа: $BACKUP_FILE"
echo ""
read -p "Продолжить восстановление? (введите 'y' для подтверждения): " confirm

if [ "$confirm" != "y" ]; then
    echo "❌ Восстановление отменено"
    exit 0
fi

# Проверить что postgres-контейнер запущен
if ! docker compose -f "$PROJECT_DIR/docker-compose.yml" ps postgres 2>/dev/null | grep -q "running"; then
    echo "❌ Контейнер postgres не запущен. Запустите: docker compose up -d postgres"
    exit 1
fi

echo "🔄 Восстановление из $BACKUP_FILE..."

# -T обязателен в скриптах (без TTY)
gunzip -c "$BACKUP_FILE" | docker compose -f "$PROJECT_DIR/docker-compose.yml" exec -T postgres \
    psql -U op otkuda_podpischik

echo "✅ База данных восстановлена!"
echo "   Перезапустите приложение: docker compose restart app bot"
