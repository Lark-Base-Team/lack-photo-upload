<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const userId = route.params.userId;
const videoRef = ref(null);
const canvasRef = ref(null);
const stream = ref(null);
const errorMessage = ref('');
const isCameraReady = ref(false);
const cameras = ref([]);
const selectedCamera = ref('');
const currentResolution = ref({ width: 0, height: 0 });
const isHighestResolution = ref(true); // 默认使用最高分辨率

// 获取所有可用的摄像头设备
const getCameras = async () => {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(device => device.kind === 'videoinput');
    cameras.value = videoDevices;
    
    if (videoDevices.length > 0 && !selectedCamera.value) {
      selectedCamera.value = videoDevices[0].deviceId;
    }
  } catch (err) {
    console.error('获取摄像头列表失败:', err);
    errorMessage.value = `无法获取摄像头列表: ${err.message}`;
  }
};

// 启动摄像头
const startCamera = async () => {
  // 如果已有流，先停止
  if (stream.value) {
    stream.value.getTracks().forEach(track => track.stop());
  }
  
  isCameraReady.value = false;
  errorMessage.value = '';
  
  try {
    // 构建约束条件
    const constraints = {
      video: {
        deviceId: selectedCamera.value ? { exact: selectedCamera.value } : undefined,
      },
      audio: false
    };
    
    // 如果选择最高分辨率，添加相应约束
    if (isHighestResolution.value) {
      constraints.video.width = { ideal: 3840 }; // 4K宽度
      constraints.video.height = { ideal: 2160 }; // 4K高度
    }
    
    console.log('使用约束:', constraints);
    stream.value = await navigator.mediaDevices.getUserMedia(constraints);
    
    if (videoRef.value) {
      videoRef.value.srcObject = stream.value;
      isCameraReady.value = true;
      
      // 获取实际分辨率
      const videoTrack = stream.value.getVideoTracks()[0];
      const settings = videoTrack.getSettings();
      currentResolution.value = {
        width: settings.width,
        height: settings.height
      };
      console.log('实际使用的分辨率:', settings.width, 'x', settings.height);
    }
  } catch (err) {
    errorMessage.value = `无法访问摄像头: ${err.message}`;
    console.error('摄像头访问错误:', err);
    
    // 如果使用高分辨率失败，尝试使用默认分辨率
    if (isHighestResolution.value) {
      isHighestResolution.value = false;
      console.log('尝试使用默认分辨率');
      await startCamera();
    }
  }
};

// 切换分辨率模式
const toggleResolutionMode = () => {
  isHighestResolution.value = !isHighestResolution.value;
  startCamera();
};

// 监听摄像头选择变化
watch(selectedCamera, () => {
  startCamera();
});

onMounted(async () => {
  await getCameras();
  await startCamera();
});

onUnmounted(() => {
  if (stream.value) {
    stream.value.getTracks().forEach(track => track.stop());
  }
});

const capturePhoto = () => {
  if (!isCameraReady.value) return;
  
  const video = videoRef.value;
  const canvas = canvasRef.value;
  
  // 设置canvas尺寸与视频相同
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  
  // 在canvas上绘制当前视频帧
  const context = canvas.getContext('2d');
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  
  // 获取图像数据
  const imageData = canvas.toDataURL('image/jpeg', 0.95); // 使用较高的质量
  
  // 发送消息到父窗口
  window.opener.postMessage({
    type: 'PHOTO_CAPTURED',
    userId: userId,
    imageData: imageData
  }, '*');
  
  // 关闭当前窗口
  window.close();
};
</script>

<template>
  <div class="camera-view">
    <h2>拍照页面</h2>
    
    <div v-if="errorMessage" class="error-message">
      {{ errorMessage }}
    </div>
    
    <div v-else class="camera-container">
      <!-- 摄像头选择器 -->
      <div class="camera-selector" v-if="cameras.length > 1">
        <el-select 
          v-model="selectedCamera" 
          placeholder="选择摄像头"
          style="width: 100%; max-width: 300px; margin-bottom: 15px;"
        >
          <el-option
            v-for="camera in cameras"
            :key="camera.deviceId"
            :label="camera.label || `摄像头 ${cameras.indexOf(camera) + 1}`"
            :value="camera.deviceId"
          />
        </el-select>
      </div>
      
      <!-- 分辨率信息 -->
      <div class="resolution-info">
        <div class="current-resolution">
          当前分辨率: {{ currentResolution.width }} x {{ currentResolution.height }}
          <el-tag type="success" v-if="isHighestResolution">最高质量</el-tag>
          <el-tag type="info" v-else>标准质量</el-tag>
        </div>
        <el-button 
          size="small" 
          @click="toggleResolutionMode" 
          type="primary" 
          plain
        >
          {{ isHighestResolution ? '切换到标准质量' : '切换到最高质量' }}
        </el-button>
      </div>
      
      <video 
        ref="videoRef" 
        autoplay 
        playsinline
        class="camera-video"
      ></video>
      
      <canvas ref="canvasRef" style="display: none;"></canvas>
      
      <div class="camera-controls">
        <el-button 
          type="primary" 
          size="large" 
          @click="capturePhoto"
          :disabled="!isCameraReady"
        >
          拍照
        </el-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.camera-view {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  text-align: center;
}

.error-message {
  color: red;
  margin: 20px 0;
  padding: 10px;
  border: 1px solid red;
  border-radius: 4px;
  background-color: #ffeeee;
}

.camera-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.camera-selector {
  width: 100%;
  max-width: 640px;
}

.resolution-info {
  width: 100%;
  max-width: 640px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  padding: 8px;
  background-color: #f8f9fa;
  border-radius: 4px;
}

.current-resolution {
  display: flex;
  align-items: center;
  gap: 8px;
}

.camera-video {
  width: 100%;
  max-width: 640px;
  border-radius: 8px;
  border: 2px solid #ddd;
}

.camera-controls {
  margin-top: 20px;
}
</style> 