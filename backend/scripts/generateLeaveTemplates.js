import ExcelJS from 'exceljs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateTemplate(worksheetName, columns, fileName) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(worksheetName);

  worksheet.columns = columns;

  // 设置表头样式
  worksheet.getRow(1).font = { bold: true, size: 11 };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD9E1F2' }
  };
  worksheet.getRow(1).alignment = {
    horizontal: 'center',
    vertical: 'middle'
  };

  // 保存文件
  const outputPath = path.join(__dirname, `../resources/excel_templates/${fileName}`);
  await workbook.xlsx.writeFile(outputPath);
  console.log('模板已生成:', outputPath);
}

// 临时请假&公差导入模板
async function generateTemporaryLeaveTemplate() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('临时请假&公差导入');

  worksheet.columns = [
    { header: '员工姓名', key: 'employeeName', width: 15 },
    { header: '请假类型', key: 'leaveType', width: 12 },
    { header: '请假日期', key: 'leaveDate', width: 14 },
    { header: '开始时间', key: 'startTime', width: 12 },
    { header: '结束时间', key: 'endTime', width: 12 },
    { header: '请假原因', key: 'reason', width: 25 },
  ];

  // 设置表头样式
  worksheet.getRow(1).font = { bold: true, size: 11 };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD9E1F2' }
  };
  worksheet.getRow(1).alignment = {
    horizontal: 'center',
    vertical: 'middle'
  };

  // 添加示例数据
  const exampleRow = worksheet.addRow({
    employeeName: '张三',
    leaveType: '临时请假',
    leaveDate: '2024-07-15',
    startTime: '09:00',
    endTime: '18:00',
    reason: '家中有事'
  });

  exampleRow.font = { size: 10 };
  exampleRow.alignment = { horizontal: 'center', vertical: 'middle' };

  const outputPath = path.join(__dirname, '../resources/excel_templates/临时请假&公差导入模板.xlsx');
  await workbook.xlsx.writeFile(outputPath);
  console.log('模板已生成:', outputPath);
}

// 正式请假导入模板
async function generateFormalLeaveTemplate() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('正式请假导入');

  worksheet.columns = [
    { header: '员工工号', key: 'employeeNumber', width: 15 },
    { header: '请假类型', key: 'leaveType', width: 12 },
    { header: '开始日期', key: 'startDate', width: 14 },
    { header: '结束日期', key: 'endDate', width: 14 },
    { header: '请假原因', key: 'reason', width: 25 },
  ];

  // 设置表头样式
  worksheet.getRow(1).font = { bold: true, size: 11 };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD9E1F2' }
  };
  worksheet.getRow(1).alignment = {
    horizontal: 'center',
    vertical: 'middle'
  };

  // 添加示例数据
  const exampleRow = worksheet.addRow({
    employeeNumber: 'E001',
    leaveType: '年假',
    startDate: '2024-07-15',
    endDate: '2024-07-19',
    reason: '年假休息'
  });

  exampleRow.font = { size: 10 };
  exampleRow.alignment = { horizontal: 'center', vertical: 'middle' };

  const outputPath = path.join(__dirname, '../resources/excel_templates/正式请假导入模板.xlsx');
  await workbook.xlsx.writeFile(outputPath);
  console.log('模板已生成:', outputPath);
}

// 离职转岗导入模板
async function generateResignationTransferTemplate() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('离职转岗导入');

  worksheet.columns = [
    { header: '员工工号', key: 'employeeNumber', width: 15 },
    { header: '类型', key: 'type', width: 10 },
    { header: '日期', key: 'date', width: 14 },
    { header: '原因', key: 'reason', width: 20 },
    { header: '调入工厂', key: 'transferPlant', width: 15 },
    { header: '调入部门', key: 'transferDept', width: 15 },
    { header: '交接人', key: 'handover', width: 15 },
  ];

  // 设置表头样式
  worksheet.getRow(1).font = { bold: true, size: 11 };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD9E1F2' }
  };
  worksheet.getRow(1).alignment = {
    horizontal: 'center',
    vertical: 'middle'
  };

  // 添加示例数据
  const exampleRow = worksheet.addRow({
    employeeNumber: 'E001',
    type: '离职',
    date: '2024-07-31',
    reason: '个人发展',
    transferPlant: '',
    transferDept: '',
    handover: '李四'
  });

  exampleRow.font = { size: 10 };
  exampleRow.alignment = { horizontal: 'center', vertical: 'middle' };

  const outputPath = path.join(__dirname, '../resources/excel_templates/离职转岗导入模板.xlsx');
  await workbook.xlsx.writeFile(outputPath);
  console.log('模板已生成:', outputPath);
}

async function main() {
  await generateTemporaryLeaveTemplate();
  await generateFormalLeaveTemplate();
  await generateResignationTransferTemplate();
  console.log('所有模板生成完成!');
}

main().catch(console.error);
