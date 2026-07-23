<script setup lang="ts">
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'

defineProps<{
  title: string
  description?: string
}>()
</script>

<template>
  <Card class="settings-section" :aria-label="title">
    <CardHeader class="settings-section__header">
      <div>
        <h2>{{ title }}</h2>
        <CardDescription v-if="description">{{ description }}</CardDescription>
      </div>
      <slot name="actions" />
    </CardHeader>
    <CardContent class="settings-section__content"><slot /></CardContent>
  </Card>
</template>

<style scoped>
.settings-section {
  display: grid;
  gap: 0;
  overflow: visible;
  padding: 0;
  border-radius: var(--radius-lg);
  background: var(--card);
}

.settings-section + .settings-section {
  margin-top: 12px;
}

.settings-section__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  padding: 18px 20px;
  border-bottom: 1px solid var(--border);
}

.settings-section__header h2 {
  margin: 0;
  color: var(--slate-950);
  font-size: 17px;
}

.settings-section__header :deep([data-slot='card-description']) {
  margin: 3px 0 0;
  color: var(--slate-500);
  font-size: 12px;
}

.settings-section__content {
  min-width: 0;
  padding: 20px;
}

@media (max-width: 900px) {
  .settings-section__header,
  .settings-section__content {
    padding-right: 16px;
    padding-left: 16px;
  }
}
</style>
