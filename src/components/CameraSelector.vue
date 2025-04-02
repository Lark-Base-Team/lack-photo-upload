<script setup>
import { ElSelect, ElOption } from 'element-plus';

const props = defineProps({
  cameras: {
    type: Array,
    default: () => []
  },
  modelValue: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['update:modelValue']);

const updateCamera = (value) => {
  emit('update:modelValue', value);
};
</script>

<template>
  <div class="camera-selector">
    <el-select 
      :model-value="modelValue" 
      @update:modelValue="updateCamera" 
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
</template>

<style scoped>
.camera-selector {
  width: 100%;
  max-width: 800px;
}

@media (min-width: 1200px) {
  .camera-selector {
    max-width: 1000px;
  }
}
</style>