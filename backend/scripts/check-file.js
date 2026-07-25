const fs = require('fs');
const vm = require('vm');
const serverJs = fs.readFileSync('server.js', 'utf8');

// 检查乱码
if (serverJs.includes('鈴?')) {
  console.log('发现乱码，正在清理...');
  
  // 读取正确版本的模板函数代码，在修改之前我们之前 Read 的是正常的
  // 让我先检查文件末尾
  const lastLines = serverJs.split('\n').slice(-30);
  console.log('\n文件最后30行:');
  lastLines.forEach((line, i) => console.log(`${lastLines.length - 30 + i + 1}: ${line}`));
  
  // 重新构建文件末尾的正确代码
} else {
  console.log('文件编码正常！');
  console.log('总长度:', serverJs.length);
  console.log('总行数:', serverJs.split('\n').length);
}

// 测试语法
try {
  new vm.Script(serverJs);
  console.log('\n语法检查通过！');
  
  // 现在尝试直接运行看是否有其他错误
  try {
    require('./server.js');
    console.log('\n服务器启动成功！');
  } catch (e) {
    console.error('\n运行错误:', e);
  }
} catch (e) {
  console.error('\n语法错误:', e);
  if (e.lineNumber) {
    console.error('\n错误行号:', e.lineNumber);
    const lines = serverJs.split('\n');
    for (let i = Math.max(0, e.lineNumber - 15); i < Math.min(lines.length, e.lineNumber + 15); i++) {
      const lineNum = i + 1;
      const prefix = lineNum === e.lineNumber ? '>>> ' : '    ';
      console.error(`${prefix}${lineNum}: ${lines[i]}`);
    }
  }
}
