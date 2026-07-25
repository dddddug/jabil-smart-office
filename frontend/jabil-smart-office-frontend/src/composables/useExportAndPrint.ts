import { ref } from 'vue';
import ExcelJS from 'exceljs'; // Assuming ExcelJS is installed

export function useExportAndPrint() {
  const exportToExcel = async (
    startDate: string,
    summaryData: any[], // DepartmentSummaryItem[]
    overworkingEmployees: any[], // EmployeeWithOverworkDetails[]
    weeklyLimitEmployees: any[], // EmployeeWithWeeklyLimitDetails[]
    errandFixList: any[] // ErrandFixItem[]
  ) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('考勤汇总');

    // Add some header rows for demonstration
    worksheet.addRow(['考勤汇总报告 - ' + startDate]);
    worksheet.addRow([]); // Empty row for spacing

    worksheet.addRow(['部门汇总']);
    worksheet.addRow(['部门', '申请人', '破7休1人数', '周超限人数', '总超限工时', '周期', '原因']);
    summaryData.forEach(item => {
      worksheet.addRow([
        item.department,
        item.applicant,
        item.overworkCount,
        item.overLimitCount,
        item.totalOverHours,
        item.period,
        item.reason,
      ]);
    });
    worksheet.addRow([]);

    worksheet.addRow(['破7休1员工']);
    worksheet.addRow(['员工姓名', '连续天数', '开始日期', '结束日期', '部门', '是否忽略']);
    overworkingEmployees.forEach(item => {
      worksheet.addRow([
        item.name,
        item.consecutiveDays,
        item.overworkPeriodStart,
        item.overworkPeriodEnd,
        item.departmentName || item.department,
        item.isIgnored ? '是' : '否',
      ]);
    });
    worksheet.addRow([]);

    worksheet.addRow(['周工时超限员工']);
    worksheet.addRow(['员工姓名', '周工时', '周上限', '超限工时', '部门']);
    weeklyLimitEmployees.forEach(item => {
      worksheet.addRow([
        item.name,
        item.weeklyHours,
        item.weeklyLimit,
        item.overLimitHours,
        item.departmentName || item.department,
      ]);
    });
    worksheet.addRow([]);

    worksheet.addRow(['公差补卡申请']);
    worksheet.addRow(['申请人', '日期', '开始时间', '结束时间', '原因', '状态']);
    errandFixList.forEach(item => {
      worksheet.addRow([
        item.employeeName,
        item.errandDate,
        item.startTime,
        item.endTime,
        item.reason,
        item.status,
      ]);
    });
    worksheet.addRow([]);


    // Generate a downloadable file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `考勤汇总_${startDate}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportAttendance = (
    currentPeriodStart: string,
    summaryData: any[],
    overworkingEmployees: any[],
    weeklyLimitEmployees: any[],
    errandFixList: any[]
  ) => {
    exportToExcel(
      currentPeriodStart,
      summaryData,
      overworkingEmployees,
      weeklyLimitEmployees,
      errandFixList
    );
  };

  const printData = async (
    scheduleViewMode: string,
    currentPeriodStart: string,
    customRangeEnd: string,
    weekDays: any[],
    monthDays: any[],
    customRangeDays: any[],
    formattedWeekRange: string,
    formattedMonthRange: string,
    formattedCustomRange: string,
    filteredEmployees: any[]
  ) => {
    // Get the days array based on view mode
    let days: any[];
    let title: string;

    if (scheduleViewMode === 'week') {
      days = weekDays;
      title = `排班表 - ${formattedWeekRange}`;
    } else if (scheduleViewMode === 'month') {
      days = monthDays;
      title = `排班表 - ${formattedMonthRange}`;
    } else {
      days = customRangeDays;
      title = `排班表 - ${formattedCustomRange}`;
    }

    // Build print content
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('请允许弹出窗口以进行打印');
      return;
    }

    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h2 { text-align: center; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: center; font-size: 12px; }
          th { background-color: #f5f5f5; }
          .sticky-col { position: sticky; left: 0; background-color: #fff; z-index: 1; }
          th.sticky-col { background-color: #f5f5f5; z-index: 2; }
          .today { background-color: #ffffcc; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h2>${title} - 共 ${filteredEmployees.length} 人</h2>
        <table>
          <thead>
            <tr>
              <th class="sticky-col">员工/日期</th>
    `;

    // Add date headers
    days.forEach(day => {
      const todayClass = day.isToday ? ' class="today"' : '';
      html += `<th${todayClass}>${day.monthDay}<br>${day.weekday}</th>`;
    });

    html += `
            </tr>
          </thead>
          <tbody>
    `;

    // Add employee rows
    filteredEmployees.forEach(employee => {
      html += `
            <tr>
              <td class="sticky-col">${employee.name || ''}<br>${employee.position || '未设置'}</td>
      `;
      days.forEach(day => {
        const scheduleItem = employee.schedule && employee.schedule[day.date];
        const shift = scheduleItem ? scheduleItem.shift : '-';
        const specialStatus = scheduleItem ? (scheduleItem.specialStatus || '') : '';
        html += `<td>${specialStatus || shift}</td>`;
      });
      html += '</tr>';
    });

    html += `
          </tbody>
        </table>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return {
    exportToExcel,
    exportAttendance,
    printData,
  };
}
