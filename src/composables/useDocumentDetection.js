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
    const gradientThreshold = 45; // 提高梯度阈值，减少噪点
    
    // 采样步长，根据图像大小动态调整
    const stepSize = Math.max(5, Math.floor(Math.min(width, height) / 100));
    
    // 创建灰度图像以提高处理速度
    const grayData = new Uint8Array(width * height);
    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
      grayData[j] = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    }
    
    // 使用Sobel算子进行边缘检测
    for (let y = stepSize; y < height - stepSize; y += stepSize) {
      for (let x = stepSize; x < width - stepSize; x += stepSize) {
        // 3x3 Sobel算子
        const idx = y * width + x;
        
        // 计算水平和垂直梯度
        const gx = 
          -1 * grayData[idx - width - 1] + 
          -2 * grayData[idx - 1] + 
          -1 * grayData[idx + width - 1] + 
          1 * grayData[idx - width + 1] + 
          2 * grayData[idx + 1] + 
          1 * grayData[idx + width + 1];
          
        const gy = 
          -1 * grayData[idx - width - 1] + 
          -2 * grayData[idx - width] + 
          -1 * grayData[idx - width + 1] + 
          1 * grayData[idx + width - 1] + 
          2 * grayData[idx + width] + 
          1 * grayData[idx + width + 1];
        
        // 计算梯度幅值
        const grad = Math.sqrt(gx * gx + gy * gy);
        
        // 如果梯度大于阈值，认为是边缘点
        if (grad > gradientThreshold) {
          // 计算梯度方向，用于更精确地确定边缘
          const angle = Math.atan2(gy, gx);
          edgePoints.push({ x, y, grad, angle });
        }
      }
    }
    
    // 如果检测到足够多的边缘点，尝试找到文档边界
    if (edgePoints.length > 50) {
      // 按梯度值排序，保留强边缘点
      edgePoints.sort((a, b) => b.grad - a.grad);
      const strongEdges = edgePoints.slice(0, Math.min(edgePoints.length, 500));
      
      // 使用RANSAC算法找到四边形
      const quadrilateral = findQuadrilateral(strongEdges, width, height);
      
      if (quadrilateral) {
        // 更新文档边界
        documentBounds.value = quadrilateral;
      } else {
        // 如果RANSAC失败，回退到简单的边界框方法
        findBoundingBox(edgePoints, width, height);
      }
    }
  };

  // 使用RANSAC算法找到四边形
  const findQuadrilateral = (points, width, height) => {
    if (points.length < 20) return null;
    
    // 分析点的分布，找到可能的四个角点区域
    const xValues = points.map(p => p.x);
    const yValues = points.map(p => p.y);
    
    // 计算点的分布
    const xMean = xValues.reduce((sum, x) => sum + x, 0) / points.length;
    const yMean = yValues.reduce((sum, y) => sum + y, 0) / points.length;
    
    // 将点分为四个象限
    const topLeft = [];
    const topRight = [];
    const bottomLeft = [];
    const bottomRight = [];
    
    for (const point of points) {
      if (point.x < xMean && point.y < yMean) {
        topLeft.push(point);
      } else if (point.x >= xMean && point.y < yMean) {
        topRight.push(point);
      } else if (point.x < xMean && point.y >= yMean) {
        bottomLeft.push(point);
      } else {
        bottomRight.push(point);
      }
    }
    
    // 确保每个象限有足够的点
    if (topLeft.length < 5 || topRight.length < 5 || 
        bottomLeft.length < 5 || bottomRight.length < 5) {
      return null;
    }
    
    // 找到每个象限的中心点
    const findCentroid = (points) => {
      const n = points.length;
      const x = points.reduce((sum, p) => sum + p.x, 0) / n;
      const y = points.reduce((sum, p) => sum + p.y, 0) / n;
      return { x, y };
    };
    
    // 找到每个象限的最外点
    const findCorner = (points, xDir, yDir) => {
      return points.reduce((best, point) => {
        const score = xDir * point.x + yDir * point.y;
        return score > best.score ? { x: point.x, y: point.y, score } : best;
      }, { x: xDir > 0 ? 0 : width, y: yDir > 0 ? 0 : height, score: -Infinity });
    };
    
    // 找到四个角点
    const tl = findCorner(topLeft, -1, -1);
    const tr = findCorner(topRight, 1, -1);
    const bl = findCorner(bottomLeft, -1, 1);
    const br = findCorner(bottomRight, 1, 1);
    
    return {
      topLeft: { x: tl.x, y: tl.y },
      topRight: { x: tr.x, y: tr.y },
      bottomLeft: { x: bl.x, y: bl.y },
      bottomRight: { x: br.x, y: br.y }
    };
  };

  // 回退方法：找到边界框
  const findBoundingBox = (points, width, height) => {
    // 找到边缘点的边界
    let minX = width, minY = height, maxX = 0, maxY = 0;
    
    for (const point of points) {
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