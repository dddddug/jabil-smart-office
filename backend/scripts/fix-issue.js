const fs = require('fs');
let serverJs = fs.readFileSync('server.js', 'utf8');

// 找到问题区域，修复缩进
const lines = serverJs.split('\n');

// 第 2731 行（从 1 开始数）没有正确的缩进，添加缩进
// 第 2734 行的 try 没有对应的 catch 的正确结束
// 修复第 2731 行的缩进，添加闭合括号

console.log('修复前:');
for (let i = 2720; i < 2750; i++) {
  console.log(`${i+1}: ${lines[i]}`);
}

// 修复第 2731 行（索引 2730）的缩进
lines[2730] = '    formattedDate = dateObj.format(\'YYYY-MM-DD\');';

// 在第 2743 行（索引 2742）之后添加一个闭合括号，关闭内层 for 循环
// 然后调整后面的缩进

// 现在重新拼接整个文件
serverJs = lines.join('\n');

fs.writeFileSync('server.js', serverJs, 'utf8');
console.log('\n已修复缩进！现在检查语法...');

// 测试语法
try {
  require('vm').compileFunction(serverJs);
  console.log('语法检查通过！');
} catch (e) {
  console.error('语法错误:', e);
  if (e.lineNumber) {
    console.error(`错误在第 ${e.lineNumber} 行`);
  }
}