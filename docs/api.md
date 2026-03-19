# 📡 REST API

Базовый URL: `http://ВАШ_СЕРВЕР:3000/api`

---

## Авторизация

Большинство эндпоинтов требуют аутентификации. Система использует HTTP-only cookie с JWT-сессией.

```bash
# Войти
POST /api/auth/login
{ "password": "ваш_пароль" }

# Выйти
POST /api/auth/logout

# Проверить сессию
GET /api/auth/session
```

Неавторизованный запрос вернёт `401 Unauthorized`.

---

## Track API (публичный)

Принимает данные от JS-скрипта с лендинга. Работает без авторизации, CORS открыт для всех доменов.

```
POST /api/track
```

**Запрос:**
```json
{
  "channelId": 1,
  "utm_source": "yandex",
  "utm_medium": "cpc",
  "utm_campaign": "summer2026",
  "utm_content": "banner",
  "utm_term": "купить",
  "yclid": "123456789",
  "gclid": null,
  "referrer": "https://yandex.ru/...",
  "url": "https://example.com/landing?utm_source=yandex"
}
```

**Ответ:**
```json
{
  "sessionId": "uuid",
  "invite_url": "https://t.me/+AbCdEfGhIjKl"
}
```

`invite_url` — одноразовая invite-ссылка для кнопки подписки. Автоматически отзывается после использования или по истечении TTL.

---

## Каналы

```
GET    /api/channels              # Список всех каналов
POST   /api/channels              # Добавить канал
GET    /api/channels/:id          # Данные канала
PATCH  /api/channels/:id          # Обновить настройки
DELETE /api/channels/:id          # Удалить канал
GET    /api/channels/:id/stats    # Статистика канала
GET    /api/channels/:id/links    # Invite-ссылки канала
GET    /api/channels/:id/subscribers  # Подписчики канала
```

**Пример: список каналов**
```json
// GET /api/channels
[
  {
    "id": 1,
    "title": "Мой канал",
    "platform": "telegram",
    "subscriberCount": 1240,
    "isActive": true
  }
]
```

**Параметры подписчиков** (`GET /api/channels/:id/subscribers`):

| Параметр | Тип | Описание |
|----------|-----|----------|
| `page` | number | Страница (по умолчанию 1) |
| `limit` | number | Записей на странице (макс 100) |
| `status` | string | `active` / `left` |
| `utmSource` | string | Фильтр по источнику |
| `search` | string | Поиск по имени / username |

---

## Ссылки

```
POST   /api/links          # Создать ручную ссылку
PATCH  /api/links/:id      # Обновить (затраты, название)
DELETE /api/links/:id      # Отозвать ссылку
```

**Создание ручной ссылки:**
```json
// POST /api/links
{
  "channelId": 1,
  "name": "Пост в канале @example",
  "utmSource": "telegram",
  "utmMedium": "post",
  "utmCampaign": "march2026",
  "costAmount": 5000,
  "costCurrency": "RUB"
}
```

---

## Подписчики

```
GET /api/subscribers        # Все подписчики (с пагинацией и фильтрами)
GET /api/subscribers/:id    # Детали подписчика с историей событий
```

---

## Источники трафика

```
GET /api/sources
```

**Параметры:**

| Параметр | Тип | Описание |
|----------|-----|----------|
| `channelId` | number | Фильтр по каналу |
| `period` | string | `7d` / `30d` / `90d` |
| `utmSource` | string | Фильтр по источнику |

**Ответ:**
```json
[
  {
    "utmSource": "yandex",
    "utmMedium": "cpc",
    "utmCampaign": "summer",
    "visits": 1500,
    "clicks": 320,
    "subscribers": 48,
    "conversionPct": 15.0,
    "costAmount": 12000,
    "costCurrency": "RUB",
    "costPerSubscriber": 250
  }
]
```

---

## Статистика

```
GET /api/stats/overview    # Сводка для дашборда
GET /api/stats/chart       # Данные для графиков (подписки/отписки по дням)
GET /api/stats/events      # Лента последних событий
GET /api/stats/export      # CSV-экспорт подписчиков
```

**Параметры overview:**

| Параметр | Тип | Описание |
|----------|-----|----------|
| `channelId` | number | Фильтр по каналу (опционально) |
| `period` | string | `7d` / `30d` / `90d` |

---

## Публичные отчёты

```
GET  /api/reports           # Список отчётов (требует авторизации)
POST /api/reports           # Создать публичный отчёт
GET  /api/reports/:token    # Данные отчёта (публичный, без авторизации)
POST /api/reports/:token/auth  # Проверить пароль отчёта
```

**Создание отчёта:**
```json
// POST /api/reports
{
  "channelId": 1,
  "name": "Отчёт для клиента март 2026",
  "password": "secret123",
  "showSubscriberNames": false,
  "showUtmDetails": true,
  "showCosts": true
}
// → { "token": "uuid", "url": "/r/uuid" }
```

---

## Настройки

```
GET   /api/settings           # Текущие настройки
PATCH /api/settings           # Обновить настройки
POST  /api/settings/password  # Сменить пароль
```

**Настройки:**
```json
{
  "timezone": "Europe/Moscow",
  "maxCorrelationWindowSec": 60
}
```

---

## Setup API

Используется только во время первичной настройки (Setup Wizard).

```
GET  /api/setup/status           # Статус настройки
POST /api/setup/password         # Шаг 1: задать пароль
POST /api/setup/bot              # Шаг 2: сохранить токен бота
POST /api/setup/bot/validate     # Валидация токена бота
POST /api/setup/channel          # Шаг 3: добавить канал
POST /api/setup/complete         # Завершить настройку
```

---

## Коды ошибок

| Код | Описание |
|-----|----------|
| `400` | Ошибка валидации — проверьте тело запроса |
| `401` | Требуется авторизация |
| `403` | Недостаточно прав |
| `404` | Ресурс не найден |
| `409` | Конфликт (например, канал уже добавлен) |
| `500` | Внутренняя ошибка сервера |

Ошибки возвращаются в формате:
```json
{ "error": "Описание ошибки" }
```
