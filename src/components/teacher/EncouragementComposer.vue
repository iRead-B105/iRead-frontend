<script setup lang="ts">
import { computed, ref } from 'vue'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'

const props = withDefaults(
  defineProps<{
    modelValue: string
    editing?: boolean
    busy?: boolean
  }>(),
  { editing: false, busy: false },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  submit: [deliveryTiming: 'immediate' | 'next-login']
  cancelEdit: []
}>()

const deliveryTiming = ref<'immediate' | 'next-login'>('next-login')

const canSubmit = computed(() => props.modelValue.trim().length > 0 && !props.busy)
</script>

<template>
  <section
    class="encouragement-composer"
    :aria-label="editing ? '전달 전 응원 수정' : '새 응원 작성'"
  >
    <label class="composer-field">
      <span>전달 문장</span>
      <Textarea
        class="textarea"
        :value="modelValue"
        maxlength="180"
        placeholder="아동에게 전할 응원을 작성해 주세요."
        @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
      />
      <small>{{ modelValue.length }}/180자</small>
    </label>

    <div class="composer-footer">
      <fieldset class="delivery-timing">
        <legend>전달 시점</legend>
        <RadioGroup v-model="deliveryTiming" class="delivery-timing__options">
          <label>
            <RadioGroupItem value="immediate" />
            바로 전달
          </label>
          <label>
            <RadioGroupItem value="next-login" />
            다음 로그인 때 전달
          </label>
        </RadioGroup>
      </fieldset>

      <div class="composer-actions">
        <Button
          v-if="editing"
          variant="outline"
          size="sm"
          type="button"
          @click="emit('cancelEdit')"
        >
          수정 취소
        </Button>
        <Button
          size="sm"
          type="button"
          :disabled="!canSubmit"
          @click="emit('submit', deliveryTiming)"
        >
          {{ busy ? '처리 중…' : editing ? '수정 내용 저장' : '응원 전달' }}
        </Button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.encouragement-composer {
  display: grid;
  gap: 14px;
}
.composer-field {
  display: grid;
  gap: 6px;
}
.composer-field > span,
.delivery-timing legend {
  color: var(--slate-700);
  font-size: 12px;
  font-weight: 700;
}
.composer-field .textarea {
  min-height: 88px;
}
.composer-field small {
  justify-self: end;
  color: var(--slate-400);
  font-size: 10px;
}
.composer-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 16px;
}
.delivery-timing {
  display: flex;
  align-items: center;
  gap: 16px;
  margin: 0;
  padding: 0;
  border: 0;
}
.delivery-timing legend {
  float: left;
  margin-right: 14px;
}
.delivery-timing label {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--slate-600);
  font-size: 11px;
}
.delivery-timing__options {
  display: flex;
  gap: 16px;
}
.composer-actions {
  display: flex;
  flex: 0 0 auto;
  justify-content: flex-end;
  gap: 7px;
}
@media (max-width: 720px) {
  .composer-footer {
    align-items: flex-start;
    flex-direction: column;
  }
  .composer-actions {
    width: 100%;
  }
}
</style>
