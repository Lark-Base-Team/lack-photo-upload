<script setup>
import { ref, computed } from 'vue';
import { ElMessage } from 'element-plus';
import Form from '../components/Form.vue';
import RecordTable from '../components/RecordTable.vue';
import ConfigManager from '../components/ConfigManager.vue';

const formData = ref({ 
  table: '',
  view: '',
  fields: []
});

// 监听表单数据变化
const handleFormDataChange = (data) => {
  formData.value = data;
};

// 计算是否显示记录表格
const showRecordTable = computed(() => {
  return formData.value.table && 
         formData.value.view && 
         formData.value.fields && 
         formData.value.fields.length > 0;
});

// 获取第一个字段作为默认字段（用于向后兼容）
const defaultFieldId = computed(() => {
  return formData.value.fields?.[0] || '';
});

// --- 配置管理逻辑 ---

// 导出配置为JSON文件
const exportConfiguration = () => {
  if (!formData.value.table) {
    ElMessage.warning('请先选择数据表后再导出配置');
    return;
  }
  try {
    const configJson = JSON.stringify(formData.value, null, 2);
    const blob = new Blob([configJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'photo_uploader_config.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    ElMessage.success('配置已导出');
  } catch (error) {
    console.error('导出配置失败:', error);
    ElMessage.error('导出配置失败');
  }
};

// 导入配置
const importConfiguration = (config) => {
  formData.value = config;
  ElMessage.success('配置已导入');
};

</script>

<template>
  <div class="home-view-wrapper">
    <div class="home-view">
      <Form @update:modelValue="handleFormDataChange" v-model="formData" />
      
      <ConfigManager 
        @export-config="exportConfiguration"
        @import-config="importConfiguration"
      />
      
      <RecordTable 
        v-if="showRecordTable"
        :key="`${formData.table}-${formData.view}-${formData.fields.join(',')}`" 
        :tableId="formData.table"
        :viewId="formData.view"
        :fieldId="defaultFieldId"
        :selectedAttachmentFields="formData.fields"
      />
    </div>
  </div>
</template>

<style scoped>
.home-view-wrapper {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
  box-sizing: border-box;
}

.home-view {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
</style> 