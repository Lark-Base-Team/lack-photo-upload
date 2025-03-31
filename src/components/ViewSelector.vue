<script>
import {bitable} from '@lark-base-open/js-sdk';
import {onMounted, ref, watch} from 'vue';
import {ElFormItem, ElOption, ElSelect,} from 'element-plus';

export default {
  components: {
    ElFormItem,
    ElSelect,
    ElOption,
  },
  props: {
    modelValue: {
      type: String,
      default: ''
    },
    tableId: {
      type: String,
      required: true
    }
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const viewList = ref([]);

    const loadViews = async () => {
      if (props.tableId) {
        try {
          const table = await bitable.base.getTableById(props.tableId);
          viewList.value = await table.getViewMetaList();
        } catch (error) {
          console.error('加载视图失败:', error);
          viewList.value = [];
        }
      } else {
        viewList.value = [];
      }
    };

    const updateValue = (value) => {
      emit('update:modelValue', value);
    };

    onMounted(() => {
      loadViews();
    });

    watch(() => props.tableId, () => {
      loadViews();
    });

    return {
      viewList,
      updateValue
    };
  },
};
</script>

<template>
  <el-form-item label="选择视图" size="large">
    <el-select 
      :model-value="modelValue" 
      @update:modelValue="updateValue" 
      placeholder="请选择视图" 
      style="width: 100%"
    >
      <el-option
        v-for="view in viewList"
        :key="view.id"
        :label="view.name"
        :value="view.id"
      />
    </el-select>
  </el-form-item>
</template> 