# Testing Patterns — Extended Reference

## Test Factory Pattern

```ts
// test/factories/user.factory.ts
import { faker } from '@faker-js/faker'

interface UserOverrides {
  name?: string
  email?: string
  role?: 'admin' | 'user'
  createdAt?: Date
}

export function createUser(overrides: UserOverrides = {}) {
  return {
    id: faker.string.uuid(),
    name: overrides.name ?? faker.person.fullName(),
    email: overrides.email ?? faker.internet.email(),
    role: overrides.role ?? 'user',
    createdAt: overrides.createdAt ?? faker.date.recent(),
  }
}

export function createUsers(count: number, overrides: UserOverrides = {}) {
  return Array.from({ length: count }, () => createUser(overrides))
}
```

Usage:
```ts
const admin = createUser({ role: 'admin' })
const users = createUsers(5, { role: 'user' })
```

## Mocking Strategies

### Module mocking (Vitest)

```ts
// Mock entire module
vi.mock('@/shared/lib/redis', () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
  },
}))

// Mock with auto-mocking + override
vi.mock('@/shared/lib/api', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/shared/lib/api')>()
  return {
    ...mod,
    fetchData: vi.fn().mockResolvedValue({ items: [] }),
  }
})
```

### Spy on existing methods

```ts
const spy = vi.spyOn(service, 'process')
spy.mockResolvedValueOnce({ ok: true })

await handler(req)

expect(spy).toHaveBeenCalledWith(expect.objectContaining({ id: '123' }))
spy.mockRestore()
```

### Timer mocking

```ts
beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { vi.useRealTimers() })

it('debounces calls', async () => {
  const fn = vi.fn()
  const debounced = debounce(fn, 300)

  debounced()
  debounced()
  debounced()

  expect(fn).not.toHaveBeenCalled()
  vi.advanceTimersByTime(300)
  expect(fn).toHaveBeenCalledOnce()
})
```

## Test Organization

```
tests/
├── unit/           # Pure logic, no I/O
│   ├── utils.test.ts
│   └── validators.test.ts
├── integration/    # With DB/Redis/external services
│   ├── api.test.ts
│   └── workers.test.ts
├── e2e/           # Full application flow
│   └── auth.spec.ts
├── factories/     # Test data factories
│   ├── user.factory.ts
│   └── project.factory.ts
└── helpers/       # Test utilities
    ├── setup.ts
    └── db.ts
```

## Assertion Patterns

```ts
// Object shape matching
expect(result).toMatchObject({
  status: 'success',
  data: expect.objectContaining({ id: expect.any(String) }),
})

// Array assertions
expect(items).toHaveLength(3)
expect(items).toEqual(expect.arrayContaining([
  expect.objectContaining({ name: 'foo' }),
]))

// Error assertions
await expect(fn()).rejects.toThrow('Not found')
await expect(fn()).rejects.toMatchObject({
  message: expect.stringContaining('404'),
})

// Snapshot (use sparingly)
expect(component).toMatchInlineSnapshot(`"<div>Hello</div>"`)
```

## API Testing Pattern (Fastify)

```ts
import { build } from '../helpers/app'

describe('POST /api/projects', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await build() // builds test app instance
  })
  afterAll(() => app.close())

  it('creates project with valid data', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/projects',
      payload: { name: 'Test Project', description: 'desc' },
      headers: { authorization: `Bearer ${testToken}` },
    })

    expect(res.statusCode).toBe(201)
    expect(res.json()).toMatchObject({
      id: expect.any(String),
      name: 'Test Project',
    })
  })

  it('rejects short name', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/projects',
      payload: { name: 'ab' },
      headers: { authorization: `Bearer ${testToken}` },
    })

    expect(res.statusCode).toBe(400)
  })
})
```
