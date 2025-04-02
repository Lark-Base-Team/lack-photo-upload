import { ref } from 'vue';
import { ElMessage } from 'element-plus';

/**
 * 照片捕获的组合式函数
 * 处理照片的拍摄、裁剪和发送
 */
export function usePhotoCapture() {
  const isProcessing = ref(false);
  const previewImage = ref(null);
  const showPreview = ref(false);

  // 预览截取的图像
  const previewCroppedImage = (videoRef, getCropArea) => {
    if (!videoRef.value) return;
    
    const video = videoRef.value;
    const cropArea = getCropArea(video);
    
    if (!cropArea) {
      ElMessage.warning('无法预览：检测到的文档区域无效');
      return;
    }
    
    const { cropX, cropY, cropWidth, cropHeight } = cropArea;
    
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
  const capturePhoto = async (videoRef, documentBounds, isAutoDetectEnabled, getCropArea, userId, router) => {
    if (!videoRef.value) return;
    
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
      if (isAutoDetectEnabled && documentBounds.value) {
        const cropArea = getCropArea(video);
        
        if (cropArea) {
          const { cropX, cropY, cropWidth, cropHeight } = cropArea;
          
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
      
      // 发送照片数据
      await sendPhotoData(imageData, userId, router);
      
      // 关闭预览
      showPreview.value = false;
    } catch (error) {
      console.error('拍照失败:', error);
      ElMessage.error(`拍照失败: ${error.message}`);
    } finally {
      isProcessing.value = false;
    }
  };

  // 发送照片数据
  const sendPhotoData = async (imageData, userId, router) => {
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
  };

  return {
    isProcessing,
    previewImage,
    showPreview,
    previewCroppedImage,
    closePreview,
    capturePhoto
  };
}