<script setup lang="ts">
// 아동 상세 페이지 위쪽에서 공통으로 보이는 아동 요약 정보와 수정/삭제 동작입니다.
import { useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { selectedStudent } from '@/features/teacher/mockData'

const router = useRouter()

function deleteStudent() {
  // confirm이 true(확인)일 때만 다음 안내를 보여 줍니다. 목업이라 실제 삭제는 하지 않습니다.
  if (window.confirm('목업에서 이 아동을 삭제 처리할까요?')) {
    window.alert('목업 환경에서는 실제 데이터가 삭제되지 않습니다.')
  }
}
</script>

<template>
  <!-- dl은 용어(dt)와 설명(dd)이 짝을 이루는 정보 목록에 적합한 HTML 구조입니다. -->
  <section class="student-summary surface">
    <img src="/images/student-profile.png" :alt="selectedStudent.name" />
    <dl>
      <div>
        <dt>이름</dt>
        <dd>{{ selectedStudent.name }}</dd>
      </div>
      <div>
        <dt>학교</dt>
        <dd>{{ selectedStudent.school }}</dd>
      </div>
      <div>
        <dt>보호자</dt>
        <dd>{{ selectedStudent.guardianName }}</dd>
      </div>
      <div>
        <dt>학습 시작일</dt>
        <dd>{{ selectedStudent.learningStartDate }}</dd>
      </div>
      <div>
        <dt>최근 학습일</dt>
        <dd>{{ selectedStudent.lastTestDate }}</dd>
      </div>
      <div>
        <dt>이번 주 출석률</dt>
        <dd>{{ selectedStudent.weeklyAttendance }}</dd>
      </div>
    </dl>
    <div class="student-summary__actions">
      <!-- 클릭 시 수정 화면 주소를 이동 기록에 추가합니다. -->
      <Button
        variant="outline"
        size="sm"
        type="button"
        @click="router.push('/teacher/students/1/edit')"
      >
        정보 수정
      </Button>
      <Button variant="destructive" size="sm" type="button" @click="deleteStudent">
        아동 삭제
      </Button>
    </div>
  </section>
</template>

<style scoped>
.student-summary {
  /* 프로필 사진, 정보 목록, 버튼을 각각 세 열로 배치합니다. */
  display: grid;
  min-height: 146px;
  align-items: center;
  gap: 24px;
  padding: 20px 24px;
  grid-template-columns: 88px 1fr 106px;
}

.student-summary > img {
  width: 82px;
  height: 82px;
  border: 4px solid var(--primary-50);
  border-radius: 50%;
  object-fit: cover;
}

.student-summary dl {
  /* 여섯 개 정보를 한 줄에 세 개씩 보이도록 3열 Grid로 만듭니다. */
  display: grid;
  margin: 0;
  gap: 18px 24px;
  grid-template-columns: repeat(3, minmax(140px, 1fr));
}

.student-summary dl div {
  min-width: 0;
}

.student-summary dt {
  margin-bottom: 5px;
  color: var(--slate-500);
  font-size: 12px;
  font-weight: 700;
}

.student-summary dd {
  /* 긴 값은 한 줄로 유지하고 넘치는 부분을 말줄임표로 표시합니다. */
  overflow: hidden;
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.student-summary__actions {
  display: grid;
  gap: 8px;
}
</style>
