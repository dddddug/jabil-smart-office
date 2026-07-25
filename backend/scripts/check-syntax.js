const fs = require('fs');
const vm = require('vm');

const code = fs.readFileSync('server.js', 'utf8');

try {
  new vm.Script(code);
  console.log('语法检查通过！');
} catch (e) {
  console.error('语法错误在第', e.lineNumber, '行:', e.message);
  const lines = code.split('\n');
  console.error('\n错误位置周围的代码:');
  for (let i = Math.max(0, e.lineNumber - 10); i < Math.min(lines.length, e.lineNumber + 10); i++) {
    const lineNum = i + 1;
    const prefix = lineNum === e.lineNumber ? '>>> ' : '    ';
    console.error(`${prefix}${lineNum}: ${lines[i]}`);
  }
}
