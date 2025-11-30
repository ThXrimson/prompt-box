<template>
    <el-scrollbar class="w-fit flex-1 border-gray-200 border-2 rounded-md">
        <vue-draggable
            v-model="images"
            :animation="100"
            class="grid grid-cols-4 lg:grid-cols-6 p-2 gap-2 min-w-0 min-h-0 overflow-y-auto overflow-x-hidden self-start"
            @end="handleDragEnd"
        >
            <div
                v-for="(image, index) in images"
                :key="image.id"
                class="image-wrapper relative hover:[&_.delete-button]:opacity-80"
            >
                <el-image
                    :src="getImageUrl(image.fileName)"
                    :preview-src-list="images.map((img) => getImageUrl(img.fileName))"
                    :initial-index="index"
                    class="w-30 h-30 object-cover rounded-md border-1 border-gray-300"
                    fit="scale-down"
                    loading="lazy"
                    hide-on-click-modal
                />
                <el-icon
                    size="1.2rem"
                    class="delete-button absolute! top-1 right-1 rounded-full bg-gray-200 text-gray-600! opacity-0 transition-all duration-300 cursor-pointer hover:bg-gray-400"
                    @click="deleteImage(image.id)"
                >
                    <Close />
                </el-icon>
                <el-icon
                    size="1.2rem"
                    class="delete-button absolute! bottom-2 right-1 rounded-full p-[2px] bg-gray-200 text-gray-600! opacity-0 transition-all duration-300 cursor-pointer hover:bg-gray-400"
                    @click="handleCopyImageToClipboard(image.id)"
                >
                    <SaveIcon />
                </el-icon>
            </div>
            <div
                v-for="i in loadingPlaceholder"
                :key="i"
                v-loading="true"
                class="w-30! h-30! rounded-md bg-gray-400"
            />
            <!-- 添加图片 -->
            <el-button
                :icon="Plus"
                class="w-30! h-30! rounded-md"
                @click="handleOpenAddImageDialog"
            />
        </vue-draggable>
    </el-scrollbar>

    <!-- 添加图片对话框 -->
    <el-dialog
        v-model="addImageDialogVisible"
        title="添加图片"
        @keyup.esc.stop.prevent="handleCancelAddExampleImage"
    >
        <el-text>图片地址（URL或本地文件）</el-text>
        <div class="flex gap-2">
            <el-input v-model="candidateImage" @paste="handlePaste" @drop.prevent="handleDrop" />
            <el-button type="success" @click="handleSelectImageFile"> 选择图片 </el-button>
        </div>
        <template #footer>
            <div>
                <el-button type="primary" @click="handleConfirmAddExampleImage"> 确定 </el-button>
                <el-button type="danger" @click="handleCancelAddExampleImage"> 取消 </el-button>
            </div>
        </template>
    </el-dialog>
</template>

<script setup lang="ts">
import { useDataStore } from '@renderer/stores/data'
import { getImageUrl } from '@renderer/utils/utils'
import { ref, watch } from 'vue'
import { Plus, Close } from '@element-plus/icons-vue'
import SaveIcon from '@renderer/icons/Save.vue'
import { VueDraggable } from 'vue-draggable-plus'
import { Image } from '@shared/models/image'
import { isNil } from 'lodash'

const props = defineProps<{
    exampleId: string
}>()

const dataStore = useDataStore()

const images = ref<Image[]>([])
watch(
    () => dataStore.example.idToImages.get(props.exampleId) || [],
    (newImages) => {
        images.value = [] as Image[]
        for (const image of newImages) {
            images.value.push({
                id: image.id,
                fileName: image.fileName,
                createTime: image.createTime,
                updateTime: image.updateTime,
            })
        }
    },
    { immediate: true }
)

const addImageDialogVisible = ref(false)
const candidateImage = ref<string>('')

const loadingPlaceholder = ref(0)

//#region 选择图片文件的函数
function handlePaste(event: ClipboardEvent): void {
    if (event.clipboardData === null || event.clipboardData.items.length === 0) {
        return
    }
    const item = event.clipboardData.items[0]
    if (item.kind === 'file') {
        candidateImage.value = window.api.other.getPathForFile(item.getAsFile()!)
    }
}

function handleDrop(event: DragEvent): void {
    if (event.dataTransfer === null || event.dataTransfer.files.length === 0) {
        return
    }
    const file = event.dataTransfer.files[0]
    candidateImage.value = window.api.other.getPathForFile(file)
}

async function handleSelectImageFile(): Promise<void> {
    const result = await window.api.other.openImageDialog()
    if (result) {
        candidateImage.value = result
    }
}
//#endregion

//#region 打开退出对话框回调
function handleOpenAddImageDialog(): void {
    addImageDialogVisible.value = true
}

async function handleConfirmAddExampleImage(): Promise<void> {
    loadingPlaceholder.value += 1
    addImageDialogVisible.value = false
    if (candidateImage.value === '') {
        ElMessage.warning('请输入图片路径或选择图片文件')
        return
    }
    const exampleIndex = dataStore.example.readonly.findIndex((e) => e.id === props.exampleId)
    if (exampleIndex === -1) {
        ElMessage.error('示例不存在')
        return
    }
    const image = await dataStore.image.create(candidateImage.value)
    if (isNil(image)) {
        ElMessage.warning('添加图片失败，请检查路径或格式是否正确')
    }
    await dataStore.example.update({
        id: props.exampleId,
        imageIds: [...dataStore.example.readonly[exampleIndex].imageIds, image.id],
    })
    loadingPlaceholder.value -= 1
    candidateImage.value = ''
}

async function deleteImage(imageID: string): Promise<void> {
    const success = await dataStore.image.delete(imageID)
    if (!success) {
        ElMessage.error('删除图片失败，请稍后再试')
    } else {
        ElMessage.success('图片已删除')
    }
}
//#endregion

function handleCancelAddExampleImage(): void {
    addImageDialogVisible.value = false
    candidateImage.value = ''
}

async function handleCopyImageToClipboard(imageId: string): Promise<void> {
    const success = await window.api.image.saveImage(imageId)
    if (success) {
        ElMessage.success('图片已保存')
    } else {
        ElMessage.error('图片保存失败')
    }
}

async function handleDragEnd(): Promise<void> {
    await dataStore.example.update({
        id: props.exampleId,
        imageIds: images.value.map((img) => img.id),
    })
}
</script>

<style scoped></style>
