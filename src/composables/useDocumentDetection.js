import { ref, onUnmounted } from 'vue';

/**
 * 文档边界检测的组合式函数
 * 使用 OpenCV.js 进行更精确的文档边缘检测
 */
export function useDocumentDetection() {
  const canvasRef = ref(null);
  const documentBounds = ref(null);
  const isAutoDetectEnabled = ref(false);
  const detectionInterval = ref(null);
  const isOpenCVReady = ref(false);

  // 初始化 OpenCV
  const initOpenCV = async () => {
    if (isOpenCVReady.value) return;
    
    try {
      // 等待 OpenCV.js 加载完成
      if (!window.cv) {
        await new Promise((resolve, reject) => {
          const checkOpenCV = () => {
            if (window.cv) {
              isOpenCVReady.value = true;
              resolve();
            } else {
              setTimeout(checkOpenCV, 100);
            }
          };
          checkOpenCV();
        });
      } else {
        isOpenCVReady.value = true;
      }
      
      console.log('OpenCV.js 已就绪');
    } catch (error) {
      console.error('OpenCV.js 初始化失败:', error);
      isOpenCVReady.value = false;
      throw error;
    }
  };

  // 从本地存储加载设置
  const loadSettings = async () => {
    try {
      const savedAutoDetect = localStorage.getItem('cameraAutoDetect');
      if (savedAutoDetect !== null) {
        isAutoDetectEnabled.value = savedAutoDetect === 'true';
      }
      
      // 初始化 OpenCV
      await initOpenCV();
      
      console.log('已加载文档检测设置:', {
        autoDetect: isAutoDetectEnabled.value,
        opencvReady: isOpenCVReady.value
      });
    } catch (error) {
      console.error('加载文档检测设置失败:', error);
      isAutoDetectEnabled.value = false;
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
  const toggleAutoDetect = async (value) => {
    console.log('自动检测开关切换:', value);
    isAutoDetectEnabled.value = value;
    saveSettings();
    
    if (value) {
      try {
        // 确保 OpenCV 已加载
        if (!isOpenCVReady.value) {
          await initOpenCV();
        }
        console.log('启动文档检测');
        startDocumentDetection();
      } catch (error) {
        console.error('启动文档检测失败:', error);
        isAutoDetectEnabled.value = false;
        saveSettings();
      }
    } else {
      console.log('停止文档检测');
      stopDocumentDetection();
      clearCanvas();
    }
  };

  // 开始文档检测
  const startDocumentDetection = (videoRef) => {
    if (!videoRef || !videoRef.value || !isOpenCVReady.value || !window.cv) {
      console.warn('文档检测未就绪:', {
        videoRef: !!videoRef,
        videoValue: !!videoRef?.value,
        opencvReady: isOpenCVReady.value,
        cvAvailable: !!window.cv
      });
      return;
    }
    
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
      if (videoRef.value && canvasRef.value && isOpenCVReady.value && window.cv) {
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
    if (!video || !canvasRef.value || !isOpenCVReady.value || !window.cv) return;
    
    const canvas = canvasRef.value;
    const ctx = canvas.getContext('2d');
    
    // 绘制视频帧到canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // 获取图像数据
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    try {
      // 创建 OpenCV 矩阵
      const src = new window.cv.Mat(canvas.height, canvas.width, window.cv.CV_8UC4);
      src.data.set(imageData.data);
      
      const gray = new window.cv.Mat();
      const edges = new window.cv.Mat();
      const contours = new window.cv.MatVector();
      const hierarchy = new window.cv.Mat();
      
      // 转换为灰度图
      window.cv.cvtColor(src, gray, window.cv.COLOR_RGBA2GRAY);
      
      // 高斯模糊
      window.cv.GaussianBlur(gray, gray, new window.cv.Size(5, 5), 0);
      
      // Canny 边缘检测
      window.cv.Canny(gray, edges, 75, 200);
      
      // 膨胀操作，连接边缘
      const kernel = window.cv.getStructuringElement(window.cv.MORPH_RECT, new window.cv.Size(3, 3));
      window.cv.dilate(edges, edges, kernel);
      
      // 查找轮廓
      window.cv.findContours(edges, contours, hierarchy, window.cv.RETR_LIST, window.cv.CHAIN_APPROX_SIMPLE);
      
      // 按面积排序轮廓
      const sortedContours = [];
      for (let i = 0; i < contours.size(); i++) {
        const cnt = contours.get(i);
        const area = window.cv.contourArea(cnt);
        sortedContours.push({ cnt, area });
      }
      sortedContours.sort((a, b) => b.area - a.area);
      
      // 查找最大的四边形轮廓
      let documentContour = null;
      for (const { cnt } of sortedContours.slice(0, 5)) {
        const peri = window.cv.arcLength(cnt, true);
        const approx = new window.cv.Mat();
        window.cv.approxPolyDP(cnt, approx, 0.02 * peri, true);
        
        if (approx.rows === 4) {
          documentContour = approx;
          break;
        }
        approx.delete();
      }
      
      // 如果找到四边形，更新文档边界
      if (documentContour) {
        const points = [];
        for (let i = 0; i < 4; i++) {
          points.push({
            x: documentContour.data32S[i * 2],
            y: documentContour.data32S[i * 2 + 1]
          });
        }
        
        // 按左上、右上、右下、左下的顺序排序点
        points.sort((a, b) => {
          if (a.y !== b.y) return a.y - b.y;
          return a.x - b.x;
        });
        
        const [topLeft, topRight, bottomRight, bottomLeft] = points;
        
        documentBounds.value = {
          topLeft,
          topRight,
          bottomRight,
          bottomLeft
        };
        
        documentContour.delete();
      }
      
      // 释放内存
      src.delete();
      gray.delete();
      edges.delete();
      contours.delete();
      hierarchy.delete();
      kernel.delete();
      
    } catch (error) {
      console.error('文档检测失败:', error);
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
    const cropX = Math.min(bounds.topLeft.x, bounds.bottomLeft.x);
    const cropY = Math.min(bounds.topLeft.y, bounds.topRight.y);
    const cropWidth = Math.max(
      Math.abs(bounds.topRight.x - bounds.topLeft.x),
      Math.abs(bounds.bottomRight.x - bounds.bottomLeft.x)
    );
    const cropHeight = Math.max(
      Math.abs(bounds.bottomLeft.y - bounds.topLeft.y),
      Math.abs(bounds.bottomRight.y - bounds.topRight.y)
    );
    
    // 确保裁剪区域在视频范围内
    const finalCropX = Math.max(0, Math.min(cropX, video.videoWidth - 1));
    const finalCropY = Math.max(0, Math.min(cropY, video.videoHeight - 1));
    const finalCropWidth = Math.min(cropWidth, video.videoWidth - finalCropX);
    const finalCropHeight = Math.min(cropHeight, video.videoHeight - finalCropY);
    
    // 确保裁剪区域有效
    if (finalCropWidth <= 0 || finalCropHeight <= 0) {
      console.warn('裁剪区域无效:', {
        x: finalCropX,
        y: finalCropY,
        width: finalCropWidth,
        height: finalCropHeight,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight
      });
      return null;
    }
    
    console.log('计算裁剪区域:', {
      original: { cropX, cropY, cropWidth, cropHeight },
      final: { finalCropX, finalCropY, finalCropWidth, finalCropHeight }
    });
    
    return {
      cropX: finalCropX,
      cropY: finalCropY,
      cropWidth: finalCropWidth,
      cropHeight: finalCropHeight
    };
  };

  // 组件卸载时自动停止检测
  onUnmounted(() => {
    stopDocumentDetection();
  });

  return {
    canvasRef,
    documentBounds,
    isAutoDetectEnabled,
    isOpenCVReady,
    loadSettings,
    saveSettings,
    clearCanvas,
    toggleAutoDetect,
    startDocumentDetection,
    stopDocumentDetection,
    getCropArea
  };
}