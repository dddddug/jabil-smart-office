const fs = require('fs');
const serverJs = fs.readFileSync('server.js', 'utf8');

const lines = serverJs.split('\n');
console.log('总行数:', lines.length);

const last20 = serverJs.slice(-200);
console.log('\n文件最后200字符:', JSON.stringify(last20));

const bracketCount = {
  '(': 0, ')': 0,
  '{': 0, '}': 0,
  '[': 0, ']': 0
};

for (let i = 0; i < serverJs.length; i++) {
  const ch = serverJs[i];
  if (ch in bracketCount) bracketCount[ch]++;
}

console.log('\n括号计数:');
console.log(`()  : ${bracketCount['(']} vs ${bracketCount[')']}`);
console.log(`{}  : ${bracketCount['{']} vs ${bracketCount['}']}`);
console.log(`[]  : ${bracketCount['[']} vs ${bracketCount[']']}`);
