<script setup lang="ts">
defineProps<{
  title: string
  description?: string
}>()
</script>

<template>
  <header class="page-header">
    <div class="page-header__copy">
      <h1>{{ title }}</h1>
      <p v-if="description" class="page-header__description">{{ description }}</p>
    </div>

    <div v-if="$slots.actions" class="page-header__actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<style scoped>
.page-header {
  display: flex;
  min-height: 76px;
  align-items: flex-end;
  justify-content: space-between;
  gap: 28px;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--slate-200);
}

.page-header__copy {
  display: grid;
  min-width: 0;
  gap: 5px;
}

.page-header h1 {
  margin: 0;
  color: var(--slate-950);
  font-size: 26px;
  line-height: 1.25;
}

.page-header__description {
  max-width: 680px;
  margin: 0;
  color: var(--slate-500);
  font-size: 12px;
  line-height: 1.55;
}

.page-header__actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 8px;
}
</style>
