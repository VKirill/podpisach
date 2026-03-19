<script setup lang="ts">
const { currentStep } = useSetup()
</script>

<template>
  <div>
    <StepPassword v-if="currentStep === 1" />
    <StepBot v-else-if="currentStep === 2" />
    <StepChannel v-else-if="currentStep === 3" />
    <StepComplete v-else-if="currentStep === 4" />
  </div>
</template>
