# Clean Code — Project-Specific Reference

<!-- Generated from model knowledge, verify against official docs -->

> Project: ai-pipeline (TypeScript ESM, Node.js) | Generated: 2026-03-10

## Именование в TypeScript

```typescript
// ✅ Intention-revealing names — примеры из проекта
const elapsedSinceHeartbeatMs = Date.now() - task.lastHeartbeatAt.getTime();
const isTaskStuckOrTimedOut = elapsedSinceHeartbeatMs > HEARTBEAT_TIMEOUT_MS;

// ❌ Диинформирующие названия
const taskList = new Map<string, PipelineTask>(); // это Map, не список!

// ✅ Правильно
const tasksBySlug = new Map<string, PipelineTask>();

// Классы — существительные
class TaskLock {}          // ✅
class LockManager {}       // ⚠️ Manager — расплывчато, лучше TaskLockRegistry
class ProcessHelper {}     // ❌ Helper — антипаттерн

// Методы — глаголы
async acquireLock(taskId: string): Promise<boolean> {}    // ✅
async isLockExpired(taskId: string): Promise<boolean> {}  // ✅ (булевы — is/has/can)
async lockData(taskId: string) {}                         // ❌ неясно что делает
```

## Функции — Одна ответственность

```typescript
// ❌ Функция делает слишком много
async function processTask(taskId: string) {
  const task = await db.query('SELECT * FROM pipeline_tasks WHERE id = $1', [taskId]);
  if (!task.rows[0]) return;
  // валидация
  if (!['pending', 'approved'].includes(task.rows[0].status)) return;
  // отправка уведомления
  await fetch('https://notify-service/...', { method: 'POST', body: JSON.stringify(task) });
  // обновление статуса
  await db.query('UPDATE pipeline_tasks SET status = $1 WHERE id = $2', ['running', taskId]);
  // запуск агента
  await runAgent(task.rows[0]);
}

// ✅ Каждая функция — одна задача
async function getValidTask(taskId: string): Promise<PipelineTask | null> {
  const task = await fetchTask(taskId);
  if (!task || !isStartableStatus(task.status)) return null;
  return task;
}

function isStartableStatus(status: string): boolean {
  return ['pending', 'approved'].includes(status);
}

async function startTask(task: PipelineTask): Promise<void> {
  await updateTaskStatus(task.id, 'running');
  await notifyTaskStarted(task);
  await runAgent(task);
}
```

## SOLID в TypeScript

```typescript
// S — Single Responsibility
// ❌ Класс делает всё
class TaskProcessor {
  async validate() {}
  async notify() {}
  async persistToDb() {}
  async runAgent() {}
}

// ✅ Разделить по ответственности (паттерн domain-layers проекта)
// src/tasks/quality-gates.ts
class QualityGates { async validate(task: PipelineTask): Promise<ValidationResult> {} }
// src/tasks/notifications.ts
class Notifier { async notify(task: PipelineTask, event: TaskEvent): Promise<void> {} }
// src/db/tasks.ts
class TaskRepository { async save(task: PipelineTask): Promise<void> {} }

// O — Open/Closed
// ✅ Расширяй через новые классы, не модифицируй существующие
interface PipelineStage {
  readonly name: string;
  execute(task: PipelineTask, ctx: StageContext): Promise<StageResult>;
}

class TriageStage implements PipelineStage {
  readonly name = 'triage';
  async execute(task, ctx) { /* ... */ }
}

// Добавить новую фазу — не трогать старые
class ScoutStage implements PipelineStage {
  readonly name = 'scout';
  async execute(task, ctx) { /* ... */ }
}

// I — Interface Segregation
// ❌ Большой интерфейс
interface TaskStore {
  getTask(id: string): Promise<PipelineTask>;
  updateStatus(id: string, status: string): Promise<void>;
  addComment(id: string, text: string): Promise<void>;
  getTimeline(id: string): Promise<TimelineEvent[]>;
  getErrors(id: string): Promise<TaskError[]>;
}

// ✅ Разделить по использованию
interface TaskReader { getTask(id: string): Promise<PipelineTask>; }
interface TaskWriter { updateStatus(id: string, status: string): Promise<void>; }
interface TaskCommentable { addComment(id: string, text: string): Promise<void>; }

// D — Dependency Inversion
// ✅ Зависеть от абстракций
class PipelineOrchestrator {
  constructor(
    private readonly tasks: TaskReader & TaskWriter,  // интерфейс, не конкретный класс
    private readonly agent: AgentRunner,
    private readonly events: EventEmitter,
  ) {}
}
```

## Error Handling — TypeScript паттерны

```typescript
// ✅ Типизированные ошибки вместо generic Error
export class TaskNotFoundError extends Error {
  readonly code = 'TASK_NOT_FOUND';
  constructor(public readonly taskId: string) {
    super(`Task not found: ${taskId}`);
  }
}

export class InvalidStatusTransitionError extends Error {
  readonly code = 'INVALID_STATUS_TRANSITION';
  constructor(
    public readonly from: TaskStatus,
    public readonly to: TaskStatus,
  ) {
    super(`Invalid transition: ${from} → ${to}`);
  }
}

// ✅ Result type (избежать try/catch в бизнес-логике)
type Result<T, E extends Error = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

async function tryAcquireLock(taskId: string): Promise<Result<Lock, LockConflictError>> {
  const existing = await getLock(taskId);
  if (existing) {
    return { ok: false, error: new LockConflictError(taskId, existing) };
  }
  const lock = await createLock(taskId);
  return { ok: true, value: lock };
}

// Использование без try/catch
const result = await tryAcquireLock(task.id);
if (!result.ok) {
  logger.warn('Lock conflict', { taskId: task.id, existingLock: result.error.existingLock });
  return;
}
startWithLock(result.value);

// ❌ Не возвращать null — использовать Result или бросать исключение
async function getTask(id: string): Promise<PipelineTask | null> { ... } // заставляет делать проверки везде

// ✅ Исключение если null = ошибочное состояние
async function getTaskOrThrow(id: string): Promise<PipelineTask> {
  const task = await findTask(id);
  if (!task) throw new TaskNotFoundError(id);
  return task;
}
```

## Комментарии — когда они нужны

```typescript
// ✅ Объясни ПОЧЕМУ, не ЧТО делает код
// pm2 delete + pm2 start is safer than pm2 restart when process is stuck.
// Old process may hold port (EADDRINUSE) — kill by port first.
function restartProcess(name: string) { ... }

// ✅ Предупреди о неочевидном поведении
// ESM requires .js suffix in all imports — do NOT use .ts
import { runAgent } from './runner.js';

// ✅ TODO с контекстом
// TODO(2026-Q2): Replace polling with webhook when Anthropic adds streaming events
async function waitForAgentCompletion(sessionId: string) { ... }

// ❌ Комментарий повторяет код
// Update task status to running
await updateTaskStatus(task.id, 'running');

// ❌ Закомментированный код
// const oldRunner = await legacyRunAgent(task);
// await legacyRunAgent(task);
const result = await runAgent(task);
```

## Форматирование — Newspaper Metaphor

```typescript
// ✅ Высокоуровневое — вверху, детали — внизу
// src/pipeline/orchestrate.ts

export async function orchestrateTask(taskId: string): Promise<void> {
  const task = await getTaskOrThrow(taskId);
  await ensureValidStartState(task);

  for (const phase of getPhasesForTask(task)) {
    await executePhase(task, phase);
  }

  await finalizeTask(task);
}

// Детали — ниже в файле
async function ensureValidStartState(task: PipelineTask): Promise<void> {
  if (!STARTABLE_STATUSES.has(task.status)) {
    throw new InvalidStatusTransitionError(task.status, 'running');
  }
  await acquireLockOrThrow(task.id);
}

async function executePhase(task: PipelineTask, phase: PipelinePhase): Promise<void> {
  logger.info('Executing phase', { taskId: task.id, phase });
  await updateTaskStatus(task.id, phaseToStatus(phase));
  // ...
}
```

## Метрики для кода проекта

| Метрика | Цель | Инструмент |
|---------|------|-----------|
| Файл > 300 строк | Декомпозировать | `wc -l src/**/*.ts` |
| Функция > 20 строк | Извлечь методы | ESLint `max-lines-per-function` |
| Цикломатическая сложность > 10 | Упростить ветвления | ESLint `complexity` |
| Глубина вложенности > 3 | Ранний return + extract | ESLint `max-depth` |
| Параметров > 3 | Parameter Object | TypeScript interface |

```typescript
// ✅ Ранний return вместо deep nesting
async function handleTaskRestart(taskId: string, from: string): Promise<void> {
  const task = await getTask(taskId);
  if (!task) return logAndReturn('Task not found', { taskId });
  if (!isRestartable(task)) return logAndReturn('Task not restartable', { taskId, status: task.status });

  await resetTaskForRestart(task, from);
  await enqueueTask(task);
}

// ✅ Parameter Object для > 3 аргументов
interface RunStepOptions {
  taskId: string;
  step: PipelineStep;
  worktreePath: string;
  agentProfile: AgentProfile;
  sessionId?: string;
}

async function runStep(opts: RunStepOptions): Promise<StepResult> { ... }
```
