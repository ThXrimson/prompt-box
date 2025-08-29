import '@renderer/assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from '@renderer/App.vue'
import router from '@renderer/routers/menu-router'

const pinia = createPinia()
const app = createApp(App)

app.config.performance = true

app.use(pinia)
app.use(router)
app.mount('#app')
