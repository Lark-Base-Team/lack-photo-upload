<script setup>
import { onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElButton } from 'element-plus';

// 导入组件
import CameraSelector from '../components/CameraSelector.vue';
import CameraSettings from '../components/CameraSettings.vue';
import CameraPreview from '../components/CameraPreview.vue';

// 导入组合式函数
import { useCamera } from '@/composables/useCamera';
import { useDocumentDetection } from '@/composables/useDocumentDetection';
import { usePhotoCapture } from '@/composables/usePhotoCapture';

const route = useRoute();
const router = useRouter();

// 解析会话ID，获取用户ID、记录ID和字段ID
const userId = route.params.userId;
const sessionParts = userId.split('_');
const actualUserId = sessionParts[0];
const recordId = sessionParts.length > 1 ? sessionParts[1] : '';
const fieldId = sessionParts.length > 2 ? sessionParts[2] : '';

// 使用组合式函数
const {
  videoRef,
  cameras,
  selectedCamera,
  currentResolution,
  isHighestResolution,
  isCameraReady,
  errorMessage,
  loadSettings: loadCameraSettings,
  getCameras,
  startCamera,
  toggleResolutionMode
} = useCamera();

const {
  canvasRef,
  documentBounds,
  isAutoDetectEnabled,
  loadSettings: loadDetectionSettings,
  toggleAutoDetect,
  startDocumentDetection,
  getCropArea
} = useDocumentDetection();

const {
  isProcessing,
  previewImage,
  showPreview,
  previewCroppedImage,
  closePreview,
  capturePhoto
} = usePhotoCapture();

// 处理自动检测开关变化
const handleAutoDetectChange = (value) => {
  toggleAutoDetect(value);
  if (value && isCameraReady.value) {
    startDocumentDetection(videoRef);
  }
};

// 预览截取的图像
const handlePreviewImage = () => {
  previewCroppedImage(videoRef, getCropArea);
};

// 拍照
const handleCapturePhoto = () => {
  capturePhoto(videoRef, documentBounds, isAutoDetectEnabled.value, getCropArea, userId, router);
};

// 监听摄像头选择变化
watch(selectedCamera, () => {
  startCamera();
});

onMounted(async () => {
  // 显示当前拍照的记录和字段信息
  if (recordId && fieldId) {
    console.log(`正在为记录 ${recordId} 的字段 ${fieldId} 拍照`);
  }
  
  // 加载设置
  loadCameraSettings();
  loadDetectionSettings();
  
  // 获取摄像头列表
  await getCameras();
  
  // 启动摄像头
  const ready = await startCamera();
  
  // 如果启用了自动检测，开始检测
  if (ready && isAutoDetectEnabled.value) {
    startDocumentDetection(videoRef);
  }
});
</script>

<template>
  <div class="camera-view">
    <h2>拍照</h2>
    
    <!-- 显示当前拍照的记录和字段信息 -->
    <div v-if="recordId && fieldId" class="photo-info">
      正在为记录 {{ recordId.substring(0, 8) }}... 拍照
    </div>
    
    <div v-if="errorMessage" class="error-message">
      {{ errorMessage }}
    </div>
    
    <div v-else class="camera-container">
      <!-- 摄像头选择器组件 -->
      <CameraSelector 
        :cameras="cameras" 
        v-model="selectedCamera" 
      />
      
      <!-- 摄像头设置组件 -->
      <CameraSettings 
        :is-highest-resolution="isHighestResolution" 
        :is-auto-detect-enabled="isAutoDetectEnabled"
        :current-resolution="currentResolution"
        @toggle-resolution="toggleResolutionMode"
        @update:is-auto-detect-enabled="handleAutoDetectChange"
      />
      
      <!-- 视频预览 -->
      <div class="video-container">
        <video 
          ref="videoRef" 
          autoplay 
          playsinline
          class="camera-video"
        ></video>
        <canvas ref="canvasRef" class="detection-canvas"></canvas>
      </div>
      
      <div class="camera-controls">
        <ElButton 
          type="primary" 
          size="large" 
          @click="handleCapturePhoto"
          :disabled="!isCameraReady || isProcessing"
          :loading="isProcessing"
        >
          {{ isProcessing ? '处理中...' : '拍照' }}
        </ElButton>
        
        <ElButton 
          type="success" 
          size="large" 
          @click="handlePreviewImage"
          :disabled="!isCameraReady || !documentBounds || isProcessing"
          plain
        >
          预览截取效果
        </ElButton>
      </div>
      
      <!-- 预览组件 -->
      <CameraPreview 
        :show-preview="showPreview" 
        :preview-image="previewImage"
        @close="closePreview"
        @capture="handleCapturePhoto"
      />
    </div>
  </div>
</template>

<style scoped>
.camera-view {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
  min-height: 100vh;
  background-color: #f8f9fa;
}

.error-message {
  color: #dc3545;
  margin: 20px 0;
  padding: 16px;
  border: 1px solid #dc3545;
  border-radius: 8px;
  background-color: #fff5f5;
  font-weight: 500;
  box-shadow: 0 2px 4px rgba(220, 53, 69, 0.1);
}

.camera-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  background-color: white;
  padding: 32px;
  border-radius: 16px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
}

.video-container {
  position: relative;
  width: 100%;
  max-width: 800px;
  height: auto;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.camera-video {
  width: 100%;
  display: block;
  background-color: #000;
}

.detection-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.camera-controls {
  margin-top: 24px;
  display: flex;
  gap: 16px;
  justify-content: center;
  width: 100%;
  max-width: 800px;
}

.camera-controls .el-button {
  min-width: 160px;
  height: 48px;
  font-size: 16px;
  font-weight: 500;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.camera-controls .el-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.photo-info {
  margin-bottom: 20px;
  padding: 12px 16px;
  background-color: #e6f7ff;
  border-radius: 8px;
  color: #1890ff;
  font-size: 15px;
  font-weight: 500;
  box-shadow: 0 2px 4px rgba(24, 144, 255, 0.1);
}

h2 {
  color: #1a1a1a;
  font-size: 28px;
  font-weight: 600;
  margin-bottom: 24px;
  text-align: center;
}

@media (max-width: 768px) {
  .camera-view {
    padding: 16px;
  }

  .camera-container {
    padding: 20px;
  }

  .camera-controls {
    flex-direction: column;
    align-items: stretch;
  }

  .camera-controls .el-button {
    width: 100%;
  }

  h2 {
    font-size: 24px;
  }
}

@media (min-width: 1200px) {
  .video-container {
    max-width: 1000px;
  }
}
</style>