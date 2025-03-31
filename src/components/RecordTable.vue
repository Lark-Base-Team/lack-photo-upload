<script>
import {bitable} from '@lark-base-open/js-sdk';
import {computed, onMounted, ref, watch} from 'vue';
import {v4 as uuidv4} from 'uuid';
import {
  ElButton,
  ElDialog,
  ElEmpty,
  ElMessage,
  ElOption,
  ElProgress,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTag,
  ElUpload,
} from 'element-plus';
import {RefreshRight} from '@element-plus/icons-vue';

export default {
  components: {
    ElTable,
    ElTableColumn,
    ElButton,
    ElSelect,
    ElOption,
    ElUpload,
    ElDialog,
    ElProgress,
    RefreshRight,
    ElTag,
    ElEmpty,
  },
  props: {
    tableId: {
      type: String,
      required: true
    },
    viewId: {
      type: String,
      required: true
    },
    fieldId: {
      type: String,
      required: true
    }
  },
  setup(props) {
    const records = ref([]);
    const loading = ref(false);
    const userId = ref('');
    const capturedImages = ref({});  // 记录ID -> 图片数据
    const allFields = ref([]);
    const selectedDisplayFields = ref([]);
    const batchUploading = ref(false);
    const batchUploadProgress = ref(0);
    const batchUploadTotal = ref(0);
    const batchUploadCurrent = ref(0);
    const showBatchUploadDialog = ref(false);
    const refreshing = ref(false);

    // 计算未拍照的记录数量
    const pendingRecordsCount = computed(() => {
      return records.value.filter(record => !record.hasPhoto).length;
    });

    // 计算已拍照但未上传的记录数量
    const capturedButNotUploadedCount = computed(() => {
      return Object.keys(capturedImages.value).filter(recordId => {
        const record = records.value.find(r => r.id === recordId);
        return record && !record.hasPhoto;
      }).length;
    });

    // 加载字段列表
    const loadFields = async () => {
      if (!props.tableId) return;
      
      try {
        const table = await bitable.base.getTableById(props.tableId);
        const fields = await table.getFieldMetaList();
        allFields.value = fields;
        
        // 默认选择前两个字段显示
        if (fields.length > 0) {
          selectedDisplayFields.value = fields.slice(0, Math.min(2, fields.length)).map(f => f.id);
        }
      } catch (error) {
        console.error('加载字段失败:', error);
      }
    };

    // 加载记录
    const loadRecords = async () => {
      if (!props.tableId || !props.viewId) return;
      
      loading.value = true;
      try {
        const table = await bitable.base.getTableById(props.tableId);
        const view = await table.getViewById(props.viewId);
        
        // 获取视图中的记录
        const recordList = await view.getVisibleRecordIdList();
        
        // 获取记录详情
        records.value = await Promise.all(
            recordList.map(async (recordId) => {
              const record = await table.getRecordById(recordId);

              // 检查是否已有附件
              let hasPhoto = false;
              if (props.fieldId && record.fields[props.fieldId]) {
                const attachments = record.fields[props.fieldId];
                hasPhoto = Array.isArray(attachments) && attachments.length > 0;
              }

              return {
                id: recordId,
                fields: record.fields,
                hasPhoto: hasPhoto
              };
            })
        );
      } catch (error) {
        console.error('加载记录失败:', error);
        ElMessage.error('加载记录失败');
      } finally {
        loading.value = false;
      }
    };

    // 刷新记录
    const refreshRecords = async () => {
      if (refreshing.value) return;
      
      refreshing.value = true;
      ElMessage.info('正在刷新记录...');
      
      try {
        await loadRecords();
        ElMessage.success('记录已刷新');
      } catch (error) {
        console.error('刷新记录失败:', error);
        ElMessage.error('刷新记录失败');
      } finally {
        refreshing.value = false;
      }
    };

    // 打开摄像头页面
    const openCameraPage = (recordId) => {
      // 生成唯一会话ID
      const sessionId = `${userId.value}_${recordId}`;
      const cameraUrl = `${window.location.origin}${window.location.pathname}#/camera/${sessionId}`;
      window.open(cameraUrl, '_blank');
    };

    // 将Base64图片转换为File对象
    const base64ToFile = (base64Data, fileName) => {
      // 提取MIME类型
      const mimeMatch = base64Data.match(/^data:([^;]+);base64,/);
      if (!mimeMatch) {
        throw new Error('Invalid base64 format');
      }
      
      const mime = mimeMatch[1];
      const base64Content = base64Data.replace(/^data:[^;]+;base64,/, '');
      
      // 解码base64
      const binaryString = atob(base64Content);
      const bytes = new Uint8Array(binaryString.length);
      
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // 创建Blob和File
      const blob = new Blob([bytes.buffer], { type: mime });
      return new File([blob], fileName, { type: mime });
    };

    // 保存照片到附件字段
    const savePhotoToAttachment = async (recordId, imageData) => {
      if (!props.tableId || !props.fieldId || !recordId) return;
      
      try {
        // 将Base64图片转换为File对象
        const fileName = `photo_${Date.now()}.jpg`;
        const file = base64ToFile(imageData, fileName);
        
        console.log('开始上传照片', fileName, recordId);
        
        // 获取表格和字段
        const table = await bitable.base.getTableById(props.tableId);
        
        // 使用正确的附件字段API
        const field = await table.getField(props.fieldId);
        await field.setValue(recordId, [file]);
        
        console.log('照片已上传到附件字段');
        
        // 更新记录状态
        const recordIndex = records.value.findIndex(r => r.id === recordId);
        if (recordIndex !== -1) {
          records.value[recordIndex].hasPhoto = true;
        }
        
        ElMessage.success('照片已上传');
      } catch (error) {
        console.error('上传照片失败:', error);
        ElMessage.error(`上传照片失败: ${error.message}`);
      }
    };

    // 处理文件上传
    const handleFileUpload = async (file, recordId) => {
      if (!file || !recordId) return false;
      
      try {
        console.log('开始上传文件', file.name, recordId);
        
        // 上传到多维表格
        const table = await bitable.base.getTableById(props.tableId);
        
        // 使用正确的附件字段API
        const field = await table.getField(props.fieldId);
        await field.setValue(recordId, [file]);
        
        console.log('文件已上传到附件字段');
        
        // 更新记录状态
        const recordIndex = records.value.findIndex(r => r.id === recordId);
        if (recordIndex !== -1) {
          records.value[recordIndex].hasPhoto = true;
        }
        
        // 保存预览图
        const reader = new FileReader();
        reader.onload = (e) => {
          capturedImages.value[recordId] = e.target.result;
        };
        reader.readAsDataURL(file);
        
        ElMessage.success('文件已上传');
        return true;
      } catch (error) {
        console.error('上传文件失败:', error);
        ElMessage.error(`上传文件失败: ${error.message}`);
        return false;
      }
    };

    // 批量上传所有已拍照的照片
    const batchUploadAllPhotos = async () => {
      // 找出所有已拍照但未上传的记录
      const recordsToUpload = Object.keys(capturedImages.value).filter(recordId => {
        const record = records.value.find(r => r.id === recordId);
        return record && !record.hasPhoto;
      });
      
      if (recordsToUpload.length === 0) {
        ElMessage.info('没有需要上传的照片');
        return;
      }
      
      batchUploading.value = true;
      batchUploadTotal.value = recordsToUpload.length;
      batchUploadCurrent.value = 0;
      batchUploadProgress.value = 0;
      showBatchUploadDialog.value = true;
      
      try {
        const table = await bitable.base.getTableById(props.tableId);
        const field = await table.getField(props.fieldId);
        
        for (const recordId of recordsToUpload) {
          const imageData = capturedImages.value[recordId];
          
          // 创建文件对象
          const fileName = `photo_${Date.now()}_${recordId}.jpg`;
          const file = base64ToFile(imageData, fileName);
          
          // 使用正确的附件字段API上传
          await field.setValue(recordId, [file]);
          
          // 更新记录状态
          const recordIndex = records.value.findIndex(r => r.id === recordId);
          if (recordIndex !== -1) {
            records.value[recordIndex].hasPhoto = true;
          }
          
          // 更新进度
          batchUploadCurrent.value++;
          batchUploadProgress.value = Math.floor((batchUploadCurrent.value / batchUploadTotal.value) * 100);
        }
        
        ElMessage.success(`成功上传 ${recordsToUpload.length} 张照片`);
        
        // 刷新记录以确认更新
        await loadRecords();
      } catch (error) {
        console.error('批量上传失败:', error);
        ElMessage.error(`批量上传失败: ${error.message}`);
      } finally {
        batchUploading.value = false;
        setTimeout(() => {
          showBatchUploadDialog.value = false;
        }, 1000);
      }
    };

    // 格式化字段值显示
    const formatFieldValue = (value, fieldType) => {
      if (value === undefined || value === null) return '';
      
      try {
        // 根据字段类型格式化显示
        switch (fieldType) {
          case 1: // 多选
          case 2: // 单选
            if (Array.isArray(value)) {
              return value.map(v => v.text || String(v)).join(', ');
            } else if (typeof value === 'object') {
              return value.text || JSON.stringify(value);
            }
            return String(value);
          case 3: // 文本
          case 4: // 数字
          case 5: // 单行文本
          case 7: // 多行文本
            return String(value);
          case 11: // 日期
            if (typeof value === 'number' || typeof value === 'string') {
              try {
                return new Date(value).toLocaleDateString();
              } catch (e) {
                return String(value);
              }
            }
            return String(value);
          case 17: // 附件
            if (Array.isArray(value)) {
              return `${value.length}个附件`;
            }
            return '';
          default:
            if (Array.isArray(value)) {
              return value.map(v => {
                if (typeof v === 'object') {
                  return v.text || JSON.stringify(v);
                }
                return String(v);
              }).join(', ');
            } else if (typeof value === 'object') {
              return value.text || JSON.stringify(value);
            }
            return String(value);
        }
      } catch (error) {
        console.error('格式化字段值失败:', error, value, fieldType);
        return String(value);
      }
    };

    onMounted(() => {
      // 生成唯一用户ID
      userId.value = localStorage.getItem('userId') || uuidv4();
      localStorage.setItem('userId', userId.value);
      
      // 监听来自拍照页面的消息
      window.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'PHOTO_CAPTURED') {
          const sessionId = event.data.userId;
          const parts = sessionId.split('_');
          
          if (parts.length === 2 && parts[0] === userId.value) {
            const recordId = parts[1];
            const imageData = event.data.imageData;
            
            // 保存图片数据
            capturedImages.value[recordId] = imageData;
            
            // 保存到附件字段
            savePhotoToAttachment(recordId, imageData);
          }
        }
      });
      
      loadFields();
      loadRecords();
    });

    watch([() => props.tableId, () => props.viewId], async () => {
      await loadFields();
      await loadRecords();
    });

    return {
      records,
      loading,
      capturedImages,
      allFields,
      selectedDisplayFields,
      pendingRecordsCount,
      capturedButNotUploadedCount,
      batchUploading,
      batchUploadProgress,
      batchUploadTotal,
      batchUploadCurrent,
      showBatchUploadDialog,
      refreshing,
      openCameraPage,
      handleFileUpload,
      formatFieldValue,
      batchUploadAllPhotos,
      refreshRecords
    };
  }
};
</script>

<template>
  <div class="record-table">
    <!-- 标题和工具栏区域 -->
    <div class="record-table-header">
      <div class="header-title">
        <h3>
          记录列表 
          <span v-if="pendingRecordsCount > 0" class="pending-count">
            ({{ pendingRecordsCount }} 条记录未拍照)
          </span>
        </h3>
      </div>
      
      <div class="header-actions">
        <!-- 字段选择器 -->
        <div class="display-fields-selector">
          <span class="selector-label">显示字段:</span>
          <el-select 
            v-model="selectedDisplayFields" 
            multiple 
            collapse-tags
            style="width: 240px"
            placeholder="选择要显示的字段"
            size="small"
          >
            <el-option
              v-for="field in allFields"
              :key="field.id"
              :label="field.name"
              :value="field.id"
            />
          </el-select>
        </div>
        
        <!-- 操作按钮组 -->
        <div class="action-group">
          <!-- 批量上传按钮 -->
          <el-button 
            v-if="capturedButNotUploadedCount > 0"
            type="success"
            size="small"
            @click="batchUploadAllPhotos"
            :loading="batchUploading"
          >
            一键上传 ({{ capturedButNotUploadedCount }})
          </el-button>
          
          <!-- 刷新按钮 -->
          <el-button 
            type="primary"
            size="small"
            plain
            :icon="RefreshRight"
            :loading="refreshing"
            @click="refreshRecords"
          >
            刷新
          </el-button>
        </div>
      </div>
    </div>
    
    <!-- 记录表格 -->
    <el-table 
      :data="records" 
      v-loading="loading"
      style="width: 100%"
      border
      stripe
      highlight-current-row
      :header-cell-style="{ background: '#f5f7fa', color: '#606266' }"
    >
      <el-table-column 
        type="index" 
        label="序号" 
        width="60" 
        align="center"
      />
      
      <!-- 动态显示选择的字段 -->
      <el-table-column 
        v-for="fieldId in selectedDisplayFields"
        :key="fieldId"
        :label="allFields.find(f => f.id === fieldId)?.name || '字段'"
        min-width="120"
        show-overflow-tooltip
      >
        <template #default="scope">
          {{ formatFieldValue(
            scope.row.fields[fieldId], 
            allFields.find(f => f.id === fieldId)?.type
          ) }}
        </template>
      </el-table-column>
      
      <el-table-column 
        label="状态" 
        width="100"
        align="center"
      >
        <template #default="scope">
          <el-tag 
            v-if="scope.row.hasPhoto" 
            type="success" 
            effect="light" 
            size="small"
          >
            已上传
          </el-tag>
          <el-tag 
            v-else-if="capturedImages[scope.row.id]" 
            type="warning" 
            effect="light" 
            size="small"
          >
            待上传
          </el-tag>
          <el-tag 
            v-else 
            type="danger" 
            effect="light" 
            size="small"
          >
            未拍照
          </el-tag>
        </template>
      </el-table-column>
      
      <el-table-column 
        label="操作"
        width="220"
        align="center"
      >
        <template #default="scope">
          <div class="row-actions">
            <div class="action-buttons">
              <el-button 
                type="primary" 
                size="small" 
                @click="openCameraPage(scope.row.id)"
              >
                {{ scope.row.hasPhoto ? '重新拍照' : '拍照' }}
              </el-button>
              
              <el-upload
                :auto-upload="false"
                :show-file-list="false"
                :on-change="(file) => handleFileUpload(file.raw, scope.row.id)"
                accept="image/*"
              >
                <el-button size="small" type="success">手动上传图片</el-button>
              </el-upload>
            </div>
            
            <div v-if="capturedImages[scope.row.id]" class="preview-container">
              <img 
                :src="capturedImages[scope.row.id]" 
                class="preview-image" 
                alt="预览图"
              />
            </div>
          </div>
        </template>
      </el-table-column>
    </el-table>
    
    <!-- 空数据提示 -->
    <div v-if="records.length === 0 && !loading" class="empty-data">
      <el-empty description="暂无记录数据" />
    </div>
    
    <!-- 批量上传进度对话框 -->
    <el-dialog
      v-model="showBatchUploadDialog"
      title="批量上传进度"
      width="30%"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      :show-close="!batchUploading"
    >
      <div class="upload-progress">
        <el-progress 
          :percentage="batchUploadProgress" 
          :format="() => `${batchUploadCurrent}/${batchUploadTotal}`"
          :status="batchUploading ? '' : 'success'"
          stroke-width="18"
        />
        <div class="progress-text">
          {{ batchUploading ? '正在上传...' : '上传完成！' }}
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
.record-table {
  margin-top: 20px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
  padding: 20px;
}

.record-table-header {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 20px;
}

.header-title {
  display: flex;
  align-items: center;
}

.header-title h3 {
  margin: 0;
  font-size: 18px;
  color: #303133;
}

.pending-count {
  font-size: 14px;
  color: #f56c6c;
  font-weight: normal;
  margin-left: 8px;
}

.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.display-fields-selector {
  display: flex;
  align-items: center;
  gap: 8px;
}

.selector-label {
  font-size: 14px;
  color: #606266;
}

.action-group {
  display: flex;
  gap: 8px;
}

.row-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.preview-container {
  width: 120px;
  height: 90px;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid #ddd;
}

.preview-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.empty-data {
  margin: 40px 0;
}

.upload-progress {
  padding: 20px 10px;
}

.progress-text {
  margin-top: 15px;
  text-align: center;
  font-size: 14px;
  color: #606266;
}

/* 响应式布局 */
@media (min-width: 768px) {
  .record-table-header {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
}
</style> 