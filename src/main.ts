// 모든 화면에 공통 적용할 색상, 글꼴, 버튼 등의 CSS를 가장 먼저 불러옵니다.
import './assets/main.css'

// createApp은 Vue 앱을 만들고, App은 화면 전체의 시작 컴포넌트입니다.
import { createApp } from 'vue'
import App from './App.vue'
// router는 URL에 따라 어떤 Vue 화면을 보여 줄지 결정합니다.
import router from './router'

// App.vue를 뿌리로 하는 Vue 애플리케이션 인스턴스를 생성합니다.
const app = createApp(App)

// 앱 전체에서 RouterLink, RouterView 같은 페이지 이동 기능을 사용할 수 있게 합니다.
app.use(router)

// index.html의 <div id="app"> 안에 Vue 화면을 실제로 그리기 시작합니다.
app.mount('#app')
