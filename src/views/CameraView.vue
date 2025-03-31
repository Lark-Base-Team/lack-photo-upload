<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElButton, ElSelect, ElOption, ElTag, ElSwitch, ElMessage } from 'element-plus';

const route = useRoute();
const router = useRouter();
const userId = route.params.userId;
const videoRef = ref(null);
const canvasRef = ref(null);
const previewCanvasRef = ref(null);
const stream = ref(null);
const errorMessage = ref('');
const isCameraReady = ref(false);
const cameras = ref([]);
const selectedCamera = ref('');
const currentResolution = ref({ width: 0, height: 0 });
const isHighestResolution = ref(true); // 默认使用最高分辨率
const isProcessing = ref(false);
const isAutoDetectEnabled = ref(false); // 默认关闭自动检测
const detectionInterval = ref(null);
const documentBounds = ref(null); // 存储检测到的文档边界
const showPreview = ref(false);
const previewImage = ref(null);

// 从本地存储加载设置
const loadSettings = () => {
  try {
    // 加载自动检测设置
    const savedAutoDetect = localStorage.getItem('cameraAutoDetect');
    if (savedAutoDetect !== null) {
      isAutoDetectEnabled.value = savedAutoDetect === 'true';
    }
    
    // 加载分辨率设置
    const savedResolution = localStorage.getItem('cameraHighestResolution');
    if (savedResolution !== null) {
      isHighestResolution.value = savedResolution === 'true';
    }
    
    // 加载摄像头设置
    const savedCamera = localStorage.getItem('selectedCamera');
    if (savedCamera) {
      selectedCamera.value = savedCamera;
    }
    
    console.log('已加载设置:', {
      autoDetect: isAutoDetectEnabled.value,
      highestResolution: isHighestResolution.value,
      camera: selectedCamera.value
    });
  } catch (error) {
    console.error('加载设置失败:', error);
  }
};

// 保存设置到本地存储
const saveSettings = () => {
  try {
    localStorage.setItem('cameraAutoDetect', isAutoDetectEnabled.value.toString());
    localStorage.setItem('cameraHighestResolution', isHighestResolution.value.toString());
    if (selectedCamera.value) {
      localStorage.setItem('selectedCamera', selectedCamera.value);
    }
  } catch (error) {
    console.error('保存设置失败:', error);
  }
};

// 计算预览区域的样式
const previewStyle = computed(() => {
  return {
    display: showPreview.value ? 'block' : 'none',
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    zIndex: '1000',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px'
  };
});

// 获取所有可用的摄像头设备
const getCameras = async () => {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(device => device.kind === 'videoinput');
    cameras.value = videoDevices;
    
    // 如果没有选择摄像头或选择的摄像头不在列表中，选择第一个
    if (!selectedCamera.value || !videoDevices.some(device => device.deviceId === selectedCamera.value)) {
      if (videoDevices.length > 0) {
        selectedCamera.value = videoDevices[0].deviceId;
        saveSettings();
      }
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
  documentBounds.value = null;
  
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
      
      // 设置canvas尺寸
      if (canvasRef.value) {
        canvasRef.value.width = settings.width;
        canvasRef.value.height = settings.height;
      }
      
      // 如果启用了自动检测，开始检测
      if (isAutoDetectEnabled.value) {
        startDocumentDetection();
      } else {
        // 确保停止检测
        stopDocumentDetection();
        // 清除画布
        clearCanvas();
      }
    }
  } catch (err) {
    errorMessage.value = `无法访问摄像头: ${err.message}`;
    console.error('摄像头访问错误:', err);
    
    // 如果使用高分辨率失败，尝试使用默认分辨率
    if (isHighestResolution.value) {
      isHighestResolution.value = false;
      saveSettings(); // 保存降级的分辨率设置
      console.log('尝试使用默认分辨率');
      await startCamera();
    }
  }
};

// 清除画布
const clearCanvas = () => {
  const canvas = canvasRef.value;
  if (canvas) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  documentBounds.value = null;
};

// 切换分辨率模式
const toggleResolutionMode = () => {
  isHighestResolution.value = !isHighestResolution.value;
  saveSettings();
  startCamera();
};

// 切换自动检测模式
const handleAutoDetectChange = (value) => {
  console.log('自动检测开关切换:', value);
  isAutoDetectEnabled.value = value;
  saveSettings();
  
  if (value) {
    console.log('启动文档检测');
    startDocumentDetection();
  } else {
    console.log('停止文档检测');
    stopDocumentDetection();
    clearCanvas();
  }
};

// 开始文档检测
const startDocumentDetection = () => {
  console.log('开始文档检测');
  
  // 先停止现有的检测
  stopDocumentDetection();
  
  // 每200ms检测一次
  detectionInterval.value = setInterval(() => {
    if (videoRef.value && canvasRef.value && isCameraReady.value) {
      detectDocumentBounds();
      drawDocumentBounds();
    }
  }, 200);
  
  console.log('检测间隔已设置:', detectionInterval.value);
};

// 停止文档检测
const stopDocumentDetection = () => {
  console.log('停止文档检测, 当前间隔:', detectionInterval.value);
  if (detectionInterval.value) {
    clearInterval(detectionInterval.value);
    detectionInterval.value = null;
    console.log('检测间隔已清除');
  }
};

// 检测文档边界
const detectDocumentBounds = () => {
  if (!videoRef.value || !canvasRef.value) return;
  
  const video = videoRef.value;
  const canvas = canvasRef.value;
  const ctx = canvas.getContext('2d');
  
  // 绘制视频帧到canvas
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  
  // 获取图像数据
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const width = canvas.width;
  const height = canvas.height;
  
  // 检测边缘点
  const edgePoints = [];
  const gradientThreshold = 40; // 梯度阈值
  
  // 采样步长，提高性能
  const stepSize = 10;
  
  for (let y = stepSize; y < height - stepSize; y += stepSize) {
    for (let x = stepSize; x < width - stepSize; x += stepSize) {
      const idx = (y * width + x) * 4;
      
      // 计算水平和垂直梯度
      const r1 = data[idx];
      const g1 = data[idx + 1];
      const b1 = data[idx + 2];
      
      const rightIdx = (y * width + (x + stepSize)) * 4;
      const r2 = data[rightIdx];
      const g2 = data[rightIdx + 1];
      const b2 = data[rightIdx + 2];
      
      const downIdx = ((y + stepSize) * width + x) * 4;
      const r3 = data[downIdx];
      const g3 = data[downIdx + 1];
      const b3 = data[downIdx + 2];
      
      // 计算亮度
      const luma1 = 0.299 * r1 + 0.587 * g1 + 0.114 * b1;
      const luma2 = 0.299 * r2 + 0.587 * g2 + 0.114 * b2;
      const luma3 = 0.299 * r3 + 0.587 * g3 + 0.114 * b3;
      
      // 计算梯度
      const gradX = Math.abs(luma1 - luma2);
      const gradY = Math.abs(luma1 - luma3);
      const grad = Math.sqrt(gradX * gradX + gradY * gradY);
      
      // 如果梯度大于阈值，认为是边缘点
      if (grad > gradientThreshold) {
        edgePoints.push({ x, y });
      }
    }
  }
  
  // 如果检测到足够多的边缘点，尝试找到文档边界
  if (edgePoints.length > 100) {
    // 找到边缘点的边界
    let minX = width, minY = height, maxX = 0, maxY = 0;
    
    for (const point of edgePoints) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }
    
    // 确保边界有一定大小
    if (maxX - minX > width * 0.2 && maxY - minY > height * 0.2) {
      // 找到四个角点
      const topLeft = { x: minX, y: minY };
      const topRight = { x: maxX, y: minY };
      const bottomLeft = { x: minX, y: maxY };
      const bottomRight = { x: maxX, y: maxY };
      
      // 更新文档边界
      documentBounds.value = {
        topLeft,
        topRight,
        bottomLeft,
        bottomRight
      };
    }
  }
};

// 绘制文档边界
const drawDocumentBounds = () => {
  if (!documentBounds.value || !canvasRef.value) return;
  
  const canvas = canvasRef.value;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  const bounds = documentBounds.value;
  
  // 绘制边框
  ctx.strokeStyle = '#00FF00';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(bounds.topLeft.x, bounds.topLeft.y);
  ctx.lineTo(bounds.topRight.x, bounds.topRight.y);
  ctx.lineTo(bounds.bottomRight.x, bounds.bottomRight.y);
  ctx.lineTo(bounds.bottomLeft.x, bounds.bottomLeft.y);
  ctx.closePath();
  ctx.stroke();
  
  // 绘制角点
  const drawCorner = (point) => {
    ctx.fillStyle = '#FF0000';
    ctx.beginPath();
    ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
    ctx.fill();
  };
  
  drawCorner(bounds.topLeft);
  drawCorner(bounds.topRight);
  drawCorner(bounds.bottomLeft);
  drawCorner(bounds.bottomRight);
};

// 预览截取的图像
const previewCroppedImage = () => {
  if (!documentBounds.value || !videoRef.value) return;
  
  const video = videoRef.value;
  const bounds = documentBounds.value;
  
  // 计算裁剪区域
  const cropX = Math.max(0, bounds.topLeft.x);
  const cropY = Math.max(0, bounds.topLeft.y);
  const cropWidth = Math.min(video.videoWidth - cropX, bounds.topRight.x - bounds.topLeft.x);
  const cropHeight = Math.min(video.videoHeight - cropY, bounds.bottomLeft.y - bounds.topLeft.y);
  
  // 确保裁剪区域有效
  if (cropWidth <= 0 || cropHeight <= 0) {
    ElMessage.warning('无法预览：检测到的文档区域无效');
    return;
  }
  
  // 创建预览canvas
  const canvas = document.createElement('canvas');
  canvas.width = cropWidth;
  canvas.height = cropHeight;
  const ctx = canvas.getContext('2d');
  
  // 绘制裁剪区域
  ctx.drawImage(
    video,
    cropX, cropY, cropWidth, cropHeight,
    0, 0, cropWidth, cropHeight
  );
  
  // 显示预览
  previewImage.value = canvas.toDataURL('image/jpeg', 0.95);
  showPreview.value = true;
};

// 关闭预览
const closePreview = () => {
  showPreview.value = false;
};

// 拍照
const capturePhoto = async () => {
  if (!videoRef.value || !isCameraReady.value) return;
  
  isProcessing.value = true;
  
  try {
    const video = videoRef.value;
    const width = video.videoWidth;
    const height = video.videoHeight;
    
    // 创建canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    // 绘制视频帧
    ctx.drawImage(video, 0, 0, width, height);
    
    let imageData;
    
    // 如果启用了自动检测并且检测到了文档边界，裁剪图像
    if (isAutoDetectEnabled.value && documentBounds.value) {
      const bounds = documentBounds.value;
      
      // 计算裁剪区域
      const cropX = Math.max(0, bounds.topLeft.x);
      const cropY = Math.max(0, bounds.topLeft.y);
      const cropWidth = Math.min(width - cropX, bounds.topRight.x - bounds.topLeft.x);
      const cropHeight = Math.min(height - cropY, bounds.bottomLeft.y - bounds.topLeft.y);
      
      // 确保裁剪区域有效
      if (cropWidth > 0 && cropHeight > 0) {
        // 创建裁剪canvas
        const croppedCanvas = document.createElement('canvas');
        croppedCanvas.width = cropWidth;
        croppedCanvas.height = cropHeight;
        const croppedCtx = croppedCanvas.getContext('2d');
        
        // 绘制裁剪区域
        croppedCtx.drawImage(
          canvas,
          cropX, cropY, cropWidth, cropHeight,
          0, 0, cropWidth, cropHeight
        );
        
        // 获取裁剪后的图像数据
        imageData = croppedCanvas.toDataURL('image/jpeg', 0.95);
        console.log('已裁剪图像');
      } else {
        // 如果裁剪区域无效，使用原始图像
        imageData = canvas.toDataURL('image/jpeg', 0.95);
        console.log('裁剪区域无效，使用原始图像');
      }
    } else {
      // 使用原始图像
      imageData = canvas.toDataURL('image/jpeg', 0.95);
      console.log('使用原始图像');
    }
    
    // 检查是否在iframe中
    const isInIframe = window !== window.parent;
    
    if (isInIframe) {
      // 如果在iframe中，发送消息到父窗口
      window.parent.postMessage({
        type: 'photo-captured',
        userId,
        imageData
      }, '*');
      
      ElMessage.success('照片已拍摄，正在返回...');
      
      // 延迟一下，让消息有时间发送
      setTimeout(() => {
        // 返回上一页
        router.back();
      }, 500);
    } else {
      // 如果不在iframe中，可能是独立窗口打开的
      try {
        // 尝试使用opener
        if (window.opener) {
          window.opener.postMessage({
            type: 'PHOTO_CAPTURED',
            userId,
            imageData
          }, '*');
          
          ElMessage.success('照片已拍摄，正在关闭窗口...');
          
          // 延迟关闭窗口
          setTimeout(() => {
            window.close();
          }, 500);
        } else {
          // 如果没有opener，可能是直接导航到这个页面的
          // 存储到localStorage，然后返回
          localStorage.setItem(`capturedPhoto_${userId}`, imageData);
          ElMessage.success('照片已拍摄，正在返回...');
          
          // 返回上一页
          router.back();
        }
      } catch (err) {
        console.error('无法发送消息到父窗口:', err);
        // 存储到localStorage，然后返回
        localStorage.setItem(`capturedPhoto_${userId}`, imageData);
        ElMessage.success('照片已保存，正在返回...');
        
        // 返回上一页
        router.back();
      }
    }
    
    // 关闭预览
    showPreview.value = false;
  } catch (error) {
    console.error('拍照失败:', error);
    ElMessage.error(`拍照失败: ${error.message}`);
  } finally {
    isProcessing.value = false;
  }
};

// 监听摄像头选择变化
watch(selectedCamera, () => {
  startCamera();
});

onMounted(async () => {
  // 加载设置
  loadSettings();
  
  // 获取摄像头列表
  await getCameras();
  
  // 启动摄像头
  await startCamera();
});

onUnmounted(() => {
  // 停止文档检测
  stopDocumentDetection();
  
  // 停止摄像头
  if (stream.value) {
    stream.value.getTracks().forEach(track => track.stop());
  }
});
</script>

<template>
  <div class="camera-view">
    <h2>拍照</h2>
    
    <div v-if="errorMessage" class="error-message">
      {{ errorMessage }}
    </div>
    
    <div v-else class="camera-container">
      <!-- 摄像头选择器 -->
      <div class="camera-selector">
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
      
      <!-- 功能设置 -->
      <div class="camera-settings">
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
        
        <div class="auto-detect-toggle">
          <span>自动检测文档边缘:</span>
          <el-switch
            v-model="isAutoDetectEnabled"
            @change="handleAutoDetectChange"
            active-text="开启"
            inactive-text="关闭"
          />
          <el-tag v-if="isAutoDetectEnabled" type="info" size="small" style="margin-left: 10px;">
            检测到文档后可预览截取效果
          </el-tag>
        </div>
      </div>
      
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
        <el-button 
          type="primary" 
          size="large" 
          @click="capturePhoto"
          :disabled="!isCameraReady || isProcessing"
          :loading="isProcessing"
        >
          {{ isProcessing ? '处理中...' : '拍照' }}
        </el-button>
        
        <el-button 
          type="success" 
          size="large" 
          @click="previewCroppedImage"
          :disabled="!isCameraReady || !documentBounds || isProcessing"
          plain
        >
          预览截取效果
        </el-button>
      </div>
      
      <!-- 预览弹窗 -->
      <div v-if="showPreview" class="preview-overlay" @click="closePreview">
        <div class="preview-content" @click.stop>
          <h3>截取预览</h3>
          <img :src="previewImage" class="preview-image" alt="预览图" />
          <div class="preview-actions">
            <el-button type="primary" @click="closePreview">关闭预览</el-button>
            <el-button type="success" @click="capturePhoto">确认拍照</el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.camera-view {
  max-width: 100%;
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
  max-width: 800px;
}

.camera-settings {
  width: 100%;
  max-width: 800px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.resolution-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  background-color: #f8f9fa;
  border-radius: 4px;
}

.current-resolution {
  display: flex;
  align-items: center;
  gap: 8px;
}

.auto-detect-toggle {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  background-color: #f8f9fa;
  border-radius: 4px;
}

.video-container {
  position: relative;
  width: 100%;
  max-width: 800px;
  height: auto;
}

.camera-video {
  width: 100%;
  border-radius: 8px;
  border: 2px solid #ddd;
  display: block;
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
  margin-top: 20px;
  display: flex;
  gap: 15px;
  justify-content: center;
}

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

/* 响应式设计 */
@media (min-width: 1200px) {
  .video-container {
    max-width: 1000px;
  }
  
  .camera-selector,
  .camera-settings {
    max-width: 1000px;
  }
  
  .preview-content {
    max-width: 80%;
  }
}
</style> 