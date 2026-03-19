<script setup lang="ts">
import { APP_VERSION } from '~/utils/constants'
</script>

<template>
  <footer class="py-4 px-6 border-t border-gray-200 dark:border-gray-800 text-center">
    <p class="text-sm text-gray-500 dark:text-gray-400">
      Откуда подписчик v{{ APP_VERSION }} •
      <a
        href="https://github.com/otkuda-podpischik/otkuda-podpischik"
        target="_blank"
        rel="noopener noreferrer"
        class="hover:text-primary-600 transition-colors"
      >Open Source</a>
    </p>
  </footer>
</template>
