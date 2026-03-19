#!/bin/bash
set -e

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
PROJECT_DIR=$(dirname "$SCRIPT_DIR")

cd "$PROJECT_DIR"

echo "🔧 Откуда подписчик — установка"
echo "================================"

# Проверка Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не установлен. Установите: https://docs.docker.com/get-docker/"
    exit 1
fi

# Проверка Docker Compose v2
if ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose v2 не найден."
    echo "   Обновите Docker до версии 20.10+ или установите плагин:"
    echo "   https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✅ Docker: $(docker --version)"
echo "✅ Docker Compose: $(docker compose version --short)"
echo ""

# Создание .env если нет
if [ ! -f "$PROJECT_DIR/.env" ]; then
    echo "📝 Создание .env..."

    # Генерация пароля: openssl или /dev/urandom как fallback
    if command -v openssl &> /dev/null; then
        POSTGRES_PASSWORD=$(openssl rand -hex 16)
    else
        POSTGRES_PASSWORD=$(cat /dev/urandom | tr -dc 'a-f0-9' | head -c 32)
    fi

    # Определить IP сервера для APP_URL
    APP_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")
    if [ -z "$APP_IP" ]; then
        APP_IP="localhost"
    fi

    cat > "$PROJECT_DIR/.env" <<EOF
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
PORT=3000
APP_URL=http://${APP_IP}:3000
EOF

    # Ограничить права доступа — пароль БД не должен читаться всеми
    chmod 600 "$PROJECT_DIR/.env"
    echo "✅ Создан .env с автогенерированным паролем БД (chmod 600)"
else
    echo "ℹ️  Файл .env уже существует, пропускаю генерацию"
fi

echo ""
echo "🐳 Сборка и запуск контейнеров..."
docker compose -f "$PROJECT_DIR/docker-compose.yml" up -d --build

echo ""
echo "✅ Установка завершена!"

APP_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")
if [ -z "$APP_IP" ]; then
    APP_IP="localhost"
fi

echo "🌐 Откройте: http://${APP_IP}:3000"
echo "📋 Следуйте мастеру настройки в браузере"
echo ""
echo "Полезные команды:"
echo "  docker compose logs -f       — логи в реальном времени"
echo "  docker compose down          — остановить контейнеры"
echo "  docker compose up -d         — запустить контейнеры"
echo "  ./scripts/backup.sh          — сделать бэкап БД"
echo "  ./scripts/update.sh          — обновить до новой версии"
echo ""
echo "⚠️  ВАЖНО: Никогда не используйте 'docker compose down -v' — это удалит все данные!"
