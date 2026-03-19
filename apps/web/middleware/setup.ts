export default defineNuxtRouteMiddleware(async () => {
  const { setupCompleted, loading, checkSession } = useAuth()

  if (loading.value) {
    await checkSession()
  }

  // Setup уже завершён → на главную
  if (setupCompleted.value) {
    return navigateTo('/')
  }
})
