<script>
import {bitable} from '@lark-base-open/js-sdk';
import {computed, onMounted, ref, watch} from 'vue';
import {ElButton, ElDivider, ElForm, ElFormItem, ElMessage, ElOption, ElSelect,} from 'element-plus';
import ViewSelector from './ViewSelector.vue';
import Instructions from './Instructions.vue';

export default {
  components: {
    ElButton,
    ElForm,
    ElFormItem,
    ElSelect,
    ElOption,
    ElDivider,
    ViewSelector,
    Instructions,
  },
  setup(props, { emit }) {
    const formData = ref({ 
      table: '',
      view: '',
      field: ''
    });
    const tableMetaList = ref([]);
    const fieldList = ref([]);
    const isLoading = ref(false);
    const showInstructions = ref(false);

    // 只过滤出附件类型的字段 (type=17)
    const attachmentFields = computed(() => {
      return fieldList.value.filter(field => field.type === 17);
    });

    const toggleInstructions = () => {
      showInstructions.value = !showInstructions.value;
    };

    const addRecord = async () => {
      const tableId = formData.value.table;
      if (tableId) {
        const table = await bitable.base.getTableById(tableId);
        table.addRecord({ fields: {} });
      }
    };

    const loadFields = async () => {
      if (formData.value.table) {
        isLoading.value = true;
        try {
          const table = await bitable.base.getTableById(formData.value.table);
          fieldList.value = await table.getFieldMetaList();
        } catch (error) {
          console.error('加载字段失败:', error);
          ElMessage.error('加载字段失败');
        } finally {
          isLoading.value = false;
        }
      } else {
        fieldList.value = [];
      }
    };

    watch(() => formData.value.table, () => {
      formData.value.view = '';
      formData.value.field = '';
      loadFields();
    });

    onMounted(async () => {
      const [tableList, selection] = await Promise.all([bitable.base.getTableMetaList(), bitable.base.getSelection()]);
      formData.value.table = selection.tableId;
      tableMetaList.value = tableList;
      await loadFields();
    });

    // 监听表单数据变化并发出事件
    watch(formData, (newValue) => {
      emit('update:modelValue', newValue);
    }, { deep: true });

    return {
      formData,
      tableMetaList,
      attachmentFields,
      isLoading,
      showInstructions,
      toggleInstructions,
      addRecord,
    };
  },
};
</script>

<template>
  <el-form ref="form" class="form" :model="formData" label-position="top">
    <div class="form-header">
      <h2>附件拍照上传</h2>
      <el-button 
        type="primary" 
        plain 
        size="small" 
        @click="toggleInstructions"
      >
        {{ showInstructions ? '隐藏使用说明' : '查看使用说明' }}
      </el-button>
    </div>
    
    <Instructions v-if="showInstructions" />
    
    <el-form-item label="选择数据表" size="large">
      <el-select v-model="formData.table" placeholder="请选择数据表" style="width: 100%">
        <el-option
            v-for="meta in tableMetaList"
            :key="meta.id"
            :label="meta.name"
            :value="meta.id"
        />
      </el-select>
    </el-form-item>
    
    <ViewSelector v-if="formData.table" v-model="formData.view" :tableId="formData.table" />
    
    <el-form-item label="选择附件字段" size="large" v-if="formData.table">
      <el-select 
        v-model="formData.field" 
        placeholder="请选择附件字段" 
        style="width: 100%"
        :loading="isLoading"
      >
        <el-option
            v-for="field in attachmentFields"
            :key="field.id"
            :label="field.name"
            :value="field.id"
        />
      </el-select>
      <div v-if="attachmentFields.length === 0 && !isLoading" class="no-fields-tip">
        没有找到附件类型的字段，请先在表格中创建一个附件字段
      </div>
    </el-form-item>

  </el-form>
</template>

<style scoped>
.form-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.form-header h2 {
  margin: 0;
  font-size: 20px;
  color: #303133;
}
.no-fields-tip {
  color: #f56c6c;
  font-size: 14px;
  margin-top: 5px;
}
</style>
