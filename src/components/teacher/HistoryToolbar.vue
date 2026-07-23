<template>
  <section class="history-toolbar" aria-label="이력 조회 조건">
    <div class="history-toolbar__controls">
      <slot />
    </div>
    <div v-if="$slots.status" class="history-toolbar__status">
      <slot name="status" />
    </div>
  </section>
</template>

<style scoped>
.history-toolbar {
  display: flex;
  min-height: 64px;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  padding: 10px 0 14px;
  border-bottom: 1px solid var(--slate-200);
}

.history-toolbar__controls {
  display: flex;
  min-width: 0;
  align-items: flex-end;
  gap: 12px;
}

.history-toolbar__status {
  flex: 0 0 auto;
  align-self: center;
  color: var(--slate-500);
  font-size: 12px;
}

@media (max-width: 900px) {
  .history-toolbar,
  .history-toolbar__controls {
    align-items: stretch;
    flex-direction: column;
  }

  .history-toolbar__status {
    align-self: flex-start;
  }
}
</style>
