<script setup lang="ts">
import SaveToast from '@/components/common/SaveToast.vue'
import { Button } from '@/components/ui/button'

withDefaults(
  defineProps<{
    saved: boolean
    disabled: boolean
    saveLabel?: string
    savedMessage?: string
  }>(),
  {
    saveLabel: '변경 사항 저장',
    savedMessage: '변경 사항이 저장되었습니다.',
  },
)

defineEmits<{
  cancel: []
}>()
</script>

<template>
  <footer class="form-actions">
    <SaveToast :visible="saved" :message="savedMessage" inline />
    <div class="form-actions__buttons">
      <Button variant="outline" type="button" @click="$emit('cancel')">취소</Button>
      <Button type="submit" :disabled="disabled">{{ saveLabel }}</Button>
    </div>
  </footer>
</template>

<style scoped>
.form-actions {
  display: flex;
  width: 100%;
  min-height: 44px;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-left: auto;
  padding: 0;
}

.form-actions__buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-left: auto;
}

@media (max-width: 480px) {
  .form-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .form-actions__buttons {
    width: 100%;
    margin-left: 0;
  }

  .form-actions__buttons :deep([data-slot='button']) {
    min-width: 0;
    flex: 1 1 120px;
  }
}
</style>
