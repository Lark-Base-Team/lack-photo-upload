import { ref, onUnmounted } from 'vue';

/**
 * 文档边界检测的组合式函数
 * 处理文档边界的检测、绘制和裁剪
 */
export function useDocumentDetection() {
  const canvasRef = ref(null);
  const documentBounds = ref(null);
  const isAutoDetectEnabled = ref(false);
  const detectionInterval = ref(null);

  // 从本地存储加载设置
  const loadSettings = () => {
    try {
      // 加载自动检测设置
      const savedAutoDetect = localStorage.getItem('cameraAutoDetect');
      if (savedAutoDetect !== null) {
        isAutoDetectEnabled.value = savedAutoDetect === 'true';
      }
      
      console.log('已加载文档检测设置:', {
        autoDetect: isAutoDetectEnabled.value
      });
    } catch (error) {
      console.error('加载文档检测设置失败:', error);
    }
  };

  // 保存设置到本地存储
  const saveSettings = () => {
    try {
      localStorage.setItem('cameraAutoDetect', isAutoDetectEnabled.value.toString());
    } catch (error) {
      console.error('保存文档检测设置失败:', error);
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

  // 切换自动检测模式
  const toggleAutoDetect = (value) => {
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
  const startDocumentDetection = (videoRef) => {
    if (!videoRef || !videoRef.value) return;
    
    console.log('开始文档检测');
    
    // 先停止现有的检测
    stopDocumentDetection();
    
    // 设置canvas尺寸
    if (canvasRef.value && videoRef.value) {
      const videoTrack = videoRef.value.srcObject.getVideoTracks()[0];
      const settings = videoTrack.getSettings();
      canvasRef.value.width = settings.width;
      canvasRef.value.height = settings.height;
    }
    
    // 每200ms检测一次
    detectionInterval.value = setInterval(() => {
      if (videoRef.value && canvasRef.value) {
        detectDocumentBounds(videoRef.value);
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
  const detectDocumentBounds = (video) => {
    if (!video || !canvasRef.value) return;
    
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

  // 获取裁剪区域
  const getCropArea = (video) => {
    if (!documentBounds.value || !video) return null;
    
    const bounds = documentBounds.value;
    
    // 计算裁剪区域
    const cropX = Math.max(0, bounds.topLeft.x);
    const cropY = Math.max(0, bounds.topLeft.y);
    const cropWidth = Math.min(video.videoWidth - cropX, bounds.topRight.x - bounds.topLeft.x);
    const cropHeight = Math.min(video.videoHeight - cropY, bounds.bottomLeft.y - bounds.topLeft.y);
    
    // 确保裁剪区域有效
    if (cropWidth <= 0 || cropHeight <= 0) {
      return null;
    }
    
    return { cropX, cropY, cropWidth, cropHeight };
  };

  // 组件卸载时自动停止检测
  onUnmounted(() => {
    stopDocumentDetection();
  });

  return {
    canvasRef,
    documentBounds,
    isAutoDetectEnabled,
    loadSettings,
    saveSettings,
    clearCanvas,
    toggleAutoDetect,
    startDocumentDetection,
    stopDocumentDetection,
    getCropArea
  };
}