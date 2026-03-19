# Откуда подписчик

## Бриф проекта «Откуда подписчик»

# «Откуда подписчик» — Open-Source Subscriber Attribution Tracker

## 1. Описание проекта

| Параметр | Значение |
|----------|----------|
| **Название** | Откуда подписчик (otkuda-podpischik) |
| **Тип** | Open-source self-hosted веб-приложение |
| **Лицензия** | MIT |
| **Разработка** | ИИ-ассистент, бюджет не ограничен |

**Суть:** Система атрибуции подписчиков Telegram и MAX каналов. Определяет, откуда пришёл каждый подписчик — из какой рекламной кампании, с какими UTM-метками, сколько стоил.

**Проблема:** Владельцы каналов тратят деньги на рекламу, но не знают, какой канал привлечения работает. Стандартные инструменты Telegram/MAX такой аналитики не дают.

**Уникальность:** Готового опенсорс-аналога не существует.

---

## 2. Целевая аудитория

| Сегмент | Описание |
|---------|----------|
| Владельцы каналов | Ведут рекламу, хотят понимать ROI |
| Маркетологи-фрилансеры | Ведут рекламу для клиентов, нужна отчётность |
| Агентства | Управляют каналами, делятся отчётами с клиентами |
| Open-source энтузиасты | Self-hosted без передачи данных третьим лицам |

---

## 3. Ключевая концепция: автономная система

Каждый пользователь **сам разворачивает** систему и **подключает своего бота**. Централизованного бота нет. Установка в одну команду:

```bash
git clone https://github.com/.../otkuda-podpischik.git
cd otkuda-podpischik
docker compose up -d
# → http://server:3000 → мастер настройки
```

### 🧙 Мастер первоначальной настройки (в браузере)

| Шаг | Действие |
|-----|----------|
| 1 | Создайте пароль администратора |
| 2 | Подключите Telegram-бота → инструкция «Откройте @BotFather, создайте бота, вставьте токен сюда» → ✅ Бот работает! |
| 3 | Добавьте канал → «Добавьте бота администратором в канал» → система автоматически находит канал → ✅ Канал подключён! |
| 4 | (Опционально) Подключите MAX-бота |
| 5 | 🎉 Дашборд готов к работе! |

**Никаких** `.env` файлов для редактирования вручную — всё через UI.

---

## 4. Функциональные требования

### 4.1. Главная / Обзор (Dashboard)
- Сводный график подписок/отписок за период (день/неделя/месяц)
- Общее число подписчиков по каналам
- Топ-3 источника трафика
- Лента последних событий («+1 из Яндекс.Директ», «−1 отписка»)

### 4.2. Каналы
- Список подключённых Telegram/MAX каналов (неограниченно)
- Добавить новый канал (подключить бота)
- Статус бота (активен/не активен), быстрая статистика

### 4.3. Ссылки

**Автоматические (основной сценарий):**
- Генерируются автоматически при переходе посетителя с лендинга
- Привязаны к UTM/yclid/gclid визита
- Автоудаление по TTL (настраивается, по умолчанию 24 часа)
- Пользователю ничего делать не надо — система работает сама

**Ручные (дополнительный сценарий):**
- Создание через UI для случаев без лендинга (пост, чат, блогер)
- Название ссылки, UTM-метки
- Поля затрат: сумма + валюта (EUR / TON)
- Автоматический расчёт стоимости подписчика

### 4.4. Подписчики (по каналу)
- Telegram/MAX ID, имя, юзернейм
- Дата подписки, источник (ссылка/кампания)
- UTM-метки (source, medium, campaign, content, term)
- yclid / gclid если были
- Статус: подписан / отписался (и когда)
- Уверенность атрибуции (confidence %)

### 4.5. Источники трафика
- Разбивка по UTM source → medium → campaign
- Таблица: источник, визитов на лендинг, кликов, подписок, конверсия %
- Затраты и стоимость подписчика (для ручных ссылок)
- Сравнение источников на графике

### 4.6. Интеграции
- 🟡 **Яндекс Метрика** — ввести номер счётчика, настроить цель
- 🔵 **Google Analytics** — ввести Measurement ID, настроить событие
- Статус подключения, лог отправленных конверсий

### 4.7. JS-скрипт для сайта
- Генератор JS-сниппета (выбрать канал → получить код)
- Инструкция по установке
- Тест: «проверить, что скрипт работает»

### 4.8. Публичные отчёты для клиентов
- Уникальная ссылка + пароль
- Режим «только чтение»
- Настраиваемая видимость: скрыть/показать имена подписчиков, UTM-детали, затраты
- Красивый дашборд для клиента маркетолога

### 4.9. Настройки
- Смена пароля
- Часовой пояс
- Окно корреляции для MAX (по умолчанию 60 сек)
- Экспорт данных (CSV)

---

## 5. Платформы и точность атрибуции

| Платформа | Метод | Точность |
|-----------|-------|----------|
| **Telegram (приватные)** | `invite_link` в `ChatMemberUpdated` | ~95% |
| **Telegram (публичные)** | `invite_link` + fallback cookie | ~80% |
| **MAX** | Промежуточный лендинг + корреляция по времени ±60 сек | ~70-85% |

### Ограничения MAX Bot API:
- ❌ Нет API для создания invite-ссылок программно
- ❌ Нет поля `invite_link` в событии `user_added`
- ✅ Обходной путь: лендинг → фиксация UTM → корреляция по временному окну

---

## 6. Технический стек

| Компонент | Технология | Обоснование |
|-----------|-----------|-------------|
| Frontend + Backend | **Nuxt 3 + Nuxt UI + Nitro** | Единый JS-стек, красивый UI из коробки, простой деплой |
| Telegram Bot | **grammY** (отдельный процесс) | Лучшая типизация, активная разработка |
| MAX Bot | REST API (`platform-api.max.ru`) | Официальный API |
| ORM | **Prisma** | Типобезопасность, миграции |
| БД | **PostgreSQL 16** | Надёжность, JSON-поддержка |
| Деплой | **Docker Compose** | Одна команда для развёртывания |

---

## 7. Нефункциональные требования

- **Self-hosted:** никаких внешних зависимостей кроме API мессенджеров
- **Минимальные ресурсы:** VPS 1 CPU / 1 GB RAM / 10 GB SSD
- **Установка:** одна команда `docker compose up -d`
- **Дизайн:** минималистичный, не перегруженный, тёмная/светлая тема
- **Open-source:** MIT лицензия, хорошая документация для контрибьюторов

## ### 4.6. Интеграции
### 4.6. Интеграции

#### 🟡 Яндекс Метрика — полная интеграция через OAuth

**Подключение (один раз в настройках):**
1. Пользователь создаёт OAuth-приложение на [oauth.yandex.ru](https://oauth.yandex.ru) (инструкция в UI)
2. Вводит в систему `client_id` и `client_secret`
3. Нажимает «Авторизоваться» → перенаправление на Яндекс → подтверждение → система получает и сохраняет `access_token` + `refresh_token`
4. Система автоматически обновляет токен когда он истекает

**Привязка счётчика к каналу:**
- В настройках каждого Telegram-канала — выпадающий список «Счётчик Яндекс Метрики»
- Система загружает список всех счётчиков пользователя через API Метрики
- Один счётчик можно привязать к нескольким каналам
- При привязке → система **автоматически создаёт цели** в Метрике через API

**Зарезервированные JS-цели (создаются автоматически):**

| Системное имя | Название по умолчанию | Описание |
|---------------|----------------------|----------|
| `op_visit` | Посещение лендинга | Пользователь зашёл на лендинг с UTM |
| `op_click` | Клик по кнопке подписки | Нажал «Подписаться» |
| `op_subscribe` | Подписка на канал | Подтверждённая подписка |
| `op_unsubscribe` | Отписка от канала | Пользователь отписался |
| `op_resubscribe` | Повторная подписка | Подписался снова после отписки |

**Настройка целей для каждого канала:**
- У каждого канала — своя таблица целей с переключателями вкл/выкл
- Можно **переименовать** цель для конкретного канала (например, `op_subscribe` → «Подписка на основной канал»)
- Можно **отключить** ненужные цели — они не будут отправляться в Метрику для этого канала
- При изменении названия → цель обновляется в Метрике через API
- Новые цели добавляются в Метрику автоматически, удалённые — деактивируются

#### 🔵 Google Analytics
- Ввести Measurement ID (`G-XXXXX`) и API Secret
- Аналогичная система целей/событий (через Measurement Protocol)

**Общее:**
- Статус подключения каждой интеграции
- Лог отправленных конверсий с фильтрацией по статусу
- Retry для неотправленных конверсий

---

## Архитектура системы

# Архитектура: «Откуда подписчик»

## 1. Общая схема

```mermaid
graph TB
    subgraph "Интернет"
        USER[👤 Посетитель сайта]
        TG_API[Telegram Bot API]
        MAX_API[MAX Bot API]
        YM[Яндекс Метрика]
        GA[Google Analytics]
        CLIENT[👤 Клиент маркетолога]
    end

    subgraph "Docker Compose"
        subgraph "app — Nuxt 3"
            NUXT_SSR[SSR Frontend — Nuxt UI]
            NITRO[Nitro Server Routes — REST API]
        end

        subgraph "bot — Node.js процесс"
            GRAMMY[grammY — Telegram Bot]
            MAX_CLIENT[MAX API Client]
            LINK_MGR[Link Manager]
            CORRELATOR[Correlator]
        end

        subgraph "postgres"
            PG[(PostgreSQL 16)]
        end
    end

    USER -->|JS-скрипт| NITRO
    NITRO -->|Создать ссылку| GRAMMY
    GRAMMY <-->|Bot API| TG_API
    MAX_CLIENT <-->|REST| MAX_API
    NITRO -->|Конверсия| YM
    NITRO -->|Конверсия| GA
    CLIENT -->|Отчёт| NUXT_SSR
    GRAMMY --> PG
    NITRO --> PG
```

---

## 2. Контейнеры

| Контейнер | Порт | Доступ | Что делает |
|-----------|------|--------|-----------|
| **app** | 3000 | Внешний | Nuxt 3 — фронт + API + мастер настройки |
| **bot** | 3001 | Только docker-сеть | grammY + MAX API + Link Manager + Correlator |
| **postgres** | 5432 | Только docker-сеть | БД, данные в Docker volume |

### Важно: разделение app и bot

Telegram-бот работает **отдельным процессом** от Nuxt — ему нужно постоянное соединение (long polling или webhook), это несовместимо с серверными маршрутами Nuxt. Связь между ними:
- **Общая БД** (PostgreSQL)
- **Внутренний HTTP API** (bot:3001, доступен только в docker-сети)

### Запуск bot-контейнера

При первом запуске `bot` контейнер **ждёт**, пока пользователь не введёт токен бота через UI. После ввода токена — `app` записывает его в БД и сигналит `bot` начать работу через внутренний API.

---

## 3. Компоненты app (Nuxt 3)

### Фронтенд (Nuxt UI)

| Страница | Путь | Описание |
|----------|------|----------|
| Setup Wizard | `/setup` | Мастер первого запуска |
| Dashboard | `/` | Сводная аналитика |
| Каналы | `/channels` | Список каналов |
| Канал | `/channels/:id` | Детали канала |
| Ссылки | `/channels/:id/links` | Invite-ссылки канала |
| Подписчики | `/channels/:id/subscribers` | Список подписчиков |
| Источники | `/sources` | Аналитика по UTM |
| Интеграции | `/integrations` | YM, GA |
| Скрипт | `/script` | Генератор JS-сниппета |
| Настройки | `/settings` | Параметры системы |
| Публичный отчёт | `/report/:token` | Отдельный layout, без авторизации |

### API (Nitro Server Routes)

**Трекинг:**
- `POST /api/track` — приём данных от JS-скрипта (UTM, yclid, gclid, fingerprint)
- `POST /api/link/generate` — запрос invite-ссылки → внутренний вызов к bot

**CRUD:**
- `GET /api/channels` — список каналов
- `POST /api/channels` — добавить канал
- `GET /api/channels/:id/subscribers` — подписчики канала
- `GET /api/channels/:id/links` — ссылки канала
- `POST /api/channels/:id/links` — создать ручную ссылку
- `GET /api/sources` — источники трафика
- `GET /api/stats` — агрегированная статистика

**Настройки:**
- `POST /api/setup/password` — создание пароля
- `POST /api/setup/bot` — подключение бота (валидация токена)
- `POST /api/setup/channel` — добавление канала
- `GET /api/settings` / `PATCH /api/settings` — настройки

**Интеграции:**
- `POST /api/integrations/ym` — подключить Яндекс Метрику
- `POST /api/integrations/ga` — подключить Google Analytics
- `POST /api/conversions/send` — отправка конверсий

**Отчёты:**
- `POST /api/reports` — создать публичный отчёт
- `GET /api/report/:token` — данные публичного отчёта
- `POST /api/report/:token/auth` — проверка пароля отчёта

**Авторизация:**
- `POST /api/auth/login` — вход по паролю
- `POST /api/auth/logout` — выход

---

## 4. Компоненты bot (Node.js)

### grammY (Telegram Bot)
- Long polling (по умолчанию) или Webhook (настраивается)
- Обработка `ChatMemberUpdated` — подписки/отписки
- `createChatInviteLink` / `revokeChatInviteLink` — управление ссылками
- Автоматическое определение каналов при добавлении бота

### MAX API Client
- Long polling `GET /updates`
- Обработка `user_added` / `user_removed`
- Корреляция по временному окну ±60 сек

### Link Manager
- Cron-задача: очистка устаревших ссылок по TTL
- Отзыв ссылок через Telegram API при удалении

### Correlator
- Для Telegram: точная связь по `invite_link` из события
- Для MAX: поиск визита в окне ±60 сек по fingerprint/IP + timestamp
- Запись `attributionConfidence` (1.0 для TG, 0.7-0.85 для MAX)

### Внутренний API (порт 3001)

| Endpoint | Описание |
|----------|----------|
| `POST /internal/link/create` | Создать invite-ссылку для визита |
| `POST /internal/link/revoke` | Отозвать ссылку |
| `GET /internal/bot/status` | Статус бота (работает/ожидает токен) |
| `POST /internal/bot/start` | Запустить бота с токеном |
| `POST /internal/bot/stop` | Остановить бота |

Авторизация внутреннего API: заголовок `Authorization: Bearer <internalApiSecret>` (auto-generated при первом запуске).

---

## 5. Поток данных: от клика до атрибуции

```mermaid
sequenceDiagram
    participant U as 👤 Посетитель
    participant JS as JS-скрипт
    participant API as Nitro API
    participant BOT as Bot-процесс
    participant TG as Telegram API
    participant DB as PostgreSQL

    U->>JS: Клик по рекламе (utm_source=yandex, yclid=123)
    JS->>API: POST /api/track {utm, yclid, fingerprint}
    API->>DB: INSERT visit (sessionId, utm*, yclid)
    API->>BOT: POST /internal/link/create {channelId, visitId}
    BOT->>TG: createChatInviteLink(chat_id, member_limit=1)
    TG-->>BOT: invite_url
    BOT->>DB: INSERT invite_link (url, visitId, channelId)
    BOT-->>API: {invite_url}
    API-->>JS: {invite_url} → подставить в кнопку

    Note over U,TG: Посетитель нажимает кнопку и подписывается

    TG->>BOT: ChatMemberUpdated {user, invite_link}
    BOT->>DB: INSERT subscriber (userId, channelId, inviteLinkId)
    BOT->>DB: UPDATE visit SET subscriberId
    BOT->>DB: UPDATE invite_link SET joinCount++

    Note over BOT,API: Если подключены интеграции

    BOT->>API: POST /api/conversions/send {visitId, subscriberId}
    API->>DB: SELECT visit.yclid, visit.gclid
    API-->>API: Отправить конверсию в YM / GA
    API->>DB: INSERT conversion (status=sent)
```

---

## 6. Поток для MAX (корреляция)

```mermaid
sequenceDiagram
    participant U as 👤 Посетитель
    participant JS as JS-скрипт
    participant API as Nitro API
    participant BOT as Bot-процесс
    participant MAX as MAX API
    participant DB as PostgreSQL

    U->>JS: Клик по рекламе
    JS->>API: POST /api/track {utm, fingerprint, ip}
    API->>DB: INSERT visit (fingerprint, ipHash, createdAt)
    API-->>JS: {max_channel_url} → кнопка «Подписаться»

    Note over U,MAX: Посетитель переходит в MAX и подписывается

    MAX->>BOT: user_added {user_id, chat_id, timestamp}
    BOT->>DB: SELECT visit WHERE fingerprint/ipHash MATCH AND createdAt ± 60 сек
    BOT->>DB: INSERT subscriber (confidence=0.75)
```

---

## 7. Безопасность

| Уровень | Метод |
|---------|-------|
| Дашборд | Пароль (bcrypt) + HTTP-only cookie с JWT |
| Публичные отчёты | Уникальный токен в URL + опциональный пароль |
| bot ↔ app | Shared secret (auto-generated) в `Authorization` header |
| Токены ботов | Хранятся в БД, зашифрованы (AES-256) |
| JS-скрипт | CORS ограничен доменом пользователя |
| PostgreSQL | Доступен только из docker-сети |

---

## 8. JS-скрипт для лендинга

```html
<script>
(function() {
  const API = 'https://YOUR_SERVER/api/track';
  const CHANNEL = 'YOUR_CHANNEL_ID';
  const p = new URLSearchParams(location.search);
  
  fetch(API, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      channelId: CHANNEL,
      utm_source: p.get('utm_source'),
      utm_medium: p.get('utm_medium'),
      utm_campaign: p.get('utm_campaign'),
      utm_content: p.get('utm_content'),
      utm_term: p.get('utm_term'),
      yclid: p.get('yclid'),
      gclid: p.get('gclid'),
      referrer: document.referrer,
      url: location.href
    })
  }).then(r => r.json()).then(res => {
    const btn = document.querySelector('[data-op-subscribe]');
    if (btn && res.invite_url) btn.href = res.invite_url;
  });
})();
</script>
```

---

## 9. Масштабирование (при росте)

| Этап | Нагрузка | Что добавить |
|------|----------|-------------|
| **v1 (MVP)** | 1-20 каналов, до 50K подписчиков | Текущая архитектура достаточна |
| **v2** | 20-100 каналов, до 500K | Redis для кеширования статистики |
| **v3** | 100+ каналов, 1M+ | BullMQ для очередей, вынос PostgreSQL на managed DB |

---

## 10. Docker Compose

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.app
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://op:op@postgres:5432/otkuda_podpischik
      - BOT_INTERNAL_URL=http://bot:3001
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

  bot:
    build:
      context: .
      dockerfile: Dockerfile.bot
    ports:
      - "3001:3001"
    environment:
      - DATABASE_URL=postgresql://op:op@postgres:5432/otkuda_podpischik
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=op
      - POSTGRES_PASSWORD=op
      - POSTGRES_DB=otkuda_podpischik
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U op"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped

volumes:
  pgdata:
```

## **Интеграции:**
**Интеграции (Яндекс Метрика):**
- `GET /api/integrations/ym` — статус подключения YM
- `POST /api/integrations/ym/credentials` — сохранить client_id + client_secret
- `GET /api/integrations/ym/auth` — начать OAuth-авторизацию (→ redirect на Яндекс)
- `GET /api/integrations/ym/callback` — OAuth callback (получить access_token + refresh_token)
- `GET /api/integrations/ym/counters` — список счётчиков пользователя (через API Метрики)
- `POST /api/channels/:id/counter` — привязать счётчик к каналу (+ автосоздание целей)
- `DELETE /api/channels/:id/counter` — отвязать счётчик от канала
- `GET /api/channels/:id/goals` — список целей канала с настройками вкл/выкл и кастомными именами
- `PATCH /api/channels/:id/goals/:goalId` — обновить настройки цели (имя, вкл/выкл)

**Интеграции (Google Analytics):**
- `POST /api/integrations/ga` — подключить Google Analytics
- `POST /api/conversions/send` — отправка конверсий в YM/GA

---

## 11. Интеграция Яндекс Метрика — OAuth + Цели

### Поток подключения

```mermaid
sequenceDiagram
    participant U as 👤 Пользователь
    participant APP as Nuxt App
    participant YA as Яндекс OAuth
    participant YM as Яндекс Метрика API
    participant DB as PostgreSQL

    Note over U,APP: Шаг 1: Ввод OAuth-ключей
    U->>APP: client_id + client_secret
    APP->>DB: INSERT YandexMetrikaAccount

    Note over U,YA: Шаг 2: Авторизация
    U->>APP: Нажимает «Авторизоваться»
    APP->>YA: Redirect → oauth.yandex.ru/authorize?client_id=...&scope=metrika:write
    YA-->>U: Показывает окно подтверждения
    U->>YA: Подтверждает
    YA->>APP: Redirect → /api/integrations/ym/callback?code=XXX
    APP->>YA: POST oauth.yandex.ru/token {code, client_id, client_secret}
    YA-->>APP: {access_token, refresh_token, expires_in}
    APP->>DB: UPDATE YandexMetrikaAccount SET tokens

    Note over APP,YM: Шаг 3: Загрузка счётчиков
    APP->>YM: GET /management/v1/counters
    YM-->>APP: [{id: "123", name: "Мой сайт", site: "example.com"}, ...]
    APP->>DB: UPSERT YandexMetrikaCounter[]
    APP-->>U: Показать список счётчиков
```

### Привязка счётчика к каналу + автосоздание целей

```mermaid
sequenceDiagram
    participant U as 👤 Пользователь
    participant APP as Nuxt App
    participant YM as Яндекс Метрика API
    participant DB as PostgreSQL

    U->>APP: Привязать счётчик "12345" к каналу "Мой канал"
    APP->>DB: INSERT ChannelCounter

    loop Для каждой из 5 зарезервированных целей
        APP->>YM: POST /management/v1/counter/12345/goals
        Note right of YM: {name: "ОП: Подписка на канал",<br/>type: "action", conditions: [{type: "exact", url: "op_subscribe"}]}
        YM-->>APP: {id: 67890}
        APP->>DB: INSERT ChannelGoalConfig {goalKey, yandexGoalId: "67890", isEnabled: true}
    end

    APP-->>U: ✅ Счётчик привязан, 5 целей создано!
```

### Зарезервированные JS-цели

| GoalKey | Название по умолчанию | Когда срабатывает | JS-событие |
|---------|----------------------|-------------------|------------|
| `op_visit` | ОП: Посещение лендинга | JS-скрипт загрузился на лендинге | `ym(ID, 'reachGoal', 'op_visit')` |
| `op_click` | ОП: Клик по подписке | Клик по кнопке `[data-op-subscribe]` | `ym(ID, 'reachGoal', 'op_click')` |
| `op_subscribe` | ОП: Подписка | Бот зафиксировал подписку | Server-side через API Метрики |
| `op_unsubscribe` | ОП: Отписка | Бот зафиксировал отписку | Server-side через API Метрики |
| `op_resubscribe` | ОП: Повторная подписка | Повторная подписка после отписки | Server-side через API Метрики |

**Важно:** `op_visit` и `op_click` отправляются из JS-скрипта на стороне клиента (через `ym()` — стандартный скрипт Метрики). `op_subscribe`, `op_unsubscribe`, `op_resubscribe` отправляются **server-side** через [Яндекс Метрика API Offline Conversions](https://yandex.ru/dev/metrika/doc/api2/practice/offline-conv.html) — привязка по `yclid` или `ClientID`.

### Настройка целей в UI канала

```
┌──────────────────────────────────────────────────────────┐
│ Канал: Мой крутой канал  →  Счётчик: 12345 (example.com)│
├──────────────────────────────────────────────────────────┤
│ Цель                    │ Название в Метрике │  Вкл/Выкл │
│─────────────────────────┼────────────────────┼───────────│
│ 📊 Посещение лендинга   │ [ОП: Посещение   ] │  [✅]     │
│ 👆 Клик по подписке     │ [ОП: Клик        ] │  [✅]     │
│ ✅ Подписка             │ [Подписка основн.] │  [✅]     │
│ ❌ Отписка              │ [ОП: Отписка     ] │  [⬜]     │
│ 🔄 Повторная подписка   │ [ОП: Повтор      ] │  [⬜]     │
└──────────────────────────────────────────────────────────┘
  [Сохранить изменения]
```

При сохранении — система обновляет названия целей в Метрике через `PUT /management/v1/counter/{id}/goal/{goalId}`.

### Автообновление токена

```typescript
// utils/yandex-metrika.ts
async function ensureValidToken(account: YandexMetrikaAccount): Promise<string> {
  if (account.tokenExpiresAt && account.tokenExpiresAt > new Date()) {
    return decrypt(account.accessToken!);
  }
  // Токен истёк — обновляем
  const response = await fetch('https://oauth.yandex.ru/token', {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: decrypt(account.refreshToken!),
      client_id: account.clientId,
      client_secret: decrypt(account.clientSecret),
    }),
  });
  const { access_token, refresh_token, expires_in } = await response.json();
  await prisma.yandexMetrikaAccount.update({
    where: { id: account.id },
    data: {
      accessToken: encrypt(access_token),
      refreshToken: encrypt(refresh_token),
      tokenExpiresAt: new Date(Date.now() + expires_in * 1000),
    },
  });
  return access_token;
}
```

---

## Схема базы данных (Prisma)

# Схема базы данных: «Откуда подписчик»

## 1. ER-диаграмма

```mermaid
erDiagram
    Settings ||--|| Settings : singleton
    Bot ||--o{ Channel : has
    Channel ||--o{ InviteLink : has
    Channel ||--o{ Subscriber : has
    Channel ||--o{ Visit : has
    Channel ||--o{ PublicReport : has
    InviteLink ||--o{ Subscriber : brought
    Visit |o--o| InviteLink : created
    Visit |o--o| Subscriber : converted
    Subscriber ||--o{ SubscriptionEvent : has
    Visit ||--o{ Conversion : sent
    Subscriber ||--o{ Conversion : for
    Integration ||--o{ Conversion : via
```

---

## 2. Prisma Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// Настройки системы (singleton, id всегда = 1)
// ============================================

model Settings {
  id                      Int      @id @default(1)
  adminPasswordHash       String?  // null = первый запуск, показать Setup Wizard
  sessionSecret           String   @default(uuid())
  timezone                String   @default("Europe/Moscow")
  maxCorrelationWindowSec Int      @default(60)   // Окно корреляции для MAX
  internalApiSecret       String   @default(uuid()) // Секрет для bot ↔ app
  setupCompleted          Boolean  @default(false)
  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt
}

// ============================================
// Боты (Telegram / MAX)
// ============================================

model Bot {
  id          Int       @id @default(autoincrement())
  platform    Platform
  token       String    // Зашифрован AES-256 в runtime
  botUsername String?   // @username бота
  botName     String?   // Отображаемое имя
  isActive    Boolean   @default(true)
  channels    Channel[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@unique([platform, token])
}

// ============================================
// Каналы
// ============================================

model Channel {
  id              Int            @id @default(autoincrement())
  bot             Bot            @relation(fields: [botId], references: [id])
  botId           Int
  platform        Platform
  platformChatId  String         // Telegram chat_id или MAX channel_id
  title           String
  username        String?        // @username канала
  isPrivate       Boolean        @default(true)
  subscriberCount Int            @default(0)  // Кешированный счётчик
  linkTtlHours    Int            @default(24) // TTL автоссылок в часах
  isActive        Boolean        @default(true)
  inviteLinks     InviteLink[]
  subscribers     Subscriber[]
  visits          Visit[]
  publicReports   PublicReport[]
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  @@unique([platform, platformChatId])
}

// ============================================
// Invite-ссылки
// ============================================

model InviteLink {
  id           Int         @id @default(autoincrement())
  channel      Channel     @relation(fields: [channelId], references: [id], onDelete: Cascade)
  channelId    Int
  visit        Visit?      @relation("VisitInviteLink", fields: [visitId], references: [id])
  visitId      Int?        @unique  // null для ручных ссылок

  url          String      // https://t.me/+xxx или MAX-ссылка
  name         String?     // Название — только для ручных ссылок
  type         LinkType    @default(auto)

  // UTM-метки (дублируются из visit для ручных ссылок)
  utmSource    String?
  utmMedium    String?
  utmCampaign  String?
  utmContent   String?
  utmTerm      String?

  // Затраты — только для ручных ссылок
  costAmount   Float?      // Сумма затрат
  costCurrency String?     // "EUR" | "TON" | "RUB" | "USD"

  // Счётчики
  clickCount   Int         @default(0)
  joinCount    Int         @default(0)

  isRevoked    Boolean     @default(false)
  expiresAt    DateTime?   // null = бессрочная (для ручных)

  subscribers  Subscriber[]
  createdAt    DateTime    @default(now())

  @@index([channelId, isRevoked])
  @@index([expiresAt])
  @@index([type])
}

// ============================================
// Визиты (с лендинга)
// ============================================

model Visit {
  id          Int          @id @default(autoincrement())
  sessionId   String       @unique @default(uuid()) // Для связи JS → API

  channel     Channel?     @relation(fields: [channelId], references: [id])
  channelId   Int?
  platform    Platform     @default(telegram)

  // UTM-метки
  utmSource   String?
  utmMedium   String?
  utmCampaign String?
  utmContent  String?
  utmTerm     String?

  // Рекламные идентификаторы
  yclid       String?      // Яндекс Click ID
  gclid       String?      // Google Click ID

  // Данные визита
  referrer    String?
  pageUrl     String?
  fingerprint String?      // Для корреляции MAX
  ipHash      String?      // SHA-256 от IP (для корреляции MAX)

  // Связи
  inviteLink  InviteLink?  @relation("VisitInviteLink")
  subscriber  Subscriber?  @relation("VisitSubscriber")
  conversions Conversion[]

  createdAt   DateTime     @default(now())

  @@index([platform, createdAt])
  @@index([fingerprint, createdAt])  // Корреляция MAX
  @@index([ipHash, createdAt])       // Корреляция MAX
  @@index([yclid])                   // Отправка конверсий YM
  @@index([gclid])                   // Отправка конверсий GA
  @@index([channelId, createdAt])
}

// ============================================
// Подписчики
// ============================================

model Subscriber {
  id                    Int                 @id @default(autoincrement())
  channel               Channel             @relation(fields: [channelId], references: [id], onDelete: Cascade)
  channelId             Int
  inviteLink            InviteLink?         @relation(fields: [inviteLinkId], references: [id])
  inviteLinkId          Int?
  visit                 Visit?              @relation("VisitSubscriber", fields: [visitId], references: [id])
  visitId               Int?                @unique

  // Данные пользователя
  platform              Platform
  platformUserId        String              // Telegram user_id или MAX user_id
  firstName             String?
  lastName              String?
  username              String?

  // Атрибуция
  attributionConfidence Float               @default(1.0)  // 1.0 = точно, 0.7 = корреляция

  // Статус
  status                SubscriberStatus    @default(active)
  subscribedAt          DateTime            @default(now())
  leftAt                DateTime?

  // Связи
  events                SubscriptionEvent[]
  conversions           Conversion[]

  createdAt             DateTime            @default(now())
  updatedAt             DateTime            @updatedAt

  @@unique([channelId, platform, platformUserId])
  @@index([channelId, status])
  @@index([subscribedAt])
  @@index([inviteLinkId])
  @@index([platform, platformUserId])
}

// ============================================
// События подписки (immutable log)
// ============================================

model SubscriptionEvent {
  id           Int        @id @default(autoincrement())
  subscriber   Subscriber @relation(fields: [subscriberId], references: [id], onDelete: Cascade)
  subscriberId Int
  eventType    EventType
  rawData      Json?      // Сырые данные от API (для отладки)
  createdAt    DateTime   @default(now())

  @@index([subscriberId, createdAt])
  @@index([eventType, createdAt])
}

// ============================================
// Публичные отчёты
// ============================================

model PublicReport {
  id                  Int      @id @default(autoincrement())
  channel             Channel  @relation(fields: [channelId], references: [id], onDelete: Cascade)
  channelId           Int
  token               String   @unique @default(uuid()) // URL-токен
  passwordHash        String?  // null = без пароля
  name                String   // "Отчёт для клиента X"

  // Настройки видимости
  showSubscriberNames Boolean  @default(false)
  showUtmDetails      Boolean  @default(true)
  showCosts           Boolean  @default(true)

  isActive            Boolean  @default(true)
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
}

// ============================================
// Интеграции (YM, GA)
// ============================================

model Integration {
  id          Int              @id @default(autoincrement())
  type        IntegrationType

  // JSON-конфиг:
  // YM: { counterId: "12345", goalId: "subscribe" }
  // GA: { measurementId: "G-XXX", apiSecret: "xxx" }
  config      Json

  isActive    Boolean          @default(true)
  lastSyncAt  DateTime?
  conversions Conversion[]
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt

  @@unique([type])  // Одна интеграция на тип
}

// ============================================
// Конверсии (отправленные в YM/GA)
// ============================================

model Conversion {
  id            Int              @id @default(autoincrement())
  visit         Visit            @relation(fields: [visitId], references: [id])
  visitId       Int
  subscriber    Subscriber       @relation(fields: [subscriberId], references: [id])
  subscriberId  Int
  integration   Integration      @relation(fields: [integrationId], references: [id])
  integrationId Int
  status        ConversionStatus @default(pending)
  errorMessage  String?
  sentAt        DateTime?
  retryCount    Int              @default(0)
  createdAt     DateTime         @default(now())

  @@index([status])
  @@index([integrationId, status])
  @@index([createdAt])
}

// ============================================
// Enums
// ============================================

enum Platform {
  telegram
  max
}

enum LinkType {
  auto     // Автоматически созданная для визита
  manual   // Вручную через UI
}

enum SubscriberStatus {
  active
  left
  kicked
  banned
}

enum EventType {
  joined
  left
  kicked
  banned
}

enum IntegrationType {
  yandex_metrika
  google_analytics
}

enum ConversionStatus {
  pending
  sent
  failed
}
```

---

## 3. Ключевые индексы и их назначение

| Индекс | Таблица | Назначение |
|--------|---------|-----------|
| `(fingerprint, createdAt)` | Visit | Корреляция MAX: поиск визита в окне ±60 сек |
| `(ipHash, createdAt)` | Visit | Резервная корреляция MAX по IP |
| `(yclid)` | Visit | Быстрый поиск для отправки конверсий в Яндекс |
| `(gclid)` | Visit | Быстрый поиск для отправки конверсий в Google |
| `(channelId, status)` | Subscriber | Подсчёт активных подписчиков канала |
| `(channelId, isRevoked)` | InviteLink | Список активных ссылок канала |
| `(expiresAt)` | InviteLink | Cron-очистка устаревших ссылок по TTL |
| `(status)` | Conversion | Retry неотправленных конверсий |
| `(eventType, createdAt)` | SubscriptionEvent | Лента событий на дашборде |

---

## 4. Автоматические миграции при старте

```bash
#!/bin/sh
# docker-entrypoint.sh (для bot-контейнера)

echo "⏳ Waiting for PostgreSQL..."
until pg_isready -h postgres -p 5432 -U op; do
  sleep 1
done

echo "🔄 Running migrations..."
npx prisma migrate deploy

echo "🌱 Seeding defaults..."
npx prisma db seed || true

echo "🚀 Starting bot..."
node dist/index.js
```

Seed-скрипт создаёт запись `Settings` с `id=1` если её нет.

---

## 5. Примеры запросов

### Топ источников трафика по каналу
```sql
SELECT 
  v.utm_source,
  v.utm_medium,
  v.utm_campaign,
  COUNT(DISTINCT v.id) as visits,
  COUNT(DISTINCT s.id) as subscribers,
  ROUND(COUNT(DISTINCT s.id)::numeric / NULLIF(COUNT(DISTINCT v.id), 0) * 100, 1) as conversion_pct
FROM "Visit" v
LEFT JOIN "Subscriber" s ON s.visit_id = v.id
WHERE v.channel_id = $1
  AND v.created_at >= $2
GROUP BY v.utm_source, v.utm_medium, v.utm_campaign
ORDER BY subscribers DESC;
```

### Стоимость подписчика по ручным ссылкам
```sql
SELECT 
  il.name,
  il.cost_amount,
  il.cost_currency,
  il.join_count,
  CASE WHEN il.join_count > 0 
    THEN ROUND(il.cost_amount / il.join_count, 2)
    ELSE NULL 
  END as cost_per_subscriber
FROM "InviteLink" il
WHERE il.channel_id = $1 
  AND il.type = 'manual'
  AND il.cost_amount IS NOT NULL
ORDER BY il.created_at DESC;
```

### Корреляция MAX (поиск визита по временному окну)
```sql
SELECT id, fingerprint, ip_hash, utm_source, utm_medium, utm_campaign
FROM "Visit"
WHERE platform = 'max'
  AND channel_id = $1
  AND created_at BETWEEN ($2 - interval '60 seconds') AND ($2 + interval '60 seconds')
  AND subscriber_id IS NULL
ORDER BY ABS(EXTRACT(EPOCH FROM (created_at - $2)))
LIMIT 1;
```

---

## 6. Объём данных (оценка)

| Сущность | На 10 каналов / год | Размер строки | Итого |
|----------|---------------------|---------------|-------|
| Visits | ~500K | ~300 bytes | ~150 MB |
| Subscribers | ~100K | ~200 bytes | ~20 MB |
| InviteLinks | ~500K | ~250 bytes | ~125 MB |
| Events | ~200K | ~150 bytes | ~30 MB |
| Conversions | ~100K | ~100 bytes | ~10 MB |
| **Итого** | | | **~335 MB** |

Вывод: даже на минимальном VPS (10 GB SSD) данных хватит на годы работы.

## // ============================================
// Интеграции (YM, GA)
// ============================================
// ============================================
// Яндекс Метрика — OAuth + Счётчики + Цели
// ============================================

model YandexMetrikaAccount {
  id            Int       @id @default(autoincrement())
  clientId      String    // OAuth App client_id
  clientSecret  String    // OAuth App client_secret (зашифрован)
  accessToken   String?   // OAuth access_token (зашифрован)
  refreshToken  String?   // OAuth refresh_token (зашифрован)
  tokenExpiresAt DateTime? // Когда истекает access_token
  yaLogin       String?   // Логин Яндекса (для отображения)
  isConnected   Boolean   @default(false)
  counters      YandexMetrikaCounter[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model YandexMetrikaCounter {
  id              Int       @id @default(autoincrement())
  account         YandexMetrikaAccount @relation(fields: [accountId], references: [id], onDelete: Cascade)
  accountId       Int
  yandexCounterId String    // ID счётчика в Метрике (например "12345678")
  counterName     String    // Название счётчика из Метрики
  counterSite     String?   // Сайт, привязанный к счётчику
  channels        ChannelCounter[]
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@unique([accountId, yandexCounterId])
}

model ChannelCounter {
  id          Int       @id @default(autoincrement())
  channel     Channel   @relation(fields: [channelId], references: [id], onDelete: Cascade)
  channelId   Int
  counter     YandexMetrikaCounter @relation(fields: [counterId], references: [id], onDelete: Cascade)
  counterId   Int
  goals       ChannelGoalConfig[]
  createdAt   DateTime  @default(now())

  @@unique([channelId, counterId])
}

// Зарезервированные типы целей (системные)
enum GoalKey {
  op_visit        // Посещение лендинга
  op_click        // Клик по кнопке подписки
  op_subscribe    // Подписка на канал
  op_unsubscribe  // Отписка от канала
  op_resubscribe  // Повторная подписка
}

model ChannelGoalConfig {
  id                Int            @id @default(autoincrement())
  channelCounter    ChannelCounter @relation(fields: [channelCounterId], references: [id], onDelete: Cascade)
  channelCounterId  Int
  goalKey           GoalKey        // Системный тип цели
  customName        String?        // Кастомное название (null = название по умолчанию)
  isEnabled         Boolean        @default(true) // Вкл/выкл для этого канала
  yandexGoalId      String?        // ID цели в Метрике (заполняется после авто-создания)
  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt

  @@unique([channelCounterId, goalKey])
}

// ============================================
// Интеграции (GA и общие)
// ============================================

model Integration {
  id          Int              @id @default(autoincrement())
  type        IntegrationType

  // JSON-конфиг:
  // GA: { measurementId: "G-XXX", apiSecret: "xxx" }
  config      Json

  isActive    Boolean          @default(true)
  lastSyncAt  DateTime?
  conversions Conversion[]
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt

  @@unique([type])
}

## // ============================================
// Каналы
// ============================================
// ============================================
// Каналы
// ============================================

model Channel {
  id              Int            @id @default(autoincrement())
  bot             Bot            @relation(fields: [botId], references: [id])
  botId           Int
  platform        Platform
  platformChatId  String         // Telegram chat_id или MAX channel_id
  title           String
  username        String?        // @username канала
  isPrivate       Boolean        @default(true)
  subscriberCount Int            @default(0)  // Кешированный счётчик
  linkTtlHours    Int            @default(24) // TTL автоссылок в часах
  isActive        Boolean        @default(true)
  inviteLinks     InviteLink[]
  subscribers     Subscriber[]
  visits          Visit[]
  publicReports   PublicReport[]
  channelCounters ChannelCounter[]  // Привязанные счётчики Метрики
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  @@unique([platform, platformChatId])
}

---

## Файловая структура проекта

# 📁 Файловая структура: «Откуда подписчик»

## Монорепозиторий

```
otkuda-podpischik/
├── README.md                        # Описание, установка, скриншоты
├── LICENSE                          # MIT
├── docker-compose.yml               # Оркестрация 3 контейнеров
├── docker-compose.dev.yml           # Overrides для разработки
├── .env.example                     # Шаблон переменных (только DATABASE_URL)
├── .gitignore
│
├── apps/
│   ├── web/                         # === Nuxt 3 приложение ===
│   │   ├── Dockerfile               # Multi-stage build
│   │   ├── nuxt.config.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── app.config.ts            # Nuxt UI тема
│   │   │
│   │   ├── assets/
│   │   │   └── css/
│   │   │       └── main.css         # Tailwind + кастомные стили
│   │   │
│   │   ├── components/
│   │   │   ├── app/
│   │   │   │   ├── AppHeader.vue        # Хедер с навигацией
│   │   │   │   ├── AppSidebar.vue       # Боковое меню
│   │   │   │   └── AppFooter.vue
│   │   │   │
│   │   │   ├── dashboard/
│   │   │   │   ├── StatsCard.vue        # Карточка метрики
│   │   │   │   ├── SubscriptionChart.vue # График подписок/отписок
│   │   │   │   ├── TopSources.vue       # Топ-3 источника
│   │   │   │   └── EventFeed.vue        # Лента событий
│   │   │   │
│   │   │   ├── channels/
│   │   │   │   ├── ChannelCard.vue      # Карточка канала
│   │   │   │   ├── ChannelList.vue      # Список каналов
│   │   │   │   └── AddChannelModal.vue  # Модалка добавления
│   │   │   │
│   │   │   ├── links/
│   │   │   │   ├── LinkTable.vue        # Таблица ссылок
│   │   │   │   ├── CreateLinkModal.vue  # Создание ручной ссылки
│   │   │   │   └── LinkCostForm.vue     # Ввод затрат EUR/TON
│   │   │   │
│   │   │   ├── subscribers/
│   │   │   │   ├── SubscriberTable.vue  # Таблица подписчиков
│   │   │   │   ├── SubscriberDetail.vue # Детали подписчика
│   │   │   │   └── SubscriberFilters.vue
│   │   │   │
│   │   │   ├── sources/
│   │   │   │   ├── SourcesTable.vue     # UTM source → medium → campaign
│   │   │   │   ├── SourcesChart.vue     # Сравнение на графике
│   │   │   │   └── SourcesFilter.vue
│   │   │   │
│   │   │   ├── integrations/
│   │   │   │   ├── YandexMetrikaForm.vue
│   │   │   │   ├── GoogleAnalyticsForm.vue
│   │   │   │   └── IntegrationStatus.vue
│   │   │   │
│   │   │   ├── reports/
│   │   │   │   ├── PublicReportView.vue  # Публичный отчёт (readonly)
│   │   │   │   ├── CreateReportModal.vue
│   │   │   │   └── ReportSettings.vue
│   │   │   │
│   │   │   ├── setup/
│   │   │   │   ├── SetupWizard.vue      # Мастер настройки
│   │   │   │   ├── StepPassword.vue     # Шаг 1: пароль
│   │   │   │   ├── StepBot.vue          # Шаг 2: токен бота
│   │   │   │   ├── StepChannel.vue      # Шаг 3: добавить канал
│   │   │   │   └── StepComplete.vue     # Шаг 4: готово!
│   │   │   │
│   │   │   ├── script/
│   │   │   │   ├── ScriptGenerator.vue  # Генератор JS-сниппета
│   │   │   │   └── ScriptTester.vue     # Тест работоспособности
│   │   │   │
│   │   │   └── shared/
│   │   │       ├── DateRangePicker.vue
│   │   │       ├── ExportButton.vue     # CSV экспорт
│   │   │       ├── PlatformBadge.vue    # Telegram / MAX бейдж
│   │   │       ├── ConfidenceBadge.vue  # Точность атрибуции
│   │   │       └── EmptyState.vue
│   │   │
│   │   ├── composables/
│   │   │   ├── useAuth.ts               # Аутентификация
│   │   │   ├── useChannels.ts           # CRUD каналов
│   │   │   ├── useSubscribers.ts        # Работа с подписчиками
│   │   │   ├── useSources.ts            # Источники трафика
│   │   │   ├── useLinks.ts              # Invite-ссылки
│   │   │   ├── useStats.ts              # Статистика / графики
│   │   │   ├── useSetup.ts              # Мастер настройки
│   │   │   └── useExport.ts             # Экспорт CSV
│   │   │
│   │   ├── layouts/
│   │   │   ├── default.vue              # Основной layout (sidebar)
│   │   │   ├── auth.vue                 # Логин
│   │   │   ├── setup.vue                # Мастер настройки
│   │   │   └── report.vue               # Публичный отчёт (без sidebar)
│   │   │
│   │   ├── pages/
│   │   │   ├── index.vue                # Главная / Обзор
│   │   │   ├── login.vue                # Вход по паролю
│   │   │   ├── setup.vue                # Мастер настройки
│   │   │   ├── channels/
│   │   │   │   ├── index.vue            # Список каналов
│   │   │   │   └── [id]/
│   │   │   │       ├── index.vue        # Обзор канала
│   │   │   │       ├── links.vue        # Ссылки канала
│   │   │   │       ├── subscribers.vue  # Подписчики канала
│   │   │   │       └── report.vue       # Настройка публичного отчёта
│   │   │   ├── sources.vue              # Источники трафика
│   │   │   ├── integrations.vue         # Яндекс Метрика / GA
│   │   │   ├── script.vue               # JS-скрипт для сайта
│   │   │   ├── settings.vue             # Настройки
│   │   │   └── r/
│   │   │       └── [token].vue          # Публичный отчёт по токену
│   │   │
│   │   ├── middleware/
│   │   │   ├── auth.ts                  # Проверка аутентификации
│   │   │   └── setup.ts                 # Редирект на мастер если не настроено
│   │   │
│   │   ├── server/
│   │   │   ├── api/
│   │   │   │   ├── auth/
│   │   │   │   │   ├── login.post.ts
│   │   │   │   │   ├── logout.post.ts
│   │   │   │   │   └── session.get.ts
│   │   │   │   │
│   │   │   │   ├── setup/
│   │   │   │   │   ├── status.get.ts        # Проверка: настроен ли?
│   │   │   │   │   ├── password.post.ts     # Шаг 1
│   │   │   │   │   ├── bot.post.ts          # Шаг 2: сохранить токен
│   │   │   │   │   ├── bot.validate.post.ts # Валидация токена
│   │   │   │   │   ├── channel.post.ts      # Шаг 3
│   │   │   │   │   └── complete.post.ts     # Финализация
│   │   │   │   │
│   │   │   │   ├── channels/
│   │   │   │   │   ├── index.get.ts         # Список каналов
│   │   │   │   │   ├── index.post.ts        # Добавить канал
│   │   │   │   │   ├── [id]/
│   │   │   │   │   │   ├── index.get.ts
│   │   │   │   │   │   ├── index.patch.ts
│   │   │   │   │   │   ├── index.delete.ts
│   │   │   │   │   │   ├── stats.get.ts
│   │   │   │   │   │   ├── links.get.ts
│   │   │   │   │   │   └── subscribers.get.ts
│   │   │   │   │
│   │   │   │   ├── links/
│   │   │   │   │   ├── index.post.ts        # Создать ручную ссылку
│   │   │   │   │   ├── [id].patch.ts        # Обновить затраты
│   │   │   │   │   └── [id].delete.ts       # Отозвать ссылку
│   │   │   │   │
│   │   │   │   ├── subscribers/
│   │   │   │   │   ├── index.get.ts         # Список (пагинация, фильтры)
│   │   │   │   │   └── [id].get.ts          # Детали подписчика
│   │   │   │   │
│   │   │   │   ├── sources/
│   │   │   │   │   └── index.get.ts         # Аналитика по UTM
│   │   │   │   │
│   │   │   │   ├── stats/
│   │   │   │   │   ├── overview.get.ts      # Сводка для дашборда
│   │   │   │   │   ├── chart.get.ts         # Данные для графиков
│   │   │   │   │   └── export.get.ts        # CSV экспорт
│   │   │   │   │
│   │   │   │   ├── track/
│   │   │   │   │   └── index.post.ts        # Приём данных от JS-скрипта
│   │   │   │   │
│   │   │   │   ├── integrations/
│   │   │   │   │   ├── index.get.ts
│   │   │   │   │   ├── index.post.ts
│   │   │   │   │   ├── [id].patch.ts
│   │   │   │   │   └── [id].delete.ts
│   │   │   │   │
│   │   │   │   ├── reports/
│   │   │   │   │   ├── index.get.ts         # Список отчётов
│   │   │   │   │   ├── index.post.ts        # Создать отчёт
│   │   │   │   │   ├── [token].get.ts       # Публичный доступ
│   │   │   │   │   └── [token].auth.post.ts # Проверка пароля
│   │   │   │   │
│   │   │   │   ├── settings/
│   │   │   │   │   ├── index.get.ts
│   │   │   │   │   └── index.patch.ts
│   │   │   │   │
│   │   │   │   └── internal/               # Внутренний API (bot → app)
│   │   │   │       ├── link/
│   │   │   │       │   └── create.post.ts
│   │   │   │       ├── subscriber/
│   │   │   │       │   └── notify.post.ts
│   │   │   │       └── conversion/
│   │   │   │           └── send.post.ts
│   │   │   │
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts              # Проверка сессии
│   │   │   │   └── internal.ts          # Проверка internal API secret
│   │   │   │
│   │   │   └── utils/
│   │   │       ├── prisma.ts            # Prisma client singleton
│   │   │       ├── session.ts           # Cookie session helpers
│   │   │       └── validators.ts        # Zod-схемы валидации
│   │   │
│   │   ├── public/
│   │   │   ├── favicon.ico
│   │   │   ├── og-image.png
│   │   │   └── tracker.js              # Минифицированный JS-скрипт
│   │   │
│   │   └── utils/
│   │       ├── format.ts               # Форматирование дат, чисел
│   │       └── constants.ts            # Константы
│   │
│   └── bot/                            # === Telegram/MAX бот ===
│       ├── Dockerfile
│       ├── package.json
│       ├── tsconfig.json
│       ├── docker-entrypoint.sh        # Ждёт postgres → миграции → запуск
│       │
│       ├── src/
│       │   ├── index.ts                # Точка входа: загрузка конфига → запуск
│       │   │
│       │   ├── config/
│       │   │   └── index.ts            # Загрузка настроек из БД
│       │   │
│       │   ├── telegram/
│       │   │   ├── bot.ts              # grammY: создание и запуск бота
│       │   │   ├── handlers/
│       │   │   │   ├── memberUpdate.ts # ChatMemberUpdated → подписка/отписка
│       │   │   │   └── commands.ts     # /start, /help
│       │   │   └── services/
│       │   │       ├── linkService.ts  # Создание/отзыв invite-ссылок
│       │   │       └── channelService.ts # Управление каналами
│       │   │
│       │   ├── max/
│       │   │   ├── client.ts           # REST-клиент platform-api.max.ru
│       │   │   ├── poller.ts           # Long polling /updates
│       │   │   └── handlers/
│       │   │       └── memberUpdate.ts # user_added / user_removed
│       │   │
│       │   ├── attribution/
│       │   │   ├── correlator.ts       # Связывание визит → подписка
│       │   │   ├── telegramMatcher.ts  # Точное: по invite_link
│       │   │   └── maxMatcher.ts       # Вероятностное: по времени ±60с
│       │   │
│       │   ├── integrations/
│       │   │   ├── yandexMetrika.ts    # Отправка конверсий в ЯМ
│       │   │   └── googleAnalytics.ts  # Отправка конверсий в GA
│       │   │
│       │   ├── jobs/
│       │   │   ├── linkCleanup.ts      # Cron: удаление устаревших ссылок
│       │   │   ├── statsSync.ts        # Cron: синхронизация счётчиков
│       │   │   └── conversionRetry.ts  # Cron: повтор неотправленных конверсий
│       │   │
│       │   ├── api/
│       │   │   └── internal.ts         # HTTP-сервер :3001 для внутренних вызовов
│       │   │
│       │   └── utils/
│       │       ├── logger.ts           # Pino logger
│       │       ├── prisma.ts           # Prisma client
│       │       └── retry.ts            # Retry-логика для API
│       │
│       └── prisma/                     # Общая Prisma-схема (symlink)
│
├── packages/
│   └── shared/                         # === Общий код ===
│       ├── package.json
│       ├── src/
│       │   ├── types.ts               # Общие TypeScript типы
│       │   ├── constants.ts           # Platform enum, статусы
│       │   └── validation.ts          # Zod-схемы (переиспользуются)
│       └── tsconfig.json
│
├── prisma/
│   ├── schema.prisma                  # Единая схема БД
│   ├── migrations/                    # Миграции (автогенерация)
│   └── seed.ts                        # Сид: дефолтные настройки
│
├── scripts/
│   ├── install.sh                     # Установка в одну команду
│   ├── backup.sh                      # Бэкап PostgreSQL
│   └── update.sh                      # Обновление до новой версии
│
├── docs/
│   ├── setup-guide.md                 # Руководство по установке
│   ├── development.md                 # Для контрибьюторов
│   ├── api.md                         # Документация API
│   └── architecture.md                # Архитектурные решения (ADR)
│
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                     # Lint + type-check + tests
│   │   └── release.yml                # Build Docker images → GHCR
│   └── ISSUE_TEMPLATE/
│       ├── bug_report.md
│       └── feature_request.md
│
├── turbo.json                         # Turborepo конфиг (монорепо)
└── package.json                       # Root: workspaces
```

## Ключевые принципы структуры

| Принцип | Реализация |
|---------|-----------|
| **Монорепозиторий** | Turborepo: `apps/web` + `apps/bot` + `packages/shared` |
| **Единая БД-схема** | `prisma/` в корне, оба приложения используют |
| **Типобезопасность** | `packages/shared` — общие типы и валидация |
| **Docker-first** | Каждое приложение имеет свой Dockerfile |
| **Nuxt conventions** | Файловая маршрутизация, auto-imports, server routes |

## Соглашения именования

| Что | Формат | Пример |
|-----|--------|--------|
| Компоненты | PascalCase | `StatsCard.vue` |
| Composables | camelCase с use | `useChannels.ts` |
| API routes | kebab-case + HTTP method | `index.get.ts` |
| Prisma модели | PascalCase singular | `Subscriber` |
| Переменные окружения | SCREAMING_SNAKE | `DATABASE_URL` |



---

# 📋 ПЛАН ЗАДАЧ (Task DAG)

## Сводка

| Метрика | Значение |
|---------|----------|
| Всего задач | 24 |
| Must-have | 19 задач (~148 часов) |
| Should-have | 5 задач (~40 часов) |
| **Итого** | **~188 часов** |
| Фаз | 7 (0–6) |

---

## DAG зависимостей

```mermaid
graph TD
    INIT1[INIT-1<br/>Монорепо<br/>4ч] --> INIT2[INIT-2<br/>Docker<br/>6ч]
    INIT1 --> INIT3[INIT-3<br/>Prisma<br/>6ч]
    INIT3 --> INIT4[INIT-4<br/>Shared<br/>3ч]

    INIT4 --> WEB1[WEB-1<br/>Nuxt каркас<br/>5ч]
    INIT4 --> BOT1[BOT-1<br/>TG бот<br/>10ч]

    WEB1 --> API1[API-1<br/>Nitro API<br/>8ч]
    WEB1 --> WEB3[WEB-3<br/>Авторизация<br/>5ч]
    API1 --> WEB2[WEB-2<br/>Setup Wizard<br/>10ч]
    API1 --> TRACK1[TRACK-1<br/>JS-скрипт<br/>8ч]

    WEB3 --> WEB2
    BOT1 --> BOT2[BOT-2<br/>Link Manager<br/>8ч]
    BOT1 --> BOT3[BOT-3<br/>Internal API<br/>5ч]
    BOT3 --> TRACK1

    BOT1 --> TRACK2[TRACK-2<br/>Correlator<br/>10ч]
    TRACK1 --> TRACK2

    WEB3 --> WEB4[WEB-4<br/>Дашборд<br/>8ч]
    TRACK2 --> WEB4
    WEB3 --> WEB5[WEB-5<br/>Каналы<br/>6ч]
    WEB3 --> WEB6[WEB-6<br/>Подписчики<br/>8ч]
    TRACK2 --> WEB6
    WEB3 --> WEB7[WEB-7<br/>Источники<br/>10ч]
    TRACK2 --> WEB7
    WEB3 --> WEB8[WEB-8<br/>Ссылки<br/>8ч]
    BOT2 --> WEB8

    BOT1 --> MAX1[MAX-1<br/>MAX Bot<br/>10ч]
    TRACK2 --> MAX1
    TRACK2 --> INT1[INT-1<br/>Я.Метрика<br/>8ч]
    TRACK2 --> INT2[INT-2<br/>GA<br/>6ч]

    WEB7 --> RPT1[RPT-1<br/>Публ. отчёты<br/>10ч]
    WEB3 --> WEB9[WEB-9<br/>Настройки<br/>5ч]
    TRACK1 --> WEB10[WEB-10<br/>Генератор JS<br/>4ч]
    WEB3 --> WEB10

    INIT2 --> DEPLOY1[DEPLOY-1<br/>Скрипты<br/>5ч]
    RPT1 --> DEPLOY2[DEPLOY-2<br/>README<br/>6ч]
    DEPLOY1 --> DEPLOY2

    TRACK2 --> TEST1[TEST-1<br/>Тесты<br/>12ч]
    BOT2 --> TEST1
    RPT1 --> TEST1
    TEST1 --> DEPLOY3[DEPLOY-3<br/>CI/CD<br/>4ч]

    style INIT1 fill:#4a9eff,color:#fff
    style INIT2 fill:#4a9eff,color:#fff
    style INIT3 fill:#4a9eff,color:#fff
    style INIT4 fill:#4a9eff,color:#fff
    style WEB1 fill:#10b981,color:#fff
    style WEB2 fill:#10b981,color:#fff
    style WEB3 fill:#10b981,color:#fff
    style API1 fill:#10b981,color:#fff
    style BOT1 fill:#f59e0b,color:#fff
    style BOT2 fill:#f59e0b,color:#fff
    style BOT3 fill:#f59e0b,color:#fff
    style TRACK1 fill:#f59e0b,color:#fff
    style TRACK2 fill:#f59e0b,color:#fff
    style WEB4 fill:#8b5cf6,color:#fff
    style WEB5 fill:#8b5cf6,color:#fff
    style WEB6 fill:#8b5cf6,color:#fff
    style WEB7 fill:#8b5cf6,color:#fff
    style WEB8 fill:#8b5cf6,color:#fff
    style MAX1 fill:#ec4899,color:#fff
    style INT1 fill:#ec4899,color:#fff
    style INT2 fill:#ec4899,color:#fff
    style RPT1 fill:#ef4444,color:#fff
    style WEB9 fill:#ef4444,color:#fff
    style WEB10 fill:#ef4444,color:#fff
    style DEPLOY1 fill:#6b7280,color:#fff
    style DEPLOY2 fill:#6b7280,color:#fff
    style DEPLOY3 fill:#6b7280,color:#fff
    style TEST1 fill:#6b7280,color:#fff
```

**Легенда:** 🔵 Инфраструктура | 🟢 Web-каркас | 🟡 Бот+трекинг | 🟣 Дашборд | 🩷 Интеграции | 🔴 Отчёты+финал | ⚫ Деплой

---

## Фаза 0: Инфраструктура (19 часов)

| ID | Задача | Часы | Сложность | Приоритет | Зависит от |
|----|--------|------|-----------|-----------|------------|
| INIT-1 | Инициализация монорепозитория (Turborepo + pnpm) | 4 | simple | **must** | — |
| INIT-2 | Docker Compose + Dockerfile'ы + автомиграции | 6 | medium | **must** | INIT-1 |
| INIT-3 | Prisma-схема + миграции + seed | 6 | medium | **must** | INIT-1 |
| INIT-4 | Shared-пакет: типы, утилиты, константы | 3 | simple | **must** | INIT-3 |

**Критерии приёмки:**
- ✅ `pnpm install` + `pnpm build` проходят без ошибок
- ✅ `docker compose up -d` поднимает 3 контейнера, healthcheck зелёный
- ✅ `prisma migrate deploy` создаёт все таблицы
- ✅ Общие типы импортируются в apps/web и apps/bot

---

## Фаза 1: Web-приложение — каркас (28 часов)

| ID | Задача | Часы | Сложность | Приоритет | Зависит от |
|----|--------|------|-----------|-----------|------------|
| WEB-1 | Nuxt 3 каркас + Nuxt UI + Layout'ы | 5 | simple | **must** | INIT-4 |
| API-1 | Nitro API: настройки, авторизация, setup | 8 | medium | **must** | INIT-4, WEB-1 |
| WEB-2 | Мастер первоначальной настройки (Setup Wizard) | 10 | complex | **must** | WEB-1, API-1 |
| WEB-3 | Авторизация (логин + сессии) | 5 | simple | **must** | WEB-1, API-1 |

**Критерии приёмки:**
- ✅ Два layout'а: dashboard (с сайдбаром) и public (отчёты)
- ✅ 4-шаговый wizard: пароль → TG-токен (валидация на лету) → канал → MAX (опц.)
- ✅ Если `setupCompleted=false` → редирект на wizard
- ✅ Логин по паролю, bcrypt, HTTP-only cookie, middleware защиты

---

## Фаза 2: Бот + трекинг (41 час)

| ID | Задача | Часы | Сложность | Приоритет | Зависит от |
|----|--------|------|-----------|-----------|------------|
| BOT-1 | Telegram-бот: grammY + ChatMemberUpdated | 10 | complex | **must** | INIT-4 |
| BOT-2 | Link Manager: создание/отзыв invite-ссылок + TTL | 8 | medium | **must** | BOT-1 |
| BOT-3 | Внутренний API бота (порт 3001) | 5 | simple | **must** | BOT-1 |
| TRACK-1 | JS-скрипт трекинга + POST /api/track | 8 | medium | **must** | API-1, BOT-3 |
| TRACK-2 | Correlator: связывание визит → подписка | 10 | complex | **must** | BOT-1, TRACK-1 |

**Критерии приёмки:**
- ✅ grammY long polling, обработка joined/left/kicked/banned
- ✅ `createChatInviteLink` с `member_limit=1`, автоотзыв по TTL
- ✅ Rate limiting 20 ссылок/мин на канал
- ✅ JS-скрипт <2KB, парсинг UTM/yclid/gclid, CORS для любого домена
- ✅ Точная атрибуция TG (invite_link), вероятностная MAX (fingerprint ±60с)

---

## Фаза 3: Дашборд (40 часов)

| ID | Задача | Часы | Сложность | Приоритет | Зависит от |
|----|--------|------|-----------|-----------|------------|
| WEB-4 | Главная: обзор, графики, топ источников | 8 | medium | **must** | WEB-3, TRACK-2 |
| WEB-5 | Раздел «Каналы»: список, добавление, удаление | 6 | simple | **must** | WEB-3 |
| WEB-6 | Раздел «Подписчики»: таблица, фильтры, экспорт | 8 | medium | **must** | WEB-3, TRACK-2 |
| WEB-7 | Раздел «Источники трафика»: UTM-аналитика | 10 | complex | **must** | WEB-3, TRACK-2 |
| WEB-8 | Раздел «Ссылки»: авто + ручные с затратами | 8 | medium | **must** | WEB-3, BOT-2 |

**Критерии приёмки:**
- ✅ Графики подписок/отписок за 7д/30д/90д
- ✅ Иерархия source → medium → campaign с drill-down
- ✅ Ручные ссылки с затратами EUR/TON, автоматический CPF
- ✅ Фильтры, поиск, пагинация, экспорт CSV

---

## Фаза 4: MAX + интеграции (24 часа) — should

| ID | Задача | Часы | Сложность | Приоритет | Зависит от |
|----|--------|------|-----------|-----------|------------|
| MAX-1 | MAX Bot: REST API клиент + обработка событий | 10 | complex | **should** | BOT-1, TRACK-2 |
| INT-1 | Интеграция Яндекс Метрика (Offline Conversions) | 8 | medium | **should** | TRACK-2 |
| INT-2 | Интеграция Google Analytics (Measurement Protocol) | 6 | medium | **should** | TRACK-2 |

**Критерии приёмки:**
- ✅ MAX long polling, user_added/user_removed, корреляция
- ✅ Отправка конверсий с yclid в Я.Метрику, retry при ошибках
- ✅ GA Measurement Protocol v2, события subscribe/unsubscribe

---

## Фаза 5: Отчёты и финализация (19 часов)

| ID | Задача | Часы | Сложность | Приоритет | Зависит от |
|----|--------|------|-----------|-----------|------------|
| RPT-1 | Публичные отчёты для клиентов | 10 | complex | **must** | WEB-7 |
| WEB-9 | Раздел «Настройки» | 5 | simple | **must** | WEB-3 |
| WEB-10 | Генератор JS-скрипта в UI + тест-проверка | 4 | simple | **must** | TRACK-1, WEB-3 |

**Критерии приёмки:**
- ✅ Публичная ссылка + пароль, настраиваемая видимость
- ✅ Read-only дашборд: подписки, источники, затраты
- ✅ Генератор скрипта с кнопкой «Скопировать» и тест-полем

---

## Фаза 6: Деплой и документация (27 часов)

| ID | Задача | Часы | Сложность | Приоритет | Зависит от |
|----|--------|------|-----------|-----------|------------|
| DEPLOY-1 | Install/Update/Backup скрипты | 5 | simple | **must** | INIT-2 |
| DEPLOY-2 | README + документация для GitHub | 6 | simple | **must** | DEPLOY-1, RPT-1 |
| TEST-1 | Тесты: unit + integration (Vitest) | 12 | complex | **should** | TRACK-2, BOT-2, RPT-1 |
| DEPLOY-3 | GitHub Actions CI/CD pipeline | 4 | simple | **should** | TEST-1 |

**Критерии приёмки:**
- ✅ `install.sh` — clone + docker compose up в одну команду
- ✅ `backup.sh` — pg_dump с красивым выводом
- ✅ README с описанием, скриншотами, быстрым стартом
- ✅ Unit-тесты correlator, UTM-парсинг, link manager (>80% покрытие)
- ✅ CI: lint + typecheck + test на push/PR

---

## Gantt-диаграмма (последовательная реализация)

```mermaid
gantt
    title План реализации «Откуда подписчик»
    dateFormat  YYYY-MM-DD
    axisFormat  %d.%m

    section Фаза 0: Инфраструктура
    INIT-1 Монорепо              :init1, 2026-03-19, 1d
    INIT-3 Prisma-схема          :init3, after init1, 1d
    INIT-2 Docker Compose        :init2, after init1, 1d
    INIT-4 Shared-пакет          :init4, after init3, 1d

    section Фаза 1: Web-каркас
    WEB-1 Nuxt каркас            :web1, after init4, 1d
    API-1 Nitro API              :api1, after web1, 2d
    WEB-3 Авторизация            :web3, after api1, 1d
    WEB-2 Setup Wizard           :web2, after web3, 2d

    section Фаза 2: Бот + трекинг
    BOT-1 TG бот                 :bot1, after init4, 2d
    BOT-3 Internal API           :bot3, after bot1, 1d
    BOT-2 Link Manager           :bot2, after bot1, 2d
    TRACK-1 JS-скрипт            :track1, after bot3, 2d
    TRACK-2 Correlator           :track2, after track1, 2d

    section Фаза 3: Дашборд
    WEB-4 Главная                :web4, after track2, 2d
    WEB-5 Каналы                 :web5, after web4, 1d
    WEB-6 Подписчики             :web6, after web5, 2d
    WEB-7 Источники              :web7, after web6, 2d
    WEB-8 Ссылки                 :web8, after web7, 2d

    section Фаза 4: Интеграции
    MAX-1 MAX Bot                :max1, after track2, 2d
    INT-1 Яндекс Метрика        :int1, after max1, 2d
    INT-2 Google Analytics       :int2, after int1, 1d

    section Фаза 5: Отчёты
    RPT-1 Публичные отчёты       :rpt1, after web7, 2d
    WEB-9 Настройки              :web9, after rpt1, 1d
    WEB-10 Генератор JS          :web10, after web9, 1d

    section Фаза 6: Деплой
    DEPLOY-1 Скрипты             :dep1, after init2, 1d
    TEST-1 Тесты                 :test1, after rpt1, 3d
    DEPLOY-2 README              :dep2, after test1, 1d
    DEPLOY-3 CI/CD               :dep3, after dep2, 1d
```

---

## Критический путь

```
INIT-1 → INIT-3 → INIT-4 → WEB-1 → API-1 → WEB-3 → TRACK-1 → TRACK-2 → WEB-7 → RPT-1 → TEST-1 → DEPLOY-2
```

**Длина критического пути: ~148 часов ≈ 18-19 рабочих дней**

---

## Параллелизация

Многие задачи можно выполнять параллельно:

| Параллельный поток A | Параллельный поток B |
|---------------------|---------------------|
| WEB-1 → API-1 → WEB-2, WEB-3 | BOT-1 → BOT-2, BOT-3 |
| WEB-4, WEB-5, WEB-6 | MAX-1, INT-1, INT-2 |
| RPT-1, WEB-9, WEB-10 | TEST-1, DEPLOY-1 |

**При параллельной работе двух потоков: ~12-14 рабочих дней**


---

## Риски и план митигации

# ⚠️ Риски и план митигации

## Матрица рисков

```mermaid
quadrantChart
    title Матрица рисков
    x-axis "Низкая вероятность" --> "Высокая вероятность"
    y-axis "Низкое влияние" --> "Высокое влияние"
    quadrant-1 "Критические"
    quadrant-2 "Мониторинг"
    quadrant-3 "Принять"
    quadrant-4 "Снижать"
    "Лимиты TG API": [0.7, 0.85]
    "MAX корреляция": [0.8, 0.6]
    "Потеря данных": [0.2, 0.95]
    "N+1 запросы": [0.75, 0.4]
    "Миграции Prisma": [0.4, 0.7]
    "Docker на слабом VPS": [0.5, 0.5]
    "Публичный отчёт утечка": [0.3, 0.65]
    "Nuxt UI breaking changes": [0.35, 0.3]
```

## Детальный анализ

### 🔴 Критические риски

#### R1. Лимиты Telegram Bot API на invite-ссылки
| Параметр | Значение |
|----------|----------|
| **Вероятность** | Высокая (70%) |
| **Влияние** | Критическое — система перестаёт работать |
| **Описание** | Telegram ограничивает количество invite-ссылок на канал. `createChatInviteLink` может вернуть ошибку при превышении лимита (вероятно, ~1000 активных ссылок на канал) |
| **Митигация** | 1) Агрессивный TTL: автоудаление через 1-2 часа (или после использования) 2) Пул переиспользуемых ссылок 3) Revoke сразу после подписки 4) Мониторинг количества активных ссылок |
| **Статус** | 🟡 Заложить в MVP |

#### R2. Потеря данных PostgreSQL в Docker
| Параметр | Значение |
|----------|----------|
| **Вероятность** | Низкая (20%) |
| **Влияние** | Катастрофическое — все данные потеряны |
| **Описание** | Docker volume может быть удалён при `docker compose down -v` или при переустановке Docker |
| **Митигация** | 1) Named volume (уже в compose) 2) Скрипт автобэкапа `backup.sh` 3) Предупреждение в README: "НИКОГДА не используйте `-v`" 4) Опционально: cron бэкап каждые 24ч |
| **Статус** | ✅ Решено в архитектуре |

---

### 🟠 Существенные риски

#### R3. Неточная корреляция MAX (платформа без invite-ссылок)
| Параметр | Значение |
|----------|----------|
| **Вероятность** | Высокая (80%) |
| **Влияние** | Среднее — ошибочная атрибуция подписчиков MAX |
| **Описание** | MAX не передаёт invite_link в событиях. Корреляция по времени ±60 сек может привести к неправильному связыванию, особенно при высоком трафике |
| **Митигация** | 1) Настраиваемое окно корреляции (UI) 2) Поле `attributionConfidence` — показывать % уверенности 3) Fingerprinting (user-agent + IP hash) для уточнения 4) Честно показывать "≈80% точность" в UI |
| **Статус** | 🟡 Заложить в MVP |

#### R4. Миграции Prisma — конфликты при обновлении
| Параметр | Значение |
|----------|----------|
| **Вероятность** | Средняя (40%) |
| **Влияние** | Высокое — приложение не стартует после обновления |
| **Описание** | `prisma migrate deploy` может упасть, если пользователь вручную менял схему БД или если миграция содержит breaking change |
| **Митигация** | 1) Автобэкап перед обновлением в `update.sh` 2) Тестирование миграций в CI 3) Документация: "не меняйте БД вручную" 4) Healthcheck в Docker — если миграция упала, контейнер не стартует (вместо полуработающего состояния) |
| **Статус** | 🟡 Заложить в MVP |

#### R5. Утечка данных через публичные отчёты
| Параметр | Значение |
|----------|----------|
| **Вероятность** | Низкая (30%) |
| **Влияние** | Высокое — персональные данные подписчиков |
| **Описание** | Публичная ссылка на отчёт может быть перехвачена или пароль может быть слабым |
| **Митигация** | 1) UUID v4 в URL (не угадать) 2) Обязательный пароль (не опциональный) 3) Rate limiting на попытки ввода пароля 4) Настраиваемая видимость: скрыть имена/ID подписчиков 5) Возможность деактивировать ссылку |
| **Статус** | 🟡 Заложить в MVP |

---

### 🟡 Умеренные риски

#### R6. N+1 запросы при загрузке подписчиков с ссылками
| Параметр | Значение |
|----------|----------|
| **Вероятность** | Высокая (75%) |
| **Влияние** | Низкое-среднее — медленные страницы |
| **Описание** | Prisma по умолчанию делает lazy loading. Страница подписчиков с UTM-данными может генерировать сотни запросов |
| **Митигация** | 1) Всегда использовать `include` / `select` в запросах 2) Пагинация (50 записей на страницу) 3) Индексы на все FK и частые фильтры 4) Prisma `$queryRaw` для сложных агрегаций |
| **Статус** | ⚪ Учтено в рекомендациях |

#### R7. Docker на слабом VPS (1GB RAM)
| Параметр | Значение |
|----------|----------|
| **Вероятность** | Средняя (50%) |
| **Влияние** | Среднее — OOM, контейнеры перезапускаются |
| **Описание** | PostgreSQL + Nuxt + Bot на VPS с 1GB RAM могут не помещаться, особенно при сборке |
| **Митигация** | 1) Multi-stage Docker build — продакшн образы минимальны 2) `node:20-alpine` вместо полного образа 3) Swap файл 1GB в документации 4) Рекомендация: 2GB RAM минимум 5) Готовые образы в GHCR (не нужно собирать на VPS) |
| **Статус** | ✅ Решено в архитектуре |

#### R8. Raw query injection через UTM-параметры
| Параметр | Значение |
|----------|----------|
| **Вероятность** | Низкая (25%) |
| **Влияние** | Критическое — доступ к БД |
| **Описание** | UTM-параметры приходят от пользователя. Если используются в raw SQL — возможна инъекция |
| **Митигация** | 1) Prisma ORM — параметризованные запросы по умолчанию 2) Zod-валидация всех входящих данных 3) Ограничение длины UTM-полей (макс 500 символов) 4) Никогда не использовать `$queryRawUnsafe` |
| **Статус** | ✅ Решено выбором стека |

---

### 🟢 Низкие риски

#### R9. Nuxt UI / Nuxt 3 breaking changes
| Параметр | Значение |
|----------|----------|
| **Вероятность** | Средняя (35%) |
| **Влияние** | Низкое — косметические баги |
| **Описание** | Nuxt UI активно развивается, мажорные версии могут сломать компоненты |
| **Митигация** | 1) Зафиксировать версии в `package.json` (exact, без `^`) 2) Обновлять осознанно, не автоматически 3) Тесты на ключевые страницы |
| **Статус** | ⚪ Стандартная практика |

#### R10. Telegram Bot API изменения
| Параметр | Значение |
|----------|----------|
| **Вероятность** | Низкая (15%) |
| **Влияние** | Среднее — сломается атрибуция |
| **Описание** | Telegram может изменить поведение `ChatMemberUpdated` или лимиты invite-ссылок |
| **Митигация** | 1) Абстрактный слой `linkService` — легко адаптировать 2) grammY активно поддерживается и обновляется 3) Мониторинг Telegram Bot API changelog |
| **Статус** | ⚪ Принять риск |

---

## Сводная таблица

| # | Риск | Вероятность | Влияние | Приоритет | Статус |
|---|------|:-----------:|:-------:|:---------:|:------:|
| R1 | Лимиты TG API invite-ссылок | 🔴 70% | 🔴 Критическое | **P0** | 🟡 MVP |
| R2 | Потеря данных PostgreSQL | 🟢 20% | 🔴 Катастрофическое | **P1** | ✅ Решено |
| R3 | Неточная корреляция MAX | 🔴 80% | 🟡 Среднее | **P1** | 🟡 MVP |
| R4 | Конфликты миграций Prisma | 🟡 40% | 🔴 Высокое | **P1** | 🟡 MVP |
| R5 | Утечка через публичные отчёты | 🟢 30% | 🔴 Высокое | **P2** | 🟡 MVP |
| R6 | N+1 запросы Prisma | 🔴 75% | 🟡 Среднее | **P2** | ⚪ Рекомендации |
| R7 | Docker на слабом VPS | 🟡 50% | 🟡 Среднее | **P2** | ✅ Решено |
| R8 | SQL injection через UTM | 🟢 25% | 🔴 Критическое | **P1** | ✅ Решено |
| R9 | Nuxt UI breaking changes | 🟡 35% | 🟢 Низкое | **P3** | ⚪ Практика |
| R10 | TG Bot API изменения | 🟢 15% | 🟡 Среднее | **P3** | ⚪ Принять |

## Чеклист для MVP

- [ ] Реализовать агрессивный TTL для invite-ссылок (R1)
- [ ] Revoke ссылки сразу после подписки (R1)
- [ ] Мониторинг количества активных ссылок (R1)
- [ ] Поле `attributionConfidence` в UI (R3)
- [ ] Настраиваемое окно корреляции MAX (R3)
- [ ] Автобэкап в `update.sh` перед обновлением (R4)
- [ ] Rate limiting на публичные отчёты (R5)
- [ ] Zod-валидация всех входящих данных (R8)
- [ ] `include`/`select` во всех Prisma-запросах (R6)
- [ ] Пагинация на всех списках (R6)


---

## Деплой и инфраструктура

# 🚀 Деплой и инфраструктура

## 1. Docker Compose (продакшн)

```yaml
# docker-compose.yml
version: "3.8"

services:
  app:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
    container_name: op-app
    restart: unless-stopped
    ports:
      - "${PORT:-3000}:3000"
    environment:
      - DATABASE_URL=postgresql://op:${POSTGRES_PASSWORD:-oppassword}@postgres:5432/otkuda_podpischik
      - BOT_INTERNAL_URL=http://bot:3001
      - NUXT_PUBLIC_APP_URL=${APP_URL:-http://localhost:3000}
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - op-network

  bot:
    build:
      context: .
      dockerfile: apps/bot/Dockerfile
    container_name: op-bot
    restart: unless-stopped
    expose:
      - "3001"
    environment:
      - DATABASE_URL=postgresql://op:${POSTGRES_PASSWORD:-oppassword}@postgres:5432/otkuda_podpischik
      - APP_INTERNAL_URL=http://app:3000
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - op-network

  postgres:
    image: postgres:16-alpine
    container_name: op-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: op
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-oppassword}
      POSTGRES_DB: otkuda_podpischik
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U op -d otkuda_podpischik"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - op-network

volumes:
  pgdata:
    driver: local

networks:
  op-network:
    driver: bridge
```

## 2. Docker Compose (разработка)

```yaml
# docker-compose.dev.yml
version: "3.8"

services:
  app:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
      target: dev
    volumes:
      - ./apps/web:/app/apps/web
      - ./packages:/app/packages
      - ./prisma:/app/prisma
    command: npx nuxi dev
    environment:
      - NODE_ENV=development

  bot:
    build:
      context: .
      dockerfile: apps/bot/Dockerfile
      target: dev
    volumes:
      - ./apps/bot:/app/apps/bot
      - ./packages:/app/packages
      - ./prisma:/app/prisma
    command: npx tsx watch src/index.ts
    environment:
      - NODE_ENV=development
```

## 3. Dockerfile (app — Nuxt 3)

```dockerfile
# apps/web/Dockerfile

# === DEV ===
FROM node:20-alpine AS dev
WORKDIR /app
COPY package.json turbo.json ./
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
COPY prisma/ prisma/
RUN npm install
COPY . .
RUN npx prisma generate
EXPOSE 3000

# === BUILD ===
FROM dev AS build
RUN npx turbo build --filter=web

# === PRODUCTION ===
FROM node:20-alpine AS production
WORKDIR /app
RUN apk add --no-cache curl
COPY --from=build /app/apps/web/.output .output
COPY --from=build /app/node_modules/.prisma node_modules/.prisma
COPY --from=build /app/prisma prisma
COPY --from=build /app/node_modules/prisma node_modules/prisma
COPY --from=build /app/node_modules/@prisma node_modules/@prisma
COPY apps/web/docker-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
EXPOSE 3000
ENV NODE_ENV=production
ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", ".output/server/index.mjs"]
```

## 4. Dockerfile (bot)

```dockerfile
# apps/bot/Dockerfile

# === DEV ===
FROM node:20-alpine AS dev
WORKDIR /app
COPY package.json turbo.json ./
COPY apps/bot/package.json apps/bot/
COPY packages/shared/package.json packages/shared/
COPY prisma/ prisma/
RUN npm install
COPY . .
RUN npx prisma generate
EXPOSE 3001

# === BUILD ===
FROM dev AS build
RUN npx turbo build --filter=bot

# === PRODUCTION ===
FROM node:20-alpine AS production
WORKDIR /app
RUN apk add --no-cache curl
COPY --from=build /app/apps/bot/dist dist
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/prisma prisma
COPY apps/bot/docker-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
EXPOSE 3001
ENV NODE_ENV=production
ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "dist/index.js"]
```

## 5. Entrypoint (автомиграции)

```bash
#!/bin/sh
# docker-entrypoint.sh (общий для app и bot)
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
```

## 6. Скрипт установки (install.sh)

```bash
#!/bin/bash
# scripts/install.sh — установка в одну команду
set -e

REPO="https://github.com/YOUR_USER/otkuda-podpischik.git"
DIR="otkuda-podpischik"

echo "🔧 Откуда подписчик — установка"
echo "================================"

# Проверка Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не установлен. Установите: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command -v docker compose &> /dev/null; then
    echo "❌ Docker Compose не найден."
    exit 1
fi

# Клонирование
if [ -d "$DIR" ]; then
    echo "📂 Директория существует, обновляю..."
    cd "$DIR" && git pull
else
    echo "📥 Клонирую репозиторий..."
    git clone "$REPO" "$DIR"
    cd "$DIR"
fi

# Создание .env если нет
if [ ! -f .env ]; then
    POSTGRES_PASSWORD=$(openssl rand -hex 16)
    cat > .env <<EOF
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
PORT=3000
APP_URL=http://$(hostname -I | awk '{print $1}'):3000
EOF
    echo "✅ Создан .env с автогенерированным паролем БД"
fi

# Запуск
echo "🐳 Запуск контейнеров..."
docker compose up -d --build

echo ""
echo "✅ Установка завершена!"
echo "🌐 Откройте: http://$(hostname -I | awk '{print $1}'):3000"
echo "📋 Следуйте мастеру настройки в браузере"
echo ""
echo "Полезные команды:"
echo "  docker compose logs -f     — логи"
echo "  docker compose down        — остановить"
echo "  docker compose up -d       — запустить"
echo "  ./scripts/backup.sh        — бэкап БД"
```

## 7. Скрипт обновления

```bash
#!/bin/bash
# scripts/update.sh
set -e

echo "📦 Обновление Откуда подписчик..."

git pull origin main

docker compose down
docker compose up -d --build

echo "✅ Обновлено! Миграции применяются автоматически."
```

## 8. Скрипт бэкапа

```bash
#!/bin/bash
# scripts/backup.sh
set -e

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups"
mkdir -p "$BACKUP_DIR"

echo "💾 Бэкап базы данных..."
docker compose exec -T postgres pg_dump -U op otkuda_podpischik | gzip > "$BACKUP_DIR/backup_$TIMESTAMP.sql.gz"

echo "✅ Бэкап сохранён: $BACKUP_DIR/backup_$TIMESTAMP.sql.gz"

# Удаление бэкапов старше 30 дней
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +30 -delete
echo "🗑️ Старые бэкапы (>30 дней) удалены"
```

## 9. CI/CD (GitHub Actions)

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx prisma generate
      - run: npx turbo lint
      - run: npx turbo typecheck

  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: op
          POSTGRES_PASSWORD: test
          POSTGRES_DB: op_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://op:test@localhost:5432/op_test
      - run: npx turbo test
        env:
          DATABASE_URL: postgresql://op:test@localhost:5432/op_test
```

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags: ["v*"]

jobs:
  docker:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v5
        with:
          context: .
          file: apps/web/Dockerfile
          push: true
          tags: ghcr.io/${{ github.repository }}/web:${{ github.ref_name }}
      - uses: docker/build-push-action@v5
        with:
          context: .
          file: apps/bot/Dockerfile
          push: true
          tags: ghcr.io/${{ github.repository }}/bot:${{ github.ref_name }}
```

## 10. Переменные окружения

| Переменная | Обязательна | По умолчанию | Описание |
|-----------|:-----------:|:------------:|----------|
| `POSTGRES_PASSWORD` | ✅ | `oppassword` | Пароль PostgreSQL |
| `PORT` | ❌ | `3000` | Порт веб-интерфейса |
| `APP_URL` | ❌ | `http://localhost:3000` | Публичный URL (для JS-скрипта) |
| `DATABASE_URL` | Авто | Авто | Строка подключения (генерируется) |
| `NODE_ENV` | Авто | `production` | Режим работы |

> **Важно:** Токен Telegram-бота, настройки каналов и интеграций НЕ хранятся в `.env` — они вводятся через UI и сохраняются в базе данных.

## 11. Требования к серверу

| Параметр | Минимум | Рекомендуется |
|----------|:-------:|:-------------:|
| CPU | 1 vCPU | 2 vCPU |
| RAM | 1 GB | 2 GB |
| Диск | 10 GB SSD | 20 GB SSD |
| ОС | Ubuntu 22.04+ / Debian 12+ | Ubuntu 24.04 |
| Docker | 24.0+ | latest |
| Docker Compose | v2.20+ | latest |

**Стоимость:** VPS от 300-500 ₽/мес (Timeweb, Selectel, Hetzner)

## 12. Reverse Proxy (опционально)

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
        proxy_cache_bypass $http_upgrade;
    }
}
```

Для HTTPS — Certbot:
```bash
sudo certbot --nginx -d tracker.example.com
```

