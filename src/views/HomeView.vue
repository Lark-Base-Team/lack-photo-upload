<script setup>
import { ref, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import Form from '../components/Form.vue';
import RecordTable from '../components/RecordTable.vue';
import ConfigManager from '../components/ConfigManager.vue';

// Google Analytics 初始化
onMounted(() => {
  // 确保在客户端执行
  if (typeof window !== 'undefined') {
    // 加载 Google Analytics 脚本
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=G-3SBR1ML59V';
    document.head.appendChild(script);

    // 初始化 dataLayer
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-3SBR1ML59V');

    // 记录页面访问
    gtag('event', 'page_view', {
      page_title: 'Home',
      page_location: window.location.href,
      page_path: window.location.pathname
    });
  }
});

const formData = ref({ 
  table: '',
  view: '',
  fields: []
});

// 监听表单数据变化
const handleFormDataChange = (data) => {
  formData.value = data;
  // 记录表单数据变化
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'form_data_change', {
      table: data.table || 'none',
      view: data.view || 'none',
      fields_count: data.fields?.length || 0
    });
  }
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
    
    // 记录导出配置事件
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'config_export', {
        table: formData.value.table,
        view: formData.value.view,
        fields_count: formData.value.fields?.length || 0
      });
    }
  } catch (error) {
    console.error('导出配置失败:', error);
    ElMessage.error('导出配置失败');
    
    // 记录导出失败事件
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'config_export_error', {
        error: error.message
      });
    }
  }
};

// 导入配置
const importConfiguration = (config) => {
  formData.value = config;
  ElMessage.success('配置已导入');
  
  // 记录导入配置事件
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'config_import', {
      table: config.table,
      view: config.view,
      fields_count: config.fields?.length || 0
    });
  }
};

// 打开问题反馈讨论组
const openFeedbackGroup = () => {
  window.open('https://applink.feishu.cn/client/chat/chatter/add_by_link?link_token=927l4007-2353-4fa3-83f8-2309edf9d423', '_blank');
  
  // 记录点击反馈按钮事件
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'feedback_button_click');
  }
};

</script>

<template>
  <div class="home-view-wrapper">
    <div class="home-view">
      <Form @update:modelValue="handleFormDataChange" v-model="formData" />
      
      <div class="config-section">
        <ConfigManager 
          @export-config="exportConfiguration"
          @import-config="importConfiguration"
        />
        
        <el-button
          type="info"
          size="small"
          plain
          @click="openFeedbackGroup"
          class="feedback-button"
        >
          问题反馈
        </el-button>
      </div>
      
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

.config-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.feedback-button {
  margin-left: auto;
}
</style> 