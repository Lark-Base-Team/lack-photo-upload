<template>
  <div class="config-manager">
    <h4>配置管理</h4>
    <div class="button-group">
      <el-button type="success" size="small" @click="exportConfig" :icon="Download">
        导出配置
      </el-button>
      <el-upload
        :auto-upload="false"
        :show-file-list="false"
        :on-change="handleImport"
        accept=".json"
        class="import-upload"
      >
        <el-button type="warning" size="small" :icon="Upload">
          导入配置
        </el-button>
      </el-upload>
    </div>
  </div>
</template>

<script setup>
import { ElButton, ElUpload, ElMessage } from 'element-plus';
import { Download, Upload } from '@element-plus/icons-vue';

// 定义emit事件
const emit = defineEmits(['export-config', 'import-config']);

// 导出配置
const exportConfig = () => {
  emit('export-config');
};

// 处理导入
const handleImport = (file) => {
  if (!file || !file.raw) {
    ElMessage.error('未选择文件');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const config = JSON.parse(e.target.result);
      // 可以在这里添加更严格的校验，确保导入的配置结构正确
      if (config && config.table && config.view && Array.isArray(config.fields)) {
        emit('import-config', config);
      } else {
        ElMessage.error('导入的配置文件格式不正确');
      }
    } catch (error) {
      console.error('导入配置失败:', error);
      ElMessage.error('导入配置失败，文件可能不是有效的JSON格式');
    }
  };
  reader.onerror = (error) => {
    console.error('读取文件失败:', error);
    ElMessage.error('读取文件失败');
  };
  reader.readAsText(file.raw);
};
</script>

<style scoped>
.config-manager {
  margin-top: 20px;
  padding: 15px;
  background-color: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.config-manager h4 {
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 16px;
  color: #495057;
}

.button-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

/* 让 el-upload 表现得像按钮组的一部分 */
.import-upload {
  display: inline-block; 
}
</style> 