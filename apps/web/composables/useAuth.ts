export function useAuth() {
  const authenticated = useState<boolean>('auth', () => false)
  const setupCompleted = useState<boolean>('setup', () => true)
  const loading = useState<boolean>('auth-loading', () => true)

  async function checkSession(): Promise<void> {
    try {
      const data = await $fetch<{ authenticated: boolean; setupCompleted: boolean }>(
        '/api/auth/session',
      )
      authenticated.value = data.authenticated
      setupCompleted.value = data.setupCompleted
    } catch {
      authenticated.value = false
    } finally {
      loading.value = false
    }
  }

  async function login(password: string): Promise<{ success: boolean; error?: string }> {
    try {
      await $fetch('/api/auth/login', { method: 'POST', body: { password } })
      authenticated.value = true
      return { success: true }
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : (err as { data?: { message?: string } })?.data?.message
      return { success: false, error: message ?? 'Ошибка авторизации' }
    }
  }

  async function logout(): Promise<void> {
    try {
      await $fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      authenticated.value = false
      await navigateTo('/login')
    }
  }

  return { authenticated, setupCompleted, loading, checkSession, login, logout }
}
