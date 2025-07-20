<template>
  <el-table :data="tagCounter">
    <el-table-column label="标签" sortable>
      <template #default="scope">
        <el-input
          v-if="editingTag[scope.row.id]"
          v-model="editingTagText[scope.row.id]"
        />
        <el-text v-else>{{ scope.row.text }}</el-text>
      </template>
    </el-table-column>
    <el-table-column prop="count" label="提示词数" sortable />
    <el-table-column label="操作">
      <template #default="scope">
        <el-button
          size="small"
          :icon="EditPen"
          :class="{
            'text-gray-400!': editingTag[scope.row.id],
          }"
          @click="handleEditTag(scope.row.id)"
        />
        <el-button
          size="small"
          type="danger"
          :icon="Delete"
          @click="handelDeleteTag(scope.row.id)"
        />
      </template>
    </el-table-column>
  </el-table>
</template>

<script setup lang="ts">
import { useStorage } from '@renderer/stores/storage'
import { EditPen, Delete } from '@element-plus/icons-vue'
import { computed, onMounted, ref } from 'vue'

const storage = useStorage()

const tagCounter = computed(() => {
  const tagCounter: Record<string, number> = {}
  storage.tags.forEach((tag) => {
    tagCounter[tag.id] = 0
  })
  storage.prompts.forEach((prompt) => {
    prompt.tagIDs.forEach((id) => {
      if (tagCounter[id]) {
        tagCounter[id]++
      } else {
        tagCounter[id] = 1
      }
    })
  })
  return Object.entries(tagCounter).map(([id, count]) => ({
    id,
    count,
    text: storage.tags.get(id)?.text || '未知标签',
  }))
})
const editingTag = ref<Record<string, boolean>>({})
const editingTagText = ref<Record<string, string>>({})

onMounted(() => {
  // 初始化编辑状态
  tagCounter.value.forEach((tag) => {
    editingTag.value[tag.id] = false
    editingTagText.value[tag.id] = tag.text
  })
})

//region 操作Tag
function handleEditTag(tagID: string): void {
  if (editingTag.value[tagID]) {
    // 如果已经处于编辑状态，保存修改
    const newTagText = editingTagText.value[tagID].trim()
    if (newTagText) {
      storage.updateTag({ id: tagID, text: newTagText }).then((res) => {
        if (res) {
          editingTag.value[tagID] = false
        } else {
          console.error('更新 Tag 失败')
        }
      })
    } else {
      console.warn('Tag 文本不能为空')
      editingTag.value[tagID] = false // 取消编辑状态
    }
  } else {
    // 否则进入编辑状态
    editingTag.value[tagID] = true
  }
}
function handelDeleteTag(tagID: string): void {
  storage.deleteTag(tagID).then((success) => {
    if (success) {
      ElMessage.success('Tag 删除成功')
    } else {
      ElMessage.error('Tag 删除失败')
    }
  })
}
//endregion
</script>
