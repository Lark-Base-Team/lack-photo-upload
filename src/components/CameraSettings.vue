<script setup>
import { ElButton, ElTag, ElSwitch } from 'element-plus';

const props = defineProps({
  isHighestResolution: {
    type: Boolean,
    default: true
  },
  isAutoDetectEnabled: {
    type: Boolean,
    default: false
  },
  currentResolution: {
    type: Object,
    default: () => ({ width: 0, height: 0 })
  }
});

const emit = defineEmits(['toggle-resolution', 'update:isAutoDetectEnabled']);

const toggleResolution = () => {
  emit('toggle-resolution');
};

const handleAutoDetectChange = (value) => {
  emit('update:isAutoDetectEnabled', value);
};
</script>

<template>
  <div class="camera-settings">
    <div class="resolution-info">
      <div class="current-resolution">
        当前分辨率: {{ currentResolution.width }} x {{ currentResolution.height }}
        <el-tag type="success" v-if="isHighestResolution">最高质量</el-tag>
        <el-tag type="info" v-else>标准质量</el-tag>
      </div>
      <el-button 
        size="small" 
        @click="toggleResolution" 
        type="primary" 
        plain
      >
        {{ isHighestResolution ? '切换到标准质量' : '切换到最高质量' }}
      </el-button>
    </div>
    
    <div class="auto-detect-toggle">
      <span>自动检测文档边缘:</span>
      <el-switch
        :model-value="isAutoDetectEnabled"
        @update:modelValue="handleAutoDetectChange"
        active-text="开启"
        inactive-text="关闭"
      />
      <el-tag v-if="isAutoDetectEnabled" type="info" size="small" style="margin-left: 10px;">
        检测到文档后可预览截取效果
      </el-tag>
    </div>
  </div>
</template>

<style scoped>
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

@media (min-width: 1200px) {
  .camera-settings {
    max-width: 1000px;
  }
}
</style>