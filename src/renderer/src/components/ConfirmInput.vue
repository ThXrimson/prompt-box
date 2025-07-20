<template>
  <div class="inline-flex items-center relative w-full">
    <el-input
      v-if="isEditing"
      ref="inputRef"
      v-model="editValue"
      :placeholder="placeholder"
      :size="size"
      :clearable="clearable"
      @keyup.enter="handleSave"
      @keyup.esc="handleCancel"
    >
      <template #suffix>
        <div class="flex items-center gap-2 pr-2.5">
          <el-icon
            class="text-base cursor-pointer text-gray-600 hover:text-green-500 transition-colors duration-200"
            @click="handleSave"
          >
            <Check />
          </el-icon>
          <el-icon
            class="text-base cursor-pointer text-gray-600 hover:text-red-500 transition-colors duration-200"
            @click="handleCancel"
          >
            <Close />
          </el-icon>
        </div>
      </template>
    </el-input>

    <div
      v-else
      class="flex items-center justify-between w-full px-[11px] py-[0.2px] min-h-8 leading-8 border border-gray-300 rounded box-border transition-all duration-200 hover:border-gray-400 focus-within:border-blue-500 focus-within:shadow-[0_0_0_1px_theme(colors.blue.500)]"
    >
      <el-text
        class="flex-grow overflow-hidden whitespace-nowrap leading-[30px]"
        :class="{
          'text-gray-400!':
            displayValue === '' ||
            displayValue === null ||
            displayValue === undefined,
          'text-gray-700!': !(
            displayValue === '' ||
            displayValue === null ||
            displayValue === undefined
          ),
        }"
      >
        {{
          displayValue === '' ||
          displayValue === null ||
          displayValue === undefined
            ? placeholder || '点击编辑'
            : displayValue
        }}
      </el-text>
      <el-icon
        class="text-base cursor-pointer text-gray-600 hover:text-blue-500 transition-colors duration-200 ml-2 flex-shrink-0"
        @click="handleEdit"
      >
        <Edit />
      </el-icon>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { ElInput, ElIcon } from 'element-plus'
import { Edit, Check, Close } from '@element-plus/icons-vue'

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
const originalValue = ref(props.modelValue) // 进入编辑前的原始值
const inputRef = ref<InstanceType<typeof ElInput> | null>(null) // el-input 实例引用

// 监听 modelValue 的变化，同步更新 displayValue
watch(
  () => props.modelValue,
  (newValue) => {
    // 只有在非编辑状态下才更新 displayValue，避免编辑时外部传入值覆盖
    if (!isEditing.value) {
      displayValue.value = newValue
      originalValue.value = newValue // 外部更新时，也更新原始值
    }
  },
  { immediate: true }
)

// 监听 displayValue 的变化，当 displayValue 改变时，确保它是最新的原始值
// watch(displayValue, (newValue) => {
//   originalValue.value = newValue;
// });

// 处理点击编辑图标
function handleEdit(): void {
  isEditing.value = true
  editValue.value = displayValue.value
  originalValue.value = displayValue.value
  emit('edit')
  nextTick(() => {
    inputRef.value?.focus()
  })
  return
}

function handleSave(): void {
  isEditing.value = false
  displayValue.value = editValue.value
  emit('update:modelValue', editValue.value)
  emit('save', editValue.value)
}

function handleCancel(): void {
  isEditing.value = false
  editValue.value = originalValue.value
  displayValue.value = originalValue.value
  emit('cancel', originalValue.value)
}
</script>

<style scoped></style>
