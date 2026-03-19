<script setup lang="ts">
import type { StatsOverview } from '@ps/shared'

definePageMeta({ middleware: 'auth' })

const { data: overview, status } = await useFetch<StatsOverview>('/api/stats/overview')
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-bold">Обзор</h1>

    <!-- Карточки метрик -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatsCard
        title="Подписчиков"
        :value="overview?.totalSubscribers ?? null"
        icon="i-heroicons-users"
      />
      <StatsCard
        title="Новых сегодня"
        :value="overview?.newToday ?? null"
        icon="i-heroicons-arrow-up-circle"
      />
      <StatsCard
        title="Ушли сегодня"
        :value="overview?.leftToday ?? null"
        icon="i-heroicons-arrow-down-circle"
        trend="down"
      />
      <StatsCard
        title="Каналов"
        :value="overview?.channels ?? null"
        icon="i-heroicons-megaphone"
      />
    </div>

    <!-- График + Топ источники -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2">
        <SubscriptionChart />
      </div>
      <TopSources :sources="overview?.topSources" />
    </div>

    <!-- Лента событий -->
    <EventFeed />
  </div>
</template>
