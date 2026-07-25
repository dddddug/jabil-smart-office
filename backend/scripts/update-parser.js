const fs = require('fs');
let serverJs = fs.readFileSync('server.js', 'utf8');

// 替换 validateAndProcessSchedule 函数为新格式
// 查找部分关键内容进行替换
serverJs = serverJs.replace(
  "    if (row && row[0] === 'No.') {",
  "    if (row && (row[0] === '姓名' || row[0] === 'Name')) {"
);

serverJs = serverJs.replace(
  "      // 获取日期列（从第4列开始）\n      dateHeaders = row.slice(4).filter(date => date);",
  "      // 获取日期列（从第1列开始，因为第0列是姓名）\n      dateHeaders = row.slice(1).filter(date => date);"
);

serverJs = serverJs.replace(
  "    errors.push({ row: 1, error: '未找到标题行\"No.\"，请确保模板格式正确' });",
  "    errors.push({ row: 1, error: '未找到标题行\"姓名\"，请确保模板格式正确' });"
);

serverJs = serverJs.replace(
  "    if (!row || !row[3] || !row[3].trim()) {",
  "    if (!row || !row[0] || !row[0].trim()) {"
);

serverJs = serverJs.replace(
  "    const employeeName = row[3]; // Name列",
  "    const employeeName = row[0]; // Name列（第0列）"
);

serverJs = serverJs.replace(
  "      const shift = row[j + 4]; // 从第5列开始是排班数据",
  "      const shift = row[j + 1]; // 从第1列开始是排班数据"
);

fs.writeFileSync('server.js', serverJs, 'utf8');
console.log('验证函数已修改成功！');

// 检查语法
try {
  require('vm').compileFunction(serverJs);
  console.log('语法检查通过！');
} catch (e) {
  console.error('语法错误:', e);
}
