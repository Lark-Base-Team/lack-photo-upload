<script>
import { ElButton, ElOption, ElSelect, ElOptionGroup } from 'element-plus';
import { RefreshRight } from '@element-plus/icons-vue';
import { computed } from 'vue';

export default {
  components: {
    ElButton,
    ElSelect,
    ElOption,
    ElOptionGroup,
    RefreshRight
  },
  props: {
    pendingRecordsCount: {
      type: Number,
      required: true
    },
    capturedButNotUploadedCount: {
      type: Number,
      required: true
    },
    selectedDisplayFields: {
      type: Array,
      required: true
    },
    availableDisplayFields: {
      type: Array,
      required: true
    },
    batchUploading: {
      type: Boolean,
      required: true
    },
    refreshing: {
      type: Boolean,
      required: true
    }
  },
  emits: ['update:selected-display-fields', 'refresh', 'batch-upload'],
  setup(props, { emit }) {
    // 按字段类型分组
    const groupedFields = computed(() => {
      const groups = {};
      props.availableDisplayFields.forEach(field => {
        if (!groups[field.type]) {
          groups[field.type] = [];
        }
        groups[field.type].push(field);
      });
      return groups;
    });

    // 获取字段类型标签
    const getFieldTypeLabel = (type) => {
      const typeMap = {
        1: '多行文本',
        2: '数字',
        3: '单选',
        4: '多选',
        5: '日期',
        7: '复选框',
        11: '人员',
        13: '电话',
        15: '超链接',
        17: '附件',
        18: '单向关联',
        19: '查找引用',
        20: '公式',
        21: '双向关联',
        22: '地理位置',
        23: '群聊',
        1001: '创建时间',
        1002: '修改时间',
        1003: '创建人',
        1004: '修改人',
        1005: '自动编号',
        99001: '二维码',
        99002: '进度条',
        99003: '货币',
        99004: '评分',
        99005: '邮箱'
      };
      return typeMap[type] || `类型 ${type}`;
    };

    // 格式化字段值显示
    const formatFieldValue = (value, fieldType) => {
      if (value === undefined || value === null) return '';
      
      try {
        switch (fieldType) {
          case 1: // 多行文本
            return String(value);
            
          case 2: // 数字
            return typeof value === 'number' ? value.toString() : String(value);
            
          case 3: // 单选
            return value?.text || String(value);
            
          case 4: // 多选
            if (Array.isArray(value)) {
              return value.map(v => v.text || String(v)).join(', ');
            }
            return String(value);
            
          case 5: // 日期
            if (typeof value === 'number' || typeof value === 'string') {
              return new Date(value).toLocaleString();
            }
            return String(value);
            
          case 7: // 复选框
            return value ? '是' : '否';
            
          case 11: // 人员
          case 1003: // 创建人
          case 1004: // 修改人
            if (Array.isArray(value)) {
              return value.map(v => v.name || v.text || String(v)).join(', ');
            }
            return value?.name || value?.text || String(value);
            
          case 13: // 电话
            return value?.text || String(value);
            
          case 15: // 超链接
            return value?.text || String(value);
            
          case 17: // 附件
            if (Array.isArray(value)) {
              return `${value.length}个附件`;
            }
            return '';
            
          case 18: // 单向关联
          case 21: // 双向关联
            if (Array.isArray(value)) {
              return value.map(v => v.text || String(v)).join(', ');
            }
            return value?.text || String(value);
            
          case 19: // 查找引用
            if (Array.isArray(value)) {
              return value.map(v => v.text || String(v)).join(', ');
            }
            return value?.text || String(value);
            
          case 20: // 公式
            return String(value);
            
          case 22: // 地理位置
            return value?.text || String(value);
            
          case 23: // 群聊
            return value?.text || String(value);
            
          case 1001: // 创建时间
          case 1002: // 修改时间
            if (typeof value === 'number' || typeof value === 'string') {
              return new Date(value).toLocaleString();
            }
            return String(value);
            
          case 1005: // 自动编号
            return String(value);
            
          case 99001: // 二维码
            return value?.text || String(value);
            
          case 99002: // 进度条
            return typeof value === 'number' ? `${value}%` : String(value);
            
          case 99003: // 货币
            return typeof value === 'number' ? `¥${value.toFixed(2)}` : String(value);
            
          case 99004: // 评分
            return typeof value === 'number' ? `${value}星` : String(value);
            
          case 99005: // 邮箱
            return value?.text || String(value);
            
          default:
            if (Array.isArray(value)) {
              return value.map(v => v.text || String(v)).join(', ');
            }
            return value?.text || String(value);
        }
      } catch (error) {
        console.error('格式化字段值失败:', error, value, fieldType);
        return String(value);
      }
    };

    const updateSelectedFields = (value) => {
      emit('update:selected-display-fields', value);
    };
    
    const refresh = () => {
      emit('refresh');
    };
    
    const batchUpload = () => {
      emit('batch-upload');
    };
    
    return {
      updateSelectedFields,
      refresh,
      batchUpload,
      groupedFields,
      getFieldTypeLabel,
      formatFieldValue
    };
  }
};
</script>

<template>
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
          :model-value="selectedDisplayFields" 
          @update:model-value="updateSelectedFields"
          multiple 
          collapse-tags
          style="width: 240px"
          placeholder="选择要显示的字段"
          size="small"
        >
          <el-option-group
            v-for="(fields, type) in groupedFields"
            :key="type"
            :label="getFieldTypeLabel(type)"
          >
            <el-option
              v-for="field in fields" 
              :key="field.id"
              :label="field.name"
              :value="field.id"
            />
          </el-option-group>
        </el-select>
      </div>
      
      <!-- 操作按钮组 -->
      <div class="action-group">
        <!-- 批量上传按钮 -->
        <el-button 
          v-if="capturedButNotUploadedCount > 0"
          type="success"
          size="small"
          @click="batchUpload"
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
          @click="refresh"
        >
          刷新
        </el-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
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

/* 响应式布局 */
@media (min-width: 768px) {
  .record-table-header {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
}
</style> 