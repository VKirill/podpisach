// PUBLIC: данные публичного отчёта (без admin-сессии, но с проверкой пароля через cookie)
// getReportData — auto-imported from server/utils/reportData by Nitro
export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, 'token')
  if (!token) {
    throw createError({ statusCode: 400, message: 'Token required' })
  }

  const report = await prisma.publicReport.findUnique({
    where: { token },
    include: {
      channel: { select: { title: true, username: true } },
    },
  })

  if (!report || !report.isActive) {
    throw createError({ statusCode: 404, message: 'Report not found' })
  }

  // Проверяем пароль через cookie-сессию отчёта
  if (report.passwordHash) {
    const sessionCookie = getCookie(event, `report-session-${token}`)
    if (!sessionCookie) {
      return {
        needsPassword: true,
        report: { name: report.name },
      }
    }
  }

  const data = await getReportData(report.channelId, {
    showSubscriberNames: report.showSubscriberNames,
    showUtmDetails: report.showUtmDetails,
    showCosts: report.showCosts,
  })

  return {
    needsPassword: false,
    report: {
      name: report.name,
      channelTitle: report.channel.title,
      channelUsername: report.channel.username,
      showSubscriberNames: report.showSubscriberNames,
      showUtmDetails: report.showUtmDetails,
      showCosts: report.showCosts,
    },
    ...data,
  }
})
