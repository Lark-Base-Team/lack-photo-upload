import { ref, onUnmounted } from 'vue';

/**
 * 摄像头管理的组合式函数
 * 处理摄像头的初始化、设置和控制
 */
export function useCamera() {
  const videoRef = ref(null);
  const stream = ref(null);
  const cameras = ref([]);
  const selectedCamera = ref('');
  const currentResolution = ref({ width: 0, height: 0 });
  const isHighestResolution = ref(true);
  const isCameraReady = ref(false);
  const errorMessage = ref('');

  // 从本地存储加载设置
  const loadSettings = () => {
    try {
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

      // 加载摄像头分辨率设置
      const savedResolutionSettings = localStorage.getItem('cameraResolution');
      if (savedResolutionSettings) {
        try {
          const resolution = JSON.parse(savedResolutionSettings);
          currentResolution.value = resolution;
        } catch (e) {
          console.error('解析保存的分辨率设置失败:', e);
        }
      }
      
      console.log('已加载摄像头设置:', {
        highestResolution: isHighestResolution.value,
        camera: selectedCamera.value,
        resolution: currentResolution.value
      });
    } catch (error) {
      console.error('加载摄像头设置失败:', error);
    }
  };

  // 保存设置到本地存储
  const saveSettings = () => {
    try {
      localStorage.setItem('cameraHighestResolution', isHighestResolution.value.toString());
      if (selectedCamera.value) {
        localStorage.setItem('selectedCamera', selectedCamera.value);
      }
      if (currentResolution.value.width && currentResolution.value.height) {
        localStorage.setItem('cameraResolution', JSON.stringify(currentResolution.value));
      }
    } catch (error) {
      console.error('保存摄像头设置失败:', error);
    }
  };

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
      } else if (currentResolution.value.width && currentResolution.value.height) {
        // 使用保存的分辨率设置
        constraints.video.width = { ideal: currentResolution.value.width };
        constraints.video.height = { ideal: currentResolution.value.height };
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
        
        // 保存实际使用的分辨率
        saveSettings();
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

    return isCameraReady.value;
  };

  // 切换分辨率模式
  const toggleResolutionMode = async () => {
    isHighestResolution.value = !isHighestResolution.value;
    saveSettings();
    await startCamera();
  };

  // 停止摄像头
  const stopCamera = () => {
    if (stream.value) {
      stream.value.getTracks().forEach(track => track.stop());
      stream.value = null;
    }
    isCameraReady.value = false;
  };

  // 组件卸载时自动停止摄像头
  onUnmounted(() => {
    stopCamera();
  });

  return {
    videoRef,
    stream,
    cameras,
    selectedCamera,
    currentResolution,
    isHighestResolution,
    isCameraReady,
    errorMessage,
    loadSettings,
    saveSettings,
    getCameras,
    startCamera,
    toggleResolutionMode,
    stopCamera
  };
}