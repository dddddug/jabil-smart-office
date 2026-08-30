<script setup lang="ts">
import { RouterView } from 'vue-router'
import OfflineSyncIndicator from './components/OfflineSyncIndicator.vue'
</script>

<template>
  <RouterView />
  <OfflineSyncIndicator />
</template>

<style scoped>
</style>
