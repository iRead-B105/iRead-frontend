export const responsiveLongTextFixture = {
  studentName: '김가나다라마바사아자',
  schoolName: '아이리드 미래교육 연구협력 부설 초등학교',
  teacherOrganization:
    '아이리드 미래교육 연구협력센터 통합학습지원실 아동읽기발달연구팀 지역연계교육지원단 디지털학습환경개선실 교수학습자료개발부',
  trainingName:
    '여러 문단의 핵심 내용을 비교하고 글의 흐름에 따라 중요한 문장을 찾아 요약하는 읽기 훈련',
  memo: '긴 메모에서도 저장 버튼과 글자 수 안내가 화면 밖으로 밀리지 않는지 확인합니다. '.repeat(
    44,
  ),
  errorMessage:
    '네트워크 연결이 불안정하여 요청을 완료하지 못했습니다. 입력한 내용은 유지되며 연결 상태를 확인한 뒤 다시 시도할 수 있습니다.',
  reportDescription:
    '최근 학습의 정확도와 참여 흐름, 시선 분석 상태를 함께 설명하는 긴 보고서 문구가 작은 화면과 확대 환경에서도 잘리지 않아야 합니다.',
} as const
