<script>
import { ElButton, ElTag, ElUpload } from 'element-plus';

export default {
  components: {
    ElButton,
    ElTag,
    ElUpload
  },
  props: {
    record: {
      type: Object,
      required: true
    },
    selectedAttachmentFields: {
      type: Array,
      required: true
    },
    allFields: {
      type: Array,
      required: true
    },
    capturedImages: {
      type: Object,
      required: true
    }
  },
  emits: ['open-camera', 'upload-file'],
  setup(props, { emit }) {
    const openCamera = (recordId, fieldId) => {
      emit('open-camera', recordId, fieldId);
    };
    
    const handleFileChange = (file, recordId, fieldId) => {
      emit('upload-file', file.raw, recordId, fieldId);
    };
    
    return {
      openCamera,
      handleFileChange
    };
  }
};
</script>

<template>
  <div class="row-actions">
    <div 
      v-for="fieldId in selectedAttachmentFields" 
      :key="fieldId" 
      class="field-actions"
    >
      <div class="field-name">
        <span>{{ allFields.find(f => f.id === fieldId)?.name || '附件字段' }}</span>
        <el-tag 
          v-if="record.attachmentStatus && record.attachmentStatus[fieldId]" 
          type="success" 
          effect="light" 
          size="small"
        >
          已上传
        </el-tag>
        <el-tag 
          v-else-if="capturedImages[record.id] && capturedImages[record.id][fieldId]" 
          type="warning" 
          effect="light" 
          size="small"
        >
          待上传
        </el-tag>
        <el-tag 
          v-else 
          type="danger" 
          effect="light" 
          size="small"
        >
          未拍照
        </el-tag>
      </div>
      
      <div class="action-buttons">
        <el-button 
          type="primary" 
          size="small" 
          @click="openCamera(record.id, fieldId)"
        >
          {{ record.attachmentStatus && record.attachmentStatus[fieldId] ? '重拍' : '拍照' }}
        </el-button>
        
        <el-upload
          :auto-upload="false"
          :show-file-list="false"
          :on-change="(file) => handleFileChange(file, record.id, fieldId)"
          accept="image/*"
        >
          <el-button size="small" type="success">上传</el-button>
        </el-upload>
      </div>
      
      <div v-if="capturedImages[record.id] && capturedImages[record.id][fieldId]" class="preview-container">
        <img 
          :src="capturedImages[record.id][fieldId]" 
          class="preview-image" 
          alt="预览图"
        />
      </div>
    </div>
    <div v-if="!selectedAttachmentFields || selectedAttachmentFields.length === 0" class="no-attachment-fields">
      请在上方选择附件字段
    </div>
  </div>
</template>

<style scoped>
.row-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.field-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-bottom: 15px;
  padding: 10px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  background-color: #f8f9fa;
  width: 100%;
  box-sizing: border-box;
  min-width: 180px;
}

.field-name {
  font-weight: bold;
  margin-bottom: 5px;
  display: flex;
  align-items: center;
  gap: 5px;
  justify-content: center;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.preview-container {
  width: 120px;
  height: 90px;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid #ddd;
}

.preview-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.no-attachment-fields {
  color: #909399;
  font-size: 14px;
  margin-top: 10px;
}
</style> 