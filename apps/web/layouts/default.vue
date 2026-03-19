<script setup lang="ts">
const isSidebarOpen = ref(false)

function closeSidebar() {
  isSidebarOpen.value = false
}
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
    <!-- Мобильный overlay -->
    <div
      v-if="isSidebarOpen"
      class="fixed inset-0 z-20 bg-black/50 lg:hidden"
      @click="closeSidebar"
    />

    <!-- Sidebar: десктоп — фиксированный, мобильный — drawer -->
    <aside
      class="fixed inset-y-0 left-0 z-30 transition-transform lg:relative lg:translate-x-0"
      :class="isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'"
    >
      <AppSidebar />
    </aside>

    <!-- Основной контент -->
    <div class="flex flex-col flex-1 min-w-0 overflow-hidden">
      <!-- Хедер -->
      <div class="flex items-center">
        <!-- Burger для мобильных -->
        <UButton
          icon="i-heroicons-bars-3"
          color="neutral"
          variant="ghost"
          class="m-2 lg:hidden"
          aria-label="Открыть меню"
          @click="isSidebarOpen = true"
        />
        <AppHeader class="flex-1" />
      </div>

      <!-- Слот страницы -->
      <main class="flex-1 overflow-y-auto">
        <div class="p-4 lg:p-6">
          <slot />
        </div>
      </main>
    </div>
  </div>
</template>
