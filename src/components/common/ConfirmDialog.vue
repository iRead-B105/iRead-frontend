<script setup lang="ts">
import { CircleAlert } from '@lucide/vue'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

withDefaults(
  defineProps<{
    open: boolean
    title: string
    message: string
    confirmLabel?: string
    tone?: 'danger' | 'primary'
  }>(),
  { confirmLabel: '삭제', tone: 'danger' },
)

defineEmits<{ cancel: []; confirm: [] }>()
</script>

<template>
  <AlertDialog :open="open">
    <AlertDialogContent class="confirm-dialog">
      <AlertDialogHeader>
        <span class="confirm-dialog__icon" :class="`is-${tone}`" aria-hidden="true">
          <CircleAlert :size="24" />
        </span>
        <AlertDialogTitle>{{ title }}</AlertDialogTitle>
        <AlertDialogDescription>{{ message }}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel @click="$emit('cancel')">취소</AlertDialogCancel>
        <AlertDialogAction
          :variant="tone === 'danger' ? 'destructive' : 'default'"
          @click="$emit('confirm')"
        >
          {{ confirmLabel }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>

<style scoped>
.confirm-dialog {
  width: min(420px, 100%);
  padding: 24px;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  text-align: center;
}
.confirm-dialog__icon {
  display: grid;
  width: 48px;
  height: 48px;
  margin: 0 auto 15px;
  border-radius: 50%;
  background: color-mix(in oklch, var(--destructive) 14%, white);
  color: var(--danger-600);
  place-items: center;
}
.confirm-dialog__icon.is-primary { background: var(--primary-50); color: var(--primary-700); }
</style>
