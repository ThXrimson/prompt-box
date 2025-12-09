import { createRouter, createWebHashHistory } from 'vue-router'
import PromptCollection from '@renderer/views/PromptCollection.vue'
import WorkspaceList from '@renderer/views/WorkspaceList.vue'
import Examples from '@renderer/views/ExampleList.vue'
import Workspace from '@renderer/views/Workspace.vue'

const router = createRouter({
    history: createWebHashHistory(),
    routes: [
        {
            path: '/',
            redirect: '/prompt-collection',
        },
        {
            path: '/prompt-collection',
            component: PromptCollection,
        },
        {
            path: '/workspaces',
            component: WorkspaceList,
        },
        {
            path: '/examples',
            component: Examples,
        },
        {
            path: '/workspace/:workspaceId',
            component: Workspace,
            props: true, // 允许将路由参数作为组件的 props
        },
    ],
})
export default router
