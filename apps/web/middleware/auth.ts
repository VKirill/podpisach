export default defineNuxtRouteMiddleware(async (to) => {
  // Публичные маршруты — пропускаем без проверки
  if (to.path.startsWith('/r/')) return
  if (to.path === '/login') return

  const { authenticated, setupCompleted, loading, checkSession } = useAuth()

  // Первая загрузка — получаем состояние сессии с сервера
  if (loading.value) {
    await checkSession()
  }

  // Setup не завершён → на мастер настройки (кроме самой страницы setup)
  if (!setupCompleted.value && to.path !== '/setup') {
    return navigateTo('/setup')
  }

  // Не авторизован → на логин (кроме страницы setup)
  if (!authenticated.value && to.path !== '/setup') {
    return navigateTo('/login')
  }
})
