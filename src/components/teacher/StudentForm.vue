<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import FormActions from '@/components/teacher/FormActions.vue'
import PageHeader from '@/components/teacher/PageHeader.vue'
import ProfileImageEditor from '@/components/teacher/ProfileImageEditor.vue'
import SettingsSection from '@/components/teacher/SettingsSection.vue'
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
import type { Student } from '@/features/teacher/types'
import { studentApi, type Gender, type StudentPayload } from '@/features/teacher/adminApi'
import { useTeacherAdmin } from '@/features/teacher/useTeacherAdmin'

const props = defineProps<{
  mode: 'create' | 'edit'
  initialValue?: Student
}>()

const router = useRouter()
const { loadAdminData } = useTeacherAdmin()
const { visible: saved, show: showSaved } = useTemporaryNotice()
const photoChanged = ref(false)
const deleteDialogOpen = ref(false)

const emptyStudent: Student = {
  id: 0,
  name: '',
  age: 0,
  birthDate: '',
  gender: '남자',
  phone: '',
  school: '',
  guardianName: '',
  guardianRelation: '어머니',
  guardianPhone: '',
  guardianEmail: '',
  address: '',
  lastLearningDate: '',
  lastTestDate: '',
  totalLearningTime: '0시간',
  latestTraining: '-',
  lastAccess: '-',
  learningStartDate: '',
  weeklyAttendance: '0%',
}

const form = reactive<Student>({ ...(props.initialValue ?? emptyStudent) })
const savedSnapshot = ref(JSON.stringify(form))
const title = computed(() => (props.mode === 'create' ? '새 아동 등록' : '아동 정보 관리'))
const description = computed(() =>
  props.mode === 'create'
    ? '아동과 보호자 정보를 입력합니다.'
    : '아동과 보호자 정보를 수정합니다.',
)
const studentInitial = computed(() => form.name.trim().charAt(0) || '학')
const formChanged = computed(
  () => JSON.stringify(form) !== savedSnapshot.value || photoChanged.value,
)
const requiredFieldsEntered = computed(
  () =>
    Boolean(form.name.trim()) &&
    Boolean(form.birthDate) &&
    Boolean(form.school.trim()) &&
    Boolean(form.guardianName.trim()) &&
    Boolean(form.guardianPhone.trim()),
)
const canSubmit = computed(() => formChanged.value && requiredFieldsEntered.value)

function markPhotoChanged() {
  photoChanged.value = true
}

function toPayload(): StudentPayload {
  return {
    name: form.name,
    studentCode: form.id ? String(form.id) : `STU-${Date.now()}`,
    birthday: form.birthDate,
    gender: (form.gender === '남자' ? 'MALE' : 'FEMALE') as Gender,
    school: form.school,
    guardian: form.guardianName,
    guardianContact: form.guardianPhone,
    guardianEmail: form.guardianEmail,
    address: form.address,
    imageId: null,
  }
}

async function submitForm() {
  if (!canSubmit.value) return

  if (props.mode === 'create') await studentApi.create(toPayload())
  else await studentApi.update(form.id, toPayload())
  await loadAdminData(true)
  savedSnapshot.value = JSON.stringify(form)
  photoChanged.value = false
  showSaved()
  if (props.mode === 'create') await router.push('/teacher/dashboard')
}

async function confirmStudentDeletion() {
  await studentApi.remove(form.id)
  await loadAdminData(true)
  deleteDialogOpen.value = false
  await router.push('/teacher/dashboard')
}
</script>

<template>
  <form class="student-form page-stack" @submit.prevent="submitForm">
    <PageHeader :title="title" :description="description" />

    <SettingsSection title="아동 정보" description="학습 관리에 사용하는 정보입니다.">
      <ProfileImageEditor
        input-id="student-photo"
        label="프로필 사진"
        :image-url="initialValue?.profileImage"
        :fallback="studentInitial"
        button-label="사진 선택"
        @select="markPhotoChanged"
      />

      <div class="form-grid section-fields">
        <div class="field field--medium">
          <Label for="student-name">아동명</Label>
          <Input id="student-name" v-model="form.name" class="input" required placeholder="아동 이름" />
        </div>
        <div class="field field--date">
          <Label for="student-birth">생년월일</Label>
          <Input id="student-birth" v-model="form.birthDate" class="input" required type="date" />
        </div>
        <div class="field field--short">
          <Label for="student-gender">성별</Label>
          <Select v-model="form.gender">
            <SelectTrigger id="student-gender" class="select !w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="남자">남자</SelectItem>
              <SelectItem value="여자">여자</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="field field--phone">
          <Label for="student-phone">아동 연락처</Label>
          <Input id="student-phone" v-model="form.phone" class="input" placeholder="010-0000-0000" />
        </div>
        <div class="field form-grid__wide">
          <Label for="student-school">학교명</Label>
          <Input id="student-school" v-model="form.school" class="input" required placeholder="학교명" />
        </div>
      </div>
    </SettingsSection>

    <SettingsSection title="보호자 정보" description="상담에 사용할 보호자 연락처입니다.">
      <div class="form-grid">
        <div class="field field--medium">
          <Label for="guardian-name">보호자명</Label>
          <Input id="guardian-name" v-model="form.guardianName" class="input" required placeholder="보호자 이름" />
        </div>
        <div class="field field--short">
          <Label for="guardian-relation">관계</Label>
          <Select v-model="form.guardianRelation">
            <SelectTrigger id="guardian-relation" class="select !w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="어머니">어머니</SelectItem>
              <SelectItem value="아버지">아버지</SelectItem>
              <SelectItem value="조부모">조부모</SelectItem>
              <SelectItem value="기타">기타</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="field field--phone">
          <Label for="guardian-phone">보호자 연락처</Label>
          <Input id="guardian-phone" v-model="form.guardianPhone" class="input" required placeholder="010-0000-0000" />
        </div>
        <div class="field">
          <Label for="guardian-email">보호자 이메일</Label>
          <Input id="guardian-email" v-model="form.guardianEmail" class="input" type="email" placeholder="example@email.com" />
        </div>
        <div class="field form-grid__wide">
          <Label for="address">주소</Label>
          <Input id="address" v-model="form.address" class="input" placeholder="주소를 입력하세요" />
        </div>
      </div>
    </SettingsSection>

    <div class="student-form__footer">
      <FormActions
        :saved="saved"
        :disabled="!canSubmit"
        :save-label="mode === 'create' ? '아동 등록' : '변경 사항 저장'"
        :saved-message="mode === 'create' ? '아동 정보가 저장되었습니다.' : '변경 사항이 저장되었습니다.'"
        @cancel="router.back()"
      />

      <section v-if="mode === 'edit'" class="danger-zone" aria-label="아동 삭제">
        <div>
          <h2>아동 삭제</h2>
          <p>아동 목록에서 제외하고 연결된 학습 기록에 더 이상 접근할 수 없게 됩니다.</p>
        </div>
        <Button variant="destructive" size="sm" type="button" @click="deleteDialogOpen = true">
          아동 삭제
        </Button>
      </section>
    </div>

    <ConfirmDialog
      :open="deleteDialogOpen"
      title="아동을 삭제할까요?"
      :message="`${form.name} 아동을 목록에서 삭제합니다. 목업에서는 실제 데이터가 삭제되지 않습니다.`"
      confirm-label="아동 삭제"
      @cancel="deleteDialogOpen = false"
      @confirm="confirmStudentDeletion"
    />
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
  max-width: none;
}

.section-fields {
  padding-top: 18px;
  border-top: 1px solid var(--border);
}

.form-grid__wide {
  grid-column: 1 / -1;
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

@media (max-width: 760px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .form-grid__wide {
    grid-column: auto;
  }
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

.student-form .button:disabled {
  border-color: var(--slate-200);
  background: var(--slate-100);
  color: var(--slate-400);
  cursor: default;
  transform: none;
}
</style>
