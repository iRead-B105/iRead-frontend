<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, shallowRef } from 'vue'
import AsyncStatePanel from '@/components/common/AsyncStatePanel.vue'
import FormActions from '@/components/teacher/FormActions.vue'
import PageHeader from '@/components/teacher/PageHeader.vue'
import ProfileImageEditor from '@/components/teacher/ProfileImageEditor.vue'
import SettingsSection from '@/components/teacher/SettingsSection.vue'
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
  authRepositories,
  createTeacherProfileDraft,
  getTeacherProfileErrorMessage,
  isSameTeacherProfileDraft,
  normalizeTeacherProfileDraft,
  TEACHER_PROFILE_MAX_LENGTH,
  validateTeacherProfileDraft,
  type TeacherProfile,
  type TeacherProfileDraft,
  type TeacherProfileFormErrors,
} from '@/features/teacher/auth'
import { useSessionStore } from '@/stores/session'

const sessionStore = useSessionStore()
const { visible: saved, show: showSaved } = useTemporaryNotice()
const repository = authRepositories.teacher

const loading = ref(true)
const saving = ref(false)
const loadError = ref('')
const saveError = ref('')
const savedMessage = ref('프로필 변경 사항이 저장되었습니다.')
const serverProfile = shallowRef<TeacherProfile | null>(null)
const selectedImage = shallowRef<File | null>(null)
const previewVersion = ref(0)
const formErrors = ref<TeacherProfileFormErrors>({})
const form = reactive<TeacherProfileDraft>({
  name: '',
  organization: '',
  gender: 'UNSPECIFIED',
})

const bodyChanged = computed(
  () => serverProfile.value !== null && !isSameTeacherProfileDraft(form, serverProfile.value),
)
const formChanged = computed(() => bodyChanged.value || selectedImage.value !== null)
const fallback = computed(() => serverProfile.value?.name.trim().charAt(0) || '교')

function applyProfile(profile: TeacherProfile): void {
  serverProfile.value = { ...profile }
  Object.assign(form, createTeacherProfileDraft(profile))
  sessionStore.replaceTeacherProfile(profile)
}

async function loadProfile(): Promise<void> {
  if (loading.value && serverProfile.value) return

  loading.value = true
  loadError.value = ''
  saveError.value = ''

  try {
    applyProfile(await repository.getInfo())
  } catch (error) {
    serverProfile.value = null
    loadError.value = getTeacherProfileErrorMessage(error, 'load')
  } finally {
    loading.value = false
  }
}

function selectImage(file: File): void {
  selectedImage.value = file
  saveError.value = ''
}

function showImageError(message: string | null): void {
  saveError.value = message ?? ''
}

function cancelChanges(): void {
  if (!serverProfile.value || saving.value) return

  Object.assign(form, createTeacherProfileDraft(serverProfile.value))
  selectedImage.value = null
  formErrors.value = {}
  saveError.value = ''
  previewVersion.value += 1
}

async function focusFirstError(errors: TeacherProfileFormErrors): Promise<void> {
  const fieldIds: Partial<Record<keyof TeacherProfileFormErrors, string>> = {
    name: 'teacher-name',
    organization: 'organization',
    gender: 'teacher-gender',
  }
  const firstField = Object.keys(errors).find(
    (field) => Boolean(errors[field as keyof TeacherProfileFormErrors]),
  ) as keyof TeacherProfileFormErrors | undefined
  const id = firstField ? fieldIds[firstField] : undefined
  if (!id) return
  await nextTick()
  document.getElementById(id)?.focus()
}

async function saveProfile(): Promise<void> {
  if (!serverProfile.value || saving.value || !formChanged.value) return

  const validationErrors = validateTeacherProfileDraft(form)
  formErrors.value = validationErrors
  if (Object.keys(validationErrors).length > 0) {
    await focusFirstError(validationErrors)
    return
  }

  saving.value = true
  saveError.value = ''
  let bodySaved = false

  try {
    if (bodyChanged.value) {
      const updatedProfile = await repository.updateProfile(normalizeTeacherProfileDraft(form))
      applyProfile(updatedProfile)
      bodySaved = true
    }

    if (selectedImage.value) {
      try {
        const updatedProfile = await repository.updateProfileImage(selectedImage.value)
        applyProfile(updatedProfile)
        selectedImage.value = null
        previewVersion.value += 1
      } catch (error) {
        previewVersion.value += 1
        saveError.value = bodySaved
          ? '기본 정보는 저장됐지만 사진 변경에 실패했습니다.'
          : getTeacherProfileErrorMessage(error, 'image')
        return
      }
    }

    savedMessage.value = '프로필 변경 사항이 저장되었습니다.'
    showSaved()
  } catch (error) {
    saveError.value = getTeacherProfileErrorMessage(error, 'save')
  } finally {
    saving.value = false
  }
}

onMounted(loadProfile)
</script>

<template>
  <div class="settings page-stack" :aria-busy="loading || saving">
    <PageHeader title="교수자 프로필" />

    <AsyncStatePanel
      v-if="loading"
      kind="loading"
      title="프로필 정보를 불러오는 중입니다"
      message="잠시만 기다려 주세요."
    />
    <AsyncStatePanel
      v-else-if="loadError"
      kind="error"
      title="프로필 정보를 불러오지 못했습니다"
      :message="loadError"
      retry-label="다시 시도"
      @retry="loadProfile"
    />

    <form
      v-else-if="serverProfile"
      id="teacher-profile-form"
      class="settings-form"
      @submit.prevent="saveProfile"
    >
      <SettingsSection title="프로필 사진">
        <ProfileImageEditor
          input-id="teacher-photo"
          label="교수자 사진"
          :image-url="serverProfile.profileImageUrl"
          :fallback="fallback"
          :preview-version="previewVersion"
          :disabled="saving"
          @select="selectImage"
          @error="showImageError"
        />
      </SettingsSection>

      <SettingsSection title="기본 정보">
        <div class="form-grid">
          <div class="field field--medium">
            <Label for="teacher-name">이름</Label>
            <Input
              id="teacher-name"
              v-model="form.name"
              class="input"
              required
              :maxlength="TEACHER_PROFILE_MAX_LENGTH.name"
              :disabled="saving"
              :aria-invalid="Boolean(formErrors.name)"
              :aria-describedby="formErrors.name ? 'teacher-name-error' : undefined"
            />
            <p v-if="formErrors.name" id="teacher-name-error" class="field-error">
              {{ formErrors.name }}
            </p>
          </div>

          <div class="field field--medium">
            <Label for="organization">소속 기관</Label>
            <Input
              id="organization"
              v-model="form.organization"
              class="input"
              :maxlength="TEACHER_PROFILE_MAX_LENGTH.organization"
              :disabled="saving"
              :aria-invalid="Boolean(formErrors.organization)"
              :aria-describedby="formErrors.organization ? 'organization-error' : undefined"
            />
            <p v-if="formErrors.organization" id="organization-error" class="field-error">
              {{ formErrors.organization }}
            </p>
          </div>

          <div class="field field--short">
            <Label for="teacher-gender">성별</Label>
            <Select v-model="form.gender" :disabled="saving">
              <SelectTrigger
                id="teacher-gender"
                class="select !w-full"
                :aria-invalid="Boolean(formErrors.gender)"
                :aria-describedby="formErrors.gender ? 'teacher-gender-error' : undefined"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UNSPECIFIED">선택 안 함</SelectItem>
                <SelectItem value="FEMALE">여자</SelectItem>
                <SelectItem value="MALE">남자</SelectItem>
              </SelectContent>
            </Select>
            <p v-if="formErrors.gender" id="teacher-gender-error" class="field-error">
              {{ formErrors.gender }}
            </p>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title="계정 정보">
        <div class="form-grid">
          <div class="field">
            <span id="teacher-email-label" class="readonly-label">이메일</span>
            <p id="teacher-email" class="readonly-value" aria-labelledby="teacher-email-label">
              {{ serverProfile.email }}
            </p>
          </div>
        </div>
      </SettingsSection>

      <p v-if="saveError" class="settings-error" role="alert">{{ saveError }}</p>

      <FormActions
        :saved="saved"
        :disabled="saving || !formChanged"
        :save-label="saving ? '저장 중...' : '변경 사항 저장'"
        :saved-message="savedMessage"
        @cancel="cancelChanges"
      />
    </form>
  </div>
</template>

<style scoped>
.settings {
  width: 100%;
  min-width: 0;
  max-width: 1020px;
  margin: 0 auto;
}

.settings-form {
  display: grid;
  gap: 2px;
}

.settings-state {
  display: grid;
  min-height: 220px;
  place-items: center;
  padding: 32px;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--card);
  color: var(--slate-600);
}

.settings-state--error {
  align-content: center;
  gap: 14px;
  color: var(--danger-600);
}

.settings-state--error p {
  margin: 0;
}

.form-grid {
  display: grid;
  max-width: 620px;
  gap: 18px 20px;
  grid-template-columns: minmax(0, 1fr);
}

.field-error {
  margin: -2px 0 0;
  font-size: 11px;
}

.field-error,
.settings-error {
  color: var(--danger-600);
}

.readonly-label {
  color: var(--foreground);
  font-size: 13px;
  font-weight: 500;
}

.readonly-value {
  min-height: 36px;
  margin: 0;
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--slate-50);
  color: var(--slate-600);
  font-size: 14px;
  line-height: 18px;
  user-select: text;
}

.settings-error {
  margin: 10px 0;
  padding: 10px 13px;
  border-radius: 8px;
  background: #fff1f2;
  font-size: 12px;
  overflow-wrap: anywhere;
}

.settings .button:disabled {
  border-color: var(--slate-200);
  background: var(--slate-100);
  color: var(--slate-400);
  cursor: default;
  transform: none;
}

@media (max-width: 480px) {
  .settings-state {
    min-height: 180px;
    padding: 24px 16px;
  }
}
</style>
