const fs = require('fs');
let serverJs = fs.readFileSync('server.js', 'utf8');

// 找到 validateAndProcessSchedule 函数的起始位置并完全替换它
const oldFunc = `// 验证和处理排班数据
const validateAndProcessSchedule = async (rows) => {
  const errors = [];
  const validData = [];
  
  // 有效班次列表，包括调休等
  const validShifts = ['A', 'B', 'C', 'N', 'A+', 'B+', 'C+', 'N+', 'A2', '休', '休息', '调休'];
  
  // 获取所有员工的映射关系（姓名 -> id）
  const employeeResult = await pool.query(
    \`SELECT id, real_name FROM \${USER_TABLE} WHERE status = 'active'\`
  );
  
  const employeeMap = {};
  employeeResult.rows.forEach(row => {
    employeeMap[row.real_name] = row.id;
  });
  
  // 先找到标题行和数据起始行
  let dataStartRow = -1;
  let dateHeaders = [];
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row && row[0] === 'No.') {
      dataStartRow = i + 2; // 跳过标题和星期行
      // 获取日期列（从第4列开始）
      dateHeaders = row.slice(4).filter(date => date);
      break;
    }
  }
  
  if (dataStartRow === -1) {
    errors.push({ row: 1, error: '未找到标题行"No."，请确保模板格式正确' });
    return { validData, errors };
  }
  
  // 解析数据行
  for (let i = dataStartRow; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;
    
    // 跳过空行
    if (!row || !row[3] || !row[3].trim()) {
      continue;
    }
    
    const employeeName = row[3]; // Name列
    
    // 遍历日期列
    for (let j = 0; j < dateHeaders.length; j++) {
      const scheduleDate = dateHeaders[j];
      const shift = row[j + 4]; // 从第5列开始是排班数据
      
      // 没有排班数据就跳过
      if (!shift || !shift.trim()) {
        continue;
      }
      
      // 验证必填字段
      if (!employeeName) {
        continue; // 没有姓名跳过
      }
      
      if (!scheduleDate) {
        continue; // 没有日期跳过
      }
      
      // 验证员工是否存在
      const employeeId = employeeMap[employeeName];
      if (!employeeId) {
        errors.push({ row: rowNum, error: \`员工 "\${employeeName}" 不存在或已离职\` });
        continue;
      }
      
      // 验证班次是否有效
      let cleanShift = shift.trim();
      // 处理特殊状态
      let specialStatus = '';
      
      // 检查是否是特殊状态
      if (cleanShift === '调休' || cleanShift === '休息' || cleanShift === '休') {
        specialStatus = cleanShift;
        cleanShift = '休息';
      }
      
      if (!validShifts.includes(cleanShift) && !validShifts.includes(shift)) {
        // 如果班次不是有效班次，检查是否作为特殊状态
        specialStatus = shift;
        cleanShift = '休息';
      }
      
      // 验证日期格式
      let formattedDate;
      try {
        const dateObj = dayjs(scheduleDate);
        if (!dateObj.isValid()) {
          throw new Error('日期格式无效');
        }
      formattedDate = dateObj.format('YYYY-MM-DD');
    } catch (e) {
      errors.push({ row: rowNum, error: \`排班日期 "\${scheduleDate}" 格式无效，请使用YYYY-MM-DD格式\` });
      continue;
    }
    
    validData.push({
      employeeId,
      employeeName,
      scheduleDate: formattedDate,
      shift,
      specialStatus: specialStatus || null
    });
  }
  
  return { validData, errors };
};`;

// 正确的函数，完全闭合
const newFunc = `// 验证和处理排班数据
const validateAndProcessSchedule = async (rows) => {
  const errors = [];
  const validData = [];
  
  // 有效班次列表，包括调休等
  const validShifts = ['A', 'B', 'C', 'N', 'A+', 'B+', 'C+', 'N+', 'A2', '休', '休息', '调休'];
  
  // 获取所有员工的映射关系（姓名 -> id）
  const employeeResult = await pool.query(
    \`SELECT id, real_name FROM \${USER_TABLE} WHERE status = 'active'\`
  );
  
  const employeeMap = {};
  employeeResult.rows.forEach(row => {
    employeeMap[row.real_name] = row.id;
  });
  
  // 先找到标题行和数据起始行
  let dataStartRow = -1;
  let dateHeaders = [];
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row && row[0] === 'No.') {
      dataStartRow = i + 2; // 跳过标题和星期行
      // 获取日期列（从第4列开始）
      dateHeaders = row.slice(4).filter(date => date);
      break;
    }
  }
  
  if (dataStartRow === -1) {
    errors.push({ row: 1, error: '未找到标题行"No."，请确保模板格式正确' });
    return { validData, errors };
  }
  
  // 解析数据行
  for (let i = dataStartRow; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;
    
    // 跳过空行
    if (!row || !row[3] || !row[3].trim()) {
      continue;
    }
    
    const employeeName = row[3]; // Name列
    
    // 遍历日期列
    for (let j = 0; j < dateHeaders.length; j++) {
      const scheduleDate = dateHeaders[j];
      const shift = row[j + 4]; // 从第5列开始是排班数据
      
      // 没有排班数据就跳过
      if (!shift || !shift.trim()) {
        continue;
      }
      
      // 验证必填字段
      if (!employeeName) {
        continue; // 没有姓名跳过
      }
      
      if (!scheduleDate) {
        continue; // 没有日期跳过
      }
      
      // 验证员工是否存在
      const employeeId = employeeMap[employeeName];
      if (!employeeId) {
        errors.push({ row: rowNum, error: \`员工 "\${employeeName}" 不存在或已离职\` });
        continue;
      }
      
      // 验证班次是否有效
      let cleanShift = shift.trim();
      // 处理特殊状态
      let specialStatus = '';
      
      // 检查是否是特殊状态
      if (cleanShift === '调休' || cleanShift === '休息' || cleanShift === '休') {
        specialStatus = cleanShift;
        cleanShift = '休息';
      }
      
      if (!validShifts.includes(cleanShift) && !validShifts.includes(shift)) {
        // 如果班次不是有效班次，检查是否作为特殊状态
        specialStatus = shift;
        cleanShift = '休息';
      }
      
      // 验证日期格式
      let formattedDate;
      try {
        const dateObj = dayjs(scheduleDate);
        if (!dateObj.isValid()) {
          throw new Error('日期格式无效');
        }
        formattedDate = dateObj.format('YYYY-MM-DD');
      } catch (e) {
        errors.push({ row: rowNum, error: \`排班日期 "\${scheduleDate}" 格式无效，请使用YYYY-MM-DD格式\` });
        continue;
      }
      
      validData.push({
        employeeId,
        employeeName,
        scheduleDate: formattedDate,
        shift,
        specialStatus: specialStatus || null
      });
    }
  }
  
  return { validData, errors };
};`;

if (serverJs.includes(oldFunc)) {
  serverJs = serverJs.replace(oldFunc, newFunc);
  fs.writeFileSync('server.js', serverJs, 'utf8');
  console.log('函数已替换成功！');
  
  // 现在检查语法
  try {
    require('vm').compileFunction(serverJs);
    console.log('语法检查通过！');
  } catch (e) {
    console.error('语法错误:', e);
  }
} else {
  console.error('找不到匹配的函数，请检查！');
  console.log('搜索失败的部分内容:', oldFunc.slice(0, 200));
}
