<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import FormActions from '@/components/teacher/FormActions.vue'
import PageHeader from '@/components/teacher/PageHeader.vue'
import ProfileImageEditor from '@/components/teacher/ProfileImageEditor.vue'
import SettingsSection from '@/components/teacher/SettingsSection.vue'
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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTemporaryNotice } from '@/composables/useTemporaryNotice'
import {
  buildStudentUpdateInput,
  createStudentFormDraft,
  normalizeStudentCreateInput,
  STUDENT_FIELD_MAX_LENGTH,
  validateStudentForm,
  type StudentDetail,
  type StudentFormErrors,
} from '@/features/teacher/student'
import { mapCommonError } from '@/features/teacher/error'
import { ApiError } from '@/lib/api'
import { useStudentStore } from '@/stores/students'

const props = defineProps<{
  mode: 'create' | 'edit'
  initialValue?: StudentDetail
}>()

const router = useRouter()
const studentStore = useStudentStore()
const { visible: saved, show: showSaved } = useTemporaryNotice()
const currentDetail = ref(props.initialValue)
const form = reactive(createStudentFormDraft(props.initialValue))
const selectedImage = ref<File | null>(null)
const imagePreviewVersion = ref(0)
const fieldErrors = ref<StudentFormErrors>({})
const submitting = ref(false)
const submitError = ref('')
const savedSnapshot = ref(JSON.stringify(form))

const deleteDialogOpen = ref(false)
const deleteConfirmation = ref('')
const deleteError = ref('')
const deleting = ref(false)

const title = computed(() => (props.mode === 'create' ? '새 아동 등록' : '아동 정보 관리'))
const description = computed(() =>
  props.mode === 'create' ? '아동과 보호자 정보를 입력합니다.' : '아동과 보호자 정보를 수정합니다.',
)
const studentInitial = computed(() => form.name.trim().charAt(0) || '학')
const formChanged = computed(
  () => JSON.stringify(form) !== savedSnapshot.value || selectedImage.value !== null,
)
const canSubmit = computed(() => formChanged.value && !submitting.value)
const canDelete = computed(
  () =>
    deleteConfirmation.value.trim() === form.name.trim() &&
    form.name.trim().length > 0 &&
    !deleting.value,
)

const fieldElementIds: Partial<Record<keyof StudentFormErrors, string>> = {
  name: 'student-name',
  birthday: 'student-birthday',
  gender: 'student-gender',
  school: 'student-school',
  guardian: 'guardian-name',
  guardianContact: 'guardian-contact',
  guardianEmail: 'guardian-email',
  address: 'student-address',
  image: 'student-photo',
}

function selectImage(file: File): void {
  selectedImage.value = file
  fieldErrors.value = { ...fieldErrors.value, image: undefined }
}

function setImageError(message: string | null): void {
  fieldErrors.value = { ...fieldErrors.value, image: message ?? undefined }
}

function markSaved(detail?: StudentDetail): void {
  if (detail) {
    currentDetail.value = detail
    Object.assign(form, createStudentFormDraft(detail))
  }
  selectedImage.value = null
  imagePreviewVersion.value += 1
  savedSnapshot.value = JSON.stringify(form)
}

async function focusFirstError(errors: StudentFormErrors): Promise<void> {
  const firstField = Object.keys(errors).find((field) =>
    Boolean(errors[field as keyof StudentFormErrors]),
  ) as keyof StudentFormErrors | undefined
  const elementId = firstField ? fieldElementIds[firstField] : undefined
  if (!elementId) return
  await nextTick()
  document.getElementById(elementId)?.focus()
}

function mutationErrorMessage(error: unknown, action: '저장' | '삭제'): string {
  if (error instanceof ApiError) {
    if (error.status === 403) return `이 아동 정보를 ${action}할 권한이 없습니다.`
    if (error.status === 404) return '아동을 찾을 수 없습니다. 목록에서 다시 선택해 주세요.'
    if (error.status === 409) {
      return action === '삭제'
        ? '연결된 기록 때문에 아동을 삭제할 수 없습니다.'
        : '다른 변경 사항과 충돌했습니다. 최신 정보를 확인해 주세요.'
    }
    if (error.status >= 500 || error.status === 0) {
      return `서버 문제로 아동 정보를 ${action}하지 못했습니다. 잠시 후 다시 시도해 주세요.`
    }
    return mapCommonError(error)?.message ?? `아동 정보를 ${action}하지 못했습니다.`
  }
  return mapCommonError(error)?.message ?? `아동 정보를 ${action}하지 못했습니다.`
}

async function submitForm(): Promise<void> {
  if (!canSubmit.value) return

  const validationErrors = validateStudentForm(form)
  if (fieldErrors.value.image) validationErrors.image = fieldErrors.value.image
  fieldErrors.value = validationErrors
  if (Object.keys(validationErrors).length > 0) {
    await focusFirstError(validationErrors)
    return
  }

  submitting.value = true
  submitError.value = ''
  try {
    if (props.mode === 'create') {
      await studentStore.createStudent({
        input: normalizeStudentCreateInput(form),
        image: selectedImage.value ?? undefined,
      })
      markSaved()
      await router.push({
        name: 'teacher-students',
        query: { studentSaved: 'created' },
      })
      return
    }

    if (!currentDetail.value) throw new Error('수정할 아동 정보가 없습니다.')
    const detail = await studentStore.updateStudent(currentDetail.value.studentId, {
      input: buildStudentUpdateInput(currentDetail.value, form),
      image: selectedImage.value ?? undefined,
    })
    markSaved(detail)
    showSaved()
  } catch (error) {
    submitError.value = mutationErrorMessage(error, '저장')
  } finally {
    submitting.value = false
  }
}

function openDeleteDialog(): void {
  deleteConfirmation.value = ''
  deleteError.value = ''
  deleteDialogOpen.value = true
}

function handleDeleteDialogOpen(nextOpen: boolean): void {
  if (!nextOpen && !deleting.value) deleteDialogOpen.value = false
}

async function confirmStudentDeletion(): Promise<void> {
  if (!canDelete.value || !currentDetail.value) return

  deleting.value = true
  deleteError.value = ''
  try {
    await studentStore.deleteStudent(currentDetail.value.studentId)
    savedSnapshot.value = JSON.stringify(form)
    selectedImage.value = null
    deleteDialogOpen.value = false
    await router.push({
      name: 'teacher-students',
      query: { studentSaved: 'deleted' },
    })
  } catch (error) {
    deleteError.value = mutationErrorMessage(error, '삭제')
  } finally {
    deleting.value = false
  }
}

function handleBeforeUnload(event: BeforeUnloadEvent): void {
  if (!formChanged.value) return
  event.preventDefault()
  event.returnValue = ''
}

onBeforeRouteLeave(() => {
  if (!formChanged.value) return true
  return window.confirm('저장하지 않은 변경 사항이 있습니다. 페이지를 나가시겠습니까?')
})

onMounted(() => window.addEventListener('beforeunload', handleBeforeUnload))
onBeforeUnmount(() => window.removeEventListener('beforeunload', handleBeforeUnload))
</script>

<template>
  <form class="student-form page-stack" novalidate @submit.prevent="submitForm">
    <PageHeader :title="title" :description="description" />

    <SettingsSection title="아동 정보" description="학습 관리에 사용하는 정보입니다.">
      <ProfileImageEditor
        input-id="student-photo"
        label="프로필 사진"
        :image-url="currentDetail?.imageUrl"
        :preview-version="imagePreviewVersion"
        :fallback="studentInitial"
        button-label="사진 선택"
        @select="selectImage"
        @error="setImageError"
      />
      <p v-if="fieldErrors.image" class="field-error" role="alert">{{ fieldErrors.image }}</p>

      <div class="form-grid section-fields">
        <div class="field">
          <Label for="student-name">아동명 <span aria-hidden="true">*</span></Label>
          <Input
            id="student-name"
            v-model="form.name"
            required
            :maxlength="STUDENT_FIELD_MAX_LENGTH.name"
            :aria-invalid="Boolean(fieldErrors.name)"
            :aria-describedby="fieldErrors.name ? 'student-name-error' : undefined"
            placeholder="아동 이름"
          />
          <p v-if="fieldErrors.name" id="student-name-error" class="field-error">
            {{ fieldErrors.name }}
          </p>
        </div>
        <div class="field">
          <Label for="student-birthday">생년월일 <span aria-hidden="true">*</span></Label>
          <Input
            id="student-birthday"
            v-model="form.birthday"
            required
            :aria-invalid="Boolean(fieldErrors.birthday)"
            :aria-describedby="fieldErrors.birthday ? 'student-birthday-error' : undefined"
            type="date"
          />
          <p v-if="fieldErrors.birthday" id="student-birthday-error" class="field-error">
            {{ fieldErrors.birthday }}
          </p>
        </div>
        <div class="field">
          <Label for="student-gender">성별 <span aria-hidden="true">*</span></Label>
          <Select v-model="form.gender">
            <SelectTrigger
              id="student-gender"
              class="!w-full"
              aria-required="true"
              :aria-invalid="Boolean(fieldErrors.gender)"
              :aria-describedby="fieldErrors.gender ? 'student-gender-error' : undefined"
            >
              <SelectValue placeholder="성별 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Boy">남자</SelectItem>
              <SelectItem value="Girl">여자</SelectItem>
            </SelectContent>
          </Select>
          <p v-if="fieldErrors.gender" id="student-gender-error" class="field-error">
            {{ fieldErrors.gender }}
          </p>
        </div>
        <div class="field">
          <Label for="student-school">학교명 <span aria-hidden="true">*</span></Label>
          <Input
            id="student-school"
            v-model="form.school"
            required
            :maxlength="STUDENT_FIELD_MAX_LENGTH.school"
            :aria-invalid="Boolean(fieldErrors.school)"
            :aria-describedby="fieldErrors.school ? 'student-school-error' : undefined"
            placeholder="학교명"
          />
          <p v-if="fieldErrors.school" id="student-school-error" class="field-error">
            {{ fieldErrors.school }}
          </p>
        </div>
      </div>
    </SettingsSection>

    <SettingsSection title="보호자 정보" description="상담에 사용할 보호자 연락처입니다.">
      <div class="form-grid">
        <div class="field">
          <Label for="guardian-name">보호자명 <span aria-hidden="true">*</span></Label>
          <Input
            id="guardian-name"
            v-model="form.guardian"
            required
            :maxlength="STUDENT_FIELD_MAX_LENGTH.guardian"
            :aria-invalid="Boolean(fieldErrors.guardian)"
            :aria-describedby="fieldErrors.guardian ? 'guardian-name-error' : undefined"
            placeholder="보호자 이름"
          />
          <p v-if="fieldErrors.guardian" id="guardian-name-error" class="field-error">
            {{ fieldErrors.guardian }}
          </p>
        </div>
        <div class="field">
          <Label for="guardian-contact">보호자 연락처 <span aria-hidden="true">*</span></Label>
          <Input
            id="guardian-contact"
            v-model="form.guardianContact"
            required
            :maxlength="STUDENT_FIELD_MAX_LENGTH.guardianContact"
            :aria-invalid="Boolean(fieldErrors.guardianContact)"
            :aria-describedby="
              fieldErrors.guardianContact ? 'guardian-contact-error' : undefined
            "
            inputmode="tel"
            placeholder="010-0000-0000"
          />
          <p v-if="fieldErrors.guardianContact" id="guardian-contact-error" class="field-error">
            {{ fieldErrors.guardianContact }}
          </p>
        </div>
        <div class="field">
          <Label for="guardian-email">보호자 이메일</Label>
          <Input
            id="guardian-email"
            v-model="form.guardianEmail"
            :maxlength="STUDENT_FIELD_MAX_LENGTH.guardianEmail"
            :aria-invalid="Boolean(fieldErrors.guardianEmail)"
            :aria-describedby="fieldErrors.guardianEmail ? 'guardian-email-error' : undefined"
            type="email"
            placeholder="example@email.com"
          />
          <p v-if="fieldErrors.guardianEmail" id="guardian-email-error" class="field-error">
            {{ fieldErrors.guardianEmail }}
          </p>
        </div>
        <div class="field form-grid__wide">
          <Label for="student-address">주소</Label>
          <Input
            id="student-address"
            v-model="form.address"
            :maxlength="STUDENT_FIELD_MAX_LENGTH.address"
            :aria-invalid="Boolean(fieldErrors.address)"
            :aria-describedby="fieldErrors.address ? 'student-address-error' : undefined"
            placeholder="주소를 입력하세요"
          />
          <p v-if="fieldErrors.address" id="student-address-error" class="field-error">
            {{ fieldErrors.address }}
          </p>
        </div>
      </div>
    </SettingsSection>

    <div class="student-form__footer">
      <p v-if="submitError" class="student-form__error" role="alert">{{ submitError }}</p>
      <FormActions
        :saved="saved"
        :disabled="!canSubmit"
        :save-label="mode === 'create' ? '아동 등록' : '변경 사항 저장'"
        :saved-message="
          mode === 'create' ? '아동이 등록되었습니다.' : '변경 사항이 저장되었습니다.'
        "
        @cancel="router.push({ name: 'teacher-students' })"
      />

      <section v-if="mode === 'edit'" class="danger-zone" aria-label="아동 삭제">
        <div>
          <h2>아동 삭제</h2>
          <p>연결된 학습 기록을 포함한 모든 데이터가 삭제되며 되돌릴 수 없습니다.</p>
        </div>
        <Button variant="destructive" size="sm" type="button" @click="openDeleteDialog">
          아동 삭제
        </Button>
      </section>
    </div>

    <AlertDialog :open="deleteDialogOpen" @update:open="handleDeleteDialogOpen">
      <AlertDialogContent class="delete-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>아동을 영구 삭제할까요?</AlertDialogTitle>
          <AlertDialogDescription>
            {{ form.name }} 아동과 연결된 학습 기록이 모두 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div class="delete-dialog__confirmation">
          <Label for="delete-student-name">
            확인하려면 <strong>{{ form.name }}</strong
            >을(를) 입력하세요.
          </Label>
          <Input
            id="delete-student-name"
            v-model="deleteConfirmation"
            autocomplete="off"
            :disabled="deleting"
          />
          <p v-if="deleteError" class="student-form__error" role="alert">{{ deleteError }}</p>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="deleting" @click="deleteDialogOpen = false">
            취소
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            :disabled="!canDelete"
            @click.prevent="confirmStudentDeletion"
          >
            {{ deleting ? '삭제 중...' : '영구 삭제' }}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </form>
</template>

<style scoped>
.student-form {
  max-width: 1080px;
  margin: 0 auto;
}

.form-grid {
  display: grid;
  max-width: none;
  gap: 18px 24px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.form-grid .field {
  display: grid;
  max-width: none;
  gap: 7px;
}

.section-fields {
  padding-top: 18px;
  border-top: 1px solid var(--border);
}

.form-grid__wide {
  grid-column: 1 / -1;
}

.field-error,
.student-form__error {
  margin: 0;
  color: var(--destructive);
  font-size: 13px;
}

.student-form__footer {
  display: grid;
  gap: 16px;
  padding-top: 2px;
}

.danger-zone {
  display: flex;
  min-height: 76px;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 16px 18px;
  border: 1px solid color-mix(in oklch, var(--destructive) 30%, var(--border));
  border-left: 3px solid var(--destructive);
  border-radius: var(--radius-lg);
  background: var(--white);
}

.danger-zone h2 {
  margin: 0;
  color: var(--destructive);
  font-size: 15px;
}

.danger-zone p {
  margin: 3px 0 0;
  color: var(--slate-500);
  font-size: 12px;
}

.delete-dialog {
  width: min(460px, calc(100% - 32px));
  max-width: 460px;
  padding: 24px;
}

.delete-dialog__confirmation {
  display: grid;
  gap: 8px;
}

@media (max-width: 760px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .form-grid__wide {
    grid-column: auto;
  }

  .danger-zone {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
