<script setup>
import { ElButton } from 'element-plus';

const props = defineProps({
  showPreview: {
    type: Boolean,
    default: false
  },
  previewImage: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['close', 'capture']);

const closePreview = () => {
  emit('close');
};

const confirmCapture = () => {
  emit('capture');
};
</script>

<template>
  <div v-if="showPreview" class="preview-overlay" @click="closePreview">
    <div class="preview-content" @click.stop>
      <h3>截取预览</h3>
      <img :src="previewImage" class="preview-image" alt="预览图" />
      <div class="preview-actions">
        <el-button type="primary" @click="closePreview">关闭预览</el-button>
        <el-button type="success" @click="confirmCapture">确认拍照</el-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 预览弹窗样式 */
.preview-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.8);
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
}

.preview-content {
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  max-width: 90%;
  max-height: 90%;
  overflow: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.preview-image {
  max-width: 100%;
  max-height: 70vh;
  object-fit: contain;
  margin: 15px 0;
  border: 1px solid #ddd;
}

.preview-actions {
  display: flex;
  gap: 10px;
  margin-top: 15px;
}

@media (min-width: 1200px) {
  .preview-content {
    max-width: 80%;
  }
}
</style>