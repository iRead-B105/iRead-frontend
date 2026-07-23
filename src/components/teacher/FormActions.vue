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
  gap: 8px;
  margin-left: auto;
}
</style>
