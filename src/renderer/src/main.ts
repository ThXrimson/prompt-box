import '@renderer/assets/main.css'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from '@renderer/App.vue'
import router from '@renderer/routers/menu-router'
import VueVirtualScroller from 'vue-virtual-scroller'

const pinia = createPinia()
const app = createApp(App)

app.use(pinia)
app.use(router)
app.use(VueVirtualScroller)
app.mount('#app')
