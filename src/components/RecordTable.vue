<script>
import {bitable} from '@lark-base-open/js-sdk';
import {computed, onMounted, ref, watch} from 'vue';
import {v4 as uuidv4} from 'uuid';
import {
  ElButton,
  ElConfigProvider,
  ElDialog,
  ElEmpty,
  ElMessage,
  ElOption,
  ElPagination,
  ElProgress,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTag,
  ElUpload,
} from 'element-plus';
import {RefreshRight} from '@element-plus/icons-vue';
import RecordActions from './record/RecordActions.vue';
import TableToolbar from './record/TableToolbar.vue';

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
    ElPagination,
    ElConfigProvider,
    RecordActions,
    TableToolbar,
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
      required: false
    },
    selectedAttachmentFields: {
      type: Array,
      required: true,
      default: () => []
    }
  },
  setup(props) {
    const allRecords = ref([]);
    const records = computed(() => {
      // 如果页面大小为 -1，显示全部记录
      if (pageSize.value === -1) {
        return allRecords.value;
      }
      
      const start = (currentPage.value - 1) * pageSize.value;
      const end = start + pageSize.value;
      return allRecords.value.slice(start, end);
    });
    
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
    const attachmentFields = ref([]);
    
    // 分页相关
    const currentPage = ref(1);
    const pageSize = ref(10);
    const pageSizes = ref([10, 20, 50, 100, 200, -1]); // -1 表示显示全部
    const total = computed(() => allRecords.value.length);

    // 计算未拍照的记录数量
    const pendingRecordsCount = computed(() => {
      return allRecords.value.filter(record => !record.hasPhoto).length;
    });

    // 计算已拍照但未上传的记录数量
    const capturedButNotUploadedCount = computed(() => {
      let count = 0;
      
      for (const recordId in capturedImages.value) {
        const record = allRecords.value.find(r => r.id === recordId);
        if (!record) continue;
        
        for (const fieldId in capturedImages.value[recordId]) {
          if (!record.attachmentStatus[fieldId]) {
            count++;
          }
        }
      }
      
      return count;
    });

    // 自定义分页文本
    const paginationLocale = {
      total: '共 {total} 条',
      goto: '前往',
      pagesize: '条/页',
      pageClassifier: '页'
    };

    // 加载字段列表
    const loadFields = async () => {
      if (!props.tableId) return;
      
      try {
        const table = await bitable.base.getTableById(props.tableId);
        const fields = await table.getFieldMetaList();
        allFields.value = fields;
        
        // 筛选出附件类型的字段
        attachmentFields.value = fields.filter(field => field.type === 17);
        
        // 默认选择前两个非附件字段显示
        if (fields.length > 0 && selectedDisplayFields.value.length === 0) {
          const nonAttachmentFields = fields.filter(f => f.type !== 17); // 过滤掉附件字段
          selectedDisplayFields.value = nonAttachmentFields
            .slice(0, Math.min(2, nonAttachmentFields.length)) // 最多选前两个
            .map(f => f.id);
        }
      } catch (error) {
        console.error('加载字段失败:', error);
      }
    };

    // 加载记录
    const loadRecords = async () => {
      if (!props.tableId || !props.viewId || props.selectedAttachmentFields.length === 0) return;
      
      loading.value = true;
      try {
        const table = await bitable.base.getTableById(props.tableId);
        const view = await table.getViewById(props.viewId);
        
        // 获取视图中的记录
        const recordList = await view.getVisibleRecordIdList();
        
        // 获取记录详情
        allRecords.value = await Promise.all(
            recordList.map(async (recordId) => {
              const record = await table.getRecordById(recordId);

              // 检查每个选中的附件字段是否已有附件
              const attachmentStatus = {};
              for (const fieldId of props.selectedAttachmentFields) {
                if (record.fields[fieldId]) {
                  const attachments = record.fields[fieldId];
                  attachmentStatus[fieldId] = Array.isArray(attachments) && attachments.length > 0;
                } else {
                  attachmentStatus[fieldId] = false;
                }
              }

              return {
                id: recordId,
                fields: record.fields,
                attachmentStatus: attachmentStatus,
                hasPhoto: Object.values(attachmentStatus).some(status => status) // 只要有一个附件字段有值就算有照片
              };
            })
        );
        
        // 重置到第一页
        currentPage.value = 1;
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
    const openCameraPage = (recordId, fieldId) => {
      // 生成唯一会话ID，包含字段ID
      const sessionId = `${userId.value}_${recordId}_${fieldId}`;
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
    const savePhotoToAttachment = async (recordId, fieldId, imageData) => {
      if (!props.tableId || !fieldId || !recordId) return;
      
      try {
        // 将Base64图片转换为File对象
        const fileName = `photo_${Date.now()}.jpg`;
        const file = base64ToFile(imageData, fileName);
        
        console.log('开始上传照片', fileName, recordId, '到字段', fieldId);
        
        // 获取表格和字段
        const table = await bitable.base.getTableById(props.tableId);
        
        // 使用正确的附件字段API
        const field = await table.getField(fieldId);
        await field.setValue(recordId, [file]);
        
        console.log('照片已上传到附件字段');
        
        // 更新记录状态
        const recordIndex = allRecords.value.findIndex(r => r.id === recordId);
        if (recordIndex !== -1) {
          allRecords.value[recordIndex].attachmentStatus[fieldId] = true;
          allRecords.value[recordIndex].hasPhoto = true;
        }
        
        ElMessage.success('照片已上传');
      } catch (error) {
        console.error('上传照片失败:', error);
        ElMessage.error(`上传照片失败: ${error.message}`);
      }
    };

    // 处理文件上传
    const handleFileUpload = async (file, recordId, fieldId) => {
      if (!file || !recordId || !fieldId) return false;
      
      try {
        console.log('开始上传文件', file.name, recordId, '到字段', fieldId);
        
        // 上传到多维表格
        const table = await bitable.base.getTableById(props.tableId);
        
        // 使用正确的附件字段API
        const field = await table.getField(fieldId);
        await field.setValue(recordId, [file]);
        
        console.log('文件已上传到附件字段');
        
        // 更新记录状态
        const recordIndex = allRecords.value.findIndex(r => r.id === recordId);
        if (recordIndex !== -1) {
          allRecords.value[recordIndex].attachmentStatus[fieldId] = true;
          allRecords.value[recordIndex].hasPhoto = true;
        }
        
        // 保存预览图
        const reader = new FileReader();
        reader.onload = (e) => {
          if (!capturedImages.value[recordId]) {
            capturedImages.value[recordId] = {};
          }
          capturedImages.value[recordId][fieldId] = e.target.result;
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
      // 找出所有已拍照但未上传的记录和字段
      const uploadsToProcess = [];
      
      for (const recordId in capturedImages.value) {
        for (const fieldId in capturedImages.value[recordId]) {
          // 仅处理当前选中的附件字段
          if (props.selectedAttachmentFields.includes(fieldId)) {
            const record = allRecords.value.find(r => r.id === recordId);
            if (record && !record.attachmentStatus[fieldId]) {
              uploadsToProcess.push({
                recordId,
                fieldId,
                imageData: capturedImages.value[recordId][fieldId]
              });
            }
          }
        }
      }
      
      if (uploadsToProcess.length === 0) {
        ElMessage.info('没有需要上传的照片');
        return;
      }
      
      batchUploading.value = true;
      batchUploadTotal.value = uploadsToProcess.length;
      batchUploadCurrent.value = 0;
      batchUploadProgress.value = 0;
      showBatchUploadDialog.value = true;
      
      try {
        const table = await bitable.base.getTableById(props.tableId);
        
        for (const upload of uploadsToProcess) {
          const { recordId, fieldId, imageData } = upload;
          
          // 创建文件对象
          const fileName = `photo_${Date.now()}_${recordId}_${fieldId}.jpg`;
          const file = base64ToFile(imageData, fileName);
          
          // 使用正确的附件字段API上传
          const field = await table.getField(fieldId);
          await field.setValue(recordId, [file]);
          
          // 更新记录状态
          const recordIndex = allRecords.value.findIndex(r => r.id === recordId);
          if (recordIndex !== -1) {
            allRecords.value[recordIndex].attachmentStatus[fieldId] = true;
            allRecords.value[recordIndex].hasPhoto = true;
          }
          
          // 更新进度
          batchUploadCurrent.value++;
          batchUploadProgress.value = Math.floor((batchUploadCurrent.value / batchUploadTotal.value) * 100);
        }
        
        ElMessage.success(`成功上传 ${uploadsToProcess.length} 张照片`);
        
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

    // 处理分页变化
    const handleCurrentChange = (val) => {
      currentPage.value = val;
    };
    
    // 处理每页显示数量变化
    const handleSizeChange = (val) => {
      pageSize.value = val;
      currentPage.value = 1; // 重置到第一页
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

    // 格式化分页大小显示文本
    const formatPageSize = (size) => {
      return size === -1 ? '全部' : size;
    };

    onMounted(() => {
      // 从本地存储加载分页设置
      const savedPageSize = localStorage.getItem('recordTablePageSize');
      if (savedPageSize) {
        pageSize.value = parseInt(savedPageSize, 10);
      }
      
      // 生成唯一用户ID
      userId.value = localStorage.getItem('userId') || uuidv4();
      localStorage.setItem('userId', userId.value);
      
      // 监听来自拍照页面的消息
      window.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'PHOTO_CAPTURED') {
          const sessionId = event.data.userId;
          const parts = sessionId.split('_');
          
          if (parts.length === 3 && parts[0] === userId.value) {
            const recordId = parts[1];
            const fieldId = parts[2];
            const imageData = event.data.imageData;
            
            // 保存图片数据
            if (!capturedImages.value[recordId]) {
              capturedImages.value[recordId] = {};
            }
            capturedImages.value[recordId][fieldId] = imageData;
            
            // 保存到附件字段
            savePhotoToAttachment(recordId, fieldId, imageData);
          }
        }
      });
      
      loadFields();
      loadRecords();
    });

    // 保存分页设置到本地存储
    watch(pageSize, (newSize) => {
      localStorage.setItem('recordTablePageSize', newSize.toString());
    });

    watch([() => props.tableId, () => props.viewId, () => props.selectedAttachmentFields], async (newValues, oldValues) => {
      const [newTableId, newViewId, newSelectedFields] = newValues;
      const [oldTableId, oldViewId, oldSelectedFields] = oldValues || [];

      // 如果表格变化，重新加载字段并重置显示字段
      if (newTableId !== oldTableId) {
        selectedDisplayFields.value = []; // 重置显示字段
        await loadFields();
      }
      
      // 如果表格、视图或选中的附件字段变化，并且都有值，则重新加载记录
      if (newTableId && newViewId && newSelectedFields && newSelectedFields.length > 0) {
         if (newTableId !== oldTableId || newViewId !== oldViewId || JSON.stringify(newSelectedFields) !== JSON.stringify(oldSelectedFields)) {
            await loadRecords();
         }
      } else {
        allRecords.value = [];
      }
    }, { immediate: true });

    // 计算可供选择的显示字段（排除附件字段）
    const availableDisplayFields = computed(() => {
      return allFields.value.filter(field => field.type !== 17); // 过滤掉附件字段
    });

    return {
      records,
      allRecords,
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
      refreshRecords,
      attachmentFields,
      availableDisplayFields,
      // 分页相关
      currentPage,
      pageSize,
      pageSizes,
      total,
      handleCurrentChange,
      handleSizeChange,
      formatPageSize,
      paginationLocale,
    };
  }
};
</script>

<template>
  <div class="record-table">
    <!-- 标题和工具栏区域 -->
    <TableToolbar
      :pending-records-count="pendingRecordsCount"
      :captured-but-not-uploaded-count="capturedButNotUploadedCount"
      :selected-display-fields="selectedDisplayFields"
      :available-display-fields="availableDisplayFields"
      :batch-uploading="batchUploading"
      :refreshing="refreshing"
      @update:selected-display-fields="selectedDisplayFields = $event"
      @refresh="refreshRecords"
      @batch-upload="batchUploadAllPhotos"
    />
    
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
        :index="(index) => index + (currentPage - 1) * pageSize + 1"
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
        label="附件操作"
        fixed="right"
        align="center"
        min-width="220"
      >
        <template #default="scope">
          <RecordActions
            :record="scope.row"
            :selected-attachment-fields="selectedAttachmentFields"
            :all-fields="allFields"
            :captured-images="capturedImages"
            @open-camera="openCameraPage"
            @upload-file="handleFileUpload"
          />
        </template>
      </el-table-column>
    </el-table>
    
    <!-- 分页控件 -->
    <div class="pagination-container">
      <el-config-provider :locale="{ el: { pagination: paginationLocale } }">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="pageSizes"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
          :pager-count="5"
          prev-text="上一页"
          next-text="下一页"
        >
          <template #sizes>
            <el-select v-model="pageSize" @change="handleSizeChange">
              <el-option
                v-for="item in pageSizes"
                :key="item"
                :label="formatPageSize(item) + ' 条/页'"
                :value="item"
              />
            </el-select>
          </template>
        </el-pagination>
      </el-config-provider>
    </div>
    
    <!-- 空数据提示 -->
    <div v-if="allRecords.length === 0 && !loading" class="empty-data">
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

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: center;
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
  .pagination-container {
    justify-content: flex-end;
  }
}
</style> 