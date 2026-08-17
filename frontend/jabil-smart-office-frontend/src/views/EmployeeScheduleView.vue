<template>
  <div class="employee-schedule-container">
    <div class="page-header">
      <div class="breadcrumb">
        <span class="breadcrumb-item">首页</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item">业务中心</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item active">员工排班</span>
      </div>
    </div>

    <div class="controls-section">
      <div class="view-mode-selector" v-if="subTab !== 'break7'">
        <button :class="{ active: scheduleViewMode === 'week' }" @click="switchViewMode('week')">周视图</button>
        <button :class="{ active: scheduleViewMode === 'month' }" @click="switchViewMode('month')">月视图</button>
        <button :class="{ active: scheduleViewMode === 'range' }" @click="switchViewMode('range')">自定义范围</button>
      </div>
      <div class="view-mode-selector" v-else>
        <span class="week-only-hint">周视图</span>
      </div>

      <div class="date-controls">
        <button @click="prevPeriod">&lt; 上一周期</button>
        <input 
          v-if="scheduleViewMode !== 'range'" 
          type="date" 
          v-model="currentPeriodStart" 
          @change="goToDate" 
          title="选择起始日期" 
        />
        <template v-else>
          <input 
            type="date" 
            v-model="currentPeriodStart" 
            title="选择开始日期" 
          />
          <span>至</span>
          <input 
            type="date" 
            v-model="customRangeEnd" 
            title="选择结束日期" 
          />
        </template>
        <button @click="nextPeriod">下一周期 &gt;</button>
        <button @click="today">今天</button>
      </div>


    </div>

    <!-- 子页面Tab -->
    <div class="sub-tabs">
      <div :class="{ 'tab-item': true, 'tab-overview': true, 'active': subTab === 'overview' }" @click="subTab = 'overview'">排班总览</div>
      <div :class="{ 'tab-item': true, 'tab-break7': true, 'active': subTab === 'break7' }" @click="subTab = 'break7'">破7休1和周工时上限、公差补卡申请</div>
      <div :class="{ 'tab-item': true, 'tab-attendance': true, 'active': subTab === 'attendance' }" @click="subTab = 'attendance'">考勤汇总</div>
      <div :class="{ 'tab-item': true, 'tab-special': true, 'active': subTab === 'special' }" @click="subTab = 'special'">特殊工时</div>
    </div>

    <!-- 右键菜单 -->
    <div v-if="isContextMenuOpen" class="context-menu" :style="{ left: contextMenuPosition.x + 'px', top: contextMenuPosition.y + 'px' }" @click="isContextMenuOpen = false">
      <div class="context-menu-item" @click.stop="openBatchShiftEdit">
        <span class="menu-icon">✏️</span>
        <span>批量修改排班</span>
      </div>
      <div class="context-menu-item" @click.stop="handleClearSchedule">
        <span class="menu-icon">🗑️</span>
        <span>清空排班</span>
      </div>
      <div class="context-menu-item" @click.stop="copySelection">
        <span class="menu-icon">📋</span>
        <span>复制 (Ctrl+C)</span>
      </div>
      <div class="context-menu-item" @click.stop="pasteSelection">
        <span class="menu-icon">📄</span>
        <span>粘贴 (Ctrl+V)</span>
      </div>
      <div class="context-menu-item" @click.stop="handleClearSelection">
        <span class="menu-icon">❌</span>
        <span>清空选择 (ESC)</span>
      </div>
    </div>

    <!-- 排班总览内容 -->
    <template v-if="subTab === 'overview'">
      <!-- 顶部指标栏：级别汇总 + 天数指标 -->
      <div class="summary-top-section">
        <!-- 按级别汇总工时（紧凑卡片形式） -->
        <div class="level-summary-container">
          <h3 class="summary-title">各级别工时汇总</h3>
          
          <!-- 图例 -->
          <div class="legend">
            <div class="legend-item">
              <span class="legend-dot schedule"></span>
              <span class="legend-text">排班工时</span>
            </div>
            <div class="legend-item">
              <span class="legend-dot overtime"></span>
              <span class="legend-text">临时加班</span>
            </div>
            <div class="legend-item">
              <span class="legend-dot leave"></span>
              <span class="legend-text">临时请假</span>
            </div>
            <div class="legend-item">
              <span class="legend-dot total"></span>
              <span class="legend-text">总工时</span>
            </div>
          </div>
        
        <div class="level-cards-grid">
          <div v-for="item in sortedLevelHoursSummary" :key="item.level" class="level-card">
            <div class="level-card-main">
              <div class="level-info">
                <div class="level-name">{{ item.level }}</div>
                <div class="employee-count">{{ item.employeeCount }}人</div>
              </div>
              <div class="level-stats">
                <div class="stat-inline">
                  <span class="stat-dot schedule"></span>
                  <span class="stat-text">{{ item.totalScheduleHours.toFixed(1) }}H</span>
                </div>
                <div class="stat-inline">
                  <span class="stat-dot overtime"></span>
                  <span class="stat-text">{{ item.totalOvertimeHours.toFixed(1) }}H</span>
                </div>
                <div class="stat-inline">
                  <span class="stat-dot leave"></span>
                  <span class="stat-text">{{ item.totalLeaveHours.toFixed(1) }}H</span>
                </div>
                <div class="stat-inline total">
                  <span class="stat-dot total"></span>
                  <span class="stat-text">{{ item.totalHours.toFixed(1) }}H</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
        
        <!-- 天数指标卡 -->
        <div class="days-stat-card">
          <div class="days-label">当前筛选</div>
          <div class="days-value">{{ currentFilterDays }} 天</div>
        </div>
      </div>

      <div class="schedule-content">
        <div v-if="scheduleViewMode === 'week'" class="weekly-schedule">
          <div class="schedule-header">
            <h3>当前周排班 ({{ formattedWeekRange }}) - 共 {{ filteredEmployees.length }} 人</h3>
            <div class="header-buttons">
              <button :disabled="!selectedDateForButtons" @click="togglePositionFilter">🎯 岗位{{ schedulePositionFilter.length > 0 ? ' (' + schedulePositionFilter.length + ')' : '' }}</button>
              <button :disabled="!selectedDateForButtons" @click="toggleShiftFilter">班次{{ scheduleShiftFilter.length > 0 ? ' (' + scheduleShiftFilter.length + ')' : '' }}</button>
              <button @click="oneClickSchedule">⚡ 一键排班</button>
              <button @click="importSchedule">📤 导入排班</button>
              <button @click="exportAttendance">📥 考勤导出</button>
            </div>
          </div>
          <div class="table-container">
            <table class="schedule-table">
              <thead>
                <tr>
                  <th class="sticky-col">员工 / 日期</th>
                  <th v-for="day in weekDays" :key="day.date"
                      :class="{
                        'today': day.isToday,
                        'header-single-selected': day.date === selectedDateForButtons,
                        'weekend-header': day.isWeekend,
                        'weekday-header-cell': !day.isWeekend
                      }"
                      @click="handleDateHeaderClick(day.date)">
                    <div class="day-header">{{ day.monthDay }}</div>
                    <div class="weekday-header">{{ day.weekday }}</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="employee in filteredEmployees" :key="employee.id">
                  <td class="sticky-col">
                    <div class="employee-info">
                      <div class="employee-avatar">{{ employee.name ? employee.name.charAt(0) : '?' }}</div>
                      <div class="employee-details">
                        <span class="employee-name">{{ employee.name }}</span>
                        <span class="employee-position">{{ employee.position || '未设置岗位' }}</span>
                        <span class="employee-total-hours">总工时: {{ getEmployeeHours(employee).totalHours.toFixed(1) }}H</span>
                      </div>
                    </div>
                  </td>
                  <td v-for="day in weekDays"
                      :key="day.date"
                      @mousedown="(e) => startSelection(employee.id, day.date, e)"
                      @mouseover="isSelecting && updateSelection(employee.id, day.date)"
                      @contextmenu.prevent="(e) => handleRightClick(e, employee.id, day.date)"
                      @dblclick="() => openShiftEditDialog(employee, day.date)"
                      @click="handleSingleDateSelect(employee.id, day.date)"
                      :class="{ 'cell-selected': isCellSelected(employee.id, day.date) }">
                    <div :class="['shift-cell', getShiftClass(employee.schedule[day.date]?.shift || '')]" v-if="employee.schedule[day.date]">
                      {{ employee.schedule[day.date]?.shift }}
                    </div>
                    <div v-else class="shift-cell shift-empty">-</div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div v-else-if="scheduleViewMode === 'month'" class="monthly-schedule">
          <div class="schedule-header">
            <h3>当前月排班 ({{ formattedMonthRange }}) - 共 {{ filteredEmployees.length }} 人</h3>
            <div class="header-buttons">
              <button :disabled="!selectedDateForButtons" @click="togglePositionFilter">🎯 岗位{{ schedulePositionFilter.length > 0 ? ' (' + schedulePositionFilter.length + ')' : '' }}</button>
              <button :disabled="!selectedDateForButtons" @click="toggleShiftFilter">班次{{ scheduleShiftFilter.length > 0 ? ' (' + scheduleShiftFilter.length + ')' : '' }}</button>
              <button @click="oneClickSchedule">⚡ 一键排班</button>
              <button @click="importSchedule">📤 导入排班</button>
              <button @click="exportAttendance">📥 考勤导出</button>
            </div>
          </div>
          <div class="table-container">
            <table class="schedule-table month-table">
              <thead>
                <tr>
                  <th class="sticky-col">员工 / 日期</th>
                  <th v-for="day in monthDays" :key="day.date"
                      :class="{
                        'today': day.isToday,
                        'header-single-selected': day.date === selectedDateForButtons,
                        'weekend-header': day.isWeekend,
                        'weekday-header-cell': !day.isWeekend
                      }"
                      @click="handleDateHeaderClick(day.date)">
                    <div class="day-header">{{ day.monthDay }}</div>
                    <div class="weekday-header">{{ day.weekday }}</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="employee in filteredEmployees" :key="employee.id">
                  <td class="sticky-col">
                    <div class="employee-info">
                      <div class="employee-avatar">{{ employee.name ? employee.name.charAt(0) : '?' }}</div>
                      <div class="employee-details">
                        <span class="employee-name">{{ employee.name }}</span>
                        <span class="employee-position">{{ employee.position || '未设置岗位' }}</span>
                        <span class="employee-total-hours">总工时: {{ getEmployeeHours(employee).totalHours.toFixed(1) }}H</span>
                      </div>
                    </div>
                  </td>
                  <td v-for="day in monthDays" 
                      :key="day.date" 
                      @mousedown="(e) => startSelection(employee.id, day.date, e)"
                      @mouseover="isSelecting && updateSelection(employee.id, day.date)"
                      @contextmenu.prevent="(e) => handleRightClick(e, employee.id, day.date)"
                      @dblclick="() => openShiftEditDialog(employee, day.date)"
                      @click="handleSingleDateSelect(employee.id, day.date)"
                      :class="{ 'cell-selected': isCellSelected(employee.id, day.date),
                                'other-month': !day.isCurrentMonth,
                                'today': day.isToday }">
                    <div :class="['shift-cell', getShiftClass(employee.schedule[day.date]?.shift || '')]" v-if="employee.schedule[day.date]">
                      {{ employee.schedule[day.date]?.shift }}
                    </div>
                    <div v-else class="shift-cell shift-empty">-</div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div v-else class="range-schedule">
          <div class="schedule-header">
            <h3>自定义范围 ({{ formattedCustomRange }}) - 共 {{ filteredEmployees.length }} 人</h3>
            <div class="header-buttons">
              <button :disabled="!selectedDateForButtons" @click="togglePositionFilter">🎯 岗位{{ schedulePositionFilter.length > 0 ? ' (' + schedulePositionFilter.length + ')' : '' }}</button>
              <button :disabled="!selectedDateForButtons" @click="toggleShiftFilter">班次{{ scheduleShiftFilter.length > 0 ? ' (' + scheduleShiftFilter.length + ')' : '' }}</button>
              <button @click="oneClickSchedule">⚡ 一键排班</button>
              <button @click="importSchedule">📤 导入排班</button>
              <button @click="exportAttendance">📥 考勤导出</button>
              <button @click="printSchedule">🖨️ 排班打印</button>
              <button @click="exportSchedule">📤 排班导出</button>
            </div>
          </div>
          <div class="table-container">
            <table class="schedule-table range-table">
              <thead>
                <tr>
                  <th class="sticky-col">员工 / 日期</th>
                  <th v-for="day in customRangeDays" :key="day.date"
                      :class="{
                        'today': day.isToday,
                        'header-single-selected': day.date === selectedDateForButtons,
                        'weekend-header': day.isWeekend,
                        'weekday-header-cell': !day.isWeekend
                      }"
                      @click="handleDateHeaderClick(day.date)">
                    <div class="day-header">{{ day.monthDay }}</div>
                    <div class="weekday-header">{{ day.weekday }}</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="employee in filteredEmployees" :key="employee.id">
                  <td class="sticky-col">
                    <div class="employee-info">
                      <div class="employee-avatar">{{ employee.name ? employee.name.charAt(0) : '?' }}</div>
                      <div class="employee-details">
                        <span class="employee-name">{{ employee.name }}</span>
                        <span class="employee-position">{{ employee.position || '未设置岗位' }}</span>
                        <span class="employee-total-hours">总工时: {{ getEmployeeHours(employee).totalHours.toFixed(1) }}H</span>
                      </div>
                    </div>
                  </td>
                  <td v-for="day in customRangeDays"
                      :key="day.date"
                      @mousedown="(e) => startSelection(employee.id, day.date, e)"
                      @mouseover="isSelecting && updateSelection(employee.id, day.date)"
                      @contextmenu.prevent="(e) => handleRightClick(e, employee.id, day.date)"
                      @dblclick="() => openShiftEditDialog(employee, day.date)"
                      @click="handleSingleDateSelect(employee.id, day.date)"
                      :class="{ 'cell-selected': isCellSelected(employee.id, day.date) }">
                    <div :class="['shift-cell', getShiftClass(employee.schedule[day.date]?.shift || '')]" v-if="employee.schedule[day.date]">
                      {{ employee.schedule[day.date]?.shift }}
                    </div>
                    <div v-else class="shift-cell shift-empty">-</div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>

    <!-- 破7休1和周工时上限、公差补卡申请 -->
    <div v-else-if="subTab === 'break7'" class="sub-tab-content break7-container">
      <!-- 顶部操作栏 -->
      <div class="break7-header-compact">
        <div class="header-title-compact">
          <span class="title-icon-compact">📊</span>
          <h2>破7休1和周工时上限、公差补卡申请</h2>
        </div>
        <div class="break7-actions-compact">
          
          <div class="email-config-compact">
            <div class="input-group-compact">
              <label>收件人：</label>
              <input type="email" v-model="emailConfig.to" placeholder="收件人邮箱" />
            </div>
            <div class="input-group-compact">
              <label>抄送人：</label>
              <input type="email" v-model="emailConfig.cc" placeholder="抄送人邮箱" />
            </div>
          </div>
          <div class="action-buttons-compact">
            <button class="btn btn-export-compact" @click="exportToExcel">
              <span class="btn-icon-compact">📥</span>
              导出Excel
            </button>
            <button class="btn btn-send-compact" @click="openInOutlook">
              <span class="btn-icon-compact">📧</span>
              发送邮件
            </button>
          </div>
        </div>
      </div>

      
      <!-- 汇总统计表格 -->
      <div class="table-container">
        <div class="table-header">
          <div class="table-title">
            <span class="table-icon">📈</span>
            <span>汇总统计</span>
          </div>
          <div class="table-stats">
            <span class="stat-badge">
              <span class="stat-label">涉及部门：</span>
              <span class="stat-value">{{ summaryData.length }}</span>
            </span>
            <span class="stat-badge">
              <span class="stat-label">破7休1：</span>
              <span class="stat-value warning">{{ totalOverworkCount }}</span>
            </span>
            <span class="stat-badge">
              <span class="stat-label">周工时超限：</span>
              <span class="stat-value danger">{{ totalOverLimitCount }}</span>
            </span>
          </div>
        </div>
        <table class="data-table with-border enhanced compact-table">
          <thead>
            <tr>
              <th rowspan="2" style="width: 30px;">申请部门</th>
              <th rowspan="2" style="width: 40px;">申请人</th>
              <th style="width: 60px;">打破7休1</th>
              <th colspan="2" style="width: 100px;">周工时&gt;63.75</th>
              <th rowspan="2" style="width: 30px;">实施周期</th>
              <th rowspan="2" style="width: 140px;">原因说明</th>
            </tr>
            <tr>
              <th style="width: 50px;">申请人数</th>
              <th style="width: 50px;">申请人数</th>
              <th style="width: 50px;">超出总工时</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(dept, index) in summaryData" :key="index">
              <td style="width: 70px; text-align: left;">{{ dept.department }}</td>
              <td style="width: 50px;">{{ dept.applicant }}</td>
              <td style="width: 60px;" class="text-warning">{{ dept.overworkCount }}</td>
              <td style="width: 60px;" class="text-danger">{{ dept.overLimitCount }}</td>
              <td style="width: 60px;" class="text-danger">{{ dept.totalOverHours }}H</td>
              <td style="width: 70px;">{{ dept.period }}</td>
              <td style="width: 140px; text-align: left;"><input type="text" :value="dept.reason" @input="setSummaryReason(dept.department, ($event.target as HTMLInputElement).value)" class="inline-input" placeholder="填写原因说明" /></td>
            </tr>
            <tr v-if="summaryData.length === 0">
              <td colspan="7" style="text-align: center; color: #6B7280; padding: 40px;">
                <span style="font-size: 48px;">📭</span>
                <br />
                暂无数据，请点击"刷新数据"
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 破7休1详细表格 -->
      <div class="table-container">
        <div class="table-header">
          <div class="table-title">
            <span class="table-icon">⚠️</span>
            <span>破7休1详细列表</span>
            <span class="count-badge">{{ overworkingEmployees.length }}</span>
          </div>
        </div>
        <table class="data-table with-border enhanced compact-table">
          <thead>
            <tr>
              <th style="width: 25px;">序号</th>
              <th style="width: 30px;">区域</th>
              <th style="width: 20px;">部门</th>
              <th style="width: 20px;">级别</th>
              <th style="width: 35px;">工号</th>
              <th style="width: 30px;">姓名</th>
              <th style="width: 50px;">开始日期</th>
              <th style="width: 50px;">结束日期</th>
              <th style="width: 30px;">天数</th>
              <th style="width: 70px;">原因说明</th>
              <th style="width: 30px;">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(emp, index) in paginatedOverworkEmployees" :key="emp.id" :class="{'ignored-row': emp.isIgnored}">
              <td style="width: 25px;">{{ (overworkCurrentPage - 1) * break7PageSize + index + 1 }}</td>
              <td style="width: 30px;">{{ emp.plantName || emp.plant || '-' }}</td>
              <td style="width: 20px;">{{ (emp.departmentName || emp.department)?.replace('MPL_Stockroom', 'ST') }}</td>
              <td style="width: 20px;">{{ emp.level || '-' }}</td>
              <td style="width: 35px;">{{ emp.oldEmployeeId || emp.sap }}</td>
              <td style="width: 30px;">{{ emp.name }}</td>
              <td style="width: 50px;">{{ formatUsDate(emp.startDate) }}</td>
              <td style="width: 50px;">{{ formatUsDate(emp.endDate) }}</td>
              <td style="width: 30px;" class="text-warning">{{ emp.consecutiveDays }}天</td>
              <td style="width: 70px;">{{ getReasonByPosition(emp.position || emp.level || '') }}</td>
              <td style="width: 30px;">
                <button class="btn btn-sm" :class="emp.isIgnored ? 'btn-success' : 'btn-danger'" @click="toggleIgnoreOverwork(emp)">
                  {{ emp.isIgnored ? '取消忽略' : '忽略' }}
                </button>
              </td>
            </tr>
            <tr v-if="overworkingEmployees.length === 0">
              <td colspan="11" style="text-align: center; color: #6B7280; padding: 40px;">
                <span style="font-size: 48px;">🎉</span>
                <br />
                暂无连续工作7天的员工
              </td>
            </tr>
          </tbody>
        </table>
        <!-- 分页控件 -->
        <div v-if="overworkingEmployees.length > break7PageSize" class="pagination-container">
          <div class="pagination-info">
            共 {{ overworkingEmployees.length }} 条数据，第 {{ overworkCurrentPage }} / {{ overworkTotalPages }} 页
          </div>
          <div class="pagination-buttons">
            <button 
              :disabled="overworkCurrentPage <= 1" 
              @click="overworkCurrentPage--"
            >
              上一页
            </button>
            <button 
              v-for="page in overworkTotalPages" 
              :key="page" 
              :class="{ active: overworkCurrentPage === page }" 
              @click="overworkCurrentPage = page"
            >
              {{ page }}
            </button>
            <button 
              :disabled="overworkCurrentPage >= overworkTotalPages" 
              @click="overworkCurrentPage++"
            >
              下一页
            </button>
          </div>
        </div>
      </div>

      <!-- 周工时上限详细表格 -->
      <div class="table-container">
        <div class="table-header">
          <div class="table-title">
            <span class="table-icon">⏰</span>
            <span>周工时上限详细列表</span>
            <span class="count-badge">{{ weeklyLimitEmployees.length }}</span>
          </div>
        </div>
        <table class="data-table with-border enhanced compact-table">
          <thead>
            <tr>
              <th style="width: 25px;">序号</th>
              <th style="width: 30px;">区域</th>
              <th style="width: 20px;">部门</th>
              <th style="width: 20px;">级别</th>
              <th style="width: 35px;">工号</th>
              <th style="width: 30px;">姓名</th>
              <th style="width: 50px;">日期</th>
              <th style="width: 30px;">周工时</th>
              <th style="width: 25px;">周数</th>
              <th style="width: 30px;">超出工时</th>
              <th style="width: 70px;">原因说明</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(emp, index) in paginatedWeeklyLimitEmployees" :key="emp.id">
              <td style="width: 25px;">{{ (weeklyLimitCurrentPage - 1) * weeklyPageSize + index + 1 }}</td>
              <td style="width: 30px;">{{ emp.plantName || emp.plant || '-' }}</td>
              <td style="width: 20px;">{{ (emp.departmentName || emp.department)?.replace('MPL_Stockroom', 'ST') }}</td>
              <td style="width: 20px;">{{ emp.level || '-' }}</td>
              <td style="width: 35px;">{{ emp.oldEmployeeId || emp.sap }}</td>
              <td style="width: 30px;">{{ emp.name }}</td>
              <td style="width: 50px;">{{ formatUsDate(emp.weekDate) }}</td>
              <td style="width: 30px;" class="text-danger">{{ emp.totalHours }}H</td>
              <td style="width: 25px;">{{ emp.weekNumber }}</td>
              <td style="width: 30px;" class="text-danger">{{ emp.overLimitHours }}H</td>
              <td style="width: 70px;">{{ getReasonByPosition(emp.position || emp.level || '') }}</td>
            </tr>
            <tr v-if="weeklyLimitEmployees.length === 0">
              <td colspan="11" style="text-align: center; color: #6B7280; padding: 40px;">
                <span style="font-size: 48px;">✅</span>
                <br />
                暂无周工时超限的员工
              </td>
            </tr>
          </tbody>
        </table>
        <!-- 分页控件 -->
        <div v-if="weeklyLimitEmployees.length > weeklyPageSize" class="pagination-container">
          <div class="pagination-info">
            共 {{ weeklyLimitEmployees.length }} 条数据，第 {{ weeklyLimitCurrentPage }} / {{ weeklyLimitTotalPages }} 页
          </div>
          <div class="pagination-buttons">
            <button 
              :disabled="weeklyLimitCurrentPage <= 1" 
              @click="weeklyLimitCurrentPage--"
            >
              上一页
            </button>
            <button 
              v-for="page in weeklyLimitTotalPages" 
              :key="page" 
              :class="{ active: weeklyLimitCurrentPage === page }" 
              @click="weeklyLimitCurrentPage = page"
            >
              {{ page }}
            </button>
            <button 
              :disabled="weeklyLimitCurrentPage >= weeklyLimitTotalPages" 
              @click="weeklyLimitCurrentPage++"
            >
              下一页
            </button>
          </div>
        </div>
      </div>

      <!-- 公差补卡申请表格 -->
      <div class="table-container">
        <div class="table-header">
          <div class="table-title">
            <span class="table-icon">📝</span>
            <span>公差申请</span>
            <span class="count-badge">{{ errandFixList.length }}</span>
          </div>
        </div>
        <table class="data-table with-border enhanced">
          <thead>
            <tr>
              <th style="width: 70px;">区域</th>
              <th style="width: 100px;">部门</th>
              <th style="width: 100px;">工号</th>
              <th style="width: 80px;">姓名</th>
              <th style="width: 120px;">开始时间</th>
              <th style="width: 120px;">结束时间</th>
              <th style="width: 90px;">假期类型</th>
              <th style="width: 200px;">备注</th>
              <th style="width: 50px;">OT</th>
              <th style="width: 90px;">证据</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in errandFixList" :key="item.id">
              <td style="width: 70px;">{{ item.plant || '-' }}</td>
              <td style="width: 100px;">{{ item.department }}</td>
              <td style="width: 100px;">{{ item.sap }}</td>
              <td style="width: 80px;">{{ item.employeeName }}</td>
              <td style="width: 120px;">{{ item.startTime }}</td>
              <td style="width: 120px;">{{ item.endTime }}</td>
              <td style="width: 90px;">{{ item.leaveType }}</td>
              <td style="width: 200px;">{{ item.reason }}</td>
              <td style="width: 50px;">{{ item.ot }}</td>
              <td style="width: 150px;">
                <img v-if="item.evidence" :src="item.evidence" alt="证据" style="width: 120px; height: auto; max-height: 100px; object-fit: contain; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;" @click="openLink(item.evidence)" />
                <span v-else>-</span>
              </td>
            </tr>
            <tr v-if="errandFixList.length === 0">
              <td colspan="10" style="text-align: center; color: #6B7280; padding: 40px;">
                <span style="font-size: 48px;">📋</span>
                <br />
                暂无公差申请
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 考勤汇总 -->
    <div v-else-if="subTab === 'attendance'" class="sub-tab-content">
      <!-- 考勤汇总的子 tab -->
      <div class="sub-tabs-sub">
        <div
          :class="{ 'tab-item-sub': true, 'active': attendanceSubTab === 'overtime' }"
          @click="attendanceSubTab = 'overtime'"
        >
          加班
        </div>
        <div
          :class="{ 'tab-item-sub': true, 'active': attendanceSubTab === 'leave' }"
          @click="attendanceSubTab = 'leave'"
        >
          事假
        </div>
        <div
          :class="{ 'tab-item-sub': true, 'active': attendanceSubTab === 'annual' }"
          @click="attendanceSubTab = 'annual'"
        >
          年假
        </div>
      </div>

      <!-- 加班内容 -->
      <div v-if="attendanceSubTab === 'overtime'" class="attendance-section">
        <div class="section-header">
          <h3 class="section-title">加班记录</h3>
          <div class="section-actions">
            <button class="btn btn-export" @click="exportOvertimeToExcel">
              <span class="btn-icon">📥</span>
              导出Excel
            </button>
          </div>
        </div>
        
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>工号</th>
                <th>姓名</th>
                <th>加班日期</th>
                <th>加班时数</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in overtimeList" :key="index">
                <td>{{ item.sap }}</td>
                <td>{{ item.name }}</td>
                <td>{{ item.date }}</td>
                <td>{{ item.hours }}</td>
              </tr>
              <tr v-if="overtimeList.length === 0">
                <td colspan="4" style="text-align: center; color: #9ca3af;">暂无加班记录</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 事假内容 -->
      <div v-else-if="attendanceSubTab === 'leave'" class="attendance-section">
        <div class="section-header">
          <h3 class="section-title">事假记录</h3>
          <div class="section-actions">
            <button class="btn btn-export" @click="exportLeaveToExcel">
              <span class="btn-icon">📥</span>
              导出Excel
            </button>
          </div>
        </div>
        
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>工号</th>
                <th>姓名</th>
                <th>开始时间</th>
                <th>结束时间</th>
                <th>休假类型</th>
                <th>备注</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in leaveList" :key="index">
                <td>{{ item.sap }}</td>
                <td>{{ item.name }}</td>
                <td>{{ item.startTime }}</td>
                <td>{{ item.endTime }}</td>
                <td>{{ item.leaveType }}</td>
                <td>{{ item.remark || '' }}</td>
              </tr>
              <tr v-if="leaveList.length === 0">
                <td colspan="6" style="text-align: center; color: #9ca3af;">暂无事假记录</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 年假内容 -->
      <div v-else-if="attendanceSubTab === 'annual'" class="attendance-section">
        <div class="section-header">
          <h3 class="section-title">年假记录</h3>
          <div class="section-actions">
            <button class="btn btn-export" @click="exportAnnualLeaveToExcel">
              <span class="btn-icon">📥</span>
              导出Excel
            </button>
          </div>
        </div>

        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>工号</th>
                <th>姓名</th>
                <th>部门</th>
                <th>开始日期</th>
                <th>结束日期</th>
                <th>天数</th>
                <th>原因</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in mergedAnnualLeaveList" :key="index">
                <td>{{ item.sap }}</td>
                <td>{{ item.name }}</td>
                <td>{{ item.departmentName }}</td>
                <td>{{ item.startDate }}</td>
                <td>{{ item.endDate }}</td>
                <td>{{ item.totalDays }}</td>
                <td>{{ item.reason }}</td>
              </tr>
              <tr v-if="annualLeaveList.length === 0">
                <td colspan="7" style="text-align: center; color: #9ca3af;">暂无年假记录</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 特殊工时 -->
    <div v-else-if="subTab === 'special'" class="sub-tab-content">
      <SpecialWorkingHoursPage 
        :startDate="currentCalculatedDateRange.startDate"
        :endDate="currentCalculatedDateRange.endDate"
      />
    </div>

    <!-- Position Filter Dialog -->
    <div v-if="isPositionFilterOpen" class="dialog-overlay" @click="closePositionFilter">
      <div class="dialog-content" @click.stop>
        <div class="dialog-header">
          <h3>选择岗位</h3>
          <button class="dialog-close" @click="closePositionFilter">×</button>
        </div>
        <div class="dialog-body">
          <div class="position-options">
            <label v-for="position in allPositions" :key="position" class="position-option">
              <input 
                type="checkbox" 
                :value="position" 
                v-model="tempPositionFilter" 
              /> 
              {{ position }}
            </label>
          </div>
        </div>
        <div class="dialog-footer">
          <button class="btn btn-secondary" @click="clearPositionFilter">清除</button>
          <button class="btn btn-secondary" @click="closePositionFilter">取消</button>
          <button class="btn btn-primary" @click="applyPositionFilter">确定</button>
        </div>
      </div>
    </div>

    <!-- Shift Filter Dialog -->
    <div v-if="isShiftFilterOpen" class="dialog-overlay" @click="closeShiftFilter">
      <div class="dialog-content" @click.stop>
        <div class="dialog-header">
          <h3>选择班次</h3>
          <button class="dialog-close" @click="closeShiftFilter">×</button>
        </div>
        <div class="dialog-body">
          <div class="position-options">
            <label v-for="shift in availableShifts" :key="shift.value" class="position-option">
              <input 
                type="checkbox" 
                :value="shift.value" 
                v-model="tempShiftFilter" 
              /> 
              {{ shift.label }}
            </label>
          </div>
        </div>
        <div class="dialog-footer">
          <button class="btn btn-secondary" @click="clearShiftFilter">清除</button>
          <button class="btn btn-secondary" @click="closeShiftFilter">取消</button>
          <button class="btn btn-primary" @click="applyShiftFilter">确定</button>
        </div>
      </div>
    </div>

    <!-- Shift Edit Dialog -->
    <div v-if="isShiftEditDialogOpen" class="dialog-overlay">
      <div class="dialog-content">
        <div class="dialog-header">
          <div class="employee-header">
            <div class="employee-avatar-large">{{ editingEmployee?.name.charAt(0) }}</div>
            <div class="employee-info-large">
              <span class="employee-name-large">{{ editingEmployee?.name }}</span>
              <span class="employee-meta">
                <span class="meta-item"><i class="el-icon-postcard"></i> 工号: {{ editingEmployee?.sap }}</span>
                <span class="meta-separator">|</span>
                <span class="meta-item"><i class="el-icon-office-building"></i> {{ editingEmployee?.department }}</span>
              </span>
            </div>
          </div>
          <button class="dialog-close" @click="closeShiftEditDialog">×</button>
        </div>
        <div class="dialog-body">
          <div class="edit-info">
            <span class="edit-label">日期：</span>
            <span class="edit-value">{{ editingDate }}</span>
          </div>
          
          <!-- 班次选择 -->
          <div class="form-group">
            <label>班次选择（单选，色系区分）：</label>
            <div class="shift-options">
              <label v-for="shift in availableShifts" :key="shift.value" :class="['shift-option', getShiftClass(shift.value)]">
                <input type="radio" :value="shift.value" v-model="editingData.shift" /> {{ shift.label }}
              </label>
            </div>
          </div>

          <!-- 临时事项 -->
          <div class="form-group">
            <label>临时事项：</label>
            <div class="temporary-matter">
              <div class="matter-row">
                <select v-model="editingData.tempMatter.type">
                  <option value="">请选择类型</option>
                  <option value="临时加班">临时加班</option>
                  <option value="公差">公差</option>
                  <option value="临时请假">临时请假</option>
                </select>
                <input type="time" v-model="editingData.tempMatter.startTime" placeholder="开始时间" />
                <span>至</span>
                <input type="time" v-model="editingData.tempMatter.endTime" placeholder="结束时间" />
              </div>
              <div class="matter-row">
                <span>时长：{{ calculateTempMatterDuration() }} 小时</span>
              </div>
              <div class="matter-row">
                <input type="text" v-model="editingData.tempMatter.reason" placeholder="事由（必填）" />
              </div>
              <div class="matter-row">
                <input type="file" ref="fileInput" style="display: none" @change="handleFileChange" accept=".jpg,.jpeg,.png,.pdf,.doc,.docx" />
                <button class="btn btn-secondary" @click="uploadProof">📎 上传证明材料</button>
                <span v-if="editingData.tempMatter.proof" style="color: #10B981; margin-left: 8px;">✓ 已上传</span>
              </div>
            </div>
          </div>
        </div>
        <div class="dialog-actions">
          <button class="btn btn-danger" @click="deleteShift">删除</button>
          <div class="action-group">
            <button class="btn btn-secondary" @click="closeShiftEditDialog">取消</button>
            <button class="btn btn-primary" @click="saveShift">保存</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Import Schedule Dialog -->
    <div v-if="isImportScheduleDialogOpen" class="dialog-overlay" @click="closeImportScheduleDialog">
      <div class="dialog-content" @click.stop>
        <div class="dialog-header">
          <h3>导入排班</h3>
          <button class="dialog-close" @click="closeImportScheduleDialog">×</button>
        </div>
        <div class="dialog-body">
          <div style="text-align: center; padding: 20px 0;">
            <button @click="downloadScheduleTemplate" style="margin-bottom: 20px; padding: 10px 20px; background: #3B82F6; color: white; border: none; border-radius: 6px; cursor: pointer;">
              📥 下载排班模板
            </button>
            <div style="margin-bottom: 15px;">或</div>
            <div style="border: 2px dashed #D1D5DB; padding: 30px; border-radius: 8px;">
              <p style="margin: 0 0 15px 0;">点击选择 Excel 文件（可多选）</p>
              <input type="file" ref="scheduleFileInput" accept=".xlsx,.xls" multiple style="display: block; margin: 0 auto;" @change="handleScheduleFileUpload">
              <p style="margin: 15px 0 0 0; color: #6B7280; font-size: 12px;">支持 .xlsx 和 .xls 格式，支持多选文件</p>
            </div>
          </div>
        </div>
        <div class="dialog-footer">
          <button class="btn btn-secondary" @click="closeImportScheduleDialog">取消</button>
        </div>
      </div>
    </div>

    <!-- 批量修改排班对话框 -->
    <div v-if="isBatchShiftEditOpen" class="dialog-overlay" @click="isBatchShiftEditOpen = false">
      <div class="dialog-content" @click.stop>
        <div class="dialog-header">
          <h3>批量修改排班</h3>
          <button class="dialog-close" @click="isBatchShiftEditOpen = false">×</button>
        </div>
        <div class="dialog-body">
          <div class="form-group">
            <label>选择班次</label>
            <select v-model="batchShiftValue" style="width: 100%; padding: 10px; border: 1px solid #D1D5DB; border-radius: 6px;">
              <option value="">请选择</option>
              <option v-for="shift in availableShifts" :key="shift.value" :value="shift.value">{{ shift.label }}</option>
            </select>
          </div>
          <p style="color: #6B7280; font-size: 12px; margin-top: 10px;">
            已选择 {{ selectedCells.length }} 个单元格
          </p>
        </div>
        <div class="dialog-footer">
          <button class="btn btn-secondary" @click="isBatchShiftEditOpen = false">取消</button>
          <button class="btn btn-primary" @click="saveBatchShift">保存</button>
        </div>
      </div>
    </div>

    <!-- Errand Fix Dialog -->
    <div v-if="isErrandFixDialogOpen" class="dialog-overlay" @click="isErrandFixDialogOpen = false">
      <div class="dialog-content" @click.stop>
        <div class="dialog-header">
          <h3>公差补卡申请</h3>
          <button class="dialog-close" @click="isErrandFixDialogOpen = false">×</button>
        </div>
        <div class="dialog-body">
          <div class="form-group">
            <label>员工：</label>
            <select v-model="errandFixForm.employeeId" style="width: 100%;">
              <option :value="emp.id" v-for="emp in employees" :key="emp.id">{{ emp.name }} ({{ emp.sap }})</option>
            </select>
          </div>
          <div class="form-group">
            <label>补卡日期：</label>
            <input type="date" v-model="errandFixForm.errandDate" style="width: 100%;" />
          </div>
          <div class="form-group">
            <label>时段：</label>
            <div style="display: flex; gap: 10px;">
              <input type="time" v-model="errandFixForm.startTime" style="flex: 1;" />
              <span style="line-height: 36px;">至</span>
              <input type="time" v-model="errandFixForm.endTime" style="flex: 1;" />
            </div>
          </div>
          <div class="form-group">
            <label>事由：</label>
            <textarea v-model="errandFixForm.reason" style="width: 100%; min-height: 80px;" placeholder="请填写公差事由"></textarea>
          </div>
        </div>
        <div class="dialog-footer">
          <button class="btn btn-secondary" @click="isErrandFixDialogOpen = false">取消</button>
          <button class="btn btn-primary" @click="submitErrandFix">提交</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import dayjs from '@/plugins/dayjs';
import 'dayjs/locale/zh-cn';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import SpecialWorkingHoursPage from './SpecialWorkingHoursPage.vue';
import request, { clearRequestCache } from '@/utils/request';
import { ElMessage, ElMessageBox } from 'element-plus';
import { fetchImageAsBase64 } from '@/utils/fileUtils';
import { formatShanghaiDateTime } from '../utils/dateUtils';
import eventBus from '@/utils/eventBus';
import { getReasonByPosition, loadPositionReasonsToCache } from '@/utils/positionReasonUtils';
import { useVoiceReminder } from '@/composables/useVoiceReminder';

// 语音提醒
const { checkScheduleChange } = useVoiceReminder();

// 排班变动记录（用于语音提醒）- 使用 localStorage 持久化存储
const SCHEDULE_HASH_KEY = 'jabil-schedule-hash';

// 获取上次保存的排班哈希
const getStoredScheduleHash = (): string => {
  try {
    return localStorage.getItem(SCHEDULE_HASH_KEY) || '';
  } catch {
    return '';
  }
};

// 保存排班哈希到 localStorage
const saveScheduleHash = (hash: string) => {
  try {
    localStorage.setItem(SCHEDULE_HASH_KEY, hash);
  } catch (e) {
    console.error('[Schedule] 保存排班哈希失败:', e);
  }
};

// 之前排班数据结构
interface PreviousScheduleItem {
  id: number;
  name: string;
  schedule: Record<string, string>;
}

// 检测排班变动
const detectScheduleChanges = () => {
  // 生成当前排班的哈希值
  const currentHash = JSON.stringify(employees.value.map(emp => ({
    id: emp.id,
    name: emp.name,
    schedule: emp.schedule || {}
  })));

  // 获取上次保存的哈希
  const storedHash = getStoredScheduleHash();

  // 与存储的哈希对比
  if (storedHash && storedHash !== currentHash) {
    // 获取有变动的员工列表
    try {
      const previousSchedule: PreviousScheduleItem[] = JSON.parse(storedHash);
      const changes: { employeeName: string; changeType: string }[] = [];

      employees.value.forEach(emp => {
        const prevEmp = previousSchedule.find((p) => p.id === emp.id);
        if (prevEmp) {
          const prevScheduleStr = JSON.stringify(prevEmp.schedule || {});
          const currScheduleStr = JSON.stringify(emp.schedule || {});
          if (prevScheduleStr !== currScheduleStr) {
            changes.push({ employeeName: emp.name || '未知员工', changeType: '排班变更' });
          }
        }
      });

      if (changes.length > 0) {
        checkScheduleChange(changes);
      }
    } catch (e) {
      console.error('[Schedule] 检测排班变动失败:', e);
    }
  }

  // 保存当前排班状态到 localStorage
  saveScheduleHash(currentHash);
};

// 获取当前登录用户
const getCurrentUser = () => {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }
  return null;
};

// 日期格式化函数 - 美式格式 (月/日/年)
const formatUsDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
};


interface ErrandFixItem {
  id: number;
  plant?: string;
  department?: string;
  sap: string;
  employeeName: string;
  startTime: string;
  endTime: string;
  leaveType: string;
  reason: string;
  ot: number;
  evidence?: string; // evidence 是可选的，因为有 if (item.evidence) 检查
}


interface Shift {
  value: string;
  label: string;
  durationHours?: number;
  description?: string;
}

interface Day {
  date: string;
  monthDay: string;
  weekday: string;
  isToday: boolean;
  isCurrentMonth?: boolean; // For month view, indicates if the day belongs to the current displayed month
  isWeekend?: boolean; // Indicates if the day is Saturday or Sunday
}




dayjs.locale('zh-cn');

const openLink = (url: string) => {
  window.open(url, '_blank');
};

interface BatchUploadResponse {
  insertedCount?: number;
  updatedCount?: number;
  errors?: string[];
}

interface ScheduleItem {
  shift: string;
  specialStatus?: string;
  tempMatter?: {
    type: string;
    startTime: string;
    endTime: string;
    reason: string;
    proof: boolean;
  };
}

interface Employee {
  id: number;
  name: string;
  sap: string;
  plantId?: number;
  plantName?: string;
  departmentId?: number;
  departmentName?: string;
  position?: string;
  level?: string;
  schedule: { [date: string]: ScheduleItem };
  scheduleHours?: number;
  overtimeHours?: number;
  leaveHours?: number;
  totalHours?: number;
  // 添加缺失的自定义属性
  employeeType?: string;
  employee_type?: string;
  realName?: string;
  oldEmployeeId?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any; // 允许任意属性
}

interface TemporaryOvertimeItem {
  employeeId: number;
  overtimeDate: string;
  hours: number;
}

interface TemporaryLeaveItem {
  id: number;
  employeeId: number;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  leaveType?: string;
  type?: string;
  reason?: string;
  proofFile?: string;
  hours?: number | string;
  // API 返回的额外字段
  employeeName?: string;
  employeeNo?: string;
  plantId?: number;
  plantName?: string;
  plant?: string;
  departmentId?: number;
  departmentName?: string;
  department?: string;
}

// 新增 Department 和 Plant 接口
interface Department {
  id: number;
  name: string;
  plantId: number;
}

interface Plant {
  id: number;
  name: string;
}

// 员工相关记录通用接口（用于 formalLeaves, resignationTransfers 等）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface EmployeeRecord { [key: string]: any; }

// 从 localStorage 恢复所有状态
const savedSubTab = localStorage.getItem('employeeScheduleSubTab');
const savedViewMode = localStorage.getItem('employeeScheduleViewMode');
const savedPeriodStart = localStorage.getItem('employeeSchedulePeriodStart');
const savedCustomRangeEnd = localStorage.getItem('employeeScheduleCustomRangeEnd');
const savedPositionFilter = localStorage.getItem('employeeSchedulePositionFilter');
const savedShiftFilter = localStorage.getItem('employeeScheduleShiftFilter');
const savedCurrentPage = localStorage.getItem('employeeScheduleCurrentPage');
const savedOverworkPage = localStorage.getItem('employeeScheduleOverworkPage');
const savedWeeklyLimitPage = localStorage.getItem('employeeScheduleWeeklyLimitPage');
const savedPageSize = localStorage.getItem('employeeSchedulePageSize');

// 视图模式
const scheduleViewMode = ref<'week' | 'month' | 'range'>(
  (savedViewMode as 'week' | 'month' | 'range') || 'week'
);

// 子页签
const subTab = ref<'overview' | 'break7' | 'attendance' | 'special'>(
  (savedSubTab as 'overview' | 'break7' | 'attendance' | 'special') || 'overview'
);

// 日期选择
const currentPeriodStart = ref(savedPeriodStart || dayjs().startOf('week').format('YYYY-MM-DD'));
const customRangeEnd = ref(savedCustomRangeEnd || dayjs().endOf('week').format('YYYY-MM-DD'));

// 计算当前视图的开始和结束日期
const currentCalculatedDateRange = computed(() => {
  let startDate = '';
  let endDate = '';

  if (scheduleViewMode.value === 'week') {
    const weekStart = dayjs(currentPeriodStart.value).day(1); // 从周一开始
    startDate = weekStart.format('YYYY-MM-DD');
    endDate = weekStart.add(6, 'day').format('YYYY-MM-DD');
  } else if (scheduleViewMode.value === 'month') {
    let monthStart;
    if (dayjs(currentPeriodStart.value).date() >= 24) {
      monthStart = dayjs(currentPeriodStart.value).date(24);
    } else {
      monthStart = dayjs(currentPeriodStart.value).subtract(1, 'month').date(24);
    }
    startDate = monthStart.format('YYYY-MM-DD');
    endDate = monthStart.add(1, 'month').date(23).format('YYYY-MM-DD');
  } else {
    // 自定义范围
    startDate = currentPeriodStart.value;
    endDate = customRangeEnd.value;
  }
  return { startDate, endDate };
});

// 筛选器
const schedulePositionFilter = ref<string[]>(
  savedPositionFilter ? JSON.parse(savedPositionFilter) : []
);
const scheduleShiftFilter = ref<string[]>(
  savedShiftFilter ? JSON.parse(savedShiftFilter) : []
);

// 新增厂区和部门筛选器
const currentPlantFilter = ref<number | null>(null);
const currentDepartmentFilter = ref<number | null>(null);

// 分页 - 排班总览
const currentPage = ref(savedCurrentPage ? parseInt(savedCurrentPage) : 1);
const pageSize = ref(savedPageSize ? parseInt(savedPageSize) : 20);

// 分页 - 破7休1和周工时
const overworkCurrentPage = ref(savedOverworkPage ? parseInt(savedOverworkPage) : 1);
const weeklyLimitCurrentPage = ref(savedWeeklyLimitPage ? parseInt(savedWeeklyLimitPage) : 1);

interface IgnoredOverworkItem {
  employeeId: number;
  startDate: string;
  endDate: string;
}

interface SummaryReasonItem {
  department: string;
  reason: string;
}

// 汇总表原因持久化
const summaryReasons = ref<SummaryReasonItem[]>([]);

const loadSummaryReasons = () => {
  try {
    const saved = localStorage.getItem('employeeScheduleSummaryReasons');
    summaryReasons.value = saved ? JSON.parse(saved) : [];
  } catch {
    summaryReasons.value = [];
  }
};

const saveSummaryReasons = () => {
  localStorage.setItem('employeeScheduleSummaryReasons', JSON.stringify(summaryReasons.value));
};

const getSummaryReason = (department: string): string => {
  const item = summaryReasons.value.find(r => r.department === department);
  return item?.reason || '';
};

const setSummaryReason = (department: string, reason: string) => {
  const index = summaryReasons.value.findIndex(r => r.department === department);
  if (index !== -1) {
    const item = summaryReasons.value[index];
    if (item) {
      item.reason = reason;
    }
  } else {
    summaryReasons.value.push({ department, reason });
  }
  saveSummaryReasons();
};

// ========== 初始化加载 ==========
// 页面加载时从 localStorage 恢复状态
const isInitialized = ref(false);

onMounted(async () => {
  loadIgnoredItems();
  loadSummaryReasons();
  await loadPositionReasonsToCache();
  // 标记初始化完成
  isInitialized.value = true;
});

const ignoredOverworkItems = ref<IgnoredOverworkItem[]>([]);

const loadIgnoredItems = () => {
  try {
    const saved = localStorage.getItem('ignoredOverworkItems');
    ignoredOverworkItems.value = saved ? JSON.parse(saved) : [];
  } catch {
    ignoredOverworkItems.value = [];
  }
};

const saveIgnoredItems = () => {
  localStorage.setItem('ignoredOverworkItems', JSON.stringify(ignoredOverworkItems.value));
};

const toggleIgnoreOverwork = (emp: Employee) => {
  const itemIdentifier = {
    employeeId: emp.id,
    startDate: emp.startDate,
    endDate: emp.endDate,
  };
  const index = ignoredOverworkItems.value.findIndex(item =>
    item.employeeId === itemIdentifier.employeeId &&
    item.startDate === itemIdentifier.startDate &&
    item.endDate === itemIdentifier.endDate
  );

  if (index !== -1) {
    // Item is currently ignored, so unignore it
    ignoredOverworkItems.value.splice(index, 1);
  } else {
    // Item is not ignored, so ignore it
    ignoredOverworkItems.value.push(itemIdentifier);
  }
  saveIgnoredItems();
  // 重新计算并刷新视图
  refreshData();
};

const scheduleFileInput = ref<HTMLInputElement | null>(null);

// ==================== 上报记录管理 ====================
interface ReportedRecord {
  employeeId: number;
  type: 'overwork' | 'overlimit';
  startDate: string;
  endDate: string;
  weekNumber: string;
  reportedAt: string;
}

// 从 localStorage 读取上报记录
const getReportedRecords = (): ReportedRecord[] => {
  try {
    const saved = localStorage.getItem('reportedRecords');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

// 保存上报记录到 localStorage
const saveReportedRecord = (record: ReportedRecord) => {
  const records = getReportedRecords();
  records.push(record);
  localStorage.setItem('reportedRecords', JSON.stringify(records));
};

// ==================== 批量选择排班相关 ====================
interface SelectedCell {
  employeeId: number;
  date: string;
}
const selectedCells = ref<SelectedCell[]>([]); // 选中的单元格
const isSelecting = ref(false); // 是否正在框选
const selectionStart = ref<SelectedCell | null>(null); // 框选起始单元格
const copiedCells = ref<{ shift: string; specialStatus?: string }[]>([]); // 复制的排班
const hasDragged = ref(false); // 是否有拖动
const lastMouseDownTime = ref(0); // 上次鼠标按下时间，用于判断是否是拖动后的点击
const DRAG_THRESHOLD_MS = 50; // 拖动阈值（毫秒），鼠标按下后这么快释放被认为是点击而非拖动
const selectedDateForButtons = ref<string | null>(null); // 单选日期，用于控制岗位/班次按钮激活

const handleSingleDateSelect = (employeeId: number, date: string) => {
  // 如果是拖拽框选触发的 click，不清空选择
  // 通过时间差判断：如果距离鼠标按下时间很短，说明是快速点击，不是拖动
  const timeSinceMouseDown = Date.now() - lastMouseDownTime.value;

  // 如果刚结束框选（hasDragged 为 true）或者时间很短，说明是拖拽后的残留 click 事件，直接返回
  if (hasDragged.value || timeSinceMouseDown < DRAG_THRESHOLD_MS) {
    hasDragged.value = false;
    return;
  }

  // 检查该单元格是否已经在 selectedCells 中（可能是 startSelection 添加的）
  const existingIndex = selectedCells.value.findIndex(
    cell => cell.employeeId === employeeId && cell.date === date
  );

  if (existingIndex >= 0) {
    // 单元格已经在 selectedCells 中，可能是 startSelection 添加的
    // 如果之前没有选中（selectedDateForButtons 为 null），则设置为当前日期
    if (!selectedDateForButtons.value) {
      selectedDateForButtons.value = date;
    }
    return; // 不做任何修改
  }

  // 正常点击选中单元格 - 添加到 selectedCells
  if (selectedDateForButtons.value === date) {
    selectedDateForButtons.value = null; // Deselect if already selected
  } else {
    selectedDateForButtons.value = date; // Select new date
  }

  // 更新选中单元格
  if (selectedDateForButtons.value === date) {
    selectedCells.value.push({ employeeId, date });
  }
};

// 处理日期表头点击，选中一整列
const handleDateHeaderClick = (date: string) => {
  if (selectedDateForButtons.value === date) {
    selectedDateForButtons.value = null; // Deselect if already selected
  } else {
    selectedDateForButtons.value = date; // Select new date
  }
  selectedCells.value = []; // 清空批量选择，确保单日筛选的优先级
};

// 右键菜单相关
const isContextMenuOpen = ref(false);
const contextMenuPosition = ref({ x: 0, y: 0 });

// 批量修改排班对话框
const isBatchShiftEditOpen = ref(false);
const batchShiftValue = ref('');
const allPositions = ref<string[]>([]); // 所有岗位列表
const availableShifts = ref<Shift[]>([]); // 可用班次列表

const loadAllPositions = async () => {
  // 从已加载的员工数据中提取所有唯一的岗位
  const positions = new Set<string>();
  employees.value.forEach(emp => {
    if (emp.position) {
      positions.add(emp.position);
    }
  });
  allPositions.value = Array.from(positions);
};

// 工时计算 - 使用班次时长表
const shiftDurationMap = ref<Map<string, number>>(new Map());

// 获取所有可用班次
const loadAvailableShifts = async () => {
  try {
    const data = await request.get<{ shifts: Shift[] }>('/schedule/shifts');
    availableShifts.value = data?.shifts || [];

    // 构建班次时长映射表
    const durationMap = new Map<string, number>();
    (data?.shifts || []).forEach((shift: Shift) => {
      if (shift.durationHours !== undefined) {
        durationMap.set(shift.value, shift.durationHours);
      }
    });
    shiftDurationMap.value = durationMap;
  } catch {
    ElMessage.error({ message: '加载可用班次失败！', showClose: true, duration: 3000 });
  }
};

// 监听所有状态变化，保存到 localStorage
watch(subTab, (newValue) => {
  localStorage.setItem('employeeScheduleSubTab', newValue);
  // 当切换到 break7 时，刷新数据（仅在初始化完成后）
  if (isInitialized.value && newValue === 'break7') {
    setTimeout(() => {
      checkOverworking();
      checkWeeklyHours();
    }, 100);
  }
}, { immediate: true });

watch(scheduleViewMode, (newValue) => {
  localStorage.setItem('employeeScheduleViewMode', newValue);
});

watch(currentPeriodStart, (newValue) => {
  localStorage.setItem('employeeSchedulePeriodStart', newValue);
});

watch(customRangeEnd, (newValue) => {
  localStorage.setItem('employeeScheduleCustomRangeEnd', newValue);
});

watch(schedulePositionFilter, (newValue) => {
  localStorage.setItem('employeeSchedulePositionFilter', JSON.stringify(newValue));
}, { deep: true });

watch(scheduleShiftFilter, (newValue) => {
  localStorage.setItem('employeeScheduleShiftFilter', JSON.stringify(newValue));
}, { deep: true });

watch(currentPage, (newValue) => {
  localStorage.setItem('employeeScheduleCurrentPage', newValue.toString());
});

watch(pageSize, (newValue) => {
  localStorage.setItem('employeeSchedulePageSize', newValue.toString());
});

watch(overworkCurrentPage, (newValue) => {
  localStorage.setItem('employeeScheduleOverworkPage', newValue.toString());
});

watch(weeklyLimitCurrentPage, (newValue) => {
  localStorage.setItem('employeeScheduleWeeklyLimitPage', newValue.toString());
});
const isLoading = ref(false);

// ========== 破7休1和周工时上限、公差补卡申请相关状态 ==========
// 邮件配置
const emailConfig = ref({
  to: 'Xiaobao_Lin@Jabil.com',
  cc: 'Zhi_Lee@Jabil.com'
});

// 公差补卡申请对话框
const isErrandFixDialogOpen = ref(false);

interface ErrandFixForm {
  employeeId: number | null;
  errandDate: string;
  startTime: string;
  endTime: string;
  reason: string;
}

const errandFixForm = ref<ErrandFixForm>({
  employeeId: null,
  errandDate: dayjs().format('YYYY-MM-DD'),
  startTime: '08:00',
  endTime: '17:00',
  reason: '',
});

const submitErrandFix = async () => {
  // Implement submission logic here
  // Example: await request.post('/api/errand-fix', errandFixForm.value);
  // Close dialog and refresh data after submission
  isErrandFixDialogOpen.value = false;
  // TODO: Implement actual data refresh logic here, maybe emit an event or call a prop function
};

// 破7休1相关 - 使用排班总览的筛选条件
const overworkingEmployees = ref<Employee[]>([]);
const normalEmployees = ref<Employee[]>([]);

// 周工时上限相关
const weeklyLimitSetting = ref(63.75);
const weeklyLimitEmployees = ref<Employee[]>([]);
const weeklyNormalEmployees = ref<Employee[]>([]);

// 考勤汇总相关
interface OvertimeItem {
  sap: string;
  name: string;
  date: string;
  hours: number;
}

interface LeaveItem {
  sap: string;
  name: string;
  startTime: string;
  endTime: string;
  leaveType: string;
  remark?: string;
}

interface AnnualLeaveItem {
  sap: string;
  name: string;
  departmentName: string;
  joinDate?: string;
  startDate: string;
  endDate: string;
  hours?: number;
  days: number;
  reason: string;
  applicantName?: string;
  applyDate?: string;
}

interface DepartmentSummary {
  department: string;
  plant: string;
  applicant: string;
  overworkCount: number;
  overLimitCount: number;
  totalOverHours: number;
  period: string;
  reason: string;
}

const overtimeList = ref<OvertimeItem[]>([]);
const leaveList = ref<LeaveItem[]>([]);
const annualLeaveList = ref<AnnualLeaveItem[]>([]);

// 合并后的年假列表（用于显示和导出）
const mergedAnnualLeaveList = computed(() => mergeConsecutiveLeave(annualLeaveList.value));

// 考勤汇总子 tab 持久化
const savedAttendanceSubTab = localStorage.getItem('employeeAttendanceSubTab');
const attendanceSubTab = ref<'overtime' | 'leave' | 'annual'>(
  (savedAttendanceSubTab as 'overtime' | 'leave' | 'annual') || 'overtime'
);

// 监听考勤汇总子 tab 变化，保存到 localStorage
watch(attendanceSubTab, (newVal) => {
  localStorage.setItem('employeeAttendanceSubTab', newVal);
});

// 法定节假日列表（2026年示例，用户可根据需要扩展）
const statutoryHolidays = new Set([
  '2026-01-01', // 元旦
  '2026-01-28', '2026-01-29', '2026-01-30', '2026-01-31', '2026-02-01', '2026-02-02', '2026-02-03', // 春节
  '2026-04-04', // 清明节
  '2026-05-01', '2026-05-02', '2026-05-03', // 劳动节
  '2026-06-19', '2026-06-20', '2026-06-21', // 端午节（2026年6月19日是星期五）
  '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07', // 国庆节
  '2026-12-25' // 圣诞节（可选）
]);

// 分页相关 - 破7休1和周工时
const break7PageSize = ref(20);
const weeklyPageSize = ref(20);

// 破7休1分页数据
const paginatedOverworkEmployees = computed(() => {
  const start = (overworkCurrentPage.value - 1) * break7PageSize.value;
  const end = start + break7PageSize.value;
  return overworkingEmployees.value.slice(start, end);
});

// 周工时超限分页数据
const paginatedWeeklyLimitEmployees = computed(() => {
  const start = (weeklyLimitCurrentPage.value - 1) * weeklyPageSize.value;
  const end = start + weeklyPageSize.value;
  return weeklyLimitEmployees.value.slice(start, end);
});

// 破7休1总页数
const overworkTotalPages = computed(() => {
  return Math.ceil(overworkingEmployees.value.length / break7PageSize.value) || 1;
});

// 周工时超限总页数
const weeklyLimitTotalPages = computed(() => {
  return Math.ceil(weeklyLimitEmployees.value.length / weeklyPageSize.value) || 1;
});

// 计算周数WKxx
const getWeekNumber = (date: string) => {
  const d = dayjs(date);
  // 计算今年的第几周
  const weekNumber = d.isoWeek();
  return `WK${weekNumber}`;
};

// 计算当前视图日期范围
const getAttendanceDateRange = () => {
  let start, end;
  if (scheduleViewMode.value === 'week') {
    start = dayjs(currentPeriodStart.value);
    end = start.clone().add(6, 'day');
  } else if (scheduleViewMode.value === 'month') {
    start = dayjs(currentPeriodStart.value);
    end = start.clone().add(1, 'month').date(23);
  } else {
    start = dayjs(currentPeriodStart.value);
    end = dayjs(customRangeEnd.value);
  }
  return { start, end };
};

// 计算加班数据
const calculateOvertime = () => {
  try {
    overtimeList.value = [];

    const { start, end } = getAttendanceDateRange();

    let currentDate = start.clone();

    while (currentDate.isBefore(end) || currentDate.isSame(end)) {
      const dateStr = currentDate.format('YYYY-MM-DD');
      const dayOfWeek = currentDate.day(); // 0=周日,1=周一,...,6=周六

      filteredEmployees.value.forEach(emp => {
        // 防御：跳过无效数据
        if (!emp || !emp.schedule) {
          return;
        }

        // 过滤掉 employeeType 等于 'jabil' 的员工
        if (emp.employeeType && String(emp.employeeType).toLowerCase().includes('jabil')) {
          return;
        }

        const schedule = emp.schedule[dateStr];
        if (!schedule || !schedule.shift) {
          return;
        }

        let overtimeHours = 0;
        const workHours = getWorkHours(schedule.shift);

        // 检查是否是请假或调休
        const isLeaveOrDayOff = schedule.shift === '请假' || schedule.shift === '调休';

        if (!isLeaveOrDayOff) {
          if (dayOfWeek === 6 || dayOfWeek === 0) {
            // 周六周天：全天算加班
            overtimeHours = workHours;
          } else {
            // 周一到周五：超过8小时的算加班
            if (workHours > 8) {
              overtimeHours = workHours - 8;
            }
          }
        }

        if (overtimeHours > 0) {
          // 周六周天：全天算加班，不限制4小时上限
          // 周一到周五：每天最大不超过4小时
          const displayHours = (dayOfWeek === 6 || dayOfWeek === 0)
            ? overtimeHours
            : Math.min(overtimeHours, 4);

          overtimeList.value.push({
            sap: emp.oldEmployeeId || emp.sap,
            name: emp.name,
            date: currentDate.format('YYYY/M/D'),
            hours: displayHours
          });
        }
      });

      currentDate = currentDate.add(1, 'day');
    }

    // 合并临时加班数据
    if (temporaryOvertimes.value && Array.isArray(temporaryOvertimes.value)) {
      temporaryOvertimes.value.forEach(tempOT => {
        // 防御：跳过无效数据
        if (!tempOT || !tempOT.employeeId) {
          return;
        }

        // 找到对应的员工
        const emp = employees.value.find(e => e.id === tempOT.employeeId);
        if (!emp) {
          return;
        }

        // 过滤掉 employeeType 等于 'jabil' 的员工
        if (emp.employeeType && String(emp.employeeType).toLowerCase().includes('jabil')) {
          return;
        }

        // 检查日期是否在范围内
        const otDate = dayjs(tempOT.overtimeDate);
        if (otDate.isBefore(start) || otDate.isAfter(end)) {
          return;
        }

        // 临时加班：不管当天是否有排班记录，都应该叠加
        // 统一日期格式为 YYYY-MM-DD 进行比较
        const normalizedOTDate = dayjs(tempOT.overtimeDate).format('YYYY-MM-DD');
        const existingKey = `${emp.oldEmployeeId || emp.sap}-${normalizedOTDate}`;
        const existingIndex = overtimeList.value.findIndex(item => {
          const normalizedItemDate = dayjs(item.date, 'YYYY/M/D').format('YYYY-MM-DD');
          return `${item.sap}-${normalizedItemDate}` === existingKey;
        });

        if (existingIndex >= 0 && tempOT.hours > 0) {
          // 已有记录，叠加临时加班小时数，但每天最大不超过4小时
          const existingRecord = overtimeList.value[existingIndex]!;
          existingRecord.hours = Math.min(existingRecord.hours + Number(tempOT.hours), 4);
        } else if (existingIndex < 0 && tempOT.hours > 0) {
          // 没有记录，添加新的临时加班记录，每天最大不超过4小时
          overtimeList.value.push({
            sap: emp.oldEmployeeId || emp.sap,
            name: emp.name,
            date: otDate.format('YYYY/M/D'),
            hours: Math.min(Number(tempOT.hours), 4)
          });
        }
      });
    }

    // 按日期升序排序
    overtimeList.value.sort((a, b) => {
      const dateA = a.date.replace(/\//g, '-');
      const dateB = b.date.replace(/\//g, '-');
      return dateA.localeCompare(dateB);
    });
  } catch (error) {
    console.error('计算加班数据失败:', error);
    overtimeList.value = [];
  }
};

// 计算事假数据
const calculateLeave = () => {
  try {
    leaveList.value = [];

    const { start, end } = getAttendanceDateRange();

    // 防御：检查 temporaryLeaves 是否存在
    if (!temporaryLeaves.value || !Array.isArray(temporaryLeaves.value)) {
      return;
    }

    // 1. 从 temporaryLeaves 中获取临时请假和调休
    temporaryLeaves.value.forEach(item => {
      // 防御：跳过无效数据
      if (!item || typeof item !== 'object') {
        return;
      }

      // 找到对应的员工
      const emp = employees.value.find(e => e.id === item.employeeId);
      if (!emp) {
        return;
      }

    // 过滤掉 employeeType 等于 'jabil' 的员工
    if (emp.employeeType && String(emp.employeeType).toLowerCase().includes('jabil')) {
      return;
    }

    // 检查日期是否在范围内
    const itemStart = item.startDate ? dayjs(item.startDate) : null;
    const itemEnd = item.endDate ? dayjs(item.endDate) : null;

    if (!itemStart || !itemEnd) {
      return;
    }

    if (itemEnd.isBefore(start) || itemStart.isAfter(end)) {
      return;
    }

    // 检查类型：事假、临时请假、调休、年假
    // leaveType 可能是大写的 LEAVE, PERSONAL_LEAVE 等，或者中文
    // 排除 ERRAND（公差）
    const isTargetLeave = 
      item.leaveType === '请假' || 
      item.type === '请假' || 
      item.leaveType === '事假' || 
      item.type === '事假' || 
      item.leaveType === '调休' || 
      item.type === '调休' ||
      item.leaveType === '年假' ||
      item.type === '年假' ||
      item.leaveType === 'LEAVE' || 
      item.leaveType === 'PERSONAL_LEAVE' ||
      item.leaveType === 'ANNUAL_LEAVE' ||
      item.leaveType === 'COMPENSATORY_LEAVE';

    if (isTargetLeave) {
      // 检查请假日期范围是否有周一到周五且不是法定节假日的日期
      // 也包括周六和周日（因为周末临时请假也是事假）
      let hasValidDate = false;
      let checkDate = itemStart.clone();
      while (checkDate.isBefore(itemEnd) || checkDate.isSame(itemEnd)) {
        const dateStr = checkDate.format('YYYY-MM-DD');
        const dayOfWeek = checkDate.day();
        // 周一到周五（1-5）和周末（0=周日，6=周六），且不是法定节假日
        if ((dayOfWeek >= 1 && dayOfWeek <= 5 || dayOfWeek === 0 || dayOfWeek === 6) && !statutoryHolidays.has(dateStr)) {
          hasValidDate = true;
          break;
        }
        checkDate = checkDate.add(1, 'day');
      }

      if (hasValidDate) {
        // 优先使用单独的 time 字段，否则使用默认时间
        const startTime = item.startTime || '07:00';
        const endTime = item.endTime || '15:00';

        // 格式化时间：去掉秒部分，只保留 HH:mm
        const formatTime = (t: string) => t.substring(0, 5);

        leaveList.value.push({
          sap: emp.oldEmployeeId || emp.sap,
          name: emp.name,
          startTime: `${dayjs(item.startDate).format('YYYY-M-D')} ${formatTime(startTime)}`,
          endTime: `${dayjs(item.endDate).format('YYYY-M-D')} ${formatTime(endTime)}`,
          leaveType: '事假',
          remark: ''
        });
      }
    }
  });

  // 1.5 从 formalLeaves 中获取年假/请假数据
  if (formalLeaves.value && Array.isArray(formalLeaves.value)) {
    formalLeaves.value.forEach(item => {
      if (!item || typeof item !== 'object') {
        return;
      }

      // 只处理已批准的请假
      if (item.status !== 'approved') {
        return;
      }

      // 找到对应的员工
      const emp = employees.value.find(e => e.id === item.employeeId);
      if (!emp) {
        return;
      }

      // 过滤掉 employeeType 等于 'jabil' 的员工
      if (emp.employeeType && String(emp.employeeType).toLowerCase().includes('jabil')) {
        return;
      }

      // 检查日期是否在范围内
      const itemStart = item.startDate ? dayjs(item.startDate) : null;
      const itemEnd = item.endDate ? dayjs(item.endDate) : null;

      if (!itemStart || !itemEnd) {
        return;
      }

      if (itemEnd.isBefore(start) || itemStart.isAfter(end)) {
        return;
      }

      // 年假不显示在事假列表中
      if (item.leaveType === 'ANNUAL_LEAVE' || item.leaveType === '年假') {
        return;
      }
      const leaveTypeDisplay = '事假';

      leaveList.value.push({
        sap: emp.oldEmployeeId || emp.sap,
        name: emp.name,
        startTime: itemStart.format('YYYY-M-D 07:00'),
        endTime: itemEnd.format('YYYY-M-D 15:00'),
        leaveType: leaveTypeDisplay,
        remark: ''
      });
    });
  }

  // 2. 从排班表中获取调休班次（周一到周五，且不是法定节假日）
  let currentDate = start.clone();
  while (currentDate.isBefore(end) || currentDate.isSame(end)) {
    const dateStr = currentDate.format('YYYY-MM-DD');
    const dayOfWeek = currentDate.day(); // 0=周日, 1=周一, 6=周六

    // 只处理周一到周五，且不是法定节假日
    if (dayOfWeek >= 1 && dayOfWeek <= 5 && !statutoryHolidays.has(dateStr)) {
      filteredEmployees.value.forEach(emp => {
        if (emp.employeeType && String(emp.employeeType).toLowerCase().includes('jabil')) {
          return;
        }
        const schedule = emp.schedule[dateStr];
        if (schedule?.shift === '调休') {
          leaveList.value.push({
            sap: emp.oldEmployeeId || emp.sap,
            name: emp.name,
            startTime: dayjs(dateStr).format('YYYY-M-D 07:00'),
            endTime: dayjs(dateStr).format('YYYY-M-D 15:00'),
            leaveType: '事假',
            remark: ''
          });
        }
      });
    }

    currentDate = currentDate.add(1, 'day');
  }

  // 3. 按开始时间排序
  leaveList.value.sort((a, b) => {
    return a.startTime.localeCompare(b.startTime);
  });
  } catch (error) {
    console.error('计算事假数据失败:', error);
    leaveList.value = [];
  }
};

// 计算年假数据
const calculateAnnualLeave = () => {
  try {
    const { start, end } = getAttendanceDateRange();

    annualLeaveList.value = [];

    // 从 formalLeaves 中获取年假数据
    if (formalLeaves.value && Array.isArray(formalLeaves.value)) {
      formalLeaves.value.forEach(item => {
        if (!item || typeof item !== 'object') {
          return;
        }

        // 只处理已批准的请假
        if (item.status !== 'approved') {
          return;
        }

        // 只处理年假类型
        if (item.leaveType !== 'ANNUAL_LEAVE' && item.leaveType !== '年假') {
          return;
        }

        // 找到对应的员工
        const emp = employees.value.find(e => e.id === item.employeeId);
        if (!emp) {
          return;
        }

        // 过滤掉 employeeType 等于 'jabil' 的员工
        if (emp.employeeType && String(emp.employeeType).toLowerCase().includes('jabil')) {
          return;
        }

        // 检查日期是否在范围内
        const itemStart = item.startDate ? dayjs(item.startDate) : null;
        const itemEnd = item.endDate ? dayjs(item.endDate) : null;

        if (!itemStart || !itemEnd) {
          return;
        }

        if (itemEnd.isBefore(start) || itemStart.isAfter(end)) {
          return;
        }

        const daysValue = parseInt(item.days) || Math.ceil(itemEnd.diff(itemStart, 'day', true)) + 1;
        annualLeaveList.value.push({
          sap: emp.oldEmployeeId || emp.sap,
          name: emp.name,
          departmentName: 'Stockroom',
          joinDate: item.employeeHireDate || '',
          startDate: itemStart.format('YYYY-M-D'),
          endDate: itemEnd.format('YYYY-M-D'),
          hours: daysValue * 8,
          days: daysValue,
          reason: item.reason || '留存年假',
          applicantName: (() => {
            const user = getCurrentUser();
            return user?.realName || user?.username || item.applicantName || '';
          })(),
          applyDate: item.createdAt ? dayjs(item.createdAt).format('YYYY-MM-DD') : ''
        });
      });
    }

    // 按开始日期排序
    annualLeaveList.value.sort((a, b) => {
      return a.startDate.localeCompare(b.startDate);
    });
  } catch (error) {
    console.error('计算年假数据失败:', error);
    annualLeaveList.value = [];
  }
};

// 将已批准的请假/年假数据合并到员工排班日程中（用于排班表格显示）
const mergeApprovedLeavesToSchedule = () => {
  // 只处理 formalLeaves（年假、固定请假），不合并临时请假和临时加班
  if (formalLeaves.value && Array.isArray(formalLeaves.value)) {
    formalLeaves.value.forEach(item => {
      // 只处理已批准的请假
      if (item.status !== 'approved') {
        return;
      }

      // 找到对应的员工
      const emp = employees.value.find(e => e.id === item.employeeId);
      if (!emp) {
        return;
      }

      // 确定特殊状态显示
      let specialStatus = '请假';
      if (item.leaveType === 'ANNUAL_LEAVE' || item.leaveType === '年假') {
        specialStatus = '年假';
      }

      // 处理日期范围
      const itemStart = item.startDate ? dayjs(item.startDate) : null;
      const itemEnd = item.endDate ? dayjs(item.endDate) : null;

      if (!itemStart || !itemEnd) {
        return;
      }

      // 遍历请假日期范围内的每一天
      let currentDate = itemStart.clone();
      while (currentDate.isBefore(itemEnd) || currentDate.isSame(itemEnd)) {
        const dateStr = currentDate.format('YYYY-MM-DD');

        // 如果该日期还没有排班数据，初始化为空对象
        if (!emp.schedule[dateStr]) {
          emp.schedule[dateStr] = { shift: '' };
        }

        // 设置特殊状态（年假/请假优先显示）
        if (!emp.schedule[dateStr].specialStatus) {
          emp.schedule[dateStr].specialStatus = specialStatus;
        }

        currentDate = currentDate.add(1, 'day');
      }
    });
  }

  // 处理离职/转岗数据
  if (resignationTransfers.value && Array.isArray(resignationTransfers.value)) {
    resignationTransfers.value.forEach(item => {
      // 找到对应的员工
      const emp = employees.value.find(e => e.id === item.employeeId);
      if (!emp) {
        return;
      }

      // 处理离职
      if (item.type === '离职') {
        if (item.status !== 'approved') {
          return;
        }
        // 离职日期起显示'离职'
        const resignDate = item.transferDate ? dayjs(item.transferDate) : null;
        if (!resignDate) {
          return;
        }

        // 从离职日期起，所有日期都标记为离职
        const rangeEnd = dayjs().add(1, 'year'); // 足够远的结束日期
        let currentDate = resignDate.clone();
        while (currentDate.isBefore(rangeEnd)) {
          const dateStr = currentDate.format('YYYY-MM-DD');

          if (!emp.schedule[dateStr]) {
            emp.schedule[dateStr] = { shift: '' };
          }

          if (!emp.schedule[dateStr].specialStatus) {
            emp.schedule[dateStr].specialStatus = '离职';
          }

          currentDate = currentDate.add(1, 'day');
        }
      }

      // 处理转岗
      if (item.type === '转岗') {
        // 转岗需要转出和转入都批准才显示'转岗'
        if (item.transferOutApprovalStatus !== 'approved') {
          return;
        }
        // 转岗日期起显示'转岗'
        const transferDate = item.transferDate ? dayjs(item.transferDate) : null;
        if (!transferDate) {
          return;
        }

        // 从转岗日期起，所有日期都标记为转岗
        const rangeEnd = dayjs().add(1, 'year'); // 足够远的结束日期
        let currentDate = transferDate.clone();
        while (currentDate.isBefore(rangeEnd)) {
          const dateStr = currentDate.format('YYYY-MM-DD');

          if (!emp.schedule[dateStr]) {
            emp.schedule[dateStr] = { shift: '' };
          }

          if (!emp.schedule[dateStr].specialStatus) {
            emp.schedule[dateStr].specialStatus = '转岗';
          }

          currentDate = currentDate.add(1, 'day');
        }
      }
    });
  }
};

// 刷新考勤汇总数据
const refreshAttendanceData = () => {
  calculateOvertime();
  calculateLeave();
  calculateAnnualLeave();
};

// 汇总数据
const summaryData = computed(() => {
  const deptMap = new Map<string, DepartmentSummary>();

  // 统计破7休1，忽略被标记的项
  overworkingEmployees.value.forEach(emp => {
    if (emp.isIgnored) {
      return; // 跳过被忽略的项
    }
    const key = 'MPL ST'; // 统一显示为 MPL ST
    if (!deptMap.has(key)) {
      deptMap.set(key, {
        department: key,
        plant: emp.plantName || '-',
        applicant: '邓大龙', // 固定为邓大龙
        overworkCount: 0,
        overLimitCount: 0,
        totalOverHours: 0,
        period: `${getWeekNumber(currentPeriodStart.value)}`,
        reason: getSummaryReason(key)
      });
    }
    const dept = deptMap.get(key)!;
    dept.overworkCount++;
  });

  // 统计周工时超限
  weeklyLimitEmployees.value.forEach(emp => {
    const key = 'MPL ST'; // 统一显示为 MPL ST
    if (!deptMap.has(key)) {
      deptMap.set(key, {
        department: key,
        plant: emp.plantName || '-',
        applicant: '邓大龙', // 固定为邓大龙
        overworkCount: 0,
        overLimitCount: 0,
        totalOverHours: 0,
        period: `${getWeekNumber(currentPeriodStart.value)}`,
        reason: getSummaryReason(key)
      });
    }
    const dept = deptMap.get(key)!;
    dept.overLimitCount++;
    dept.totalOverHours += emp.overLimitHours;
  });

  return Array.from(deptMap.values());
});

// 统计总数
const totalOverworkCount = computed(() => {
  return summaryData.value.reduce((sum, dept) => sum + dept.overworkCount, 0);
});

const totalOverLimitCount = computed(() => {
  return summaryData.value.reduce((sum, dept) => sum + dept.overLimitCount, 0);
});

// 刷新数据
const refreshData = () => {
  checkOverworking();
  checkWeeklyHours();
  // 重置分页到第一页
  overworkCurrentPage.value = 1;
  weeklyLimitCurrentPage.value = 1;
};

// 监听筛选条件变化，自动刷新数据（仅在初始化完成后）
watch([currentPeriodStart, customRangeEnd, scheduleViewMode], () => {
  if (isInitialized.value) {
    if (subTab.value === 'break7') {
      refreshData();
    } else if (subTab.value === 'attendance') {
      refreshAttendanceData();
    }
  }
});

// 监听子标签页切换，当进入破7休1或考勤汇总页面时自动加载数据
// 破7休1界面强制使用周视图
watch(subTab, (newTab) => {
  if (isInitialized.value) {
    if (newTab === 'break7') {
      // 强制切换到周视图，确保日期范围一致
      switchViewMode('week');
      refreshData();
    } else if (newTab === 'attendance') {
      refreshAttendanceData();
    }
  }
});



// 公差补卡申请列表 - 从临时请假&公差获取公差类型的数据
const errandFixList = computed(() => {
  return temporaryLeaves.value
    .filter(item => item.leaveType === 'ERRAND' || item.type === '公差' || item.leaveType === '公差')
    .filter(item => {
      // 找到对应的员工信息
      const emp = employees.value.find(e => e.id === item.employeeId);
      // 过滤掉 employeeType 等于 'jabil' 的员工
      return !emp || !(emp.employeeType && String(emp.employeeType).toLowerCase().includes('jabil'));
    })
    .map(item => {
      // 找到对应的员工信息
      const emp = employees.value.find(e => e.id === item.employeeId);

      // 正确格式化开始时间和结束时间：日期 + 时间
      const formatDateTime = (dateStr: string, timeStr: string): string => {
        if (!dateStr) return '';
        let result = dateStr;
        if (timeStr) {
          // 去掉秒部分，只保留 HH:mm
          const time = timeStr.substring(0, 5);
          result += ' ' + time;
        }
        return result;
      };

      // 计算OT：结束时间 - 开始时间（考虑实际时间）
      let ot = 0;
      try {
        const startDateTime = item.startDate ? dayjs(item.startDate) : null;
        const endDateTime = item.endDate ? dayjs(item.endDate) : null;

        // 如果有单独的时间字段，叠加到日期上
        let startMoment = startDateTime;
        let endMoment = endDateTime;

        if (item.startTime && startDateTime) {
          const timeParts = item.startTime.split(':').map(Number);
          const hours = timeParts[0] ?? 0;
          const minutes = timeParts[1] ?? 0;
          startMoment = startDateTime.hour(hours).minute(minutes).second(0);
        }

        if (item.endTime && endDateTime) {
          const timeParts = item.endTime.split(':').map(Number);
          const hours = timeParts[0] ?? 0;
          const minutes = timeParts[1] ?? 0;
          endMoment = endDateTime.hour(hours).minute(minutes).second(0);
        }

        if (startMoment && endMoment && startMoment.isValid() && endMoment.isValid()) {
          const diffMinutes = endMoment.diff(startMoment, 'minute');
          ot = diffMinutes / 60; // 转换为小时
          ot = Math.round(ot * 100) / 100; // 保留两位小数
        }
      } catch (e) {
        console.error('Error calculating OT in errandFixList:', e);
      }

      return {
        id: item.id,
        plant: item.plantName || item.plant || '-',
        department: (item.departmentName || item.department || '-').replace('MPL_Stockroom', 'ST'),
        // 优先使用 oldEmployeeId（工号），其次使用 employeeNo
        sap: item.employeeNo || emp?.oldEmployeeId || '-',
        employeeName: item.employeeName || emp?.name || '-',
        startTime: formatDateTime(item.startDate || '', item.startTime || ''),
        endTime: formatDateTime(item.endDate || '', item.endTime || ''),
        leaveType: item.leaveType === 'ERRAND' ? '公差' : item.leaveType || item.type || '公差',
        reason: item.reason || '-',
        ot: ot,
        evidence: item.proofFile ? `http://localhost:3001/uploads/${item.proofFile}` : ''
      };
    });
});

// 周视图的日期
const weekDays = computed(() => {
  const days = [];
  // 从周一开始
  const start = dayjs(currentPeriodStart.value).day(1);
  for (let i = 0; i < 7; i++) {
    const day = start.add(i, 'day');
    days.push({
      date: day.format('YYYY-MM-DD'),
      monthDay: day.format('MM/DD'),
      weekday: day.format('dd'),
      isToday: day.isSame(dayjs(), 'day'),
      isWeekend: day.day() === 0 || day.day() === 6,
    });
  }
  return days;
});

// 月视图的日期
const monthDays = computed(() => {
  const days: Day[] = [];
  // 如果当前日期 >=24号，就从本月24号开始，到次月23号
  // 如果当前日期 <24号，就从上月24号开始，到本月23号
  let startDate;
  const today = dayjs();
  const selectedMonth = dayjs(currentPeriodStart.value).month();

  if (dayjs(currentPeriodStart.value).date() >= 24) {
    // 从本月24号开始
    startDate = dayjs(currentPeriodStart.value).date(24);
  } else {
    // 从上月24号开始
    startDate = dayjs(currentPeriodStart.value).subtract(1, 'month').date(24);
  }
  // 到次月23号结束
  const endDate = startDate.add(1, 'month').date(23);

  let current = startDate;
  while (current.isBefore(endDate) || current.isSame(endDate)) {
    days.push({
      date: current.format('YYYY-MM-DD'),
      monthDay: current.format('MM/DD'),
      weekday: current.format('dd'),
      isToday: current.isSame(today, 'day'),
      isCurrentMonth: current.month() === selectedMonth,
      isWeekend: current.day() === 0 || current.day() === 6,
    });
    current = current.add(1, 'day');
  }
  return days;
});

// 自定义范围的日期
const customRangeDays = computed(() => {
  const days = [];
  const start = dayjs(currentPeriodStart.value);
  const end = dayjs(customRangeEnd.value);
  const totalDays = end.diff(start, 'day') + 1;

  for (let i = 0; i < totalDays; i++) {
    const day = start.add(i, 'day');
    days.push({
      date: day.format('YYYY-MM-DD'),
      monthDay: day.format('MM/DD'),
      weekday: day.format('dd'),
      isToday: day.isSame(dayjs(), 'day'),
      isWeekend: day.day() === 0 || day.day() === 6,
    });
  }
  return days;
});

const formattedWeekRange = computed(() => {
  const start = dayjs(currentPeriodStart.value);
  const end = dayjs(currentPeriodStart.value).add(6, 'day');
  return `${start.format('YYYY年MM月DD日')} - ${end.format('MM月DD日')}`;
});

const formattedMonthRange = computed(() => {
  // 如果当前日期 >=24号，就从本月24号开始，到次月23号
  // 如果当前日期 <24号，就从上月24号开始，到本月23号
  let startDate;
  if (dayjs(currentPeriodStart.value).date() >= 24) {
    // 从本月24号开始
    startDate = dayjs(currentPeriodStart.value).date(24);
  } else {
    // 从上月24号开始
    startDate = dayjs(currentPeriodStart.value).subtract(1, 'month').date(24);
  }
  // 到次月23号结束
  const endDate = startDate.add(1, 'month').date(23);
  return `${startDate.format('YYYY年MM月DD日')} - ${endDate.format('MM月DD日')}`;
});

const formattedCustomRange = computed(() => {
  const start = dayjs(currentPeriodStart.value);
  const end = dayjs(customRangeEnd.value);
  return `${start.format('YYYY年MM月DD日')} - ${end.format('MM月DD日')}`;
});

// 当前筛选维度的天数
const currentFilterDays = computed(() => {
  if (scheduleViewMode.value === 'week') {
    return 7; // 周视图固定7天
  } else if (scheduleViewMode.value === 'month') {
    // 月视图从24号到次月23号，计算天数
    let startDate;
    if (dayjs(currentPeriodStart.value).date() >= 24) {
      startDate = dayjs(currentPeriodStart.value).date(24);
    } else {
      startDate = dayjs(currentPeriodStart.value).subtract(1, 'month').date(24);
    }
    const endDate = startDate.add(1, 'month').date(23);
    return endDate.diff(startDate, 'day') + 1;
  } else {
    // 自定义范围
    const start = dayjs(currentPeriodStart.value);
    const end = dayjs(customRangeEnd.value);
    return end.diff(start, 'day') + 1;
  }
});

// 从后端获取员工排班数据
const employees = ref<Employee[]>([]);
const temporaryOvertimes = ref<TemporaryOvertimeItem[]>([]);
const temporaryLeaves = ref<TemporaryLeaveItem[]>([]);
const formalLeaves = ref<EmployeeRecord[]>([]);
const resignationTransfers = ref<EmployeeRecord[]>([]);
const plants = ref<Plant[]>([]);
const departments = ref<Department[]>([]);

// 获取所有厂区
const loadPlants = async () => {
  try {
    const response = await request.get('/plants');

    // 防御：处理不同的响应格式
    let plantsData: Plant[] = [];
    if (response && typeof response === 'object') {
      if (Array.isArray(response)) {
        plantsData = response;
      } else if ('plants' in response) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        plantsData = (response as any).plants || [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } else if ('data' in response && Array.isArray((response as any).data)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        plantsData = (response as any).data;
      }
    }

    plants.value = plantsData;
  } catch (error) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((error as any)?.code === 'CANCELLED' || (error as any)?.isCancelled) {
      return;
    }
    console.error('加载厂区失败:', error);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    console.error('错误详情:', (error as any)?.stack || new Error().stack);
    ElMessage.error({ message: '加载厂区失败！', showClose: true, duration: 3000 });
  }
};

// 获取所有部门
const loadDepartments = async () => {
  try {
    // 防御：确保 departments.value 存在
    if (!departments.value) {
      console.error('[ERROR] departments ref 未正确初始化');
      return;
    }

    const response = await request.get('/departments');

    // 防御：处理不同的响应格式
    let departmentsData: Department[] = [];
    if (response && typeof response === 'object') {
      if (Array.isArray(response)) {
        departmentsData = response;
      } else if ('departments' in response) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        departmentsData = (response as any).departments || [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } else if ('data' in response && Array.isArray((response as any).data)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        departmentsData = (response as any).data;
      }
    }

    departments.value = departmentsData;
  } catch (error) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((error as any)?.code === 'CANCELLED' || (error as any)?.isCancelled) {
      return;
    }
    console.error('加载部门失败:', error);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    console.error('错误详情:', (error as any));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    console.error('错误消息:', (error as any)?.message);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    console.error('错误堆栈:', (error as any)?.stack);
    ElMessage.error({ message: '加载部门失败！', showClose: true, duration: 3000 });
  }
};

// 从后端获取员工排班数据
const loadEmployeesAndSchedules = async () => {
  isLoading.value = true;
  try {
    const { startDate, endDate } = currentCalculatedDateRange.value;

    const response = await request.get<{ employees: Employee[] }>('/schedule/employees', {
      params: {
        startDate,
        endDate,
        plantId: currentPlantFilter.value || undefined,
        departmentId: currentDepartmentFilter.value || undefined,
      },
    });

    // 防御：确保 response 有效
    if (!response) {
      console.error('API 返回数据为空');
      employees.value = [];
      isLoading.value = false;
      return;
    }

    // 处理响应数据（request 拦截器已自动解包 data）
    const data = response;

    // 防御：处理不同的响应格式
    let rawEmployees: Employee[] = [];
    if (Array.isArray(data)) {
      // 如果直接返回数组（某些缓存场景）
      rawEmployees = data;
    } else if (data.employees) {
      // 标准格式 { employees: [...] }
      rawEmployees = data.employees;
    } else {
      // 未知格式
      console.error('未知的响应格式:', data);
      rawEmployees = [];
    }

    // 岗位排序：Supervisor、Leader、Goods to people、HMP、收发料、Change part、Spare part、MRO、MRB、Cycle Count、IA、MFG
    const positionOrder: Record<string, number> = {
      'Supervisor': 1,
      'Leader': 2,
      'Goods to people': 3,
      'HMP': 4,
      '收发料': 5,
      'Change part': 6,
      'Spare part': 7,
      'MRO': 8,
      'MRB': 9,
      'Cycle Count': 10,
      'IA': 11,
      'MFG': 12
    };

    // 按岗位排序，同岗位按入职日期排序（早入职的排前面）
    rawEmployees.sort((a: Employee, b: Employee) => {
      const orderA = positionOrder[a.position || ''] || 999;
      const orderB = positionOrder[b.position || ''] || 999;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      // 同岗位按入职日期排序，早入职排前面
      const dateA = a.employeeHireDate || '';
      const dateB = b.employeeHireDate || '';
      if (dateA && dateB) {
        return dateA.localeCompare(dateB);
      }
      if (dateA) return -1;
      if (dateB) return 1;
      return (a.name || '').localeCompare(b.name || '', 'zh-CN');
    });

    employees.value = rawEmployees;

    // 防御：获取临时数据（使用 try-catch 避免失败影响主流程）
    try {
      // 计算扩展的日期范围（包含当前显示月份的所有日期，确保请假/年假/离职/转岗数据能显示）
      const { startDate, endDate } = currentCalculatedDateRange.value;
      const rangeStart = dayjs(startDate);
      const rangeEnd = dayjs(endDate);
      // 扩展到整个月份
      const expandedStart = rangeStart.date(1).format('YYYY-MM-DD');
      const expandedEnd = rangeEnd.endOf('month').format('YYYY-MM-DD');
      await fetchTemporaryData(expandedStart, expandedEnd);
    } catch (tempError) {
      console.error('获取临时数据失败（继续执行）:', tempError);
      temporaryOvertimes.value = [];
      temporaryLeaves.value = [];
      formalLeaves.value = [];
      resignationTransfers.value = [];
    }

    // 将已批准的请假/年假数据合并到员工排班日程中（用于排班表格显示）
    try {
      mergeApprovedLeavesToSchedule();
    } catch (mergeError) {
      console.error('合并请假数据到排班失败（继续执行）:', mergeError);
    }

    // 防御：计算加班和请假（使用 try-catch 避免失败影响主流程）
    try {
      calculateOvertime();
    } catch (calcError) {
      console.error('计算加班数据失败（继续执行）:', calcError);
      overtimeList.value = [];
    }

    try {
      calculateLeave();
    } catch (leaveError) {
      console.error('计算事假数据失败（继续执行）:', leaveError);
      leaveList.value = [];
    }

    try {
      calculateAnnualLeave();
    } catch (annualError) {
      console.error('计算年假数据失败（继续执行）:', annualError);
      annualLeaveList.value = [];
    }

  } catch (error) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((error as any)?.code === 'CANCELLED' || (error as any)?.isCancelled) {
      return;
    }

    console.error('加载员工和排班数据失败:', error);
    // 增强错误信息输出
    if (error) {
      console.error('Error type:', typeof error);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      console.error('Error message:', (error as any)?.message);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      console.error('Error code:', (error as any)?.code);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      console.error('Error response:', (error as any)?.response?.data);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((error as any)?.response) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        console.error('Error response status:', (error as any)?.response.status);
      }
    }
    ElMessage.error({ message: '加载员工和排班数据失败！', showClose: true, duration: 3000 });
    employees.value = [];
  } finally {
    isLoading.value = false;
  }

  // 检测排班变动并触发语音提醒
  detectScheduleChanges();
};

const fetchTemporaryData = async (startDate: string, endDate: string) => {
  try {
    // 清除请求缓存，确保获取最新数据
    clearRequestCache();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const overtimeRes = await request.get<any>('/temporary-overtime', {
      params: {
        startDate,
        endDate,
        pageSize: 1000
      }
    });
    // 拦截器已提取 data，直接使用
    temporaryOvertimes.value = Array.isArray(overtimeRes) ? overtimeRes : (overtimeRes?.items || []);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const leaveRes = await request.get<any>('/temporary-leave', {
      params: {
        startDate,
        endDate,
        pageSize: 1000
      }
    });
    temporaryLeaves.value = Array.isArray(leaveRes) ? leaveRes : (leaveRes?.items || []);

    // 获取年假/请假数据（formal-leave）
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formalLeaveRes = await request.get<any>('/formal-leave', {
      params: {
        startDate,
        endDate,
        pageSize: 1000
      }
    });
    // 拦截器已提取 data，formalLeaveRes 直接就是 items 数组
    formalLeaves.value = Array.isArray(formalLeaveRes) ? formalLeaveRes : (formalLeaveRes?.items || []);

    // 获取离职/转岗数据
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const resignationRes = await request.get<any>('/resignation-transfer', {
      params: {
        startDate,
        endDate,
        pageSize: 1000
      }
    });
    resignationTransfers.value = Array.isArray(resignationRes) ? resignationRes : (resignationRes?.items || []);

  } catch (error) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((error as any)?.code === 'CANCELLED' || (error as any)?.isCancelled) {
      return;
    }
    console.error('获取临时加班或请假数据失败:', error);
    temporaryOvertimes.value = [];
    temporaryLeaves.value = [];
    formalLeaves.value = [];
    resignationTransfers.value = [];
  }
};

// 处理请假/年假数据变更事件，刷新排班表中的请假显示
const handleFormalLeaveChanged = async (data?: { tabType?: string }) => {
  // 只处理 annual 和 resignation 类型，因为这些才会影响排班表显示
  if (!data || data.tabType === 'annual' || data.tabType === 'resignation') {
    // 清除请求缓存
    clearRequestCache();
    // 重新获取排班数据
    await fetchEmployees();
  }
};

const calculateEmployeeOvertimeHours = (employeeId: number, startDate: string, endDate: string): number => {
  let total = 0;
  if (!temporaryOvertimes.value || !Array.isArray(temporaryOvertimes.value)) {
    return 0;
  }

  temporaryOvertimes.value.forEach((item) => {
    if (!item) {
      return;
    }

    if (item.employeeId === employeeId && item.overtimeDate) {
      try {
        const overtimeDate = dayjs(item.overtimeDate);

        if (!overtimeDate.isValid()) {
          return;
        }
        const overtimeDateStr = overtimeDate.format('YYYY-MM-DD');
        const isInRange = overtimeDateStr >= startDate && overtimeDateStr <= endDate;

        if (isInRange) {
          const hours = Number(item.hours) || 0;
          total += hours;
        }
      } catch {
        // 忽略日期解析错误
      }
    }
  });
  return total;
};

const calculateEmployeeLeaveHours = (employeeId: number, startDate: string, endDate: string): number => {
  let total = 0;
  try {
    temporaryLeaves.value.forEach(item => {
      if (!item || item.employeeId !== employeeId) {
        return;
      }

      // 跳过公差类型，不计算在请假工时内
      if (item.leaveType === 'ERRAND' || item.type === '公差') {
        return;
      }

      // 获取数据库中的 hours 字段
      const leaveHours = parseFloat(String(item.hours ?? '')) || 0;
      if (leaveHours <= 0) {
        return;
      }

      // 解析请假日期范围
      const itemStartDate = dayjs(item.startDate);
      const itemEndDate = dayjs(item.endDate);
      const rangeStart = dayjs(startDate);
      const rangeEnd = dayjs(endDate);

      // 计算日期重叠
      const overlapStart = itemStartDate.isAfter(rangeStart) ? itemStartDate : rangeStart;
      const overlapEnd = itemEndDate.isBefore(rangeEnd) ? itemEndDate : rangeEnd;

      // 只有在有重叠时才计算
      if (overlapStart.isBefore(overlapEnd) || overlapStart.isSame(overlapEnd)) {
        // 检查是否同一天请假（部分请假）
        if (itemStartDate.format('YYYY-MM-DD') === itemEndDate.format('YYYY-MM-DD')) {
          // 同一天请假：使用数据库中的 hours 字段（精确值，如 1 小时）
          total += leaveHours;
        } else {
          // 多天请假：按重叠天数计算，每天 8 小时
          const overlapDays = overlapEnd.diff(overlapStart, 'day') + 1;
          total += overlapDays * 8;
        }
      }
    });
  } catch (error) {
    console.error('[ERROR] calculateEmployeeLeaveHours:', error);
  }
  return total;
};

const fetchEmployees = async () => {
  isLoading.value = true;
  try {
    const { startDate, endDate } = currentCalculatedDateRange.value;
    
    try {
      await fetchTemporaryData(startDate, endDate);
    } catch {
      ElMessage.warning({ message: '获取临时数据失败，继续加载排班数据！', showClose: true, duration: 3000 });
    }

    const response = await request.get<{ employees: Employee[] }>('/schedule/employees', {
      params: { startDate, endDate }
    });

    const data = response;

    if (data?.employees) {
    const viewStartDate = dayjs(startDate);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filteredEmployees = data.employees.filter((emp: any) => {
      if (!emp.leaveDate) {
        return true;
      }

      const leaveDate = dayjs(emp.leaveDate);

      let cycleStartOfLeaveDate: dayjs.Dayjs;
      if (leaveDate.date() >= 24) {
        cycleStartOfLeaveDate = leaveDate.date(24);
      } else {
        cycleStartOfLeaveDate = leaveDate.subtract(1, 'month').date(24);
      }

      const firstHiddenCycleStart = cycleStartOfLeaveDate.add(1, 'month');

      return viewStartDate.isBefore(firstHiddenCycleStart);
    });

    // 岗位排序：Supervisor、Leader、Goods to people、HMP、收发料、Change part、Spare part、MRO、MRB、Cycle Count、IA、MFG
    const positionOrder: Record<string, number> = {
      'Supervisor': 1,
      'Leader': 2,
      'Goods to people': 3,
      'HMP': 4,
      '收发料': 5,
      'Change part': 6,
      'Spare part': 7,
      'MRO': 8,
      'MRB': 9,
      'Cycle Count': 10,
      'IA': 11,
      'MFG': 12
    };

    // 按岗位排序，同岗位按入职日期排序（早入职的排前面）
    filteredEmployees.sort((a: Employee, b: Employee) => {
      const orderA = positionOrder[a.position || ''] || 999;
      const orderB = positionOrder[b.position || ''] || 999;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      // 同岗位按入职日期排序，早入职排前面
      const dateA = a.employeeHireDate || '';
      const dateB = b.employeeHireDate || '';
      if (dateA && dateB) {
        return dateA.localeCompare(dateB);
      }
      if (dateA) return -1;
      if (dateB) return 1;
      return (a.name || '').localeCompare(b.name || '', 'zh-CN');
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    employees.value = filteredEmployees.map((emp: any) => {
      let scheduleHours = 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Object.values(emp.schedule || {}).forEach((scheduleInfo: any) => {
        const shift = scheduleInfo?.shift || '';
        scheduleHours += getWorkHours(shift);
      });
      
      let overtimeHours = 0;
      let leaveHours = 0;
      try {
        overtimeHours = calculateEmployeeOvertimeHours(emp.id, startDate, endDate);
        leaveHours = calculateEmployeeLeaveHours(emp.id, startDate, endDate);
      } catch {
        ElMessage.warning({ message: '计算临时工时失败！', showClose: true, duration: 3000 });
      }
      
      return {
        ...emp,
        plant: emp.plantName || emp.plant || '-',
        department: emp.departmentName || '',
        scheduleHours: scheduleHours,
        overtimeHours: overtimeHours,
        leaveHours: leaveHours,
        totalHours: scheduleHours + overtimeHours - leaveHours
      };
    });

    if (isInitialized.value && subTab.value === 'break7') {
      refreshData();
    }
  } else {
    employees.value = [];
  }
  } catch {
    ElMessage.error({ message: '获取员工数据失败！', showClose: true, duration: 3000 });
  } finally {
    isLoading.value = false;
  }
};

// 监听视图模式和日期变化，重新获取数据
watch([scheduleViewMode, currentPeriodStart, customRangeEnd], (newValues) => {
  // 如果切换到了自定义范围视图，设置默认值（本周六到下周五）
  if (newValues[0] === 'range' && !newValues[1]) {
    // 找到本周六
    let saturday: dayjs.Dayjs;
    const today = dayjs();
    if (today.day() <= 6) {
      // 今天是周日到周五，找到本周六
      saturday = today.day(6);
    } else {
      // 今天是周六，用今天
      saturday = today;
    }
    currentPeriodStart.value = saturday.format('YYYY-MM-DD');
    customRangeEnd.value = saturday.add(6, 'day').format('YYYY-MM-DD');
  }
  fetchEmployees();
});

onMounted(async () => {
  await loadPlants();
  await loadDepartments();
  await loadEmployeesAndSchedules();
  await loadAllPositions(); // 加载所有岗位
  await loadAvailableShifts(); // 加载所有可用班次

  // 监听请假/年假数据变更事件，刷新排班表中的请假显示
  eventBus.on('formal-leave-changed', handleFormalLeaveChanged);

  // 添加一个延迟以确保 DOM 渲染完成，然后再进行任何需要 DOM 宽度的计算
  setTimeout(() => {
    // ensureTableScroll();
    if (isInitialized.value && subTab.value === 'break7') {
      checkOverworking();
      checkWeeklyHours();
    } else if (subTab.value === 'attendance') {
      refreshAttendanceData();
    }
  }, 1000);
});

// 监听键盘事件
document.addEventListener('keydown', (e) => {
  // Ctrl+C 复制
  if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
    e.preventDefault();
    copySelection();
    // 复制后自动清空选择
    setTimeout(() => clearSelection(), 100);
  }
  // Ctrl+V 粘贴
  if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
    e.preventDefault();
    pasteSelection();
    // 粘贴后自动清空选择
    setTimeout(() => clearSelection(), 100);
  }
  // ESC 清空选择和关闭菜单
  if (e.key === 'Escape') {
    clearSelection();
    closeContextMenu();
  }
});

document.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  // 如果点击的不是排班表格单元格，也不是右键菜单，就清空选择
  if (!target.closest('.schedule-table') && !target.closest('.context-menu')) {
    clearSelection();
  }
  // 关闭右键菜单
  if (!target.closest('.context-menu')) {
    closeContextMenu();
  }
});
const prevPeriod = () => {
  if (scheduleViewMode.value === 'week') {
    // 确保移动到前一周的周一
    currentPeriodStart.value = dayjs(currentPeriodStart.value).day(1).subtract(7, 'day').format('YYYY-MM-DD');
  } else if (scheduleViewMode.value === 'month') {
    // 月视图，减去一个月，保持日期为24号
    currentPeriodStart.value = dayjs(currentPeriodStart.value).subtract(1, 'month').date(24).format('YYYY-MM-DD');
  } else if (scheduleViewMode.value === 'range') {
    // 自定义范围（周六到周五），向前移动一周
    currentPeriodStart.value = dayjs(currentPeriodStart.value).subtract(7, 'day').format('YYYY-MM-DD');
    customRangeEnd.value = dayjs(customRangeEnd.value).subtract(7, 'day').format('YYYY-MM-DD');
  }
};

const nextPeriod = () => {
  if (scheduleViewMode.value === 'week') {
    // 确保移动到后一周的周一
    currentPeriodStart.value = dayjs(currentPeriodStart.value).day(1).add(7, 'day').format('YYYY-MM-DD');
  } else if (scheduleViewMode.value === 'month') {
    // 月视图，加上一个月，保持日期为24号
    currentPeriodStart.value = dayjs(currentPeriodStart.value).add(1, 'month').date(24).format('YYYY-MM-DD');
  } else if (scheduleViewMode.value === 'range') {
    // 自定义范围（周六到周五），向后移动一周
    currentPeriodStart.value = dayjs(currentPeriodStart.value).add(7, 'day').format('YYYY-MM-DD');
    customRangeEnd.value = dayjs(customRangeEnd.value).add(7, 'day').format('YYYY-MM-DD');
  }
};

const today = () => {
  if (scheduleViewMode.value === 'week') {
    currentPeriodStart.value = dayjs().day(1).format('YYYY-MM-DD');
  } else if (scheduleViewMode.value === 'month') {
    // 月视图的今天，设置为合适的24号
    if (dayjs().date() >= 24) {
      currentPeriodStart.value = dayjs().date(24).format('YYYY-MM-DD');
    } else {
      currentPeriodStart.value = dayjs().subtract(1, 'month').date(24).format('YYYY-MM-DD');
    }
  } else if (scheduleViewMode.value === 'range') {
    // 自定义范围的今天，设置为本周六到下周五
    let saturday: dayjs.Dayjs;
    const today = dayjs();
    if (today.day() <= 6) {
      saturday = today.day(6);
    } else {
      saturday = today;
    }
    currentPeriodStart.value = saturday.format('YYYY-MM-DD');
    customRangeEnd.value = saturday.add(6, 'day').format('YYYY-MM-DD');
  }
};

const goToDate = () => {
  if (scheduleViewMode.value === 'week') {
    currentPeriodStart.value = dayjs(currentPeriodStart.value).day(1).format('YYYY-MM-DD');
  } else if (scheduleViewMode.value === 'month') {
    // 月视图跳转到日期时，设置为合适的24号
    if (dayjs(currentPeriodStart.value).date() >= 24) {
      currentPeriodStart.value = dayjs(currentPeriodStart.value).date(24).format('YYYY-MM-DD');
    } else {
      currentPeriodStart.value = dayjs(currentPeriodStart.value).subtract(1, 'month').date(24).format('YYYY-MM-DD');
    }
  }
};

const switchViewMode = (mode: 'week' | 'month' | 'range') => {
  if (mode === 'week') {
    // 切换到周视图，确保当前周的周一
    currentPeriodStart.value = dayjs().day(1).format('YYYY-MM-DD');
  } else if (mode === 'month') {
    // 切换到月视图，设置为24号
    // 如果今天 >=24号，就用本月24号，否则用上月24号
    if (dayjs().date() >= 24) {
      currentPeriodStart.value = dayjs().date(24).format('YYYY-MM-DD');
    } else {
      currentPeriodStart.value = dayjs().subtract(1, 'month').date(24).format('YYYY-MM-DD');
    }
  } else if (mode === 'range') {
    // 自定义范围，默认从本周六到下周五
    // 找到本周六
    let saturday: dayjs.Dayjs;
    const today = dayjs();
    if (today.day() <= 6) {
      // 今天是周日到周五，找到本周六
      saturday = today.day(6);
    } else {
      // 今天是周六，用今天
      saturday = today;
    }
    currentPeriodStart.value = saturday.format('YYYY-MM-DD');
    // 下周五是周六加6天
    customRangeEnd.value = saturday.add(6, 'day').format('YYYY-MM-DD');
  }
  scheduleViewMode.value = mode;
};



// 岗位选择对话框
const isPositionFilterOpen = ref(false);
const tempPositionFilter = ref<string[]>([]);

// 班次选择对话框
const isShiftFilterOpen = ref(false);
const tempShiftFilter = ref<string[]>([]);

// 导入排班对话框
const isImportScheduleDialogOpen = ref(false);

// 获取所有可用岗位

const togglePositionFilter = () => {
  if (!selectedDateForButtons.value) return; // 必须选中日期才能操作
  // 根据选中日期，动态获取该日期下所有员工的岗位
  const positions = new Set<string>();
  employees.value.forEach(employee => {
    if (employee.schedule[selectedDateForButtons.value!]) {
      positions.add(employee.position || '无岗位');
    }
  });
  allPositions.value = Array.from(positions).filter(p => p !== '无岗位'); // 过滤掉无效岗位
  tempPositionFilter.value = [...schedulePositionFilter.value]; // 复制当前筛选状态
  isPositionFilterOpen.value = true;
};

const closePositionFilter = () => {
  isPositionFilterOpen.value = false;
};

const clearPositionFilter = () => {
  tempPositionFilter.value = []; // 清空临时筛选值
  applyPositionFilter(); // 应用清空后的筛选并关闭对话框
};

const applyPositionFilter = () => {
  schedulePositionFilter.value = [...tempPositionFilter.value];
  closePositionFilter();
};

const toggleShiftFilter = () => {
  if (!selectedDateForButtons.value) return; // 必须选中日期才能操作
  // 根据选中日期，动态获取该日期下所有员工的班次
  const shifts = new Set<string>();
  employees.value.forEach(employee => {
    if (employee.schedule[selectedDateForButtons.value!]) {
      shifts.add(employee.schedule[selectedDateForButtons.value!]!.shift);
    }
  });
  availableShifts.value = Array.from(shifts).map(s => ({ label: s, value: s }));
  tempShiftFilter.value = [...scheduleShiftFilter.value];
  isShiftFilterOpen.value = true;
};

const closeShiftFilter = () => {
  isShiftFilterOpen.value = false;
};

const clearShiftFilter = () => {
  tempShiftFilter.value = []; // 清空临时筛选值
  applyShiftFilter(); // 应用清空后的筛选并关闭对话框
};

const applyShiftFilter = () => {
  scheduleShiftFilter.value = [...tempShiftFilter.value];
  closeShiftFilter();
};

// 班次定义

const filteredEmployees = computed(() => {
  return employees.value.filter(emp => {
    // 排班总览不过滤 employeeType，只进行岗位和班次过滤
    
    // 岗位过滤
    if (schedulePositionFilter.value.length === 0) {
      // 如果没有岗位过滤，检查班次过滤
      if (scheduleShiftFilter.value.length === 0) return true;
    } else {
      // 有岗位过滤，先检查岗位
      if (emp.position && !schedulePositionFilter.value.includes(emp.position)) return false;
    }
    
    // 班次过滤
    if (scheduleShiftFilter.value.length === 0) return true;
    
    // 获取当前视图的日期
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let currentDays: any[] = [];
    if (scheduleViewMode.value === 'week') {
      currentDays = weekDays.value;
    } else if (scheduleViewMode.value === 'month') {
      currentDays = monthDays.value;
    } else {
      currentDays = customRangeDays.value;
    }
    
    // 检查员工在当前日期范围内是否有任何一个被选中的班次
    for (const day of currentDays) {
      const schedule = emp.schedule[day.date];
      if (schedule && schedule.shift && scheduleShiftFilter.value.includes(schedule.shift)) {
        return true;
      }
    }
    
    return false;
  });
});

// 监听 filteredEmployees 变化，刷新考勤汇总数据
watch(filteredEmployees, () => {
  if (subTab.value === 'attendance') {
    refreshAttendanceData();
  }
});

// 汇总数据计算
// 注意: shiftCount 未使用，已注释保留以便将来启用
// const shiftCount = computed(() => {
//   const counts: { [key: string]: number } = { 'A班': 0, 'B班': 0, 'C班': 0, 'N班': 0, 'A+': 0, 'B+': 0, 'C+': 0, 'N+': 0, 'A2': 0, '休': 0 };
//   weekDays.value.forEach(day => {
//     filteredEmployees.value.forEach(emp => {
//       const shift = emp.schedule[day.date]?.shift;
//       if (shift && counts.hasOwnProperty(shift)) {
//         counts[shift] = (counts[shift] || 0) + 1;
//       }
//     });
//   });
//   return counts;
// });

// 计算单个员工在当前筛选日期范围内的工时
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getEmployeeHours = (emp: any) => {
  // 使用统一的日期范围计算，和排班总览保持一致
  const { start, end } = getAttendanceDateRange();

  console.log(`📊 getEmployeeHours - ${emp.name}: 日期范围 ${start.format('YYYY-MM-DD')} 至 ${end.format('YYYY-MM-DD')}`);

  let scheduleHours = 0;
  let overtimeHours = 0;
  let leaveHours = 0;

  // 遍历整个日期范围
  let currentDate = start.clone();
  while (currentDate.isBefore(end) || currentDate.isSame(end, 'day')) {
    const dateStr = currentDate.format('YYYY-MM-DD');
    const schedule = emp.schedule[dateStr];

    // 计算排班工时
    if (schedule && schedule.shift) {
      const wh = getWorkHours(schedule.shift);
      scheduleHours += wh;
      console.log(`  ${dateStr}: 班次=${schedule.shift}, 排班工时=${wh}`);
    }

    // 计算加班工时（按天计算）
    const otHours = calculateEmployeeOvertimeHours(emp.id, dateStr, dateStr);
    if (otHours > 0) {
      overtimeHours += otHours;
      console.log(`  ${dateStr}: 加班工时=${otHours}`);
    }

    currentDate = currentDate.add(1, 'day');
  }

  // 请假工时只调用一次，传入整个日期范围
  leaveHours = calculateEmployeeLeaveHours(emp.id, start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD'));

  const totalHours = scheduleHours + overtimeHours - leaveHours;

  console.log(`  总计: 排班=${scheduleHours}h, 加班=${overtimeHours}h, 请假=${leaveHours}h, 总计=${totalHours}h`);

  return {
    scheduleHours,
    overtimeHours,
    leaveHours,
    totalHours
  };
};

// 按级别汇总工时
const levelHoursSummary = computed(() => {
  const summary: { [level: string]: {
    employeeCount: number;
    totalScheduleHours: number;
    totalOvertimeHours: number;
    totalLeaveHours: number;
    totalHours: number;
  } } = {};

  filteredEmployees.value.forEach(emp => {
    // 获取当前视图的日期范围
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let currentDays: any[] = [];
    if (scheduleViewMode.value === 'week') {
      currentDays = weekDays.value;
    } else if (scheduleViewMode.value === 'month') {
      currentDays = monthDays.value;
    } else {
      currentDays = customRangeDays.value;
    }

    // 排除离职员工：检查当前日期范围内是否有离职标记
    const isResigned = currentDays.some(day => {
      const schedule = emp.schedule[day.date];
      return schedule && schedule.specialStatus === '离职';
    });
    if (isResigned) return;

    const level = emp.level || '未设置';
    if (!summary[level]) {
      summary[level] = {
        employeeCount: 0,
        totalScheduleHours: 0,
        totalOvertimeHours: 0,
        totalLeaveHours: 0,
        totalHours: 0
      };
    }
    summary[level].employeeCount++;

    // 根据当前日期范围重新计算工时
    const empHours = getEmployeeHours(emp);

    summary[level].totalScheduleHours += empHours.scheduleHours;
    summary[level].totalOvertimeHours += empHours.overtimeHours;
    summary[level].totalLeaveHours += empHours.leaveHours;
    summary[level].totalHours += empHours.totalHours;
  });

  return summary;
});

// 级别排序映射 - 定义各级别的排序优先级
const LEVEL_ORDER: { [key: string]: number } = {
  'Group Leader': 1,
  'Warehouse Supervisor': 2,
  '6 Level': 3,
  '5 Level': 4,
  '4 Level': 5,
  '3 Level': 6,
  '2 Level': 7,
  '1 Level': 8,
  '排班工时': 99
};

// 按级别排序后的汇总数据数组
const sortedLevelHoursSummary = computed(() => {
  const summary = levelHoursSummary.value;
  return Object.entries(summary)
    .map(([level, data]) => ({ level, ...data }))
    .sort((a, b) => {
      const orderA = LEVEL_ORDER[a.level] ?? 50;
      const orderB = LEVEL_ORDER[b.level] ?? 50;
      return orderA - orderB;
    });
});

// 工时计算 - 优先使用班次时长表，否则使用默认值
const getWorkHours = (shift: string): number => {
  // 防御：检查 shift 参数
  if (!shift) {
    return 0;
  }

  // 防御：检查 shiftDurationMap 是否存在
  if (shiftDurationMap.value && typeof shiftDurationMap.value.has === 'function') {
    if (shiftDurationMap.value.has(shift)) {
      return shiftDurationMap.value.get(shift) ?? 0;
    }
  }

  // 兜底：硬编码默认值（兼容旧数据）
  switch (shift) {
    case 'A班':
    case 'A':
    case 'B班':
    case 'B':
    case 'C班':
    case 'C':
    case 'N班':
    case 'N':
      return 8;
    case 'A+':
    case 'B+':
    case 'C+':
    case 'N+':
      return 12;
    case 'A2':
      return 10.5;
    default:
      return 0;
  }
};

const getShiftClass = (shift: string) => {
  if (!shift) return '';

  // 其他班次类型
  if (shift.includes('调休')) return 'shift-overtime';
  if (shift.includes('请假')) return 'shift-leave';
  if (shift.includes('年假')) return 'shift-annual';
  if (shift.includes('离职')) return 'shift-resign';
  if (shift.includes('旷工')) return 'shift-absent';

  // 获取班次前缀（A, B, C, N）
  const prefix = shift.charAt(0).toUpperCase();

  if (prefix === 'A') {
    if (shift.includes('+')) return 'shift-a-plus';
    if (shift.includes('2') || shift.includes('晚')) return 'shift-a2';
    return 'shift-a';
  }
  if (prefix === 'B') {
    if (shift.includes('+')) return 'shift-b-plus';
    return 'shift-b';
  }
  if (prefix === 'C') {
    if (shift.includes('+')) return 'shift-c-plus';
    return 'shift-c';
  }
  if (prefix === 'N') {
    if (shift.includes('+')) return 'shift-n-plus';
    return 'shift-n';
  }

  return '';
};

// 排班编辑弹窗
const isShiftEditDialogOpen = ref(false);
const editingEmployee = ref<Employee | null>(null);
const editingDate = ref('');
const editingData = ref({
  shift: '',
  specialStatusList: [] as string[],
  tempMatter: {
    type: '',
    startTime: '',
    endTime: '',
    reason: '',
    proof: false,
  },
});

const openShiftEditDialog = (employee: Employee, date: string) => {
  editingEmployee.value = employee;
  editingDate.value = date;
  
  // 获取现有数据
  const scheduleItem = employee.schedule[date];
  
  // 构建最终数据对象
  const resultData = {
    shift: '',
    specialStatusList: [] as string[],
    tempMatter: {
      type: '',
      startTime: '',
      endTime: '',
      reason: '',
      proof: false,
    },
  };
  
  // 如果有现有数据，填充值
  if (scheduleItem) {
    // 设置 shift
    if (scheduleItem.shift) {
      resultData.shift = scheduleItem.shift;
    }
    
    // 设置 specialStatusList
    if (scheduleItem.specialStatus) {
      resultData.specialStatusList = [scheduleItem.specialStatus];
    }
    
    // 设置 tempMatter
    if (scheduleItem.tempMatter) {
      resultData.tempMatter = scheduleItem.tempMatter;
    }
  }
  
  editingData.value = resultData;
  isShiftEditDialogOpen.value = true;
};

const saveShift = async () => {
  if (editingEmployee.value && editingDate.value) {
    try {
      const tempMatter = editingData.value.tempMatter;
      
      // 验证：如果是公差且大于2小时，必须上传证明
      if (tempMatter.type === '公差') {
        const hours = calculateTempMatterDurationAsNumber();
        if (hours > 2 && !tempMatter.proof) {
          ElMessage.warning({ message: '公差超过2小时必须上传证明材料！', showClose: true, duration: 3000 });
          return;
        }
      }
      
      // 如果有临时事项，先保存临时事项
      if (tempMatter.type && tempMatter.startTime && tempMatter.endTime && tempMatter.reason) {
        const hours = calculateTempMatterDurationAsNumber();

        if (tempMatter.type === '临时加班') {
          // 保存到临时加班
          const overtimeData = {
            employeeId: editingEmployee.value.id,
            plantId: editingEmployee.value.plantId || 0,
            departmentId: editingEmployee.value.departmentId || 0,
            overtimeType: '临时加班',
            overtimeDate: editingDate.value,
            startTime: tempMatter.startTime,
            endTime: tempMatter.endTime,
            hours: hours,
            reason: tempMatter.reason,
            proofFile: tempMatter.proof ? '已上传' : '',
            applicantId: editingEmployee.value.id,
          };
          
          try {
            await request.post('/temporary-overtime', overtimeData);
            ElMessage.success({ message: '临时加班保存成功！', showClose: true, duration: 3000 });
            // 刷新临时加班数据
            await fetchTemporaryData(editingDate.value, editingDate.value);
          } catch {
            ElMessage.error({ message: '临时加班记录保存失败，请稍后重试！', showClose: true, duration: 3000 });
            return;
          }
        } else {
          // 保存到临时请假（请假或公差）
          const leaveData = {
            employeeId: editingEmployee.value.id,
            plantId: editingEmployee.value.plantId || 0,
            departmentId: editingEmployee.value.departmentId || 0,
            leaveType: tempMatter.type === '临时请假' ? 'LEAVE' : 'ERRAND',
            startDate: editingDate.value,
            endDate: editingDate.value,
            startTime: tempMatter.startTime,
            endTime: tempMatter.endTime,
            hours: hours,
            reason: tempMatter.reason,
            proofFile: tempMatter.proof ? '已上传' : '',
            applicantId: editingEmployee.value.id,
          };
          
          try {
            await request.post('/temporary-leave', leaveData);
            ElMessage.success({ message: '临时请假/公差保存成功！', showClose: true, duration: 3000 });
            // 刷新临时请假数据
            await fetchTemporaryData(editingDate.value, editingDate.value);
          } catch {
            ElMessage.error({ message: '临时请假/公差记录保存失败，请稍后重试！', showClose: true, duration: 3000 });
            return;
          }
        }
      }
      
      // 保存排班信息
      try {
        await request.post('/schedule/save', {
          employeeId: editingEmployee.value.id,
          scheduleDate: editingDate.value,
          shift: editingData.value.shift,
          specialStatus: editingData.value.specialStatusList[0],
          tempMatter: editingData.value.tempMatter,
        });

        // 自动同步：如果特殊状态是离职，自动更新员工花名册状态
        if (editingData.value.specialStatusList[0] === '离职') {
          try {
            // 尝试使用 userId（如果有的话）
            const targetId = editingEmployee.value.userId || editingEmployee.value.id;
            await request.put(`/users/${targetId}`, {
              status: 'inactive',
              leaveDate: editingDate.value
            });
            // 清除请求缓存，确保花名册获取最新数据
            clearRequestCache();
            // 通知员工花名册页面刷新
            eventBus.emit('employee-roster-changed');
            ElMessage.success({ message: '排班保存成功！员工状态已自动更新为离职', showClose: true, duration: 3000 });
          } catch (syncError) {
            // 花名册更新失败不影响排班保存的提示
            console.error('自动同步员工状态失败:', syncError);
            ElMessage.success({ message: '排班保存成功！', showClose: true, duration: 3000 });
          }
        } else {
          ElMessage.success({ message: '排班保存成功！', showClose: true, duration: 3000 });
        }

        // 清除请求缓存，确保获取最新数据
        clearRequestCache();

        // 保存成功后，重新获取数据
        await fetchEmployees();

        // 如果保存的是年假或请假类型，通知请假Tab刷新
        const savedShift = editingData.value.shift;
        if (savedShift && (savedShift.includes('年假') || savedShift.includes('请假'))) {
          eventBus.emit('schedule-annual-leave-changed');
        }
      } catch {
        ElMessage.error({ message: '排班保存失败，请稍后重试！', showClose: true, duration: 3000 });
      }
    } catch {
      ElMessage.error({ message: '保存失败，请重试！', showClose: true, duration: 3000 });
    }
  }
  closeShiftEditDialog();
};

const calculateTempMatterDurationAsNumber = (): number => {
  if (!editingData.value.tempMatter.startTime || !editingData.value.tempMatter.endTime) return 0;
  const start = dayjs(`2026-01-01 ${editingData.value.tempMatter.startTime}`);
  const end = dayjs(`2026-01-01 ${editingData.value.tempMatter.endTime}`);
  return end.diff(start, 'hour', true);
};

const deleteShift = async () => {
  if (editingEmployee.value && editingDate.value) {
    try {
      await request.delete(`/schedule/${editingEmployee.value.id}/${editingDate.value}`);
      // 删除成功后，重新获取数据
      await fetchEmployees();
      ElMessage.success({ message: '排班删除成功！', showClose: true, duration: 3000 });
    } catch {
      ElMessage.error({ message: '删除排班失败！', showClose: true, duration: 3000 });
    }
  }
  closeShiftEditDialog();
};

const closeShiftEditDialog = () => {
  isShiftEditDialogOpen.value = false;
  editingEmployee.value = null;
  editingDate.value = '';
  editingData.value = {
    shift: '',
    specialStatusList: [],
    tempMatter: {
      type: '',
      startTime: '',
      endTime: '',
      reason: '',
      proof: false,
    },
  };
};

const calculateTempMatterDuration = (): string => {
  if (!editingData.value.tempMatter.startTime || !editingData.value.tempMatter.endTime) return '0';
  const start = dayjs(`2026-01-01 ${editingData.value.tempMatter.startTime}`);
  const end = dayjs(`2026-01-01 ${editingData.value.tempMatter.endTime}`);
  const hours = end.diff(start, 'hour', true);
  return hours.toFixed(1);
};

const fileInput = ref<HTMLInputElement | null>(null);

const uploadProof = () => {
  if (fileInput.value) {
    fileInput.value.click();
  }
};

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0 && editingData.value && editingData.value.tempMatter) {
    // 标记为已上传
    editingData.value.tempMatter.proof = true;
    console.log('文件已选择:', target.files[0]?.name || '');
  }
};

// 操作按钮
const oneClickSchedule = () => {
  ElMessage.info({ message: '执行一键排班功能', showClose: true, duration: 3000 });
};

const printSchedule = () => {
  // 确定要打印的日期范围
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let daysToPrint: any[] = [];
  let headerTitle = '';
  
  if (scheduleViewMode.value === 'week') {
    daysToPrint = weekDays.value;
    headerTitle = formattedWeekRange.value;
  } else if (scheduleViewMode.value === 'month') {
    daysToPrint = monthDays.value;
    headerTitle = formattedMonthRange.value;
  } else {
    daysToPrint = customRangeDays.value;
    headerTitle = formattedCustomRange.value;
  }

  // 创建打印窗口
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (!printWindow) {
    ElMessage.error({ message: '请允许弹出窗口！', showClose: true, duration: 3000 });
    return;
  }

  // 生成打印内容
  let printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Stockroom 排班表 - ${headerTitle}</title>
      <style>
        @page {
          size: A4 landscape;
          margin: 10mm;
        }
        body {
          font-family: 'Microsoft YaHei', Arial, sans-serif;
          padding: 10px;
          font-size: 10px;
        }
        h1 {
          text-align: center;
          font-size: 16px;
          margin: 10px 0;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 10px;
          line-height: 1.1;
        }
        th, td {
          border: 1px solid #000;
          padding: 2px 4px;
          text-align: center;
          white-space: nowrap;
          height: 22px;
        }
        th {
          background-color: #f5f5f5;
          font-weight: bold;
        }
        .sticky-col {
          position: sticky;
          left: 0;
          background-color: #fff;
          z-index: 1;
        }
        .sticky-header {
          position: sticky;
          top: 0;
          z-index: 2;
        }
        .remark {
          margin-top: 15px;
          font-size: 10px;
        }
        .remark p {
          margin: 3px 0;
        }
        @media print {
          body {
            padding: 0;
          }
          table {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
        }
      </style>
    </head>
    <body>
      <h1>Stockroom 排班表 (${headerTitle})</h1>
      <table>
        <thead>
          <tr>
            <th class="sticky-col sticky-header">No.</th>
            <th class="sticky-col sticky-header">Team Grp.</th>
            <th class="sticky-col sticky-header">Name</th>
            ${daysToPrint.map(day => `<th>${day.date}</th>`).join('')}
          </tr>
          <tr>
            <th class="sticky-col sticky-header"></th>
            <th class="sticky-col sticky-header"></th>
            <th class="sticky-col sticky-header"></th>
            ${daysToPrint.map(day => `<th>${day.weekday}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
  `;

  // 添加员工排班数据
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filteredEmployees.value.forEach((employee: any, index: number) => {
    printContent += `
      <tr>
        <td class="sticky-col">${index + 1}</td>
        <td class="sticky-col">${employee.position || ''}</td>
        <td class="sticky-col">${employee.name || ''}</td>
    `;

    daysToPrint.forEach(day => {
      const schedule = employee.schedule[day.date];
      let shiftText = '';
      
      if (schedule) {
        if (schedule.specialStatus) {
          shiftText = schedule.specialStatus;
        } else {
          shiftText = schedule.shift || '';
        }
      }
      
      printContent += `<td>${shiftText}</td>`;
    });

    printContent += '</tr>';
  });

  // 添加备注
  printContent += `
        </tbody>
      </table>
      <div class="remark">
        <p><strong>备注：</strong></p>
        <p>A: 6:50-15:00 &nbsp;&nbsp; A+: 6:50-19:00</p>
        <p>B: 14:50-23:00 &nbsp;&nbsp; B+: 10:50-23:00</p>
        <p>C: 22:50-7:00 &nbsp;&nbsp; C+: 18:50-7:00</p>
        <p>N: 8:30-17:30 &nbsp;&nbsp; N+: 8:30-21:30</p>
      </div>
    </body>
    </html>
  `;

  printWindow.document.write(printContent);
  printWindow.document.close();
  
  // 等待内容加载完成后直接打印
  printWindow.onload = function() {
    printWindow.focus();
    printWindow.print();
  };
};

// 下载排班模板
const downloadScheduleTemplate = async () => {
  try {
    let startDate, endDate;
    
    // 根据视图模式计算日期范围
    if (scheduleViewMode.value === 'week') {
      // 周视图：从本周一到周日
      const weekStart = dayjs(currentPeriodStart.value).day(1);
      startDate = weekStart.format('YYYY-MM-DD');
      endDate = weekStart.add(6, 'day').format('YYYY-MM-DD');
    } else if (scheduleViewMode.value === 'month') {
      // 月视图：从24号到次月23号
      let monthStart;
      if (dayjs(currentPeriodStart.value).date() >= 24) {
        monthStart = dayjs(currentPeriodStart.value).date(24);
      } else {
        monthStart = dayjs(currentPeriodStart.value).subtract(1, 'month').date(24);
      }
      startDate = monthStart.format('YYYY-MM-DD');
      endDate = monthStart.add(1, 'month').date(23).format('YYYY-MM-DD');
    } else {
      // 自定义范围视图
      startDate = currentPeriodStart.value;
      endDate = customRangeEnd.value;
    }
    
    const blob = await request.get('/schedule/download-template', {
      params: { startDate, endDate },
      responseType: 'blob'
    }) as Blob;
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '排班导入模板.xlsx';
    a.click();
    window.URL.revokeObjectURL(url);
    ElMessage.success({ message: '排班模板下载成功！', showClose: true, duration: 3000 });
  } catch {
    ElMessage.error({ message: '下载模板失败！', showClose: true, duration: 3000 });
  }
};

// 导入排班
const importSchedule = () => {
  isImportScheduleDialogOpen.value = true;
};

// 考勤导出
const exportAttendance = () => {
  console.log('📥 开始导出考勤...');
  
  // 根据视图模式确定日期范围
  let startDate, endDate;
  const dateRangeList: {date: string, code: string, dayOfWeek: number}[] = [];
  
  if (scheduleViewMode.value === 'week') {
    // 周视图：确定当前月周期
    const refDate = dayjs(currentPeriodStart.value);
    let monthStart, monthEnd;
    if (refDate.date() >= 24) {
      monthStart = refDate.date(24);
      monthEnd = monthStart.clone().add(1, 'month').date(23);
    } else {
      monthStart = refDate.subtract(1, 'month').date(24);
      monthEnd = monthStart.clone().add(1, 'month').date(23);
    }
    
    // 生成整个月周期的日期代码映射
    const monthDateMap = new Map<string, string>();
    let current = monthStart.clone();
    let dayCode = 1;
    while (current.isBefore(monthEnd) || current.isSame(monthEnd)) {
      monthDateMap.set(
        current.format('YYYY-MM-DD'),
        String(dayCode)
      );
      current = current.add(1, 'day');
      dayCode++;
    }
    
    // 生成当前周的日期列表，但只保留属于当前月周期的日期
    weekDays.value.forEach(day => {
      const dayDate = dayjs(day.date);
      // 检查日期是否属于当前月周期
      if ((dayDate.isAfter(monthStart) || dayDate.isSame(monthStart)) && 
          (dayDate.isBefore(monthEnd) || dayDate.isSame(monthEnd))) {
        dateRangeList.push({
          date: day.date,
          code: monthDateMap.get(day.date) || '',
          dayOfWeek: dayjs(day.date).day()
        });
      }
    });
    
    // 确定最终的导出日期范围
    if (dateRangeList.length > 0) {
      startDate = dayjs(dateRangeList[0]!.date);
      endDate = dayjs(dateRangeList[dateRangeList.length - 1]!.date);
    } else {
      // 如果当前周没有属于当前月周期的日期，就不导出或者导出空
      startDate = monthStart;
      endDate = monthEnd;
    }
    
  } else {
    // 先计算当前月周期的日期代码映射
    const refDate = dayjs(currentPeriodStart.value);
    let monthStart, monthEnd;
    if (refDate.date() >= 24) {
      monthStart = refDate.date(24);
      monthEnd = monthStart.clone().add(1, 'month').date(23);
    } else {
      monthStart = refDate.subtract(1, 'month').date(24);
      monthEnd = monthStart.clone().add(1, 'month').date(23);
    }
    
    // 生成整个月周期的日期代码映射
    const monthDateMap = new Map<string, string>();
    let current = monthStart.clone();
    let dayCode = 1;
    while (current.isBefore(monthEnd) || current.isSame(monthEnd)) {
      monthDateMap.set(
        current.format('YYYY-MM-DD'),
        String(dayCode)
      );
      current = current.add(1, 'day');
      dayCode++;
    }
    
    if (scheduleViewMode.value === 'month') {
      // 月视图：导出整个月周期
      startDate = monthStart;
      endDate = monthEnd;
      
      let current2 = startDate.clone();
      let dayCode2 = 1;
      while (current2.isBefore(endDate) || current2.isSame(endDate)) {
        dateRangeList.push({
          date: current2.format('YYYY-MM-DD'),
          code: String(dayCode2),
          dayOfWeek: current2.day()
        });
        current2 = current2.add(1, 'day');
        dayCode2++;
      }
      
    } else {
      // 自定义范围视图：导出自定义筛选的日期区间，日期代码按照当前月周期
      startDate = dayjs(currentPeriodStart.value);
      endDate = dayjs(customRangeEnd.value);
      
      let current2 = startDate.clone();
      while (current2.isBefore(endDate) || current2.isSame(endDate)) {
        const dateStr = current2.format('YYYY-MM-DD');
        dateRangeList.push({
          date: dateStr,
          code: monthDateMap.get(dateStr) || '',
          dayOfWeek: current2.day()
        });
        current2 = current2.add(1, 'day');
      }
    }
  }
  
  console.log('📅 导出日期范围:', startDate.format('YYYY-MM-DD'), '至', endDate.format('YYYY-MM-DD'));

  // 生成Excel数据
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const excelData: any[][] = [];
  
  // 表头
  const header: string[] = ['工号', '姓名'];
  dateRangeList.forEach(d => {
    header.push(d.code);
  });
  excelData.push(header);
  
  // 遍历员工（过滤掉 employee_type 等于 "jabil" 的）
  filteredEmployees.value.forEach(emp => {
    // 检查 employee_type 字段
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const employeeType = (emp as any).employee_type;
    if (employeeType && String(employeeType).toLowerCase() === 'jabil') {
      return; // 跳过
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row: any[] = [(emp as any).oldEmployeeId || emp.sap, emp.name];
    // 遍历日期
    dateRangeList.forEach(d => {
      const schedule = emp.schedule[d.date];
      let code = '';
      if (schedule) {
        const shift = schedule.shift;
        const specialStatus = (schedule as ScheduleItem).specialStatus;
        
        // 检查是否是周一到周五的请假/调休
        if (d.dayOfWeek >= 1 && d.dayOfWeek <= 5) {
          if (specialStatus === '请假' || specialStatus === '调休' || shift === '请假' || shift === '调休') {
            code = '01';
          } else if (['A', 'A2', 'A+'].includes(shift)) {
            code = '01';
          } else if (['B', 'B+'].includes(shift)) {
            code = '02';
          } else if (['C', 'C+'].includes(shift)) {
            code = '03';
          } else if (['N', 'N+'].includes(shift)) {
            code = '04';
          }
        } else {
          // 周末的处理
          if (['A', 'A2', 'A+'].includes(shift)) {
            code = '01';
          } else if (['B', 'B+'].includes(shift)) {
            code = '02';
          } else if (['C', 'C+'].includes(shift)) {
            code = '03';
          } else if (['N', 'N+'].includes(shift)) {
            code = '04';
          }
        }
      }
      row.push(code);
    });
    excelData.push(row);
  });
  
  // 创建工作簿
  const wb = XLSX.utils.book_new();
  // 创建工作表
  const ws = XLSX.utils.aoa_to_sheet(excelData);
  // 添加工作表到工作簿
  XLSX.utils.book_append_sheet(wb, ws, '考勤数据');
  // 下载文件
  XLSX.writeFile(wb, `考勤导出_${startDate.format('YYYYMMDD')}_${endDate.format('YYYYMMDD')}.xlsx`);
  console.log('✅ 考勤导出完成！');
};

// 排班导出
const exportSchedule = async () => {
  console.log('📤 开始导出排班...');

  // 获取当前视图的日期范围
  let startDate: dayjs.Dayjs;
  let endDate: dayjs.Dayjs;
  let dateList: {date: string, monthDay: string, weekday: string}[] = [];

  if (scheduleViewMode.value === 'week') {
    // 周视图
    startDate = dayjs(currentPeriodStart.value);
    endDate = startDate.clone().add(6, 'day');
    dateList = weekDays.value.map(d => ({
      date: d.date,
      monthDay: d.monthDay,
      weekday: d.weekday
    }));
  } else if (scheduleViewMode.value === 'range') {
    // 自定义范围视图
    startDate = dayjs(currentPeriodStart.value);
    endDate = dayjs(customRangeEnd.value);
    dateList = customRangeDays.value.map(d => ({
      date: d.date,
      monthDay: d.monthDay,
      weekday: d.weekday
    }));
  } else {
    // 月视图 - 导出整个月周期
    const refDate = dayjs(currentPeriodStart.value);
    let monthStart, monthEnd;
    if (refDate.date() >= 24) {
      monthStart = refDate.date(24);
      monthEnd = monthStart.clone().add(1, 'month').date(23);
    } else {
      monthStart = refDate.subtract(1, 'month').date(24);
      monthEnd = monthStart.clone().add(1, 'month').date(23);
    }
    startDate = monthStart;
    endDate = monthEnd;

    // 生成月周期的日期列表
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    let current = monthStart.clone();
    while (current.isBefore(monthEnd) || current.isSame(monthEnd)) {
      dateList.push({
        date: current.format('YYYY-MM-DD'),
        monthDay: current.format('M/D'),
        weekday: weekdays[current.day()] || ''
      });
      current = current.add(1, 'day');
    }
  }

  // 构建Excel数据
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const excelData: any[][] = [];

  // 表头：姓名、部门，然后是每个日期
  const header: string[] = ['姓名', '部门'];
  dateList.forEach(d => {
    header.push(`${d.monthDay} (${d.weekday})`);
  });
  header.push('总工时');
  excelData.push(header);

  // 遍历员工
  filteredEmployees.value.forEach(emp => {
    const row: (string | number)[] = [
      emp.name,
      emp.department || ''
    ];

    let totalHours = 0;

    // 添加每天的班次
    dateList.forEach(d => {
      const schedule = emp.schedule[d.date];
      if (schedule) {
        const shift = schedule.shift;
        row.push(shift);
        // 计算工时
        const hours = getWorkHours(shift);
        if (hours > 0) totalHours += hours;
      } else {
        row.push('');
      }
    });

    row.push(totalHours.toFixed(1));
    excelData.push(row);
  });

  // 创建工作簿并下载
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(excelData);
  XLSX.utils.book_append_sheet(wb, ws, '排班数据');
  XLSX.writeFile(wb, `排班导出_${startDate.format('YYYYMMDD')}_${endDate.format('YYYYMMDD')}.xlsx`);
  console.log('✅ 排班导出完成！');
};

// 关闭导入排班对话框
const closeImportScheduleDialog = () => {
  isImportScheduleDialogOpen.value = false;
  // 清空文件输入
  if (scheduleFileInput.value) {
    scheduleFileInput.value.value = '';
  }
};

// 处理文件上传
const handleScheduleFileUpload = async (e: Event) => {
  const target = e.target as HTMLInputElement;
  const files = target.files;
  if (!files || files.length === 0) return;

  let totalInserted = 0;
  let totalUpdated = 0;
  let anyError = false;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (!file) continue;
    
    const formData = new FormData();
    formData.append('file', file as Blob);

    try {
      const result = await request.post<BatchUploadResponse>('/batch/schedule/batch-upload', formData);

      if (!result || typeof result !== 'object') {
        throw new Error(`服务器返回数据格式异常`);
      }

      totalInserted += result.insertedCount || 0;
      totalUpdated += result.updatedCount || 0;

      // 如果有部分错误也展示
      if (result.errors && result.errors.length > 0) {
        ElMessage.warning({ message: `文件 "${file.name}" 导入存在部分错误，请查看控制台！`, showClose: true, duration: 3000 });
      }
    } catch (error) {
      anyError = true;
      let errorMsg = `文件 "${file.name}" 导入失败`;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((error as any)?.response?.data?.details && (error as any)?.response?.data?.details?.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        errorMsg += ':\n' + (error as any).response.data.details.slice(0, 3).map((err: any) =>
          typeof err === 'object' ? `第${err.row}行: ${err.error}` : String(err)
        ).join('\n');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } else if ((error as any)?.message) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        errorMsg += ':\n' + (error as any).message;
      }
      ElMessage.error({ message: errorMsg, showClose: true, duration: 3000 });
    }
  }

  // 显示结果
  if (!anyError) {
    ElMessage.success({ message: `全部导入成功！\n新增: ${totalInserted} 条\n更新: ${totalUpdated} 条`, showClose: true, duration: 3000 });
  } else {
    ElMessage.warning({ message: `导入完成！\n新增: ${totalInserted} 条\n更新: ${totalUpdated} 条\n(部分文件可能导入失败)`, showClose: true, duration: 3000 });
  }

  // 清除请求缓存，确保获取最新数据
  clearRequestCache();

  // 重新加载数据
  await fetchEmployees();

  // 关闭对话框
  closeImportScheduleDialog();
};

// ========== 批量选择和复制排班相关 ==========
// 检查单元格是否选中
const isCellSelected = (employeeId: number, date: string) => {
  return selectedCells.value.some(cell => cell.employeeId === employeeId && cell.date === date);
};

// 处理右键点击
const handleRightClick = (e: MouseEvent, employeeId: number, date: string) => {
  // Clear any existing single date selection if a batch operation is initiated
  selectedDateForButtons.value = null; 
  
  // 先取消正在进行的框选
  isSelecting.value = false;
  hasDragged.value = true; // 标记为有拖动，防止 endSelection 打开对话框
  
  // 如果点击的单元格不在选中列表中，就只选中这一个
  if (!isCellSelected(employeeId, date)) {
    selectedCells.value = [{ employeeId, date }];
  }
  
  // 打开右键菜单
  openContextMenu(e);
};

// 开始框选
const startSelection = (employeeId: number, date: string, e: MouseEvent) => {
  // 如果是右键，不处理
  if (e.button !== 0) return;

  lastMouseDownTime.value = Date.now();
  isSelecting.value = true;
  hasDragged.value = false;
  selectionStart.value = { employeeId, date };

  selectedCells.value = [{ employeeId, date }];
  e.preventDefault();
  // Clear any existing single date selection if a batch operation is initiated
  selectedDateForButtons.value = null;
};

// 更新框选
const updateSelection = (employeeId: number, date: string) => {
  if (!isSelecting.value || !selectionStart.value) return;

  // 记录有拖动
  hasDragged.value = true;

  // 获取当前显示的员工和日期列表（使用 filteredEmployees 而非 paginatedEmployees，保持与模板一致）
  const currentEmployees = filteredEmployees.value;
  const currentDays = scheduleViewMode.value === 'week' ? weekDays.value : monthDays.value;

  // 找到起始和结束的索引
  const startEmpIndex = currentEmployees.findIndex(e => e.id === selectionStart.value!.employeeId);
  const endEmpIndex = currentEmployees.findIndex(e => e.id === employeeId);

  // 如果找不到员工，不执行框选
  if (startEmpIndex === -1 || endEmpIndex === -1) {
    return;
  }

  const startDateIndex = currentDays.findIndex(d => d.date === selectionStart.value!.date);
  const endDateIndex = currentDays.findIndex(d => d.date === date);

  // 确定范围
  const minEmpIndex = Math.min(startEmpIndex, endEmpIndex);
  const maxEmpIndex = Math.max(startEmpIndex, endEmpIndex);
  const minDateIndex = Math.min(startDateIndex, endDateIndex);
  const maxDateIndex = Math.max(startDateIndex, endDateIndex);

  // 生成选中的单元格
  selectedCells.value = [];
  for (let i = minEmpIndex; i <= maxEmpIndex; i++) {
    for (let j = minDateIndex; j <= maxDateIndex; j++) {
      const emp = currentEmployees[i];
      const day = currentDays[j];
      if (emp && day) {
        selectedCells.value.push({
          employeeId: emp.id,
          date: day.date
        });
      }
    }
  }
};

// 结束框选
const endSelection = () => {
  isSelecting.value = false;
};

// 复制排班
const copySelection = () => {
  if (selectedCells.value.length === 0) return;
  
  copiedCells.value = selectedCells.value.map(cell => {
    const emp = employees.value.find(e => e.id === cell.employeeId);
    const schedule = emp?.schedule[cell.date];
    return {
      shift: schedule?.shift || '',
      specialStatus: schedule?.specialStatus
    };
  });
  
  // 自动清空选择
  setTimeout(() => clearSelection(), 100);
};

// 粘贴排班
const pasteSelection = async () => {
  if (selectedCells.value.length === 0 || copiedCells.value.length === 0) return;
  
  // 批量保存排班
  for (let i = 0; i < selectedCells.value.length; i++) {
    const cell = selectedCells.value[i];
    const copiedData = copiedCells.value[i % copiedCells.value.length]; // 循环使用复制的数据
    
    if (cell && copiedData && copiedData.shift) {
      const emp = employees.value.find(e => e.id === cell.employeeId);
      if (emp) {
        // 临时更新本地数据 - 使用响应式方式
        if (!emp.schedule[cell.date]) {
          emp.schedule = { ...emp.schedule, [cell.date]: { shift: copiedData.shift, specialStatus: copiedData.specialStatus } };
        } else {
          emp.schedule = {
            ...emp.schedule,
            [cell.date]: {
              ...emp.schedule[cell.date],
              shift: copiedData.shift,
              specialStatus: copiedData.specialStatus
            }
          };
        }
        
        // 调用后端保存
        try {
          await request.post('/schedule/save', {
            employeeId: cell.employeeId,
            scheduleDate: cell.date,
            shift: copiedData.shift,
            specialStatus: copiedData.specialStatus
          });
        } catch {
          ElMessage.error({ message: `保存排班失败: ${cell.date}`, showClose: true, duration: 3000 });
        }
      }
    }
  }
  
  // 清除请求缓存，确保获取最新数据
  clearRequestCache();

  // 刷新数据
  await fetchEmployees();
  // 自动清空选择
  clearSelection();
};

// 清空选择
const clearSelection = () => {
  selectedCells.value = [];
  isSelecting.value = false;
  selectionStart.value = null;
  hasDragged.value = true;
};

// 从右键菜单清空选择
const handleClearSelection = () => {
  clearSelection();
  closeContextMenu();
};

// 清空选中单元格的排班
const handleClearSchedule = async () => {
  if (selectedCells.value.length === 0) return;

  // 提前设置状态，防止误触发
  hasDragged.value = true;
  
  try {
    await ElMessageBox.confirm(
      `确定要清空 ${selectedCells.value.length} 个单元格的排班吗？`,
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );
  } catch {
    ElMessage.info({ message: '已取消清空操作', showClose: true, duration: 3000 });
    return;
  }
  
  closeContextMenu();
  
  // 批量清空排班
  for (const cell of selectedCells.value) {
    const emp = employees.value.find(e => e.id === cell.employeeId);
    if (emp && emp.schedule[cell.date]) {
      // 临时更新本地数据
      const newSchedule = { ...emp.schedule };
      delete newSchedule[cell.date];
      emp.schedule = newSchedule;

      // 调用后端删除排班 - 使用正确的 DELETE 方法
      try {
        await request.delete(`/schedule/${cell.employeeId}/${cell.date}`);

        // 同步删除该日期的请假/年假记录
        try {
          await request.delete('/formal-leave/by-employee-date', {
            params: { employeeId: cell.employeeId, date: cell.date }
          });
        } catch {
          // 忽略删除请假/年假记录的错误（可能没有记录）
        }

        // 同步删除该日期的离职/转岗记录
        try {
          await request.delete('/formal-leave/resignation/by-employee-date', {
            params: { employeeId: cell.employeeId, date: cell.date }
          });
        } catch {
          // 忽略删除离职/转岗记录的错误（可能没有记录）
        }
      } catch {
        ElMessage.error({ message: `删除排班失败: ${cell.date}`, showClose: true, duration: 3000 });
      }
    }
  }

  clearSelection();
  await fetchEmployees();
};

// 打开右键菜单
const openContextMenu = (e: MouseEvent) => {
  if (selectedCells.value.length > 0) {
    isContextMenuOpen.value = true;
    contextMenuPosition.value = { x: e.clientX, y: e.clientY };
  }
};

// 关闭右键菜单
const closeContextMenu = () => {
  isContextMenuOpen.value = false;
};

// 打开批量修改对话框
const openBatchShiftEdit = () => {
  isContextMenuOpen.value = false;
  isBatchShiftEditOpen.value = true;
  batchShiftValue.value = '';
  // 关键：提前设置状态，防止后续 endSelection 打开单日编辑
  hasDragged.value = true;
};

// 保存批量修改
const saveBatchShift = async () => {
  if (!batchShiftValue.value || selectedCells.value.length === 0) {
    ElMessage.warning({ message: '请选择班次和单元格！', showClose: true, duration: 3000 });
    return;
  }

  // 先关闭对话框
  isBatchShiftEditOpen.value = false;
  // 清空状态，防止后续触发打开
  hasDragged.value = true;
  
  // 批量保存
  for (const cell of selectedCells.value) {
    const emp = employees.value.find(e => e.id === cell.employeeId);
    if (emp) {
      // 临时更新本地数据 - 使用响应式方式更新
      if (!emp.schedule[cell.date]) {
        // 使用 Vue.set 的方式或重新赋值整个对象来确保响应式
        emp.schedule = { ...emp.schedule, [cell.date]: { shift: batchShiftValue.value } };
      } else {
        // 重新赋值整个对象
        emp.schedule = {
          ...emp.schedule,
          [cell.date]: {
            ...emp.schedule[cell.date],
            shift: batchShiftValue.value
          }
        };
      }

      // 调用后端保存
      try {
        await request.post('/schedule/save', {
          employeeId: cell.employeeId,
          scheduleDate: cell.date,
          shift: batchShiftValue.value
        });
      } catch {
        ElMessage.error({ message: `保存排班失败: ${cell.date}`, showClose: true, duration: 3000 });
      }
    }
  }

  // 清空选择
  clearSelection();

  // 清除请求缓存，确保获取最新数据
  clearRequestCache();

  // 刷新数据
  await fetchEmployees();
  ElMessage.success({ message: '批量排班保存成功！', showClose: true, duration: 3000 });
};

// 监听鼠标按钮
const lastMouseButton = ref<number>(0);

// 监听键盘事件
onMounted(async () => {
  loadIgnoredItems(); // 加载忽略项
  await loadPlants();
  await loadDepartments();
  await loadEmployeesAndSchedules();
  await loadAllPositions(); // 加载所有岗位
  await loadAvailableShifts(); // 加载所有可用班次

  // 监听请假/年假数据变更事件，刷新排班表中的请假显示
  eventBus.on('formal-leave-changed', handleFormalLeaveChanged);

  // 添加一个延迟以确保 DOM 渲染完成，然后再进行任何需要 DOM 宽度的计算
  setTimeout(() => {
    // ensureTableScroll();
    if (isInitialized.value && subTab.value === 'break7') {
      checkOverworking();
      checkWeeklyHours();
    } else if (subTab.value === 'attendance') {
      refreshAttendanceData();
    }
  }, 1000);
});

// 监听键盘事件
document.addEventListener('keydown', (e) => {
  // Ctrl+C 复制
  if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
    e.preventDefault();
    copySelection();
    // 复制后自动清空选择
    setTimeout(() => clearSelection(), 100);
  }
  // Ctrl+V 粘贴
  if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
    e.preventDefault();
    pasteSelection();
    // 粘贴后自动清空选择
    setTimeout(() => clearSelection(), 100);
  }
  // ESC 清空选择和关闭菜单
  if (e.key === 'Escape') {
    clearSelection();
    closeContextMenu();
  }
});

// 鼠标松开时结束框选（全局）
document.addEventListener('mouseup', () => {
  // 如果是右键，不执行 endSelection
  if (lastMouseButton.value === 2) {
    return;
  }
  endSelection();
});

// 点击其他地方关闭右键菜单并清空选择
document.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  // 如果点击的不是排班表格单元格，也不是右键菜单，就清空选择
  if (!target.closest('.schedule-table') && !target.closest('.context-menu')) {
    clearSelection();
  }
  // 关闭右键菜单
  if (!target.closest('.context-menu')) {
    closeContextMenu();
  }
});

// 监听筛选变化时重置页码
watch(filteredEmployees, () => {
  currentPage.value = 1;
});

// ========== 破7休1和周工时上限、公差补卡申请相关函数 ==========

// 检查破7休1 - 使用排班总览的筛选条件
const checkOverworking = () => {
  console.log('🔍 检查破7休1...');

  // 确保必要的数据都已加载
  if (!employees.value || employees.value.length === 0) {
    console.log('⚠️ 员工数据未加载，跳过检查');
    return;
  }

  // 直接从 employees.value 过滤，检查所有可能的字段名
  console.log('🔍 原始员工总数:', employees.value.length);
  
  // 过滤掉 employeeType 等于 'jabil' 的员工（后端返回字段名是 employeeType）
  const filteredForCheck = employees.value.filter(emp => {
    if (emp.employeeType && String(emp.employeeType).toLowerCase().includes('jabil')) {
      console.log('🔍 checkWeeklyHours 过滤掉 jabil 员工:', emp.name, 'employeeType =', emp.employeeType);
      return false;
    }
    return true;
  });
  
  console.log('🔍 过滤后员工数:', filteredForCheck.length);
  
  // 获取当前视图的日期范围
  let viewStart, viewEnd;
  if (scheduleViewMode.value === 'week') {
    viewStart = dayjs(currentPeriodStart.value);
    viewEnd = viewStart.clone().add(6, 'day');
  } else if (scheduleViewMode.value === 'month') {
    viewStart = dayjs(currentPeriodStart.value);
    viewEnd = viewStart.clone().add(1, 'month').date(23);
  } else {
    viewStart = dayjs(currentPeriodStart.value);
    viewEnd = dayjs(customRangeEnd.value);
  }
  
  // 检查日期范围扩展到前后各10天，确保能找到跨视图边界的连续工作
  // 注意：dayjs.subtract/add 会修改原对象，所以要先 clone！
  const checkStart = viewStart.clone().subtract(14, 'day'); // 向前检查两周
  const checkEnd = viewEnd.clone().add(14, 'day'); // 向后检查两周
  
  console.log('🔍 视图日期范围:', viewStart.format('YYYY-MM-DD'), '至', viewEnd.format('YYYY-MM-DD'));
  console.log('🔍 实际检查日期范围:', checkStart.format('YYYY-MM-DD'), '至', checkEnd.format('YYYY-MM-DD'));
  
  overworkingEmployees.value = [];
  normalEmployees.value = [];
  
  filteredForCheck.forEach((emp, index) => {
    const empName = emp.name;
    console.log(`🔍 [${index}] 检查员工:`, empName, '排班数据:', emp.schedule ? Object.keys(emp.schedule).length : 0, '个日期');
    
    let consecutiveDays = 0;
    let startDate = null;
    let lastWorkDate = null;
    // 用于保存最终的记录，确保取的是与视图重叠的那一段
    let finalConsecutiveDays = 0;
    let finalStartDate = null;
    let finalEndDate = null;
    
    let currentDate = checkStart.clone();
    
    // 打印这几个员工的详细检查过程
    const targetEmployees = ['彭绍勇', '李力', '易妍玲', '李文武', '刘华丽'];
    const isTargetEmployee = targetEmployees.includes(empName);
    
    // 遍历检查日期范围
    while (currentDate.isBefore(checkEnd) || currentDate.isSame(checkEnd)) {
      const dateStr = currentDate.format('YYYY-MM-DD');
      const schedule = emp.schedule[dateStr];

      // 检查是否是工作日（有班次安排）
      const isWorkDay = schedule && schedule.shift;

      // 检查是否是休息类班次（调休、请假、年假、离职、旷工）
      // 这些班次会中断连续工作天数计数
      const isRestShift = schedule && (
        schedule.specialStatus === '离职' ||
        ['调休', '请假', '年假', '旷工', '离职'].includes(schedule.shift)
      );

      // 如果是工作日
      if (isWorkDay && !isRestShift) {
        if (consecutiveDays === 0) {
          startDate = dateStr;
        }
        consecutiveDays++;
        lastWorkDate = dateStr;

        if (isTargetEmployee) {
          console.log(`🔍 [${index}] ${empName} - ${dateStr}: shift=${schedule?.shift}, 工作日, 连续${consecutiveDays}天`);
        }

        // 如果连续工作≥7天，检查这个时间段是否与视图范围有重叠
        if (consecutiveDays >= 7) {
          const checkOverlapStart = dayjs(startDate);
          const checkOverlapEnd = dayjs(lastWorkDate);
          let hasOverlapWithView = false;

          // 正确的重叠判断：start <= viewEnd AND end >= viewStart
          if ((checkOverlapStart.isBefore(viewEnd) || checkOverlapStart.isSame(viewEnd)) &&
              (checkOverlapEnd.isAfter(viewStart) || checkOverlapEnd.isSame(viewStart))) {
            hasOverlapWithView = true;
          }

          if (hasOverlapWithView) {
            // 更新最终记录，取最后一个符合条件的
            finalConsecutiveDays = consecutiveDays;
            finalStartDate = startDate;
            finalEndDate = lastWorkDate;

            if (isTargetEmployee) {
              console.log(`🔍 [${index}] ${empName}: 找到符合条件的记录: 连续${finalConsecutiveDays}天 (${finalStartDate} 至 ${finalEndDate})`);
            }
          }
        }
      } else {
        // 非工作日或休息类班次，重置连续计数
        consecutiveDays = 0;
        startDate = null;
        lastWorkDate = null;
      }

      currentDate = currentDate.add(1, 'day');
    }
    
    // 遍历完后，如果有符合条件的记录，才添加
    if (finalStartDate && finalEndDate && !((emp.employee_type || '').toString().toLowerCase() === 'jabil')) {
      // 再次确保记录的日期范围与当前视图有重叠才显示
      const recordStart = dayjs(finalStartDate);
      const recordEnd = dayjs(finalEndDate);
      const hasOverlap = (recordStart.isBefore(viewEnd) || recordStart.isSame(viewEnd)) &&
                         (recordEnd.isAfter(viewStart) || recordEnd.isSame(viewStart));
      
      if (hasOverlap) {
        // 判断结束日期：
        // 1. 如果从开始日期到开始+12天范围内有调休、请假等非工作日，使用实际最后工作日
        // 2. 否则使用开始日期+12天
        let normalizedEndDate: string;
        const checkEnd = dayjs(finalStartDate).add(12, 'day');
        let hasNonWorkDay = false;
        let actualLastWorkDate = dayjs(finalStartDate);

        for (let d = dayjs(finalStartDate); d.isBefore(checkEnd) || d.isSame(checkEnd); d = d.add(1, 'day')) {
          const dateStr = d.format('YYYY-MM-DD');
          const schedule = emp.schedule[dateStr];
          if (schedule) {
            const isRestShift = schedule.specialStatus === '离职' ||
              ['调休', '请假', '年假', '旷工', '离职'].includes(schedule.shift);
            if (isRestShift) {
              hasNonWorkDay = true;
              break;
            }
            actualLastWorkDate = d;
          }
        }

        if (hasNonWorkDay) {
          normalizedEndDate = actualLastWorkDate.format('YYYY-MM-DD');
        } else {
          normalizedEndDate = checkEnd.format('YYYY-MM-DD');
        }

        const normalizedConsecutiveDays = dayjs(normalizedEndDate).diff(dayjs(finalStartDate), 'day') + 1;
        console.log(`🔍 [${index}] ✅ 最终记录: ${empName}, 连续${normalizedConsecutiveDays}天 (${finalStartDate} 至 ${normalizedEndDate})`);
        // 检查是否在忽略列表中
        const isIgnored = ignoredOverworkItems.value.some(item =>
          item.employeeId === emp.id &&
          item.startDate === finalStartDate &&
          item.endDate === normalizedEndDate
        );
        overworkingEmployees.value.push({
          ...emp,
          consecutiveDays: normalizedConsecutiveDays,
          startDate: finalStartDate,
          endDate: normalizedEndDate,
          sap: emp.oldEmployeeId || emp.sap, // 使用旧工号
          reason: getReasonByPosition(emp.position || emp.level || ''),
          isIgnored: isIgnored // 添加忽略标记
        });
      } else {
        console.log(`🔍 [${index}] 跳过 ${empName}: 记录 (${finalStartDate} 至 ${finalEndDate}) 与当前视图 (${viewStart.format('YYYY-MM-DD')} 至 ${viewEnd.format('YYYY-MM-DD')}) 无重叠`);
      }
    } else if (!((emp.employee_type || '').toString().toLowerCase() === 'jabil')) {
      normalEmployees.value.push(emp);
    }
  });
  
  console.log(`✅ 检查完成，发现 ${overworkingEmployees.value.length} 名连续工作≥7天的员工`);
  console.log('📋 破7休1员工列表:', overworkingEmployees.value.map(e => ({ 
    name: e.name || e.realName, 
    id: e.id, 
    consecutiveDays: e.consecutiveDays 
  })));
};

// 检查周工时上限 - 使用排班总览的筛选条件
const checkWeeklyHours = () => {
  console.log('📊 检查周工时上限...');
  
  // 确保必要的数据都已加载
  if (!employees.value || employees.value.length === 0) {
    console.log('⚠️ 员工数据未加载，跳过检查');
    return;
  }
  
  // 直接从 employees.value 过滤，检查所有可能的字段名
  console.log('📊 原始员工总数:', employees.value.length);
  
  // 调试：找到周天映，打印他的完整数据
  const zhouTianying = employees.value.find(e => (e.name === '周天映' || e.realName === '周天映'));
  if (zhouTianying) {
    console.log('🔍 找到周天映的完整数据:', JSON.stringify(zhouTianying, null, 2));
    console.log('🔍 周天映的所有字段:', Object.keys(zhouTianying));
    // 检查所有可能的字段
    const possibleFields = ['employee_type', 'employeeType', 'EmployeeType', 'type', 'emp_type', 'empType'];
    for (const field of possibleFields) {
      if (zhouTianying[field]) {
        console.log(`🔍 周天映的字段 ${field} 的值:`, zhouTianying[field]);
      }
    }
  }
  
  // 过滤掉 employeeType 等于 'jabil' 的员工（后端返回字段名是 employeeType）
  const filteredForCheck = employees.value.filter(emp => {
    if (emp.employeeType && String(emp.employeeType).toLowerCase().includes('jabil')) {
      console.log('🔍 checkWeeklyHours 过滤掉 jabil 员工:', emp.name, 'employeeType =', emp.employeeType);
      return false;
    }
    return true;
  });
  
  console.log('🔍 过滤后员工数:', filteredForCheck.length);
  
  weeklyLimitEmployees.value = [];
  weeklyNormalEmployees.value = [];
  
  // 获取当前视图的日期范围 - 和排班总览保持一致
  let start, end;
  if (scheduleViewMode.value === 'week') {
    start = dayjs(currentPeriodStart.value);
    end = start.clone().add(6, 'day');
  } else if (scheduleViewMode.value === 'month') {
    start = dayjs(currentPeriodStart.value);
    end = start.clone().add(1, 'month').date(23);
  } else {
    start = dayjs(currentPeriodStart.value);
    end = dayjs(customRangeEnd.value);
  }
  
  const weekDateStr = `${start.format('YYYY-MM-DD')} 至 ${end.format('YYYY-MM-DD')}`;
  console.log('📊 检查日期范围:', weekDateStr);
  
  filteredForCheck.forEach((emp, index) => {
    const empName = emp.name || emp.realName;
    console.log(`📊 [${index}] 检查员工:`, empName);
    
    let scheduleHours = 0;
    let overtimeHours = 0;
    
    // 计算日期范围内的工时
    let currentDate = start.clone();
    while (currentDate.isBefore(end) || currentDate.isSame(end)) {
      const dateStr = currentDate.format('YYYY-MM-DD');
      const dayOfWeek = currentDate.day(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      
      // 排班工时
      const schedule = emp.schedule[dateStr];
      
      let wh = 0;
      if (schedule && schedule.shift) {
        // 检查是否是请假或调休
        const isLeaveOrDayOff = schedule.shift === '请假' || schedule.shift === '调休';
        
        if (isLeaveOrDayOff) {
          // 请假或调休，工时为0
          wh = 0;
        } else if (dayOfWeek >= 1 && dayOfWeek <= 4) {
          // 周一到周四：按实际排班计算
          wh = getWorkHours(schedule.shift);
        } else {
          // 周五到周天：只要不是请假或调休，就按12H算
          wh = 12;
        }
        
        // 打印彭绍勇或第一个员工的详细工时
          const weekDays = ['日','一','二','三','四','五','六'];
          if (empName === '彭绍勇' || index === 0) {
            console.log(`📊 [${index}] ${empName} - ${dateStr} (周${weekDays[dayOfWeek]}): 班次=${schedule.shift}, 工时=${wh}`);
          }
        scheduleHours += wh;
      }
      
      // 加班工时
      overtimeHours += calculateEmployeeOvertimeHours(emp.id, dateStr, dateStr);
      
      currentDate = currentDate.add(1, 'day');
    }
    
    const totalHours = scheduleHours + overtimeHours;
    const overLimitHours = totalHours - weeklyLimitSetting.value;
    
    console.log(`📊 [${index}] ${empName}: 排班=${scheduleHours}h, 加班=${overtimeHours}h, 总计=${totalHours}h, 超限=${overLimitHours > 0 ? overLimitHours : 0}h`);
    
    if (overLimitHours > 0 && !((emp.employee_type || '').toString().toLowerCase() === 'jabil')) {
      // 只显示周一的日期
      const mondayDate = start.day(1).format('YYYY-MM-DD');
      const weekEndDate = start.day(7).format('YYYY-MM-DD');
      const weekNumber = 'WK' + start.isoWeek();
      
      weeklyLimitEmployees.value.push({
        ...emp,
        scheduleHours,
        overtimeHours,
        totalHours,
        overLimitHours,
        weekDate: mondayDate,
        weekEndDate: weekEndDate,
        weekNumber: weekNumber,
        sap: emp.oldEmployeeId || emp.sap, // 使用旧工号
        reason: getReasonByPosition(emp.position || emp.level || '')
      });
    }
  });

  console.log(`✅ 检查完成，发现 ${weeklyLimitEmployees.value.length} 名周工时超限员工`);
  console.log('📋 周工时超限员工列表:', weeklyLimitEmployees.value.map(e => ({ 
    name: e.name || e.realName, 
    id: e.id, 
    totalHours: e.totalHours 
  })));
};

// ========== 导出Excel和发送邮件功能 ==========

// 导出Excel
const exportToExcel = async () => {
  console.log('📥 导出Excel...');
  
  const weekNum = getWeekNumber(currentPeriodStart.value);
  const fileName = `破7休1和周工时上限、公差补卡申请-${weekNum}(HY).xlsx`;
  
  const workbook = new ExcelJS.Workbook();

  // 1. 汇总表 - 添加多行表头
  const summarySheet = workbook.addWorksheet('汇总');
  
  // 计算需要加边框的行数（表头2行 + 数据）
  const tableRowCount = 2 + summaryData.value.length;
  
  // 第一行表头
  summarySheet.addRow(['申请部门', '申请人', '打破7休1', '周工时>63.75', '', '实施周期', '原因说明']);
  
  // 第二行表头
  summarySheet.addRow(['', '', '申请人数', '申请人数', '超出总工时', '', '']);
  
  // 合并单元格
  summarySheet.mergeCells('A1:A2'); // 申请部门
  summarySheet.mergeCells('B1:B2'); // 申请人
  summarySheet.mergeCells('D1:E1'); // 周工时>63.75
  summarySheet.mergeCells('F1:F2'); // 实施周期
  summarySheet.mergeCells('G1:G2'); // 原因说明
  
  // 添加数据
  summaryData.value.forEach(dept => {
    summarySheet.addRow([
      'MPL ST', // 统一显示为 MPL ST
      dept.applicant,
      dept.overworkCount,
      dept.overLimitCount,
      dept.totalOverHours,
      dept.period,
      dept.reason
    ]);
  });
  
  // 添加备注信息
  summarySheet.addRow([]);
  summarySheet.addRow(['操作指南：']);
  summarySheet.addRow(['1. 各区域基于实际需求按照标准格式提供特批信息']);
  summarySheet.addRow(['2. 每周周四12:00前完成本周需要特批的申请信息']);
  summarySheet.addRow(['3. 按照申请项目将特批名单放入对应的sheet中，名单人数必须与申请人数相符']);
  summarySheet.addRow([]);
  summarySheet.addRow(['特批申请流程：']);
  summarySheet.addRow(['1. 每周四下午由Coordinator统一汇总发给对应区域的主管审批']);
  summarySheet.addRow(['2. 各区域主管负责审核数据的真实性并给予approve or reject']);
  summarySheet.addRow(['3. Coordinator每周四下午将主管已批准的名单发送给Rose or William进行终审']);
  summarySheet.addRow(['4. 审批流程完成后发送给考勤小组受理，没有完成批复的申请视为无效申请。']);
  summarySheet.addRow([]);
  summarySheet.addRow(['Coordinator', 'Area']);
  summarySheet.addRow(['欧小妮', 'ENE ABC / DYS']);
  summarySheet.addRow(['李志', 'MPL/Phase V/OOCL/YL']);
  
  // 只给表格部分应用样式：边框和居中
  summarySheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber <= tableRowCount) {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        cell.alignment = {
          vertical: 'middle',
          horizontal: 'center'
        };
      });
    }
  });
  
  // 适配列宽
  summarySheet.columns.forEach(column => {
    if (column && typeof column.eachCell === 'function') {
      let maxLength = 10;
      column.eachCell({ includeEmpty: true }, cell => {
        const columnLength = cell.value ? cell.value.toString().length : 10;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = maxLength < 10 ? 10 : maxLength;
    }
  });
  
  // 2. 破7休1详细表
  const overworkSheet = workbook.addWorksheet('打破7休1');
  overworkSheet.addRow(['序号', '区域', '部门', '级别', '工号', '姓名', '开始日期', '结束日期', '连续工作天数', '原因说明']);

  let rowIndex = 0;
  overworkingEmployees.value.forEach((emp) => {
    if (emp.isIgnored) {
      return; // 跳过被忽略的项
    }
    rowIndex++;
    // 格式化日期
    const formatDate = (dateStr: string) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
    };
    // 优先使用处理后的字段，如果没有则使用原始字段
    const plantValue = emp.plant || emp.plantName || '-';
    const deptValue = emp.department || (emp.departmentName ? emp.departmentName.replace('MPL_Stockroom', 'ST') : 'ST');
    overworkSheet.addRow([
      rowIndex,
      plantValue,
      deptValue,
      emp.level || '',
      emp.sap,
      emp.name,
      formatDate(emp.startDate),
      formatDate(emp.endDate),
      emp.consecutiveDays,
      emp.reason
    ]);
  });
  
  // 应用样式
  overworkSheet.eachRow({ includeEmpty: false }, (row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center'
      };
    });
  });
  
  // 适配列宽
  overworkSheet.columns.forEach(column => {
    if (column && typeof column.eachCell === 'function') {
      let maxLength = 10;
      column.eachCell({ includeEmpty: true }, cell => {
        const columnLength = cell.value ? cell.value.toString().length : 10;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = maxLength < 10 ? 10 : maxLength;
    }
  });
  
  // 3. 周工时上限详细表
  const weeklySheet = workbook.addWorksheet('周工时＞63.75');
  weeklySheet.addRow(['序号', '区域', '部门', '级别', '工号', '姓名', '日期', '周工时', '周数', '超出工时', '原因说明']);

  weeklyLimitEmployees.value.forEach((emp, idx) => {
    // 格式化日期
    const formatDate = (dateStr: string) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
    };
    // 直接使用 processEmployeeData 已经处理好的字段
    // 优先使用处理后的字段，如果没有则使用原始字段
    const plantValue = emp.plant || emp.plantName || '-';
    const deptValue = emp.department || (emp.departmentName ? emp.departmentName.replace('MPL_Stockroom', 'ST') : 'ST');
    weeklySheet.addRow([
      idx + 1,
      plantValue,
      deptValue,
      emp.level || '',
      emp.sap,
      emp.name,
      formatDate(emp.weekDate),
      emp.totalHours,
      weekNum,
      emp.overLimitHours,
      emp.reason
    ]);
  });
  
  // 应用样式
  weeklySheet.eachRow({ includeEmpty: false }, (row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center'
      };
    });
  });
  
  // 适配列宽
  weeklySheet.columns.forEach(column => {
    if (column && typeof column.eachCell === 'function') {
      let maxLength = 10;
      column.eachCell({ includeEmpty: true }, cell => {
        const columnLength = cell.value ? cell.value.toString().length : 10;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = maxLength < 10 ? 10 : maxLength;
    }
  });
  
  // 4. 公差补卡申请表
  const errandSheet = workbook.addWorksheet('公差');
  errandSheet.addRow(['区域', '部门', '工号', '姓名', '开始时间', '结束时间', '假期类型', '备注', 'OT', '证据']);
  
  // 处理公差数据并嵌入图片
  for (let i = 0; i < errandFixList.value.length; i++) {
    const item = errandFixList.value[i];
    if (!item) continue; // 添加空值检查
    // 格式化日期
    const formatDate = (dateStr: string) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
    };
    const row = errandSheet.addRow([
      item.plant || '',
      item.department?.replace('MPL_Stockroom', 'ST'),
      item.sap,
      item.employeeName,
      formatDate(item.startTime),
      formatDate(item.endTime),
      item.leaveType,
      item.reason,
      item.ot,
      ''  // 证据列先留空，后面添加图片或链接
    ]);
    
    // 如果有证据，处理常见图片格式并嵌入
    if (item.evidence) {
      const evidenceCell = row.getCell(10); // 第10列是证据列
      const lowerEvidence = String(item.evidence || '').toLowerCase();
      // 接受常见图片格式
      let extension: 'png' | 'jpeg' | null = null;
      if (lowerEvidence.endsWith('.png')) {
        extension = 'png';
      } else if (lowerEvidence.endsWith('.jpg') || lowerEvidence.endsWith('.jpeg')) {
        extension = 'jpeg';
      }
      
      if (extension) {
        try {
          // 下载图片并嵌入
          const response = await fetch(item.evidence);
          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
            // 在浏览器环境中直接使用 ArrayBuffer
            const imageId = workbook.addImage({
              buffer: arrayBuffer,
              extension: extension
            });
            
            // 设置行高以便显示图片
            row.height = 100;
            
            // 设置列宽以便显示图片
            errandSheet.getColumn(10).width = 20;
            
            // 添加图片到单元格，更大更清晰
            errandSheet.addImage(imageId, {
              tl: { col: 9, row: i + 1 },  // 第10列(索引9)，当前行(索引i+1)
              ext: { width: 90, height: 90 }, // Set a reasonable size for the image
              editAs: 'oneCell'
            });
            // 确保没有任何文字
            evidenceCell.value = '';
            console.log('图片嵌入成功:', item.evidence);
          } else {
            console.log('图片下载失败:', response.status, item.evidence);
          }
        } catch (err) {
          console.log('图片嵌入失败:', err);
        }
      }
      // 无论成功失败，都不显示任何文字
      evidenceCell.value = '';
    } else {
      row.getCell(10).value = '';
    }
  }
  
  // 应用样式
  errandSheet.eachRow({ includeEmpty: false }, (row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center'
      };
    });
  });
  
  // 适配列宽
  errandSheet.columns.forEach(column => {
    if (column && typeof column.eachCell === 'function') {
      let maxLength = 10;
      column.eachCell({ includeEmpty: true }, cell => {
        const columnLength = cell.value ? cell.value.toString().length : 10;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = maxLength < 10 ? 10 : maxLength;
    }
  });

  // 5. 补卡表 - 只要表头
  const fixCardSheet = workbook.addWorksheet('补卡');
  fixCardSheet.addRow(['区域', '部门', '工号', '姓名', '签卡类型', '签卡原因', '签卡时间 进', '签卡时间 出', '备注', '证据']);
  
  // 应用样式到表头
  fixCardSheet.eachRow({ includeEmpty: false }, (row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center'
      };
    });
  });
  
  // 适配列宽
  fixCardSheet.columns.forEach(column => {
    if (column && typeof column.eachCell === 'function') {
      let maxLength = 10;
      column.eachCell({ includeEmpty: true }, cell => {
        const columnLength = cell.value ? cell.value.toString().length : 10;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = maxLength < 10 ? 10 : maxLength;
    }
  });
  
  // 下载文件
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
  
  console.log('✅ Excel导出完成:', fileName);
};
// 在 Outlook 中打开并发送邮件
const openInOutlook = async () => {
  try {
    const weekNum = getWeekNumber(currentPeriodStart.value);
    const subject = `破7休1和周工时上限、公差补卡申请-${weekNum}(HY)`;
    
    const to = emailConfig.value.to || 'Xiaobao.Lin@jabil.com';
    const cc = emailConfig.value.cc || 'Zhi.Li@jabil.com';
    
    // 先下载Excel作为附件
    console.log('📧 正在生成 Excel 附件...');
    
    const workbook = new ExcelJS.Workbook();

    // 1. 汇总表 - 添加多行表头
    const summarySheet = workbook.addWorksheet('汇总');
    
    // 计算需要加边框的行数（表头2行 + 数据）
    const tableRowCount = 2 + summaryData.value.length;
    
    // 第一行表头
    summarySheet.addRow(['申请部门', '申请人', '打破7休1', '周工时>63.75', '', '实施周期', '原因说明']);
    
    // 第二行表头
    summarySheet.addRow(['', '', '申请人数', '申请人数', '超出总工时', '', '']);
    
    // 合并单元格
    summarySheet.mergeCells('A1:A2'); // 申请部门
    summarySheet.mergeCells('B1:B2'); // 申请人
    summarySheet.mergeCells('D1:E1'); // 周工时>63.75
    summarySheet.mergeCells('F1:F2'); // 实施周期
    summarySheet.mergeCells('G1:G2'); // 原因说明
    
    // 添加数据
    summaryData.value.forEach(dept => {
      summarySheet.addRow([
        dept.department?.replace('MPL_Stockroom', 'Stockroom'),
        dept.applicant,
        dept.overworkCount,
        dept.overLimitCount,
        dept.totalOverHours,
        dept.period,
        dept.reason
      ]);
    });
    
    // 添加备注信息
    summarySheet.addRow([]);
    summarySheet.addRow(['操作指南：']);
    summarySheet.addRow(['1. 各区域基于实际需求按照标准格式提供特批信息']);
    summarySheet.addRow(['2. 每周周四12:00前完成本周需要特批的申请信息']);
    summarySheet.addRow(['3. 按照申请项目将特批名单放入对应的sheet中，名单人数必须与申请人数相符']);
    summarySheet.addRow([]);
    summarySheet.addRow(['特批申请流程：']);
    summarySheet.addRow(['1. 每周四下午由Coordinator统一汇总发给对应区域的主管审批']);
    summarySheet.addRow(['2. 各区域主管负责审核数据的真实性并给予approve or reject']);
    summarySheet.addRow(['3. Coordinator每周四下午将主管已批准的名单发送给Rose or William进行终审']);
    summarySheet.addRow(['4. 审批流程完成后发送给考勤小组受理，没有完成批复的申请视为无效申请。']);
    summarySheet.addRow([]);
    summarySheet.addRow(['Coordinator', 'Area']);
    summarySheet.addRow(['欧小妮', 'ENE ABC / DYS']);
    summarySheet.addRow(['李志', 'MPL/Phase V/OOCL/YL']);
    
    // 只给表格部分应用样式：边框和居中
    summarySheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber <= tableRowCount) {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
          cell.alignment = {
            vertical: 'middle',
            horizontal: 'center'
          };
        });
      }
    });
    
    // 适配列宽
    summarySheet.columns.forEach(column => {
      if (column && typeof column.eachCell === 'function') {
        let maxLength = 10;
        column.eachCell({ includeEmpty: true }, cell => {
          const columnLength = cell.value ? cell.value.toString().length : 10;
          if (columnLength > maxLength) {
            maxLength = columnLength;
          }
        });
        column.width = maxLength < 10 ? 10 : maxLength;
      }
    });

    // 2. 破7休1详细表
    const overworkSheet = workbook.addWorksheet('打破7休1');
    overworkSheet.addRow(['序号', '区域', '部门', '级别', '工号', '姓名', '开始日期', '结束日期', '连续工作天数', '原因说明']);

    let overworkRowNum = 0;
    overworkingEmployees.value.forEach((emp) => {
      if (emp.isIgnored) {
        return; // 跳过被忽略的项
      }
      overworkRowNum++;
      // 格式化日期
      const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
      };
      // 优先使用处理后的字段，如果没有则使用原始字段
      const plantValue = emp.plant || emp.plantName || '-';
      const deptValue = emp.department || (emp.departmentName ? emp.departmentName.replace('MPL_Stockroom', 'ST') : 'ST');
      overworkSheet.addRow([
        overworkRowNum,
        plantValue,
        deptValue,
        emp.level || '',
        emp.sap,
        emp.name,
        formatDate(emp.startDate),
        formatDate(emp.endDate),
        emp.consecutiveDays,
        emp.reason
      ]);
    });
    
    // 应用样式
    overworkSheet.eachRow({ includeEmpty: false }, (row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        cell.alignment = {
          vertical: 'middle',
          horizontal: 'center'
        };
      });
    });
    
    // 适配列宽
    overworkSheet.columns.forEach(column => {
      if (column && typeof column.eachCell === 'function') {
        let maxLength = 10;
        column.eachCell({ includeEmpty: true }, cell => {
          const columnLength = cell.value ? cell.value.toString().length : 10;
          if (columnLength > maxLength) {
            maxLength = columnLength;
          }
        });
        column.width = maxLength < 10 ? 10 : maxLength;
      }
    });

    // 3. 周工时上限详细表
    const weeklySheet = workbook.addWorksheet('周工时＞63.75');
    weeklySheet.addRow(['序号', '区域', '部门', '级别', '工号', '姓名', '日期', '周工时', '周数', '超出工时', '原因说明']);
    
    weeklyLimitEmployees.value.forEach((emp, idx) => {
      // 格式化日期
      const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
      };
      // 优先使用处理后的字段，如果没有则使用原始字段
      const plantValue = emp.plant || emp.plantName || '-';
      const deptValue = emp.department || (emp.departmentName ? emp.departmentName.replace('MPL_Stockroom', 'ST') : 'ST');
      weeklySheet.addRow([
        idx + 1,
        plantValue,
        deptValue,
        emp.level || '',
        emp.sap,
        emp.name,
        formatDate(emp.weekDate),
        emp.totalHours,
        weekNum,
        emp.overLimitHours,
        emp.reason
      ]);
    });
    
    // 应用样式
    weeklySheet.eachRow({ includeEmpty: false }, (row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        cell.alignment = {
          vertical: 'middle',
          horizontal: 'center'
        };
      });
    });
    
    // 适配列宽
    weeklySheet.columns.forEach(column => {
      if (column && typeof column.eachCell === 'function') {
        let maxLength = 10;
        column.eachCell({ includeEmpty: true }, cell => {
          const columnLength = cell.value ? cell.value.toString().length : 10;
          if (columnLength > maxLength) {
            maxLength = columnLength;
          }
        });
        column.width = maxLength < 10 ? 10 : maxLength;
      }
    });

    // 4. 公差补卡申请表
    const errandSheet = workbook.addWorksheet('公差');
    errandSheet.addRow(['区域', '部门', '工号', '姓名', '开始时间', '结束时间', '假期类型', '备注', 'OT', '证据']);

    // 收集所有图片加载的Promise
    const imagePromises: Promise<{ item: ErrandFixItem, imageData: { base64: string, extension: string } | null, rowIndex: number } | null>[] = [];
    const imageMeta: { imageId: number, rowIndex: number, colIndex: number }[] = []; // Store image ID and cell position

    // 格式化日期函数，放在循环外面，避免重复定义
    const formatDate = (dateStr: string) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
    };

    for (let i = 0; i < errandFixList.value.length; i++) {
      const item = errandFixList.value[i];
      if (!item) continue; // 添加空值检查
      
      const row = errandSheet.addRow([
        item.plant || '',
        item.department?.replace('MPL_Stockroom', 'ST'),
        item.sap,
        item.employeeName,
        formatDate(item.startTime),
        formatDate(item.endTime),
        item.leaveType,
        item.reason,
        item.ot,
        '' // 证据列先留空，后面添加图片
      ]);

      // 存储当前行，以便后续定位图片
      const currentRowIndex = row.number;
      
      if (item.evidence) {
        imagePromises.push(
          fetchImageAsBase64(item.evidence).then(imageData => ({
            item: item as ErrandFixItem,
            imageData,
            rowIndex: currentRowIndex
          }))
        );
      }
    }

    // 等待所有图片加载完成
    const fetchedImages = await Promise.all(imagePromises);

    // 遍历已加载的图片，并添加到工作簿
    fetchedImages.forEach(result => {
      if (result && result.imageData) {
        const { item, imageData, rowIndex } = result;
        try {
          const imageId = workbook.addImage({
            base64: imageData.base64,
            extension: imageData.extension as 'png' | 'jpeg', // Ensure type compatibility
          });
          imageMeta.push({ imageId, rowIndex, colIndex: 10 }); // 10th column for evidence
        } catch (e) {
          console.error(`Failed to add image to workbook for item ${item.id}:`, e);
        }
      }
    });

    // 嵌入图片到对应的单元格并调整行高
    imageMeta.forEach(({ imageId, rowIndex, colIndex }) => {
      const targetRow = errandSheet.getRow(rowIndex);
      if (targetRow) {
        targetRow.height = 100; // 设置行高以便显示图片
        errandSheet.addImage(imageId, {
          tl: { col: colIndex - 1, row: rowIndex - 1 }, // tl: top-left, col/row are 0-indexed
          ext: { width: 90, height: 90 }, // 图片显示尺寸
          editAs: 'oneCell'
        });
      }
    });

    // 适配列宽
    errandSheet.columns.forEach(column => {
      if (column && typeof column.eachCell === 'function') {
        let maxLength = 10;
        column.eachCell({ includeEmpty: true }, cell => {
          const columnLength = cell.value ? cell.value.toString().length : 10;
          if (columnLength > maxLength) {
            maxLength = columnLength;
          }
        });
        column.width = maxLength < 10 ? 10 : maxLength;
      }
    });
    // 特别设置证据列的宽度
    errandSheet.getColumn(10).width = 15; // 适当增加证据列宽度

    // 应用样式
    errandSheet.eachRow({ includeEmpty: false }, (row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        cell.alignment = {
          vertical: 'middle',
          horizontal: 'center'
        };
      });
    });

    // 5. 补卡表
    const fixCardSheet = workbook.addWorksheet('补卡');
    fixCardSheet.addRow(['区域', '部门', '工号', '姓名', '签卡类型', '签卡原因', '签卡时间 进', '签卡时间 出', '备注', '证据']);
    
    // 应用样式
    fixCardSheet.eachRow({ includeEmpty: false }, (row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        cell.alignment = {
          vertical: 'middle',
          horizontal: 'center'
        };
      });
    });
    
    // 适配列宽
    fixCardSheet.columns.forEach(column => {
      if (column && typeof column.eachCell === 'function') {
        let maxLength = 10;
        column.eachCell({ includeEmpty: true }, cell => {
          const columnLength = cell.value ? cell.value.toString().length : 10;
          if (columnLength > maxLength) {
            maxLength = columnLength;
          }
        });
        column.width = maxLength < 10 ? 10 : maxLength;
      }
    });

    // 生成Excel
    const excelBuffer = await workbook.xlsx.writeBuffer();
    const excelBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const fileName = `破7休1和周工时上限、公差补卡申请-${weekNum}(HY).xlsx`;
    
    // 下载Excel
    const url = URL.createObjectURL(excelBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);

    // 保存上报记录
    // 保存破7休1记录（跳过忽略的项）
    overworkingEmployees.value.forEach(emp => {
      if (emp.isIgnored) {
        return; // 跳过被忽略的项
      }
      saveReportedRecord({
        employeeId: emp.id,
        type: 'overwork',
        startDate: emp.startDate,
        endDate: emp.endDate,
        weekNumber: weekNum,
        reportedAt: formatShanghaiDateTime()
      });
    });
    // 保存周工时超限记录
    weeklyLimitEmployees.value.forEach(emp => {
      saveReportedRecord({
        employeeId: emp.id,
        type: 'overlimit',
        startDate: emp.weekDate,
        endDate: emp.weekEndDate,
        weekNumber: weekNum,
        reportedAt: formatShanghaiDateTime()
      });
    });
    console.log('✅ 上报记录已保存');
    
    // 构建纯文本邮件正文
    const body = `HI XIAOBAO:\n\n附件是${weekNum}破7休1和周工时上限、公差补卡申请，请帮忙查阅和审批，谢谢。`.trim();
    
    // 构建 mailto 链接
    const mailtoUrl = `mailto:${encodeURIComponent(to)}?cc=${encodeURIComponent(cc)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    // 尝试打开 Outlook
    if (window.open(mailtoUrl, '_blank')) {
      alert('📧 Excel已下载！\n\n邮件已在 Outlook 中打开，请手动添加刚才下载的Excel文件作为附件，然后发送。');
    } else {
      alert('📧 Excel已下载！\n\n请手动打开 Outlook，填写邮件并添加Excel文件作为附件。');
    }
    
  } catch (error) {
    console.error('❌ 打开邮件失败:', error);
    alert('打开邮件失败，请手动操作。');
  }
};

// 导出加班Excel
const exportOvertimeToExcel = async () => {
  try {
    console.log('📥 导出加班Excel...');
    const weekNum = getWeekNumber(currentPeriodStart.value);
    
    const workbook = new ExcelJS.Workbook();
    
    // 创建加班表
    const overtimeSheet = workbook.addWorksheet('加班');
    overtimeSheet.addRow(['工号', '姓名', '加班日期', '加班时数']);
    
    overtimeList.value.forEach(item => {
      overtimeSheet.addRow([item.sap, item.name, item.date, item.hours]);
    });
    
    // 应用样式
    overtimeSheet.eachRow({ includeEmpty: false }, (row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        cell.alignment = {
          vertical: 'middle',
          horizontal: 'center'
        };
      });
    });
    
    // 适配列宽
    if (overtimeSheet.columns) {
      overtimeSheet.columns.forEach(column => {
        if (!column) return;
        let maxLength = 10;
        if (column.eachCell) {
          column.eachCell({ includeEmpty: true }, cell => {
            const columnLength = cell.value ? cell.value.toString().length : 10;
            if (columnLength > maxLength) {
              maxLength = columnLength;
            }
          });
        }
        column.width = maxLength < 10 ? 10 : maxLength;
      });
    }

    // 生成Excel
    const excelBuffer = await workbook.xlsx.writeBuffer();
    const excelBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const fileName = `加班记录-${weekNum}.xlsx`;
    
    // 下载Excel
    const url = URL.createObjectURL(excelBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    
    console.log('✅ 加班Excel导出成功');
  } catch (error) {
    console.error('❌ 导出加班Excel失败:', error);
    alert('导出失败，请重试。');
  }
};

// 导出事假Excel
const exportLeaveToExcel = async () => {
  try {
    console.log('📥 导出事假Excel...');
    const weekNum = getWeekNumber(currentPeriodStart.value);
    
    const workbook = new ExcelJS.Workbook();
    
    // 创建事假表
    const leaveSheet = workbook.addWorksheet('事假');
    leaveSheet.addRow(['工号', '姓名', '开始时间', '结束时间', '假期类型', '备注']);

    leaveList.value.forEach(item => {
      leaveSheet.addRow([item.sap, item.name, item.startTime, item.endTime, item.leaveType, item.remark || '']);
    });
    
    // 应用样式
    leaveSheet.eachRow({ includeEmpty: false }, (row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        cell.alignment = {
          vertical: 'middle',
          horizontal: 'center'
        };
      });
    });

    // 适配列宽
    if (leaveSheet.columns) {
      leaveSheet.columns.forEach(column => {
        if (!column) return;
        let maxLength = 10;
        if (column.eachCell) {
          column.eachCell({ includeEmpty: true }, cell => {
            const columnLength = cell.value ? cell.value.toString().length : 10;
            if (columnLength > maxLength) {
              maxLength = columnLength;
            }
          });
        }
        column.width = maxLength < 10 ? 10 : maxLength;
      });
    }

    // 生成Excel
    const excelBuffer = await workbook.xlsx.writeBuffer();
    const excelBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const fileName = `事假记录-${weekNum}.xlsx`;
    
    // 下载Excel
    const url = URL.createObjectURL(excelBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    
    console.log('✅ 事假Excel导出成功');
  } catch (error) {
    console.error('❌ 导出事假Excel失败:', error);
    alert('导出失败，请重试。');
  }
};

// 合并连续多天的年假记录
interface MergedAnnualLeave {
  sap: string;
  name: string;
  departmentName: string;
  joinDate: string;
  startDate: string;
  endDate: string;
  totalHours: number;
  totalDays: number;
  reason: string;
  applicantName: string;
  applyDate: string;
}

const mergeConsecutiveLeave = (list: AnnualLeaveItem[]): MergedAnnualLeave[] => {
  if (!list || list.length === 0) return [];

  // 按工号、姓名、入职日期排序（使用dayjs进行日期比较）
  const sorted = [...list].sort((a, b) => {
    if (a.sap !== b.sap) return a.sap.localeCompare(b.sap);
    if (a.name !== b.name) return a.name.localeCompare(b.name);
    return dayjs(a.startDate).isBefore(dayjs(b.startDate)) ? -1 : 1;
  });

  const merged: MergedAnnualLeave[] = [];
  let current: MergedAnnualLeave | null = null;

  sorted.forEach((item) => {
    const hours = typeof item.hours === 'number' ? item.hours : (item.hours ? parseInt(String(item.hours)) : 8) || 8;
    const days = typeof item.days === 'number' ? item.days : (item.days ? parseInt(String(item.days)) : 1) || 1;

    if (!current) {
      current = {
        sap: item.sap,
        name: item.name,
        departmentName: 'Stockroom',
        joinDate: item.joinDate || '',
        startDate: item.startDate,
        endDate: item.endDate,
        totalHours: hours,
        totalDays: days,
        reason: item.reason || '',
        applicantName: item.applicantName || '',
        applyDate: item.applyDate || ''
      };
    } else if (current.sap === item.sap && current.name === item.name) {
      // 检查是否连续
      const nextStart = dayjs(item.startDate);
      const prevEnd = dayjs(current.endDate);
      const daysDiff = nextStart.diff(prevEnd, 'day');

      if (daysDiff === 1) {
        // 连续，合并
        current.endDate = item.endDate;
        current.totalHours += hours;
        current.totalDays += days;
      } else {
        // 不连续，保存当前并开始新记录
        merged.push(current);
        current = {
          sap: item.sap,
          name: item.name,
          departmentName: 'Stockroom',
          joinDate: item.joinDate || '',
          startDate: item.startDate,
          endDate: item.endDate,
          totalHours: hours,
          totalDays: days,
          reason: item.reason || '',
          applicantName: item.applicantName || '',
          applyDate: item.applyDate || ''
        };
      }
    } else {
      // 不同员工，保存当前并开始新记录
      merged.push(current);
      current = {
        sap: item.sap,
        name: item.name,
        departmentName: 'Stockroom',
        joinDate: item.joinDate || '',
        startDate: item.startDate,
        endDate: item.endDate,
        totalHours: hours,
        totalDays: days,
        reason: item.reason || '',
        applicantName: item.applicantName || '',
        applyDate: item.applyDate || ''
      };
    }
  });

  if (current) {
    merged.push(current);
  }

  return merged;
};

// 导出年假Excel
const exportAnnualLeaveToExcel = async () => {
  try {
    console.log('📥 导出年假Excel...');
    const weekNum = getWeekNumber(currentPeriodStart.value);

    // 使用合并后的年假列表
    const mergedList = mergedAnnualLeaveList.value;

    const workbook = new ExcelJS.Workbook();

    // 创建年假表
    const annualLeaveSheet = workbook.addWorksheet('年假');

    // 不使用columns定义（会生成自动表头），手动添加所有行
    // 设置列宽（12列）
    annualLeaveSheet.columns = [
      { key: 'index', width: 6 },
      { key: 'sap', width: 10 },
      { key: 'name', width: 10 },
      { key: 'departmentName', width: 14 },
      { key: 'joinDate', width: 12 },
      { key: 'leaveType', width: 10 },
      { key: 'startDate', width: 18 },
      { key: 'endDate', width: 18 },
      { key: 'totalHours', width: 8 },
      { key: 'totalDays', width: 8 },
      { key: 'reason', width: 20 },
      { key: 'applicantName', width: 10 },
      { key: 'applyDate', width: 18 },
    ];

    // 添加标题行（年份动态）
    const currentYear = new Date().getFullYear();
    const titleRow = annualLeaveSheet.addRow([`Stockroom ${currentYear} 请假申请表`]);
    titleRow.getCell(1).font = { bold: true, size: 14 };
    titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    titleRow.getCell(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF92D050' }
    };
    // 合并13列（A1到M1）
    annualLeaveSheet.mergeCells(1, 1, 1, 13);
    titleRow.height = 25;

    // 表头样式
    const headerCellStyle = (cell: ExcelJS.Cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF92D050' }
      };
      cell.font = {
        bold: true,
        size: 11,
        color: { argb: 'FF000000' }
      };
      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle'
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };
    };

    // 添加表头行（13列，包含请假详细原因）
    const headers = ['序号', '工号', '姓名', '部门', '入职日期', '请假类别', '请假时间起', '请假时间止', '时数H', '天数D', '请假详细原因', '填表人', '填写时间'];
    const headerRow = annualLeaveSheet.addRow(headers);
    headerRow.eachCell((cell) => {
      headerCellStyle(cell);
    });
    headerRow.height = 20;

    // 添加数据行（白底单色，禁止交替行样式）
    mergedList.forEach((item, index) => {
      const row = annualLeaveSheet.addRow([
        index + 1,
        item.sap,
        item.name,
        item.departmentName,
        item.joinDate,
        '年假',
        item.startDate,
        item.endDate,
        item.totalHours,
        item.totalDays,
        item.reason,
        item.applicantName,
        item.applyDate
      ]);
      row.height = 18;
      row.eachCell((cell) => {
        // 强制白底覆盖任何默认样式
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFFFFF' }
        };
        // 细边框
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
        cell.alignment = {
          horizontal: 'center',
          vertical: 'middle'
        };
      });
    });

    // 禁用工作表的交替行样式
    const sheetRows = (annualLeaveSheet as ExcelJS.Worksheet & { _rows?: unknown[] })._rows;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sheetRows?.forEach((row: any) => {
      if (row._cells) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        row._cells.forEach((cell: any) => {
          if (cell._style) {
            cell._style.fillId = undefined;
          }
        });
      }
    });

    // 生成Excel
    const excelBuffer = await workbook.xlsx.writeBuffer();
    const excelBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const fileName = `年假请假申请表-${weekNum}.xlsx`;

    // 下载Excel
    const url = URL.createObjectURL(excelBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);

    console.log('✅ 年假Excel导出成功');
  } catch (error) {
    console.error('❌ 导出年假Excel失败:', error);
    alert('导出失败，请重试。');
  }
};

// 组件卸载时清理事件监听器
onUnmounted(() => {
  eventBus.off('formal-leave-changed', handleFormalLeaveChanged);
});

</script>

<style scoped>
.employee-schedule-container {
  padding: 0 24px 24px 24px;
  background-color: #F9FAFB;
  min-height: 100%;
  padding-top: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 52px;
  z-index: 99;
  background-color: #F9FAFB;
  padding: 8px 0 16px 0;
  margin-bottom: 0;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #6B7280;
}

.breadcrumb-item.active {
  color: #111827;
  font-weight: 500;
}

.breadcrumb-separator {
  color: #D1D5DB;
}

/* 汇总卡片 */
.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}

.summary-card {
  background: linear-gradient(135deg, #FFFFFF 0%, #F3F4F6 100%);
  border: 1px solid #E5E7EB;
  border-radius: 10px;
  padding: 12px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.card-title {
  color: #6B7280;
  font-size: 12px;
  font-weight: 500;
  margin-bottom: 6px;
}

.card-value {
  color: #0066CC;
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 3px;
}

.card-desc {
  color: #9CA3AF;
  font-size: 11px;
}

.controls-section {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 8px;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: #FFFFFF;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.view-mode-selector button,
.filter-controls button,
.action-buttons button {
  background-color: #F9FAFB;
  color: #374151;
  border: 1px solid #D1D5DB;
  padding: 10px 18px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
  font-weight: 500;
}

.view-mode-selector button.active,
.view-mode-selector button:hover,
.filter-controls button:hover,
.action-buttons button:hover {
  background-color: #0066CC;
  color: #FFFFFF;
  border-color: #0066CC;
}

.view-mode-selector .week-only-hint {
  background: linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%);
  color: #FFFFFF;
  border: none;
  padding: 10px 18px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: default;
  opacity: 0.9;
}

.date-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.date-controls input[type="date"] {
  background-color: #FFFFFF;
  color: #111827;
  border: 1px solid #D1D5DB;
  padding: 10px 14px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
}

.date-controls input[type="date"]:focus {
  outline: none;
  border-color: #0066CC;
  box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
}

.date-controls button {
  background-color: #F9FAFB;
  color: #374151;
  border: 1px solid #D1D5DB;
  padding: 10px 18px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
  font-weight: 500;
}

.date-controls button:hover {
  background-color: #0066CC;
  color: #FFFFFF;
  border-color: #0066CC;
}

.schedule-content {
  background-color: #FFFFFF;
  border-radius: 12px;
  padding: 16px 24px 24px 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 24px;
}

/* 顶部汇总区域 - 滚动时固定在顶部 */
.summary-top-section {
  display: flex;
  gap: 16px;
  align-items: stretch;
  margin-bottom: 24px;
  position: sticky;
  top: 0;
  z-index: 100;
  background-color: #F3F4F6;
  padding: 8px 0;
}

/* 按级别汇总工时 - 紧凑卡片形式 */
.level-summary-container {
  background-color: #FFFFFF;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  flex: 1;
}

.summary-title {
  color: #111827;
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 4px 0;
}

.days-stat-card {
  background: linear-gradient(135deg, #F0F9FF 0%, #E0F4FF 100%);
  border: 1px solid #B8E4FF;
  border-radius: 12px;
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 45px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.days-label {
  font-size: 13px;
  color: #4B5563;
  font-weight: 500;
  margin-bottom: 4px;
}

.days-value {
  font-size: 28px;
  font-weight: 700;
  color: #0066CC;
}

.level-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
  margin-top: 0;
}

.level-card {
  background: linear-gradient(135deg, #FFFFFF 0%, #E0F4FF 100%);
  border: 1px solid #B8E4FF;
  border-radius: 8px;
  padding: 8px 16px;
  transition: all 0.15s ease;
}

.level-card:hover {
  background: linear-gradient(135deg, #FFFFFF 0%, #C7EBFF 100%);
  border-color: #8DD6FF;
}

.level-card-main {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.level-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.level-name {
  font-size: 14px;
  font-weight: 700;
  color: #111827;
}

.employee-count {
  font-size: 12px;
  font-weight: 600;
  color: #0066CC;
}

.level-stats {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.stat-inline {
  display: flex;
  align-items: center;
  gap: 4px;
}

.stat-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.stat-dot.schedule {
  background-color: #6B7280;
}

.stat-dot.overtime {
  background-color: #F59E0B;
}

.stat-dot.leave {
  background-color: #EF4444;
}

.stat-dot.total {
  background-color: #0066CC;
}

.stat-text {
  font-size: 12px;
  font-weight: 600;
  color: #374151;
}

.stat-inline.total .stat-text {
  color: #0066CC;
  font-weight: 700;
}

/* 总计行 */
.total-row-card {
  background: linear-gradient(135deg, #0066CC 0%, #0052A3 100%);
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 12px;
}

.total-row-main {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.total-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.total-name {
  font-size: 15px;
  font-weight: 800;
  color: #FFFFFF;
}

.total-count {
  font-size: 13px;
  font-weight: 700;
  color: #FFFFFF;
}

.total-stats {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.total-stats .stat-text {
  color: #FFFFFF;
}

.total-stats .stat-inline.total .stat-text {
  color: #FCD34D;
}

/* 图例 */
.legend {
  display: flex;
  justify-content: flex-end;
  gap: 24px;
  padding: 0;
  margin-top: -10px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.legend-dot.schedule {
  background: linear-gradient(135deg, #6B7280 0%, #4B5563 100%);
}

.legend-dot.overtime {
  background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
}

.legend-dot.leave {
  background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);
}

.legend-dot.total {
  background: linear-gradient(135deg, #0066CC 0%, #0052A3 100%);
}

.legend-text {
  font-size: 12px;
  color: #6B7280;
  font-weight: 500;
}

.schedule-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.schedule-header h3 {
  color: #111827;
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.header-buttons {
  display: flex;
  gap: 8px;
}

.header-buttons button {
  padding: 6px 12px;
  border: 1px solid #D1D5DB;
  border-radius: 6px;
  background-color: #FFFFFF;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.header-buttons button:hover {
  background-color: #F3F4F6;
  border-color: #9CA3AF;
}

.table-container {
  overflow-x: hidden;
  overflow-y: auto;
  max-height: calc(100vh - 320px);
  position: relative;
}

.schedule-table {
  width: 100%;
  border-collapse: collapse;
  position: relative;
}

.schedule-table th,
.schedule-table td {
  border: 1px solid #E5E7EB;
  padding: 2px 3px;
  text-align: center;
  vertical-align: middle;
  font-size: 12px;
}

.schedule-table th {
  background-color: #F9FAFB;
  font-weight: 600;
  color: #374151;
  font-size: 12px;
  position: sticky;
  top: 0;
  z-index: 50;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

/* 员工列固定 */
.schedule-table .sticky-col {
  position: sticky;
  left: 0;
  z-index: 20;
  background-color: #FFFFFF;
  min-width: 120px;
  max-width: 120px;
}

/* 固定行和固定列交叉的单元格 - 需要最高层级 */
.schedule-table th.sticky-col {
  z-index: 60;
  background-color: #F9FAFB;
  top: 0;
  min-width: 120px;
  max-width: 120px;
}

.schedule-table th.today {
  background-color: #EFF6FF;
  border-color: #0066CC;
}

/* 月视图表格紧凑样式 */
.schedule-table.month-table th,
.schedule-table.month-table td {
  padding: 2px 4px;
}

.schedule-table.month-table .day-header {
  font-size: 11px;
}

.schedule-table.month-table .weekday-header {
  font-size: 10px;
}

.schedule-table.month-table .shift-cell {
  font-size: 10px;
  padding: 2px;
}

.schedule-table.month-table .employee-info {
  gap: 4px;
}

.schedule-table.month-table .employee-avatar {
  width: 20px;
  height: 20px;
  font-size: 10px;
}

.schedule-table.month-table .employee-name {
  font-size: 11px;
}

.schedule-table.month-table .employee-position {
  font-size: 9px;
  padding: 0 4px;
}

.schedule-table.month-table .employee-total-hours {
  font-size: 9px;
}

/* 选中单元格样式 */
.schedule-table td.cell-selected {
  background-color: #d1e7dd; /* Light green for selection */
  border: 1px solid #198754; /* Darker green border */
}
.schedule-table td.cell-selected .shift-cell {
  background-color: transparent !important;
}

/* 表头单选高亮样式 */
.schedule-table th.header-single-selected {
  background-color: #0066CC !important; /* Primary blue highlight */
  color: white !important;
  font-weight: 600;
  box-shadow: inset 0 0 0 2px #0052A3;
}

/* 周末表头样式 */
.schedule-table th.weekend-header {
  background-color: #FEF2F2 !important; /* Light red background for weekends */
  color: #991B1B !important; /* Dark red text */
  border-left: 1px solid #FECACA;
  border-right: 1px solid #FECACA;
}

.schedule-table th.weekend-header .day-header {
  color: #991B1B;
}

.schedule-table th.weekend-header .weekday-header {
  color: #DC2626;
}

/* 工作日表头样式 */
.schedule-table th.weekday-header-cell {
  background-color: #F9FAFB;
}

/* 表头悬停效果 */
.schedule-table th:not(.sticky-col):hover {
  background-color: #E5E7EB !important;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.schedule-table th.weekend-header:hover {
  background-color: #FEE2E2 !important;
}

/* 表头内边距优化 */
.schedule-table th:not(.sticky-col) {
  padding: 4px 2px;
  min-width: 24px;
}

.schedule-table th:not(.sticky-col) .day-header {
  margin-bottom: 2px;
}

/* 右键菜单样式 */
.context-menu {
  position: fixed;
  z-index: 9999;
  background: white;
  border: 1px solid #D1D5DB;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  min-width: 180px;
  padding: 4px 0;
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  cursor: pointer;
  font-size: 14px;
  color: #374151;
  transition: all 0.2s;
}

.context-menu-item:hover {
  background: #F3F4F6;
}

.context-menu-item .menu-icon {
  font-size: 16px;
}

.day-header {
  font-weight: 700;
  color: #111827;
  font-size: 14px;
}

.weekday-header {
  font-size: 11px;
  color: #6B7280;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.schedule-table tbody tr:hover {
  background-color: #F9FAFB;
}

.employee-info {
  display: flex;
  align-items: center;
  gap: 6px;
}

.employee-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: linear-gradient(135deg, #0066CC 0%, #0052A3 100%);
  color: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 11px;
  flex-shrink: 0;
}

.employee-details {
  display: flex;
  flex-direction: column;
  text-align: left;
  gap: 2px;
}

.employee-name {
  font-weight: 600;
  color: #111827;
  font-size: 12px;
}

.employee-position {
  font-size: 10px;
  color: #6B7280;
  background-color: #F3F4F6;
  padding: 1px 6px;
  border-radius: 3px;
  width: fit-content;
}

.employee-total-hours {
  font-size: 10px;
  color: #0066CC;
  font-weight: 600;
}

.shift-cell {
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 4px;
  transition: all 0.2s ease;
  font-weight: 500;
  font-size: 11px;
  min-height: 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
}

.shift-cell:hover {
  transform: scale(1.05);
}

/* 分页控件样式 */
.pagination-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  margin-top: 8px;
}

.pagination-info {
  font-size: 14px;
  color: #6B7280;
}

.pagination-buttons {
  display: flex;
  gap: 8px;
  align-items: center;
}

.pagination-buttons button {
  padding: 6px 12px;
  border: 1px solid #D1D5DB;
  border-radius: 6px;
  background-color: #FFFFFF;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.pagination-buttons button:hover:not(:disabled) {
  background-color: #F3F4F6;
  border-color: #9CA3AF;
}

.pagination-buttons button.active {
  background-color: #0066CC;
  border-color: #0066CC;
  color: #FFFFFF;
}

.pagination-buttons button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background-color: #F9FAFB;
}

.shift-empty {
  color: #9CA3AF;
  font-size: 11px;
}

.shift-cell.shift-empty {
  color: #9CA3AF;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 28px;
}

.special-status {
  font-size: 16px;
  margin-top: 2px;
  opacity: 0.9;
  font-weight: 700;
  width: 100%;
  text-align: center;
  line-height: 1.2;
  display: block;
  border: 1px solid;
  border-radius: 4px;
  padding: 12px 4px;
}

/* ========== 班次颜色 - 统一渐变配色方案 ========== */

/* 班次选择弹窗里的颜色 */
.shift-option {
  border-radius: 8px;
  padding: 10px 16px;
  font-weight: 500;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
.shift-option:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
}

.shift-option.shift-a {
  background: linear-gradient(135deg, #6366F1 0%, #818CF8 100%);
  color: white;
  border: none;
}
.shift-option.shift-b {
  background: linear-gradient(135deg, #F97316 0%, #FB923C 100%);
  color: white;
  border: none;
}
.shift-option.shift-c {
  background: linear-gradient(135deg, #14B8A6 0%, #2DD4BF 100%);
  color: white;
  border: none;
}
.shift-option.shift-n {
  background: linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%);
  color: white;
  border: none;
}
.shift-option.shift-a-plus {
  background: linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%);
  color: white;
  border: none;
}
.shift-option.shift-b-plus {
  background: linear-gradient(135deg, #EC4899 0%, #F472B6 100%);
  color: white;
  border: none;
}
.shift-option.shift-c-plus {
  background: linear-gradient(135deg, #0EA5E9 0%, #38BDF8 100%);
  color: white;
  border: none;
}
.shift-option.shift-n-plus {
  background: linear-gradient(135deg, #A855F7 0%, #C084FC 100%);
  color: white;
  border: none;
}
.shift-option.shift-a2 {
  background: linear-gradient(135deg, #4F46E5 0%, #6366F1 100%);
  color: white;
  border: none;
}

/* 其他班次类型 - 渐变色 */
.shift-option.shift-overtime {
  background: linear-gradient(135deg, #10B981 0%, #34D399 100%);
  color: white;
  border: none;
}
.shift-option.shift-leave {
  background: linear-gradient(135deg, #6366F1 0%, #818CF8 100%);
  color: white;
  border: none;
}
.shift-option.shift-annual {
  background: linear-gradient(135deg, #0EA5E9 0%, #38BDF8 100%);
  color: white;
  border: none;
}
.shift-option.shift-resign {
  background: linear-gradient(135deg, #6B7280 0%, #9CA3AF 100%);
  color: white;
  border: none;
}
.shift-option.shift-absent {
  background: linear-gradient(135deg, #EF4444 0%, #F87171 100%);
  color: white;
  border: none;
}

/* 排班表格里的颜色 - 渐变 */
.shift-cell {
  border-radius: 6px;
  font-weight: 500;
  text-align: center;
  padding: 4px 2px;
}
.shift-cell.shift-a {
  background: linear-gradient(135deg, #6366F1 0%, #818CF8 100%) !important;
  color: white !important;
  border: none !important;
}
.shift-cell.shift-b {
  background: linear-gradient(135deg, #F97316 0%, #FB923C 100%) !important;
  color: white !important;
  border: none !important;
}
.shift-cell.shift-c {
  background: linear-gradient(135deg, #14B8A6 0%, #2DD4BF 100%) !important;
  color: white !important;
  border: none !important;
}
.shift-cell.shift-n {
  background: linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%) !important;
  color: white !important;
  border: none !important;
}
.shift-cell.shift-a-plus {
  background: linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%) !important;
  color: white !important;
  border: none !important;
}
.shift-cell.shift-b-plus {
  background: linear-gradient(135deg, #EC4899 0%, #F472B6 100%) !important;
  color: white !important;
  border: none !important;
}
.shift-cell.shift-c-plus {
  background: linear-gradient(135deg, #0EA5E9 0%, #38BDF8 100%) !important;
  color: white !important;
  border: none !important;
}
.shift-cell.shift-n-plus {
  background: linear-gradient(135deg, #A855F7 0%, #C084FC 100%) !important;
  color: white !important;
  border: none !important;
}
.shift-cell.shift-a2 {
  background: linear-gradient(135deg, #4F46E5 0%, #6366F1 100%) !important;
  color: white !important;
  border: none !important;
}

/* 其他班次类型 - 渐变色 */
.shift-cell.shift-overtime {
  background: linear-gradient(135deg, #10B981 0%, #34D399 100%) !important;
  color: white !important;
  border: none !important;
}
.shift-cell.shift-leave {
  background: linear-gradient(135deg, #6366F1 0%, #818CF8 100%) !important;
  color: white !important;
  border: none !important;
}
.shift-cell.shift-annual {
  background: linear-gradient(135deg, #0EA5E9 0%, #38BDF8 100%) !important;
  color: white !important;
  border: none !important;
}
.shift-cell.shift-resign {
  background: linear-gradient(135deg, #6B7280 0%, #9CA3AF 100%) !important;
  color: white !important;
  border: none !important;
}
.shift-cell.shift-absent {
  background: linear-gradient(135deg, #EF4444 0%, #F87171 100%) !important;
  color: white !important;
  border: none !important;
}


/* 子页面Tab */
.sub-tabs {
  display: flex;
  background: #FFFFFF;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  margin-bottom: 24px;
}

.tab-item {
  flex: 1;
  padding: 10px 12px;
  text-align: center;
  font-weight: 500;
  color: #6B7280;
  cursor: pointer;
  transition: all 0.2s ease;
  border-bottom: 3px solid transparent;
  font-size: 14px;
}

/* 排班总览 - 蓝色 */
.tab-overview {
  border-bottom: 3px solid #3B82F6;
}

.tab-overview:hover {
  background-color: #EFF6FF;
  color: #3B82F6;
}

.tab-overview.active {
  color: #FFFFFF;
  background-color: #3B82F6;
  border-bottom-color: #1D4ED8;
}

/* 破7休1和周工时上限 - 绿色 */
.tab-break7 {
  border-bottom: 3px solid #10B981;
}

.tab-break7:hover {
  background-color: #ECFDF5;
  color: #10B981;
}

.tab-break7.active {
  color: #FFFFFF;
  background-color: #10B981;
  border-bottom-color: #047857;
}

/* 公差补卡申请 - 橙色 */
.tab-applications {
  border-bottom: 3px solid #F59E0B;
}

.tab-applications:hover {
  background-color: #FFFBEB;
  color: #F59E0B;
}

.tab-applications.active {
  color: #FFFFFF;
  background-color: #F59E0B;
  border-bottom-color: #D97706;
}

/* 考勤汇总特殊工时 - 紫色 */
.tab-attendance {
  border-bottom: 3px solid #8B5CF6;
}

.tab-attendance:hover {
  background-color: #F5F3FF;
  color: #8B5CF6;
}

.tab-attendance.active {
  color: #FFFFFF;
  background-color: #8B5CF6;
  border-bottom-color: #6D28D9;
}

/* 考勤汇总内部子标签 */
.sub-tabs-sub {
  display: flex;
  gap: 4px;
  background-color: #F3F4F6;
  border-radius: 8px;
  padding: 4px;
  margin-bottom: 20px;
}

.tab-item-sub {
  flex: 1;
  padding: 10px 16px;
  text-align: center;
  font-size: 14px;
  font-weight: 500;
  color: #6B7280;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s;
}

.tab-item-sub:hover {
  background-color: #E5E7EB;
  color: #374151;
}

.tab-item-sub.active {
  background-color: #FFFFFF;
  color: #111827;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* 考勤汇总区域 */
.attendance-section {
  background-color: #FFFFFF;
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.section-actions {
  display: flex;
  gap: 12px;
}

/* 特殊工时 - 青色 */
.tab-special {
  border-bottom: 3px solid #06B6D4;
}

.tab-special:hover {
  background-color: #ECFEFF;
  color: #06B6D4;
}

.tab-special.active {
  color: #FFFFFF;
  background-color: #06B6D4;
  border-bottom-color: #0E7490;
}

@media (max-width: 768px) {
  .tab-item {
    padding: 12px 8px;
    font-size: 12px;
  }
}

/* Dialog Styles */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.dialog-content {
  background-color: #FFFFFF;
  color: #111827;
  padding: 0;
  border-radius: 12px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  width: 520px;
  max-width: 95%;
  max-height: 85vh;
  overflow-y: auto;
  border: 1px solid #E5E7EB;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #E5E7EB;
  background: linear-gradient(135deg, #FFFFFF 0%, #F9FAFB 100%);
}

.dialog-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.employee-header {
  display: flex;
  align-items: center;
  gap: 16px;
}

.employee-avatar-large {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #409EFF 0%, #337ecc 100%);
  color: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 22px;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.35);
}

.employee-info-large {
  display: flex;
  flex-direction: column;
}

.employee-name-large {
  font-weight: 700;
  color: #111827;
  font-size: 20px;
  letter-spacing: 0.5px;
}

.employee-meta {
  font-size: 13px;
  color: #6B7280;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}

.meta-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #6B7280;
}

.meta-item i {
  font-size: 12px;
  color: #9CA3AF;
}

.meta-separator {
  color: #D1D5DB;
  font-weight: 300;
}

.dialog-close {
  background: none;
  border: none;
  font-size: 24px;
  color: #9CA3AF;
  cursor: pointer;
  padding: 0;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.dialog-close:hover {
  background-color: #FEE2E2;
  color: #DC2626;
}

.dialog-body {
  padding: 12px 16px;
}

.edit-info {
  display: flex;
  margin-bottom: 12px;
  padding: 10px 12px;
  background-color: #F9FAFB;
  border-radius: 8px;
}

.edit-label {
  color: #6B7280;
  font-size: 14px;
  min-width: 60px;
}

.edit-value {
  color: #111827;
  font-weight: 600;
  font-size: 14px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #374151;
  font-weight: 600;
  font-size: 14px;
  padding-left: 8px;
  border-left: 3px solid #409EFF;
}

.shift-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.shift-option {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  padding: 8px 14px;
  border-radius: 20px;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 13px;
  font-weight: 600;
  color: white;
  opacity: 0.8;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.shift-option:hover {
  opacity: 1;
  transform: translateY(-3px) scale(1.02);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}

.shift-option input[type="radio"] {
  accent-color: white;
  width: 16px;
  height: 16px;
}

.special-status-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.special-status-options label {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 20px;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 12px;
  font-weight: 500;
  margin-bottom: 0;
  background-color: #FFFFFF;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.special-status-options label:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.special-status-options label input[type="checkbox"] {
  width: 14px;
  height: 14px;
}

.temporary-matter {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.matter-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.matter-row select,
.matter-row input[type="time"],
.matter-row input[type="text"] {
  flex: 1;
  min-width: 120px;
  padding: 10px 14px;
  border: 1px solid #D1D5DB;
  border-radius: 8px;
  font-size: 14px;
  background-color: #FFFFFF;
}

.matter-row select:focus,
.matter-row input:focus {
  outline: none;
  border-color: #409EFF;
  box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.15);
}

.dialog-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px 16px;
  border-top: 1px solid #E5E7EB;
}

.action-group {
  display: flex;
  gap: 10px;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.btn-primary {
  background: linear-gradient(135deg, #409EFF 0%, #337ecc 100%);
  color: #FFFFFF;
  box-shadow: 0 4px 14px rgba(64, 158, 255, 0.35);
}

.btn-primary:hover {
  background: linear-gradient(135deg, #337ecc 0%, #2B6CB0 100%);
  box-shadow: 0 6px 20px rgba(64, 158, 255, 0.45);
  transform: translateY(-1px);
}

.btn-secondary {
  background-color: #FFFFFF;
  color: #374151;
  border: 1px solid #E5E7EB;
}

.btn-secondary:hover {
  background-color: #F9FAFB;
  border-color: #D1D5DB;
  transform: translateY(-1px);
}

.btn-danger {
  background: linear-gradient(135deg, #F56565 0%, #E53E3E 100%);
  color: #FFFFFF;
  box-shadow: 0 4px 14px rgba(245, 101, 101, 0.35);
}

.btn-danger:hover {
  background: linear-gradient(135deg, #E53E3E 0%, #C53030 100%);
  box-shadow: 0 6px 20px rgba(245, 101, 101, 0.45);
  transform: translateY(-1px);
}

/* Placeholders */
.month-placeholder,
.range-placeholder {
  padding: 60px 20px;
  text-align: center;
  color: #9CA3AF;
  font-size: 16px;
}

/* 月视图和自定义范围视图优化 */
.month-table th,
.month-table td,
.range-table th,
.range-table td {
  padding: 6px;
}

.month-table .day-header,
.range-table .day-header {
  font-size: 12px;
}

.month-table .weekday-header,
.range-table .weekday-header {
  font-size: 10px;
}

.month-table .shift-cell,
.range-table .shift-cell {
  padding: 4px;
  font-size: 11px;
  min-height: 30px;
}

/* 子页签内容样式 */
.sub-tab-content {
  padding: 20px;
}

.placeholder-content {
  text-align: center;
  padding: 60px 20px;
  color: #6B7280;
}

.placeholder-content h3 {
  margin-bottom: 16px;
  color: #111827;
}

/* 分页控件样式 */
.pagination-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  margin-top: 16px;
  border-top: 1px solid #E5E7EB;
  flex-wrap: wrap;
  gap: 16px;
}

.pagination-info {
  font-size: 13px;
  color: #6B7280;
}

.pagination-controls {
  display: flex;
  gap: 4px;
  align-items: center;
}

.pagination-btn {
  padding: 6px 12px;
  border: 1px solid #D1D5DB;
  background-color: #FFFFFF;
  color: #374151;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.pagination-btn:hover:not(:disabled) {
  background-color: #F3F4F6;
  border-color: #9CA3AF;
}

.pagination-btn.active {
  background-color: #0066CC;
  color: #FFFFFF;
  border-color: #0066CC;
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-size-selector {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #6B7280;
}

.page-size-selector select {
  padding: 6px 10px;
  border: 1px solid #D1D5DB;
  border-radius: 6px;
  font-size: 13px;
  background-color: #FFFFFF;
  cursor: pointer;
}

.page-size-selector select:focus {
  outline: none;
  border-color: #0066CC;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 12px 16px;
  border-top: 1px solid #E5E7EB;
  background-color: #F9FAFB;
}

.position-options {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
  max-height: 300px;
  overflow-y: auto;
}

.position-option {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border: 1px solid #E5E7EB;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 13px;
}

.position-option:hover {
  background-color: #F9FAFB;
  border-color: #D1D5DB;
}

.position-option input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

/* ========== 破7休1和周工时上限、公差补卡申请页面样式 ========== */
.break7-container {
  background: linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%);
  min-height: 100vh;
}

.break7-header-compact {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #1E40AF 0%, #3B82F6 50%, #60A5FA 100%);
  border-radius: 12px;
  box-shadow: 0 12px 28px -10px rgba(59, 130, 246, 0.35);
}

.header-title-compact {
  display: flex;
  align-items: center;
  gap: 10px;
}

.title-icon-compact {
  font-size: 28px;
  filter: drop-shadow(0 2px 6px rgba(255,255,255,0.3));
}

.break7-header-compact h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #FFFFFF;
  letter-spacing: 0.3px;
  text-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.break7-actions-compact {
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
}

.email-config-compact {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(10px);
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.25);
}

.input-group-compact {
  display: flex;
  align-items: center;
  gap: 6px;
}

.email-config-compact label {
  font-size: 12px;
  color: #FFFFFF;
  font-weight: 600;
  white-space: nowrap;
  text-shadow: 0 1px 2px rgba(0,0,0,0.1);
}

.email-config-compact input {
  padding: 6px 10px;
  border: 1.5px solid rgba(255, 255, 255, 0.35);
  border-radius: 6px;
  font-size: 12px;
  min-width: 180px;
  background: rgba(255, 255, 255, 0.95);
  color: #1E293B;
  font-weight: 500;
  transition: all 0.3s ease;
}

.email-config-compact input::placeholder {
  color: #94A3B8;
  font-size: 11px;
}

.email-config-compact input:focus {
  outline: none;
  border-color: #FFFFFF;
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.25);
  background: #FFFFFF;
  transform: translateY(-0.5px);
}

.action-buttons-compact {
  display: flex;
  gap: 8px;
}

.btn-export-compact,
.btn-send-compact {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.12);
  letter-spacing: 0.2px;
}

.btn-export-compact {
  background: linear-gradient(135deg, #059669 0%, #10B981 100%);
  color: #FFFFFF;
}

.btn-export-compact:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 18px rgba(16, 185, 129, 0.4);
}

.btn-send-compact {
  background: linear-gradient(135deg, #7C3AED 0%, #A855F7 100%);
  color: #FFFFFF;
}

.btn-send-compact:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 18px rgba(168, 85, 247, 0.4);
}

.btn-icon-compact {
  font-size: 14px;
}

/* 表格容器 - 紧凑版本 */
.table-container {
  background: #FFFFFF;
  border-radius: 10px;
  overflow-x: auto;
  overflow-y: auto;
  max-height: calc(100vh - 320px);
  border: 1px solid #E2E8F0;
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.05);
  margin-bottom: 12px;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  background: linear-gradient(135deg, #F1F5F9 0%, #E2E8F0 100%);
  border-bottom: 2px solid #CBD5E1;
}

.table-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 700;
  color: #1E293B;
}

.table-icon {
  font-size: 20px;
}

.count-badge {
  padding: 4px 12px;
  background: linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%);
  color: #FFFFFF;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 700;
  box-shadow: 0 1px 5px rgba(59, 130, 246, 0.25);
}

.table-stats {
  display: flex;
  gap: 12px;
}

.stat-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: #FFFFFF;
  border-radius: 8px;
  border: 1.5px solid #E2E8F0;
  box-shadow: 0 1px 4px rgba(0,0,0,0.03);
}

.stat-label {
  font-size: 12px;
  color: #64748B;
  font-weight: 600;
}

.stat-value {
  font-size: 16px;
  font-weight: 800;
  color: #1E293B;
}

.stat-value.warning {
  color: #F59E0B;
}

.stat-value.danger {
  color: #DC2626;
}

/* 数据表格 - 紧凑版本 */
.data-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.data-table th,
.data-table td {
  padding: 2px 4px;
  font-size: 11px;
  text-align: left;
  border-bottom: 1px solid #F1F5F9;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.data-table th {
  background: linear-gradient(135deg, #1E293B 0%, #334155 100%);
  font-weight: 700;
  font-size: 11px;
  color: #FFFFFF;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  position: sticky;
  top: 0;
  z-index: 10;
}

.data-table td {
  font-size: 12px;
  color: #334155;
  background: #FFFFFF;
  font-weight: 500;
}

.data-table tbody tr {
  transition: all 0.25s ease;
}

.data-table tbody tr:hover {
  background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%);
  transform: scale(1.002);
}

.data-table.with-border {
  border: 1.5px solid #CBD5E1;
}

.data-table.with-border th,
.data-table.with-border td {
  border: 1px solid #CBD5E1;
}

.data-table.with-border th {
  background: linear-gradient(135deg, #1E293B 0%, #334155 100%);
}

.data-table.enhanced th {
  background: linear-gradient(135deg, #1D4ED8 0%, #3B82F6 100%);
}

/* 紧凑表格 */
.compact-table th,
.compact-table td {
  padding: 2px 2px;
  font-size: 10px;
}

.compact-table th {
  text-align: center;
}

.compact-table td {
  text-align: center;
}

/* 内联输入框 - 紧凑版本 */
.inline-input {
  width: 100%;
  padding: 5px 5px;
  border: 1.5px solid #E2E8F0;
  border-radius: 5px;
  font-size: 12px;
  font-weight: 500;
  background: #F8FAFC;
  transition: all 0.3s ease;
  color: #1E293B;
}

.inline-input:focus {
  outline: none;
  border-color: #3B82F6;
  background: #FFFFFF;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
}

.inline-input::placeholder {
  color: #94A3B8;
  font-weight: 400;
  font-size: 11px;
}

/* 文字颜色 */
.text-warning {
  color: #F59E0B;
  font-weight: 700;
}

.text-danger {
  color: #DC2626;
  font-weight: 700;
}

/* 响应式 - 紧凑版本 */
@media (max-width: 768px) {
  .break7-header-compact {
    flex-direction: column;
    gap: 14px;
    padding: 12px;
  }
  
  .break7-header-compact h2 {
    font-size: 16px;
  }
  
  .email-config-compact {
    width: 100%;
    padding: 10px;
  }
  
  .email-config-compact input {
    min-width: auto;
    flex: 1;
  }
  
  .break7-actions-compact {
    width: 100%;
    flex-direction: column;
  }
  
  .action-buttons-compact {
    width: 100%;
  }
  
  .btn-export-compact,
  .btn-send-compact {
    width: 100%;
    justify-content: center;
  }
  
  .table-header {
    flex-direction: column;
    gap: 10px;
    padding: 8px 12px;
  }
  
  .table-stats {
    width: 100%;
    justify-content: space-between;
  }
  
  .data-table th,
  .data-table td {
    padding: 6px 8px;
    font-size: 11px;
  }
}

/* 被忽略的行样式 */
.ignored-row {
  background-color: #f3f4f6; /* 灰色背景 */
  opacity: 0.6; /* 半透明 */
  text-decoration: line-through; /* 删除线 */
}

.ignored-row:hover {
  background-color: #e5e7eb; /* 稍深的灰色，悬停时 */
}

/* 小按钮样式 */
.btn-sm {
  padding: 1px 4px;
  font-size: 9px;
  border-radius: 2px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  white-space: nowrap;
  line-height: 1.2;
  font-weight: 500;
}

.btn-sm:hover {
  transform: translateY(-1px);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}

.btn-danger {
  background-color: #ef4444; /* 红色，忽略按钮 */
  color: white;
}

.btn-danger:hover {
  background-color: #dc2626;
}

.btn-success {
  background-color: #10b981; /* 绿色，取消忽略按钮 */
  color: white;
}

.btn-success:hover {
  background-color: #059669;
}
</style>
