<template>
  <div class="not-found-container">
    <h1>404 Not Found</h1>
    <p>抱歉，您访问的页面不存在或尚未开发完成。</p>
    <router-link to="/">返回仪表盘</router-link>
  </div>
</template>

<script setup lang="ts">
// No script needed for a simple Not Found page
</script>

<style scoped>
.not-found-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #E0E0E0;
  background-color: #0A1628;
}

h1 {
  font-size: 3em;
  color: #00A8E8;
  margin-bottom: 20px;
}

p {
  font-size: 1.2em;
  margin-bottom: 30px;
}

router-link {
  color: #0066CC;
  text-decoration: none;
  font-size: 1.1em;
  border: 1px solid #0066CC;
  padding: 10px 20px;
  border-radius: 5px;
  transition: all 0.3s ease;
}

router-link:hover {
  background-color: #0066CC;
  color: white;
}
</style>
