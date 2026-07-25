<template>
  <div class="print-container">
    <div v-if="isLoading" class="loading">正在加载PDF，请稍候...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <iframe
      v-else-if="pdfUrl"
      :src="pdfUrl"
      class="pdf-iframe"
      @load="onIframeLoad"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

const pdfUrl = ref('');
const isLoading = ref(true);
const error = ref('');

const onIframeLoad = () => {
  // iframe加载完成后触发打印
  try {
    // 给一点延迟确保PDF完全渲染
    setTimeout(() => {
      window.print();
    }, 500);
  } catch (e) {
    console.error('打印失败:', e);
  }
};

onMounted(() => {
  // 从URL获取文件名
  const urlParams = new URLSearchParams(window.location.search);
  const fileName = urlParams.get('file');

  if (fileName) {
    pdfUrl.value = `/api/k045/preview/${fileName}`;
    isLoading.value = false;
  } else {
    error.value = '未指定要打印的文件';
    isLoading.value = false;
  }
});
</script>

<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.print-container {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.loading, .error {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  font-size: 18px;
  color: #666;
  background: #f5f5f5;
}

.error {
  color: #f56c6c;
}

.pdf-iframe {
  width: 100%;
  height: 100vh;
  border: none;
  background: white;
}

/* 隐藏浏览器默认的打印按钮和页眉页脚 */
@media print {
  html, body {
    width: 100%;
    height: auto;
    overflow: visible;
  }

  .print-container {
    height: auto;
  }

  .loading, .error {
    display: none;
  }

  .pdf-iframe {
    display: block;
    height: 100vh;
  }
}

@page {
  margin: 0;
  size: auto;
}
</style>
