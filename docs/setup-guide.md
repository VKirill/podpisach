# 🚀 Руководство по установке

## Требования к серверу

| Параметр | Минимум | Рекомендуется |
|----------|:-------:|:-------------:|
| CPU | 1 vCPU | 2 vCPU |
| RAM | 1 GB | 2 GB |
| Диск | 10 GB SSD | 20 GB SSD |
| ОС | Ubuntu 22.04+ / Debian 12+ | Ubuntu 24.04 |
| Docker | 24.0+ | latest |
| Docker Compose | v2.20+ | latest |

**Стоимость VPS:** от 300–500 ₽/мес (Timeweb, Selectel, Hetzner).

---

## Установка

### 1. Установите Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
```

### 2. Клонируйте репозиторий и запустите

```bash
git clone https://github.com/VKirill/otkuda-podpischik.git
cd otkuda-podpischik
./scripts/install.sh
```

Скрипт автоматически:
- Создаёт `.env` с безопасным паролем БД
- Собирает Docker-образы
- Запускает 3 контейнера (app, bot, postgres)
- Применяет миграции БД

После завершения откройте `http://ВАШ_IP:3000`.

---

## Setup Wizard (мастер настройки)

При первом входе система покажет мастер настройки. Пройдите 3 шага:

### Шаг 1 — Пароль администратора

Придумайте надёжный пароль. Он используется для входа в систему.

### Шаг 2 — Подключение Telegram-бота

1. Откройте [@BotFather](https://t.me/BotFather) в Telegram
2. Отправьте `/newbot`, задайте имя и username
3. Скопируйте токен вида `1234567890:ABC...`
4. Вставьте токен в форму — система проверит его автоматически

### Шаг 3 — Добавление канала

1. Добавьте бота администратором в ваш Telegram-канал
2. Нажмите «Найти каналы» — система обнаружит канал автоматически
3. Выберите канал и нажмите «Подключить»

Готово! Дашборд откроется автоматически.

---

## Установка JS-скрипта на сайт

Перейдите в раздел **«JS-скрипт»** и скопируйте сгенерированный код.

Вставьте его в `<head>` вашего лендинга:

```html
<script>
window.__OP_API = 'https://tracker.example.com/api/track';
window.__OP_CHANNEL = 'ВАШ_CHANNEL_ID';
</script>
<script src="https://tracker.example.com/tracker.js" async></script>
```

Добавьте атрибут `data-op-subscribe` на кнопку подписки — скрипт автоматически подставит invite-ссылку:

```html
<a data-op-subscribe href="#">Подписаться на канал</a>
```

Скрипт весит ~3 KB и не блокирует загрузку страницы.

---

## Reverse Proxy (Nginx + SSL)

Для работы по HTTPS настройте Nginx и Certbot:

```nginx
# /etc/nginx/sites-available/otkuda-podpischik
server {
    listen 80;
    server_name tracker.example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/otkuda-podpischik /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Получить SSL-сертификат
sudo certbot --nginx -d tracker.example.com
```

После этого обновите `APP_URL` в `.env` и перезапустите: `docker compose up -d`.

---

## Обновление

```bash
cd otkuda-podpischik
./scripts/update.sh
```

Скрипт создаёт бэкап БД, скачивает новую версию и перезапускает контейнеры. Миграции применяются автоматически.

---

## Бэкап и восстановление

```bash
# Создать бэкап
./scripts/backup.sh
# → backups/backup_20260319_120000.sql.gz

# Восстановить из бэкапа
./scripts/restore.sh backups/backup_20260319_120000.sql.gz
```

Бэкапы старше 30 дней удаляются автоматически.

> ⚠️ **Внимание:** Никогда не запускайте `docker compose down -v` — это удалит все данные вместе с Docker-volumes.
