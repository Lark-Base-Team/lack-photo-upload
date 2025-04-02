<script>
export default {
  name: 'Instructions'
}
</script>

<template>
  <div class="instructions-container">
    <div class="instructions-header">
      <h3>📷 附件拍照上传插件使用说明</h3>
    </div>
    
    <div class="instructions-content">
      <div class="instruction-step">
        <div class="step-number">1</div>
        <div class="step-content">
          <h4>选择数据表和视图</h4>
          <p>首先选择您要操作的数据表和视图。确保表中包含至少一个附件类型的字段。</p>
        </div>
      </div>
      
      <div class="instruction-step">
        <div class="step-number">2</div>
        <div class="step-content">
          <h4>选择附件字段</h4>
          <p>选择一个或多个附件类型的字段。拍摄的照片将会上传到您指定的字段中。如果没有附件字段，请先在表格中创建一个。</p>
        </div>
      </div>
      
      <div class="instruction-step">
        <div class="step-number">3</div>
        <div class="step-content">
          <h4>查看记录列表</h4>
          <p>设置完成后，您将看到记录列表。您可以选择在表格中显示哪些非附件字段。对于每个选定的附件字段，记录行中会显示单独的拍照/上传按钮和状态。</p>
          <p>记录列表支持分页显示，您可以选择每页显示的记录数量（10、20、50、100、200或全部(-1，显示全部记录)），方便管理大量数据。</p>
        </div>
      </div>
      
      <div class="instruction-step">
        <div class="step-number">4</div>
        <div class="step-content">
          <h4>使用摄像头</h4>
          <p>点击记录中某个附件字段对应的"拍照"按钮，即可为该记录的该字段拍摄照片。在摄像头界面，您可以：</p>
          <ul>
            <li>选择不同的摄像头设备</li>
            <li>切换高质量/标准质量模式</li>
            <li>开启文档边缘检测功能（可自动裁剪文档）</li>
            <li>预览截取效果</li>
            <li>拍照并自动返回</li>
          </ul>
        </div>
      </div>
      
      <div class="instruction-step">
        <div class="step-number">5</div>
        <div class="step-content">
          <h4>上传照片</h4>
          <p>拍摄完成后，照片预览会显示在对应记录和字段的操作区域。您可以点击"一键上传"按钮一次性上传所有已拍摄但未上传的照片，或者通过点击记录旁的"上传"按钮单独上传本地图片文件。照片会自动上传到对应的附件字段。</p>
        </div>
      </div>

      <div class="instruction-step">
        <div class="step-number">6</div>
        <div class="step-content">
          <h4>分页与数据管理</h4>
          <p>对于大量记录，您可以：</p>
          <ul>
            <li><strong>调整每页显示数量：</strong> 选择每页显示10、20、50、100、200条或全部(-1，显示全部记录)</li>
            <li><strong>页面导航：</strong> 使用分页控件在不同页面间切换</li>
            <li><strong>刷新数据：</strong> 点击"刷新"按钮获取最新数据</li>
          </ul>
          <p>您的分页设置会自动保存，下次使用时自动恢复。</p>
        </div>
      </div>

      <div class="instruction-step">
        <div class="step-number">7</div>
        <div class="step-content">
          <h4>配置管理</h4>
          <p>您可以通过"配置管理"区域的功能：</p>
          <ul>
            <li><strong>导出配置：</strong> 将当前选择的数据表、视图和附件字段保存为一个 JSON 文件，方便备份或分享。</li>
            <li><strong>导入配置：</strong> 选择之前导出的 JSON 文件，快速恢复设置。</li>
          </ul>
        </div>
      </div>
    </div>
    
    <div class="instructions-tips">
      <h4>💡 小贴士</h4>
      <ul>
        <li>高质量模式会使用摄像头支持的最高分辨率，但可能会降低启动速度。</li>
        <li>文档边缘检测功能适合拍摄文档、证件等方形物体，能自动识别边缘并裁剪。</li>
        <li>"显示字段"选择器只包含非附件类型的字段，附件字段的操作固定显示在"附件操作"列中。</li>
        <li>对于大量记录，建议使用分页功能而不是"全部"选项，以提高页面响应速度。</li>
        <li>如果摄像头无法打开，请检查浏览器权限设置。</li>
        <li>导入配置会覆盖当前的设置，请谨慎操作。</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.instructions-container {
  background-color: #f9f9f9;
  border-radius: 8px;
  padding: 20px;
  margin: 20px 0;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

.instructions-header {
  margin-bottom: 20px;
  border-bottom: 1px solid #eaeaea;
  padding-bottom: 10px;
}

.instructions-header h3 {
  margin: 0;
  color: #409EFF;
  font-size: 18px;
}

.instructions-content {
  margin-bottom: 20px;
}

.instruction-step {
  display: flex;
  margin-bottom: 15px;
  align-items: flex-start;
}

.step-number {
  background-color: #409EFF;
  color: white;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  margin-right: 15px;
  flex-shrink: 0;
}

.step-content {
  flex: 1;
}

.step-content h4 {
  margin: 0 0 8px 0;
  color: #303133;
}

.step-content p {
  margin: 0;
  color: #606266;
  line-height: 1.5;
}

.step-content p + p {
  margin-top: 8px;
}

.step-content ul {
  margin: 8px 0 0 0;
  padding-left: 20px;
  color: #606266;
}

.step-content li {
  margin-bottom: 5px;
}

.instructions-tips {
  background-color: #ecf8ff;
  border-left: 5px solid #50bfff;
  padding: 15px;
  border-radius: 4px;
}

.instructions-tips h4 {
  margin: 0 0 10px 0;
  color: #409EFF;
}

.instructions-tips ul {
  margin: 0;
  padding-left: 20px;
  color: #606266;
}

.instructions-tips li {
  margin-bottom: 5px;
}
</style> 