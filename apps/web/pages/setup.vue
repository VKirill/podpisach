<script setup lang="ts">
definePageMeta({ layout: 'setup', middleware: 'setup' })

const { checkStatus } = useSetup()

onMounted(async () => {
  await checkStatus()
})
</script>

<template>
  <ClientOnly>
    <SetupWizard />
    <template #fallback>
      <div class="text-center py-8">
        <div class="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p class="text-gray-500">Загрузка...</p>
      </div>
    </template>
  </ClientOnly>
</template>
