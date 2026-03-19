<script setup lang="ts">
const { currentStep } = useSetup()
</script>

<template>
  <div>
    <SetupStepPassword v-if="currentStep === 1" />
    <SetupStepBot v-else-if="currentStep === 2" />
    <SetupStepChannel v-else-if="currentStep === 3" />
    <SetupStepComplete v-else-if="currentStep === 4" />
  </div>
</template>
