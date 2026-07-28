import ExcelJS from 'exceljs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateTemplate() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('临时加班导入');

  // 设置列宽
  worksheet.columns = [
    { header: '员工姓名', key: 'employeeName', width: 15 },
    { header: '加班类型', key: 'overtimeType', width: 12 },
    { header: '加班日期', key: 'overtimeDate', width: 14 },
    { header: '开始时间', key: 'startTime', width: 12 },
    { header: '结束时间', key: 'endTime', width: 12 },
    { header: '加班原因', key: 'reason', width: 25 },
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
    overtimeType: '临时加班',
    overtimeDate: '2024-07-15',
    startTime: '18:00',
    endTime: '21:00',
    reason: '项目赶工'
  });

  // 设置示例行样式
  exampleRow.font = { size: 10 };
  exampleRow.alignment = { horizontal: 'center', vertical: 'middle' };

  // 保存文件
  const outputPath = path.join(__dirname, '../resources/excel_templates/临时加班导入模板.xlsx');
  await workbook.xlsx.writeFile(outputPath);
  console.log('模板已生成:', outputPath);
}

generateTemplate().catch(console.error);
