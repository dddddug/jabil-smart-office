<template>
  <el-dialog title="批量导入特殊工时" v-model="dialogVisible" width="500px" :before-close="handleClose">
    <el-upload
      class="upload-demo"
      drag
      action="#"
      :multiple="false"
      :show-file-list="true"
      :auto-upload="false"
      :on-change="handleFileChange"
      :on-remove="handleFileRemove"
      :file-list="fileList"
      accept=".xlsx"
    >
      <i class="el-icon-upload"></i>
      <div class="el-upload__text">将文件拖到此处，或<em>点击上传</em></div>
      <template v-slot:tip>
<div class="el-upload__tip" >只能上传 .xlsx 文件</div>
</template>
    </el-upload>

    <div v-if="importResult" class="import-result-section">
      <h3>导入结果：</h3>
      <p>成功导入：{{ importResult.successCount }} 条</p>
      <div v-if="importResult.errors && importResult.errors.length > 0">
        <p>失败详情：</p>
        <el-alert
          v-for="(msg, index) in importResult.errors"
          :key="index"
          :title="msg"
          type="error"
          :closable="false"
          style="margin-bottom: 5px;"
        ></el-alert>
      </div>
      <div v-else-if="importResult.successCount > 0 && (!importResult.errors || importResult.errors.length === 0)">
        <el-alert title="所有数据均成功导入！" type="success" :closable="false"></el-alert>
      </div>
      <div v-else-if="importResult.successCount === 0 && (!importResult.errors || importResult.errors.length === 0)">
        <el-alert title="未导入任何数据" type="info" :closable="false"></el-alert>
      </div>
    </div>

    <template v-slot:footer>
<span  class="dialog-footer">
      <el-button type="info" icon="el-icon-download" @click="handleDownloadTemplate">下载导入模板</el-button>
      <el-button @click="handleClose">取 消</el-button>
      <el-button type="primary" :disabled="!selectedFile" @click="handleImport">导 入</el-button>
    </span>
</template>
  </el-dialog>
</template>

<script>
import { importSpecialWorkingHours, downloadImportTemplate } from '@/api/specialWorkingHours'
import { downloadFile } from '@/utils/excelUtils'
import eventBus from '@/utils/eventBus'

export default {
  name: 'SpecialWorkingHoursImportModal',
  props: {
    visible: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      dialogVisible: this.visible,
      selectedFile: null,
      fileList: [],
      importResult: null
    }
  },
  watch: {
    visible(val) {
      this.dialogVisible = val
      if (val) {
        this.resetModal()
      }
    }
  },
  methods: {
    handleClose() {
      this.resetModal()
      this.$emit('update:visible', false)
      this.$emit('import-success') // 通知父组件导入成功，刷新列表
      eventBus.emit('special-working-hours-changed') // 通知工位安排页面刷新
    },
    handleFileChange(file, fileList) {
      this.fileList = [file]
      this.selectedFile = file.raw
      this.importResult = null // 清空上次导入结果
    },
    handleFileRemove(file, fileList) {
      this.fileList = []
      this.selectedFile = null
    },
    async handleImport() {
      if (!this.selectedFile) {
        this.$message.warning('请先选择要导入的文件！')
        return
      }

      const loading = this.$loading({
        lock: true,
        text: '导入中...',
        spinner: 'el-icon-loading',
        background: 'rgba(0, 0, 0, 0.7)'
      })

      try {
        const response = await importSpecialWorkingHours(this.selectedFile)
        this.importResult = { 
          successCount: response?.insertedCount || 0,
          errors: response?.errors || [] 
        }

        if (this.importResult.errors.length > 0) {
          this.$message.error('部分数据导入失败，请查看详情。')
        } else {
          this.$message.success('文件导入成功！')
        }
        this.$emit('import-success') // 通知父组件导入成功，刷新列表
        eventBus.emit('special-working-hours-changed') // 通知工位安排页面刷新
      } catch (error) {
        console.error('导入失败:', error)
        // error 对象现在包含 code, message, 以及可能的 details
        this.$message.error('文件导入失败：' + (error.message || '未知错误'))
        // 如果有详细错误信息，也尝试显示
        if (error.details && Array.isArray(error.details) && error.details.length > 0) {
          this.importResult = { 
            successCount: 0, // 导入失败，成功数为0
            errors: error.details // 将后端返回的详细错误信息赋值给 errors
          } 
        } else {
          this.importResult = { 
            successCount: 0, 
            errors: [error.message || '未知错误'] 
          } 
        }
      } finally {
        loading.close()
      }
    },
    // 下载导入模板
    async handleDownloadTemplate() {
      try {
        const res = await downloadImportTemplate()
        downloadFile(res.data, 'SpecialWorkingHoursImportTemplate.xlsx')
        this.$message.success('导入模板下载成功')
      } catch (error) {
        this.$message.error('导入模板下载失败：' + (error?.message || '未知错误'))
      }
    },
    resetModal() {
      this.selectedFile = null
      this.fileList = []
      this.importResult = null
    }
  }
}
</script>

<style scoped>
.upload-demo {
  text-align: center;
  margin-bottom: 20px;
}
.import-result-section {
  margin-top: 20px;
  padding: 10px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
}
</style>
