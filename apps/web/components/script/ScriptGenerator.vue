<script setup lang="ts">
const modelValue = defineModel<number | undefined>({ default: undefined })

const { channels, loading, fetchChannels } = useChannels()
const config = useRuntimeConfig()
const copied = ref(false)

const appUrl = config.public.appUrl as string

const activeChannels = computed(() =>
  channels.value.filter((c) => c.isActive),
)

const channelOptions = computed(() =>
  activeChannels.value.map((c) => ({
    label: c.title,
    value: c.id,
  })),
)

const selectedChannel = computed(() =>
  activeChannels.value.find((c) => c.id === modelValue.value) ?? null,
)

// КРИТИЧНО: '</' + 'script>' и '<' + 'script' — не писать теги script литерально, это сломает SFC парсер
const scriptClose = '</' + 'script>'
const scriptOpen = '<' + 'script'

const generatedCode = computed(() => {
  if (!selectedChannel.value) return ''
  const { id, username } = selectedChannel.value
  const href = username ? `https://t.me/${username}` : '#'

  return [
    '<!-- ПодписачЪ — трекинг (1 строка) -->',
    scriptOpen + ` src="${appUrl}/t.js?id=${id}" defer>` + scriptClose,
    '',
    '<!-- Кнопка подписки (разместите где нужно) -->',
    `<a href="${href}" data-ps-subscribe>`,
    '  Подписаться на канал',
    '</a>',
  ].join('\n')
})

const isLocalhost = computed(() =>
  appUrl.includes('localhost') || appUrl.includes('127.0.0.1'),
)

async function copyCode(): Promise<void> {
  if (!generatedCode.value) return
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(generatedCode.value)
    } else {
      // Fallback для HTTP без Clipboard API
      const el = document.createElement('textarea')
      el.value = generatedCode.value
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch {
    // игнорировать ошибки буфера обмена
  }
}

onMounted(() => {
  fetchChannels()
})
</script>

<template>
  <UCard>
    <template #header>
      <h2 class="text-lg font-semibold">Генератор JS-скрипта</h2>
    </template>

    <div class="space-y-4">
      <div>
        <label class="block text-sm font-medium mb-1">Канал</label>
        <USelect
          v-model="modelValue"
          :items="channelOptions"
          value-key="value"
          label-key="label"
          :loading="loading"
          placeholder="Выберите канал..."
          class="w-full"
        />
      </div>

      <template v-if="selectedChannel">
        <UAlert
          v-if="isLocalhost"
          color="warning"
          icon="i-heroicons-exclamation-triangle"
          title="Предупреждение"
          description="APP_URL содержит localhost. Замените на публичный URL сервера перед использованием на сайте."
        />

        <div>
          <label class="block text-sm font-medium mb-1">Код для установки</label>
          <UTextarea
            :model-value="generatedCode"
            readonly
            :rows="6"
            class="font-mono text-sm w-full"
          />
        </div>

        <UButton
          :icon="copied ? 'i-heroicons-check' : 'i-heroicons-clipboard'"
          :color="copied ? 'success' : 'primary'"
          @click="copyCode"
        >
          {{ copied ? 'Скопировано!' : 'Скопировать код' }}
        </UButton>

        <UAlert
          color="info"
          icon="i-heroicons-information-circle"
          title="Инструкция по установке"
        >
          <template #description>
            <ul class="list-disc list-inside space-y-1 text-sm mt-1">
              <li>Скопируйте одну строку скрипта на ваш сайт перед <code class="font-mono">&lt;/body&gt;</code></li>
              <li>Добавьте атрибут <code class="font-mono">data-ps-subscribe</code> к кнопке подписки</li>
              <li>Скрипт автоматически определит сервер и подставит invite-ссылку</li>
            </ul>
          </template>
        </UAlert>
      </template>

      <UAlert
        v-else
        color="neutral"
        icon="i-heroicons-cursor-arrow-rays"
        description="Выберите канал для генерации кода установки."
      />
    </div>
  </UCard>
</template>
