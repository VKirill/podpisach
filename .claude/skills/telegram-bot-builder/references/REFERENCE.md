# grammY Telegram Bot Framework Reference Documentation

> Source: Context7 — `/websites/grammy_dev`
> Generated: 2026-03-11

---

## Overview

grammY is an easy-to-use, flexible, and scalable Telegram Bot Framework for building bots with TypeScript or JavaScript. It provides a modern API with middleware support, plugins, and comprehensive Bot API coverage.

---

## Getting Started

### Basic Bot

```typescript
import { Bot } from "grammy";

const bot = new Bot(""); // <-- put your bot token between the ""

// Handle the /start command.
bot.command("start", (ctx) => ctx.reply("Welcome! Up and running."));

// Handle other messages.
bot.on("message", (ctx) => ctx.reply("Got another message!"));

// Start the bot (long polling).
bot.start();
```

### Accessing Bot API Directly

```typescript
// Outside middleware — use bot.api
bot.api.sendMessage(chat_id, 'Hello, grammY!');

// Inside middleware — use ctx.api (preferred)
bot.command("test", async (ctx) => {
  await ctx.api.sendMessage(ctx.chat.id, 'Hello!');
});
```

---

## Bot API Methods

### Core Methods Reference

#### GET /getUpdates (Long Polling)

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `offset` | integer | No | Sequential number of first update |
| `limit` | integer | No | Limit updates (1-100) |
| `timeout` | integer | No | Delay between requests |
| `allowed_updates` | string[] | No | Update types to receive |

#### POST /setWebhook

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | Yes | HTTPS URL for updates |
| `certificate` | InputFile | No | Public key certificate |
| `ip_address` | string | No | Fixed IP for webhook |
| `max_connections` | integer | No | Max simultaneous connections |
| `allowed_updates` | string[] | No | Update types to receive |
| `drop_pending_updates` | boolean | No | Drop pending updates |
| `secret_token` | string | No | Secret token header |

#### POST /deleteWebhook

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `drop_pending_updates` | boolean | No | Drop pending updates |

#### GET /getMe

No parameters. Returns basic bot info as User object.

---

## Sessions

### Session Middleware

```typescript
import {
  Bot,
  Context,
  session,
  SessionFlavor,
} from "grammy";

// Define the shape of our session.
interface SessionData {
  pizzaCount: number;
}

// Flavor the context type to include sessions.
type MyContext = Context & SessionFlavor<SessionData>;

const bot = new Bot<MyContext>("");

// Install session middleware, and define the initial session value.
function initial(): SessionData {
  return { pizzaCount: 0 };
}
bot.use(session({ initial }));

bot.command("hunger", async (ctx) => {
  const count = ctx.session.pizzaCount;
  await ctx.reply(`Your hunger level is ${count}!`);
});

bot.hears(/.*pizza.*/, (ctx) => ctx.session.pizzaCount++);

bot.start();
```

---

## Inline Keyboards

### Creating and Handling Inline Keyboards

```typescript
const inlineKeyboard = new InlineKeyboard().text("click", "click-payload");

bot.command("start", async (ctx) => {
  await ctx.reply("Curious? Click me!", { reply_markup: inlineKeyboard });
});

bot.callbackQuery("click-payload", async (ctx) => {
  await ctx.answerCallbackQuery({
    text: "You were curious, indeed!",
  });
});
```

### InlineKeyboard Class

The `InlineKeyboard` class is used to create inline keyboards (buttons displayed underneath a message). When pressed, inline buttons send a callback query that is not visible to the user.

Methods include:
- `.text(label, callbackData)` — text button with callback
- `.url(label, url)` — button that opens URL
- `.switchInline(label, query)` — switch to inline mode
- `.switchInlineCurrent(label, query)` — inline mode in current chat
- `.switchInlineChosen(label, query)` — inline in chosen chat
- `.row()` — start a new button row

---

## Custom Keyboards

### Building Custom Keyboards

```typescript
const keyboard = new Keyboard()
  .text('A').text('B').row()
  .text('C').text('D')

await ctx.reply('Here is your custom keyboard!', {
  reply_markup: keyboard
})
```

Custom keyboards replace the user's system keyboard. Pressing a custom keyboard button sends a text message with its label.

---

## Menu Plugin

### Sending Menus

```typescript
bot.command("menu", async (ctx) => {
  await ctx.reply("Here is your menu", { reply_markup: menu });
});
```

The menu plugin provides interactive inline keyboard menus with built-in navigation and state management.

---

## Conversations Plugin

### Using Plugins Inside Conversations

Context objects within conversations are isolated from the main middleware. Plugins installed on the bot are NOT automatically available inside conversations.

```typescript
import { Context, Keyboard } from 'grammy';
import {
  conversations,
  createConversation,
  ConversationFlavor,
  Conversation,
} from '@grammyjs/conversations';
import { hydrate, HydrateFlavor } from '@grammyjs/hydrate';

type MyContext = ConversationFlavor<Context>;
type MyConversationContext = HydrateFlavor<Context>;

// Install conversations plugin outside
bot.use(conversations());

// Define the conversation function
async function convo(
  conversation: Conversation<MyContext, MyConversationContext>,
  ctx: MyConversationContext
) {
  // hydrate plugin is installed on ctx here
  const other = await conversation.wait();
  // hydrate plugin is installed on other here too
  await ctx.reply('Conversation ended.');
}

// Create conversation with plugins
bot.use(createConversation(convo, { plugins: [hydrate()] }));

// Command to enter the conversation
bot.command('enter', async (ctx) => {
  // hydrate is NOT available on this ctx
  await ctx.conversation.enter('convo');
});
```

### Installing Transformer Plugins in Conversations

```typescript
bot.use(conversations());

async function convo(conversation, ctx) {
  await ctx.reply('Conversation started with transformer.');
  await conversation.wait();
}

bot.use(createConversation(convo, {
  plugins: [
    async (ctx, next) => {
      ctx.api.config.use(transformer);
      await next();
    },
  ],
}));
```

### ConversationConfig.plugins

The `plugins` option allows installing grammY plugins on every context object created by the conversation. Key notes:
- Plugins installed here process the context before it is given to the conversation
- Plugins relying on code after `next()` resolves might not function as expected
- Sessions are NOT compatible with conversations plugin (use conversation's own state)
- You can use this to install Bot API transformers

---

## Error Handling

### Setting Error Handler

```typescript
// For long polling / @grammyjs/runner
bot.catch((err) => {
  const ctx = err.ctx;
  console.error(`Error while handling update ${ctx.update.update_id}:`);
  const e = err.error;

  if (e instanceof GrammyError) {
    console.error("Error in request:", e.description);
  } else if (e instanceof HttpError) {
    console.error("Could not contact Telegram:", e);
  } else {
    console.error("Unknown error:", e);
  }
});
```

The `catch(errorHandler)` function sets the error handler for the bot when using long polling. This is crucial for managing errors during `bot.start()` or when using the `@grammyjs/runner` package. Calling this method has no effect when using webhooks.

---

## Filter Queries & Listeners

### Common Filter Patterns

```typescript
// Commands
bot.command("start", handler);
bot.command("help", handler);

// Message types
bot.on("message", handler);          // Any message
bot.on("message:text", handler);     // Text messages
bot.on("message:photo", handler);    // Photo messages
bot.on("message:document", handler); // Document messages
bot.on("message:sticker", handler);  // Sticker messages

// Callback queries (inline keyboard presses)
bot.callbackQuery("data", handler);
bot.on("callback_query:data", handler);

// Text matching
bot.hears("hello", handler);         // Exact match
bot.hears(/hello/i, handler);        // Regex match

// Inline queries
bot.on("inline_query", handler);

// Edited messages
bot.on("edited_message", handler);

// Channel posts
bot.on("channel_post", handler);
```

---

## Context Shortcuts

Context provides shortcuts for common operations:

```typescript
bot.on("message", async (ctx) => {
  // Reply to the message
  await ctx.reply("Hello!");

  // Reply with markdown
  await ctx.reply("*bold*", { parse_mode: "MarkdownV2" });

  // Forward the message
  await ctx.forwardMessage(otherChatId);

  // Delete the message
  await ctx.deleteMessage();

  // Get chat info
  const chat = ctx.chat;
  const from = ctx.from;
  const message = ctx.message;
});

bot.callbackQuery("data", async (ctx) => {
  // Answer callback query (remove loading indicator)
  await ctx.answerCallbackQuery({ text: "Done!" });

  // Edit the message that had the button
  await ctx.editMessageText("Updated text");
});
```

---

## Middleware Composition

### Using Composers

grammY uses a middleware pattern similar to Express/Koa. Middleware functions receive `ctx` and `next`.

```typescript
import { Bot, Composer } from "grammy";

const bot = new Bot("");

// Create a composer for admin commands
const admin = new Composer();
admin.command("ban", (ctx) => ctx.reply("User banned"));
admin.command("unban", (ctx) => ctx.reply("User unbanned"));

// Create a composer for user commands
const user = new Composer();
user.command("start", (ctx) => ctx.reply("Welcome!"));
user.command("help", (ctx) => ctx.reply("Help text"));

// Install both composers
bot.use(admin);
bot.use(user);

// Custom middleware
bot.use(async (ctx, next) => {
  console.log(`Processing update ${ctx.update.update_id}`);
  const start = Date.now();
  await next(); // call downstream middleware
  const ms = Date.now() - start;
  console.log(`Response time: ${ms}ms`);
});
```

---

## Webhook Setup

### Express Integration

```typescript
import express from "express";
import { Bot, webhookCallback } from "grammy";

const bot = new Bot("");

// Set up handlers
bot.command("start", (ctx) => ctx.reply("Welcome!"));

const app = express();
app.use(express.json());
app.use("/webhook", webhookCallback(bot, "express"));

app.listen(3000);
```

### Setting Webhook URL

```typescript
// Set webhook
await bot.api.setWebhook("https://your-domain.com/webhook", {
  secret_token: "your-secret-token",
  drop_pending_updates: true,
});

// Delete webhook (switch back to long polling)
await bot.api.deleteWebhook({ drop_pending_updates: true });

// Get webhook info
const info = await bot.api.getWebhookInfo();
```

---

## Context Flavors

Context flavors allow extending the context type with additional properties from plugins:

```typescript
import { Context, SessionFlavor } from "grammy";
import { ConversationFlavor } from "@grammyjs/conversations";
import { HydrateFlavor } from "@grammyjs/hydrate";

// Combine multiple flavors
type MyContext = HydrateFlavor<
  ConversationFlavor<
    Context & SessionFlavor<SessionData>
  >
>;

const bot = new Bot<MyContext>("");
```

---

## Useful Plugins

| Plugin | Package | Description |
|--------|---------|-------------|
| Sessions | built-in | Store session data per chat/user |
| Keyboard | built-in | Build inline & custom keyboards |
| Conversations | `@grammyjs/conversations` | Build conversational interfaces |
| Hydrate | `@grammyjs/hydrate` | Hydrate API objects with methods |
| Menu | `@grammyjs/menu` | Interactive inline menus |
| Router | `@grammyjs/router` | Route updates by condition |
| Auto-retry | `@grammyjs/auto-retry` | Retry failed API calls |
| Rate limiter | `@grammyjs/ratelimiter` | Throttle user requests |
| Runner | `@grammyjs/runner` | Concurrent long polling |
| Files | `@grammyjs/files` | Download files easily |
| i18n | `@grammyjs/i18n` | Internationalization |
| Parse mode | `@grammyjs/parse-mode` | Default parse mode |
| Stateless question | `@grammyjs/stateless-question` | Stateless questions |
