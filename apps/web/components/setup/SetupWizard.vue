<script setup lang="ts">
const { currentStep } = useSetup()
</script>

<template>
  <Transition name="fade" mode="out-in">
    <StepPassword v-if="currentStep === 1" key="step-1" />
    <StepBot v-else-if="currentStep === 2" key="step-2" />
    <StepChannel v-else-if="currentStep === 3" key="step-3" />
    <StepComplete v-else-if="currentStep === 4" key="step-4" />
  </Transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
