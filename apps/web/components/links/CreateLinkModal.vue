<script setup lang="ts">
import { CURRENCIES } from '@ps/shared'

interface Props {
  channelId: number
}

const props = defineProps<Props>()

const open = defineModel<boolean>({ default: false })
const emit = defineEmits<{ created: [] }>()

const name = ref('')
const utmSource = ref('')
const utmMedium = ref('')
const utmCampaign = ref('')
const utmContent = ref('')
const utmTerm = ref('')
const costAmount = ref<number | null>(null)
const costCurrency = ref('RUB')

const loading = ref(false)
const error = ref('')
const createdUrl = ref('')

const currencyOptions = CURRENCIES.map((c: string) => ({ label: c, value: c }))

function resetForm(): void {
  name.value = ''
  utmSource.value = ''
  utmMedium.value = ''
  utmCampaign.value = ''
  utmContent.value = ''
  utmTerm.value = ''
  costAmount.value = null
  costCurrency.value = 'RUB'
  error.value = ''
  createdUrl.value = ''
}

function handleClose(): void {
  open.value = false
  resetForm()
}

async function handleSubmit(): Promise<void> {
  if (!name.value.trim()) return
  loading.value = true
  error.value = ''
  try {
    const result = await $fetch<{ url: string; linkId: number }>('/api/links', {
      method: 'POST',
      body: {
        channelId: props.channelId,
        name: name.value.trim(),
        utmSource: utmSource.value || undefined,
        utmMedium: utmMedium.value || undefined,
        utmCampaign: utmCampaign.value || undefined,
        utmContent: utmContent.value || undefined,
        utmTerm: utmTerm.value || undefined,
        costAmount: costAmount.value ?? undefined,
        costCurrency: costAmount.value ? costCurrency.value : undefined,
      },
    })
    createdUrl.value = result.url
    emit('created')
  } catch (err: unknown) {
    const e = err as { data?: { message?: string }; message?: string }
    error.value = e?.data?.message ?? e?.message ?? 'Не удалось создать ссылку'
  } finally {
    loading.value = false
  }
}

async function copyCreatedUrl(): Promise<void> {
  await navigator.clipboard.writeText(createdUrl.value)
}

watch(open, (val) => {
  if (!val) resetForm()
})
</script>

<template>
  <UModal v-model:open="open" title="Создать ручную ссылку">
    <template #body>
      <div class="space-y-4">
        <!-- Успех: показываем созданную ссылку -->
        <template v-if="createdUrl">
          <div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-sm text-green-700 dark:text-green-300">
            ✅ Ссылка успешно создана!
          </div>
          <div class="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
            <span class="flex-1 text-sm font-mono break-all text-gray-700 dark:text-gray-300">{{ createdUrl }}</span>
            <UButton icon="i-heroicons-clipboard" size="sm" variant="ghost" @click="copyCreatedUrl">
              Скопировать
            </UButton>
          </div>
        </template>

        <!-- Форма создания -->
        <template v-else>
          <div
            v-if="error"
            class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-red-700 dark:text-red-300 text-sm"
          >
            ❌ {{ error }}
          </div>

          <UFormField label="Название *">
            <UInput v-model="name" placeholder="Реклама в Яндексе" :disabled="loading" class="w-full" />
          </UFormField>

          <div class="text-sm font-medium text-gray-700 dark:text-gray-300">UTM-метки</div>
          <div class="grid grid-cols-2 gap-3">
            <UFormField label="utm_source">
              <UInput v-model="utmSource" placeholder="yandex" :disabled="loading" class="w-full" />
            </UFormField>
            <UFormField label="utm_medium">
              <UInput v-model="utmMedium" placeholder="cpc" :disabled="loading" class="w-full" />
            </UFormField>
            <UFormField label="utm_campaign">
              <UInput v-model="utmCampaign" placeholder="spring_2025" :disabled="loading" class="w-full" />
            </UFormField>
            <UFormField label="utm_content">
              <UInput v-model="utmContent" placeholder="banner_1" :disabled="loading" class="w-full" />
            </UFormField>
            <UFormField label="utm_term" class="col-span-2">
              <UInput v-model="utmTerm" placeholder="keyword" :disabled="loading" class="w-full" />
            </UFormField>
          </div>

          <div class="text-sm font-medium text-gray-700 dark:text-gray-300">Затраты</div>
          <div class="flex gap-3">
            <UFormField label="Сумма" class="flex-1">
              <UInput
                v-model.number="costAmount"
                type="number"
                placeholder="1000"
                :disabled="loading"
                class="w-full"
              />
            </UFormField>
            <UFormField label="Валюта">
              <USelect
                v-model="costCurrency"
                :items="currencyOptions"
                value-key="value"
                label-key="label"
                :disabled="loading"
                class="w-24"
              />
            </UFormField>
          </div>
        </template>
      </div>
    </template>

    <template #footer>
      <div class="flex gap-2 justify-end">
        <UButton variant="ghost" @click="handleClose">
          {{ createdUrl ? 'Закрыть' : 'Отмена' }}
        </UButton>
        <UButton
          v-if="!createdUrl"
          color="primary"
          :loading="loading"
          :disabled="loading || !name.trim()"
          @click="handleSubmit"
        >
          Создать
        </UButton>
      </div>
    </template>
  </UModal>
</template>
