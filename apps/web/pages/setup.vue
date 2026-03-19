<script setup lang="ts">
definePageMeta({ layout: 'setup', middleware: 'setup' })

const { checkStatus } = useSetup()
await checkStatus()
</script>

<template>
  <SetupWizard />
</template>
