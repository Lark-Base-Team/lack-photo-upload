<script>
import { ElButton, ElOption, ElSelect } from 'element-plus';
import { RefreshRight } from '@element-plus/icons-vue';

export default {
  components: {
    ElButton,
    ElSelect,
    ElOption,
    RefreshRight
  },
  props: {
    pendingRecordsCount: {
      type: Number,
      required: true
    },
    capturedButNotUploadedCount: {
      type: Number,
      required: true
    },
    selectedDisplayFields: {
      type: Array,
      required: true
    },
    availableDisplayFields: {
      type: Array,
      required: true
    },
    batchUploading: {
      type: Boolean,
      required: true
    },
    refreshing: {
      type: Boolean,
      required: true
    }
  },
  emits: ['update:selected-display-fields', 'refresh', 'batch-upload'],
  setup(props, { emit }) {
    const updateSelectedFields = (value) => {
      emit('update:selected-display-fields', value);
    };
    
    const refresh = () => {
      emit('refresh');
    };
    
    const batchUpload = () => {
      emit('batch-upload');
    };
    
    return {
      updateSelectedFields,
      refresh,
      batchUpload
    };
  }
};
</script>

<template>
  <div class="record-table-header">
    <div class="header-title">
      <h3>
        记录列表 
        <span v-if="pendingRecordsCount > 0" class="pending-count">
          ({{ pendingRecordsCount }} 条记录未拍照)
        </span>
      </h3>
    </div>
    
    <div class="header-actions">
      <!-- 字段选择器 -->
      <div class="display-fields-selector">
        <span class="selector-label">显示字段:</span>
        <el-select 
          :model-value="selectedDisplayFields" 
          @update:model-value="updateSelectedFields"
          multiple 
          collapse-tags
          style="width: 240px"
          placeholder="选择要显示的字段"
          size="small"
        >
          <el-option
            v-for="field in availableDisplayFields" 
            :key="field.id"
            :label="field.name"
            :value="field.id"
          />
        </el-select>
      </div>
      
      <!-- 操作按钮组 -->
      <div class="action-group">
        <!-- 批量上传按钮 -->
        <el-button 
          v-if="capturedButNotUploadedCount > 0"
          type="success"
          size="small"
          @click="batchUpload"
          :loading="batchUploading"
        >
          一键上传 ({{ capturedButNotUploadedCount }})
        </el-button>
        
        <!-- 刷新按钮 -->
        <el-button 
          type="primary"
          size="small"
          plain
          :icon="RefreshRight"
          :loading="refreshing"
          @click="refresh"
        >
          刷新
        </el-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.record-table-header {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 20px;
}

.header-title {
  display: flex;
  align-items: center;
}

.header-title h3 {
  margin: 0;
  font-size: 18px;
  color: #303133;
}

.pending-count {
  font-size: 14px;
  color: #f56c6c;
  font-weight: normal;
  margin-left: 8px;
}

.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.display-fields-selector {
  display: flex;
  align-items: center;
  gap: 8px;
}

.selector-label {
  font-size: 14px;
  color: #606266;
}

.action-group {
  display: flex;
  gap: 8px;
}

/* 响应式布局 */
@media (min-width: 768px) {
  .record-table-header {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
}
</style> 