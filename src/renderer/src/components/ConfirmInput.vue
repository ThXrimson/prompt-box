<template>
  <div class="flex relative w-full border border-gray-300 rounded">
    <el-input
      v-if="isEditing"
      ref="inputRef"
      v-model="editValue"
      type="textarea"
      :placeholder="placeholder"
      :size="size"
      :clearable="clearable"
      resize="none"
      class="example-input"
      @blur="handleSave"
      @keyup.esc="handleCancel"
    />

    <el-scrollbar
      v-else
      class="flex-1 flex"
      wrap-class="flex-1 flex"
      view-class="flex justify-between w-full py-1 px-2 transition-all duration-200 hover:border-gray-400"
      @click="handleEdit"
    >
      <el-text
        class="confirm-text w-full leading-5 max-h-32"
        :class="{
          'text-gray-400!': checkTextEmpty(displayValue),
          'text-gray-700!': !checkTextEmpty(displayValue),
        }"
      >
        {{
          checkTextEmpty(displayValue)
            ? placeholder || '点击编辑'
            : displayValue
        }}
      </el-text>
      <!-- <el-icon
        class="text-base cursor-pointer text-gray-600 hover:text-blue-500 transition-colors duration-200 ml-2 flex-shrink-0"
        @click="handleEdit"
      >
        <Edit />
      </el-icon> -->
    </el-scrollbar>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { ElInput } from 'element-plus'

interface Props {
  modelValue?: string
  placeholder?: string
  type?: 'text' | 'textarea'
  size?: 'large' | 'default' | 'small'
  clearable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  placeholder: '',
  size: 'default',
  clearable: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'save', value: string): void
  (e: 'cancel', originalValue: string): void
  (e: 'edit'): void // 抛出编辑事件
}>()

const isEditing = ref(false) // 是否处于编辑状态
const displayValue = ref(props.modelValue) // 显示的值
const editValue = ref(props.modelValue) // 编辑时绑定的值
let originalValue = props.modelValue // 进入编辑前的原始值
const inputRef = ref<InstanceType<typeof ElInput> | null>(null) // el-input 实例引用

// 监听 modelValue 的变化，同步更新 displayValue
watch(
  () => props.modelValue,
  (newValue) => {
    // 只有在非编辑状态下才更新 displayValue，避免编辑时外部传入值覆盖
    if (!isEditing.value) {
      displayValue.value = newValue
      originalValue = newValue // 外部更新时，也更新原始值
    }
  },
  { immediate: true }
)

// 处理点击编辑图标
function handleEdit(): void {
  isEditing.value = true
  editValue.value = displayValue.value
  originalValue = displayValue.value
  emit('edit')
  nextTick(() => {
    inputRef.value?.focus()
  })
  return
}

function handleSave(): void {
  isEditing.value = false
  if (editValue.value === originalValue) return
  emit('update:modelValue', editValue.value)
  emit('save', editValue.value)
}

function handleCancel(): void {
  isEditing.value = false
  emit('cancel', originalValue)
}

function checkTextEmpty(text: string): boolean {
  return text === '' || text === null || text === undefined
}
</script>

<style scoped>
.example-input :deep(.el-textarea__inner) {
  field-sizing: content;
  max-height: 8.5rem;
}
</style>
