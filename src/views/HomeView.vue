<script setup>
import { ref, computed } from 'vue';
import Form from '../components/Form.vue';
import RecordTable from '../components/RecordTable.vue';

const formData = ref({ 
  table: '',
  view: '',
  field: ''
});

// 监听表单数据变化
const handleFormDataChange = (data) => {
  formData.value = data;
};

// 计算是否显示记录表格
const showRecordTable = computed(() => {
  return formData.value.table && formData.value.view && formData.value.field;
});
</script>

<template>
  <div class="home-view">
    <Form @update:modelValue="handleFormDataChange" v-model="formData" />
    
    <RecordTable 
      v-if="showRecordTable"
      :tableId="formData.table"
      :viewId="formData.view"
      :fieldId="formData.field"
    />
  </div>
</template>

<style scoped>
.home-view {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
</style> 