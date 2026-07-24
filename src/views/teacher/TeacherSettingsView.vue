<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
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
import { teacherApi } from '@/features/teacher/adminApi'

const router = useRouter()
const { visible: saved, show: showSaved } = useTemporaryNotice()
const photoChanged = ref(false)
const form = reactive({
  name: '이OO',
  organization: 'OO복지센터',
  email: 'ssafy123@ssafy.com',
  gender: '여자',
  phone: '010-1234-5678',
  address: '서울특별시 강남구 테헤란로 212',
})
const savedSnapshot = ref(JSON.stringify(form))
const formChanged = computed(
  () => JSON.stringify(form) !== savedSnapshot.value || photoChanged.value,
)

function markPhotoChanged() {
  photoChanged.value = true
}

function saveProfile() {
  if (!formChanged.value) return
  savedSnapshot.value = JSON.stringify(form)
  photoChanged.value = false
  showSaved()
}

onMounted(async () => {
  const teacher = await teacherApi.getInfo()
  form.name = teacher.name
  form.organization = teacher.organization
  form.email = teacher.email
  form.gender = teacher.gender === 'Male' ? '남자' : '여자'
  savedSnapshot.value = JSON.stringify(form)
})
</script>

<template>
  <div class="settings page-stack">
    <PageHeader
      title="교수자 프로필"
      description="교수자 정보를 관리합니다."
    />

    <form id="teacher-profile-form" class="settings-form" @submit.prevent="saveProfile">
      <SettingsSection title="프로필 사진" description="사진을 확인하거나 변경합니다.">
        <ProfileImageEditor
          input-id="teacher-photo"
          label="교수자 사진"
          image-url="/images/teacher-profile.png"
          fallback="이"
          @select="markPhotoChanged"
        />
      </SettingsSection>

      <SettingsSection title="기본 정보" description="이름과 소속 기관을 관리합니다.">
        <div class="form-grid">
          <div class="field field--medium">
            <Label for="teacher-name">이름</Label>
            <Input id="teacher-name" v-model="form.name" class="input" required />
          </div>
          <div class="field field--medium">
            <Label for="organization">소속 기관</Label>
            <Input id="organization" v-model="form.organization" class="input" required />
          </div>
          <div class="field field--short">
            <Label for="teacher-gender">성별</Label>
            <Select v-model="form.gender">
              <SelectTrigger id="teacher-gender" class="select !w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="여자">여자</SelectItem>
                <SelectItem value="남자">남자</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title="연락처" description="상담과 안내에 사용할 연락처입니다.">
        <div class="form-grid">
          <div class="field">
            <Label for="teacher-email">이메일</Label>
            <Input id="teacher-email" v-model="form.email" class="input" type="email" required />
          </div>
          <div class="field field--phone">
            <Label for="teacher-phone">연락처</Label>
            <Input id="teacher-phone" v-model="form.phone" class="input" />
          </div>
          <div class="field form-grid__wide">
            <Label for="teacher-address">주소</Label>
            <Input id="teacher-address" v-model="form.address" class="input" />
          </div>
        </div>
      </SettingsSection>

      <FormActions
        :saved="saved"
        :disabled="!formChanged"
        saved-message="프로필 변경 사항이 저장되었습니다."
        @cancel="router.back()"
      />
    </form>
  </div>
</template>

<style scoped>
.settings {
  max-width: 1020px;
  margin: 0 auto;
}

.settings-form {
  display: grid;
  gap: 2px;
}

.form-grid {
  display: grid;
  max-width: 620px;
  gap: 18px 20px;
  grid-template-columns: minmax(0, 1fr);
}

.form-grid__wide {
  grid-column: 1 / -1;
}

.settings .button:disabled {
  border-color: var(--slate-200);
  background: var(--slate-100);
  color: var(--slate-400);
  cursor: default;
  transform: none;
}
</style>
