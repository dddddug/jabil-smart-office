const fs = require('fs');
const serverJs = fs.readFileSync('server.js', 'utf8');
const lines = serverJs.split('\n');

let braceStack = [];
const matches = [];

for (let lineNum = 0; lineNum < lines.length; lineNum++) {
  const line = lines[lineNum];
  for (let charIdx = 0; charIdx < line.length; charIdx++) {
    const ch = line[charIdx];
    
    if (ch === '{') {
      braceStack.push({ line: lineNum + 1, char: charIdx, lineContent: line });
    } else if (ch === '}') {
      if (braceStack.length > 0) {
        const start = braceStack.pop();
        matches.push({ start, end: { line: lineNum + 1, char: charIdx } });
      }
    }
  }
}

console.log('未闭合的大括号数量:', braceStack.length);
if (braceStack.length > 0) {
  console.log('\n未闭合的大括号位置:');
  braceStack.forEach((b, i) => {
    console.log(`${i + 1}. 第 ${b.line} 行: ${b.lineContent.trim()}`);
  });
} else {
  console.log('所有大括号都已闭合！');
}
