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
      <div class="view-mode-selector">
        <button :class="{ active: scheduleViewMode === 'week' }" @click="switchViewMode('week')">周视图</button>
        <button :class="{ active: scheduleViewMode === 'month' }" @click="switchViewMode('month')">月视图</button>
        <button :class="{ active: scheduleViewMode === 'range' }" @click="switchViewMode('range')">自定义范围</button>
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
      <div :class="{ 'tab-item': true, 'tab-overview': true, 'active': subTab.id === 'overview' }" @click="subTab = subTabsOptions.find(t => t.id === 'overview')!">排班总览</div>
      <div :class="{ 'tab-item': true, 'tab-break7': true, 'active': subTab.id === 'break7' }" @click="subTab = subTabsOptions.find(t => t.id === 'break7')!">破7休1和周工时上限、公差补卡申请</div>
      <div :class="{ 'tab-item': true, 'tab-attendance': true, 'active': subTab.id === 'attendance' }" @click="subTab = subTabsOptions.find(t => t.id === 'attendance')!">考勤汇总</div>
      <div :class="{ 'tab-item': true, 'tab-special': true, 'active': subTab.id === 'special' }" @click="subTab = subTabsOptions.find(t => t.id === 'special')!">特殊工时</div>
    </div>

    <!-- 右键菜单 -->
    <div v-if="isContextMenuOpen" class="context-menu" :style="{ left: contextMenuPosition.x + 'px', top: contextMenuPosition.y + 'px' }" @click="isContextMenuOpen = false">
      <div class="context-menu-item" @click.stop="openBatchShiftEdit">
        <span class="menu-icon">✏️</span>
        <span>批量修改排班</span>
      </div>
      <div class="context-menu-item" @click.stop="handleClearSchedule(filteredEmployees, closeContextMenu, fetchEmployees)">
        <span class="menu-icon">🗑️</span>
        <span>清空排班</span>
      </div>
      <div class="context-menu-item" @click.stop="copySelection(filteredEmployees)">
        <span class="menu-icon">📋</span>
        <span>复制 (Ctrl+C)</span>
      </div>
      <div class="context-menu-item" @click.stop="pasteSelection(filteredEmployees, fetchEmployees)">
        <span class="menu-icon">📄</span>
        <span>粘贴 (Ctrl+V)</span>
      </div>
      <div class="context-menu-item" @click.stop="handleClearSelection(); closeContextMenu()">
        <span class="menu-icon">❌</span>
        <span>清空选择 (ESC)</span>
      </div>
    </div>

    <!-- 排班总览内容 -->
    <template v-if="subTab.id === 'overview'">
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
          <div v-for="(data, level) in levelHoursSummary" :key="level" class="level-card">
            <div class="level-card-main">
              <div class="level-info">
                <div class="level-name">{{ level }}</div>
                <div class="employee-count">{{ data.employeeCount }}人</div>
              </div>
              <div class="level-stats">
                <div class="stat-inline">
                  <span class="stat-dot schedule"></span>
                  <span class="stat-text">{{ data.totalScheduleHours !== undefined ? data.totalScheduleHours.toFixed(1) : '0.0' }}H</span>
                </div>
                <div class="stat-inline">
                  <span class="stat-dot overtime"></span>
                  <span class="stat-text">{{ data.totalOvertimeHours !== undefined ? data.totalOvertimeHours.toFixed(1) : '0.0' }}H</span>
                </div>
                <div class="stat-inline">
                  <span class="stat-dot leave"></span>
                  <span class="stat-text">{{ data.totalLeaveHours !== undefined ? data.totalLeaveHours.toFixed(1) : '0.0' }}H</span>
                </div>
                <div class="stat-inline total">
                  <span class="stat-dot total"></span>                  <span class="stat-text">{{ data.totalHours !== undefined ? data.totalHours.toFixed(1) : '0.0' }}H</span>
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
                  <th v-for="day in weekDays" :key="day.date" :class="{ 'today': day.isToday, 'header-single-selected': day.date === selectedDateForButtons }" @click="handleDateHeaderClick(day.date)">
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
                        <span class="employee-total-hours">总工时: {{ getEmployeeHours(employee, weekDays, calculateEmployeeOvertimeHours, calculateEmployeeLeaveHours)?.totalHours !== undefined ? getEmployeeHours(employee, weekDays, calculateEmployeeOvertimeHours, calculateEmployeeLeaveHours).totalHours.toFixed(1) : '0.0' }}H</span>
                      </div>
                    </div>
                  </td>
                  <td v-for="day in weekDays" 
                      :key="day.date" 
                      @mousedown="(e) => startSelection(employee.id, day.date, e)"
                      @mouseover="isSelecting && updateSelection(employee.id, day.date, paginatedEmployees, weekDays)"
                      @contextmenu.prevent="(e) => handleRightClick(e, employee.id, day.date)"
                      @dblclick="() => openShiftEditDialog(employee, day.date)"
                      @click="handleSingleDateSelect(day.date)"
                      :class="{ 'cell-selected': isCellSelected(employee.id, day.date), 'cell-single-selected': day.date === selectedDateForButtons }">
                    <div :class="['shift-cell', getShiftClass(employee.schedule[day.date]?.shift || '')]" v-if="employee.schedule[day.date]">
                      <template v-if="employee.schedule[day.date]?.specialStatus">
                        <div 
                          class="special-status"
                          :data-status="employee.schedule[day.date]?.specialStatus"
                        >
                          {{ employee.schedule[day.date]?.specialStatus }}
                        </div>
                      </template>
                      <template v-else>
                        {{ employee.schedule[day.date]?.shift }}
                      </template>
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
                  <th v-for="day in monthDays" :key="day.date" :class="{ 'today': day.isToday, 'header-single-selected': day.date === selectedDateForButtons }" @click="handleDateHeaderClick(day.date)">
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
                        <span class="employee-total-hours">总工时: {{ getEmployeeHours(employee, monthDays, calculateEmployeeOvertimeHours, calculateEmployeeLeaveHours)?.totalHours !== undefined ? getEmployeeHours(employee, monthDays, calculateEmployeeOvertimeHours, calculateEmployeeLeaveHours).totalHours.toFixed(1) : '0.0' }}H</span>
                      </div>
                    </div>
                  </td>
                  <td v-for="day in monthDays" 
                      :key="day.date" 
                      @mousedown="(e) => startSelection(employee.id, day.date, e)"
                      @mouseover="isSelecting && updateSelection(employee.id, day.date, paginatedEmployees, monthDays)"
                      @contextmenu.prevent="(e) => handleRightClick(e, employee.id, day.date)"
                      @dblclick="() => openShiftEditDialog(employee, day.date)"
                      @click="handleSingleDateSelect(day.date)"
                      :class="{ 'cell-selected': isCellSelected(employee.id, day.date),
                                'other-month': !day.isCurrentMonth,
                                'today': day.isToday,
                                'cell-single-selected': day.date === selectedDateForButtons }">
                    <div :class="['shift-cell', getShiftClass(employee.schedule[day.date]?.shift || '')]" v-if="employee.schedule[day.date]">
                      <template v-if="employee.schedule[day.date]?.specialStatus">
                        <div 
                          class="special-status"
                          :data-status="employee.schedule[day.date]?.specialStatus"
                        >
                          {{ employee.schedule[day.date]?.specialStatus }}
                        </div>
                      </template>
                      <template v-else>
                        {{ employee.schedule[day.date]?.shift }}
                      </template>
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
              <button @click="printData(
                scheduleViewMode,
                currentPeriodStart,
                customRangeEnd,
                weekDays,
                monthDays,
                customRangeDays,
                formattedWeekRange,
                formattedMonthRange,
                formattedCustomRange,
                filteredEmployees
              )">🖨️ 排班打印</button>
            </div>
          </div>
          <div class="table-container">
            <table class="schedule-table range-table">
              <thead>
                <tr>
                  <th class="sticky-col">员工 / 日期</th>
                  <th v-for="day in customRangeDays" :key="day.date" :class="{ 'today': day.isToday, 'header-single-selected': day.date === selectedDateForButtons }" @click="handleDateHeaderClick(day.date)">
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
                        <span class="employee-total-hours">总工时: {{ getEmployeeHours(employee, customRangeDays, calculateEmployeeOvertimeHours, calculateEmployeeLeaveHours)?.totalHours !== undefined ? getEmployeeHours(employee, customRangeDays, calculateEmployeeOvertimeHours, calculateEmployeeLeaveHours).totalHours.toFixed(1) : '0.0' }}H</span>
                      </div>
                    </div>
                  </td>
                  <td v-for="day in customRangeDays" 
                      :key="day.date" 
                      @mousedown="(e) => startSelection(employee.id, day.date, e)"
                      @mouseover="isSelecting && updateSelection(employee.id, day.date, paginatedEmployees, customRangeDays)"
                      @contextmenu.prevent="(e) => handleRightClick(e, employee.id, day.date)"
                      @dblclick="() => openShiftEditDialog(employee, day.date)"
                      @click="handleSingleDateSelect(day.date)"
                      :class="{ 'cell-selected': isCellSelected(employee.id, day.date), 'cell-single-selected': day.date === selectedDateForButtons }">
                    <div :class="['shift-cell', getShiftClass(employee.schedule[day.date]?.shift || '')]" v-if="employee.schedule[day.date]">
                      <template v-if="employee.schedule[day.date]?.specialStatus">
                        <div 
                          class="special-status"
                          :data-status="employee.schedule[day.date]?.specialStatus"
                        >
                          {{ employee.schedule[day.date]?.specialStatus }}
                        </div>
                      </template>
                      <template v-else>
                        {{ employee.schedule[day.date]?.shift }}
                      </template>
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

    <!-- 破7休1和周工时上限、公差补卡申请内容 -->
    <template v-else-if="subTab.id === 'break7'">
      <div class="schedule-content">
        <h3 class="summary-title">破7休1和周工时上限检查</h3>
        <p>已识别连续工作超过7天或周工时超过限制的员工。</p>
        
        <div class="section-header" style="margin-top: 20px;">
          <h4 class="section-title">打破7休1员工 ({{ totalOverworkCount }}人)</h4>
          <button class="btn btn-secondary" @click="exportAttendance">导出 Excel</button>
        </div>
        <div v-if="overworkingEmployees.length > 0">
          <table class="schedule-table">
            <thead>
              <tr>
                <th>员工姓名</th>
                <th>连续天数</th>
                <th>开始日期</th>
                <th>结束日期</th>
                <th>部门</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="emp in overworkingEmployees" :key="emp.id + emp.overworkPeriodStart">
                <td>{{ emp.name }}</td>
                <td>{{ emp.consecutiveDays }}</td>
                <td>{{ emp.overworkPeriodStart }}</td>
                <td>{{ emp.overworkPeriodEnd }}</td>
                <td>{{ emp.departmentName || emp.department }}</td>
                <td>
                  <button class="btn btn-secondary" @click="toggleIgnoreOverwork(emp)">{{ emp.isIgnored ? '取消忽略' : '忽略' }}</button>
                </td>
              </tr>
            </tbody>
          </table>
          <div class="pagination-container">
            <span class="pagination-info">共 {{ totalOverworkCount }} 条</span>
          </div>
        </div>
        <div v-else>
          <p>没有发现打破7休1的员工。</p>
        </div>

        <h4 class="section-title" style="margin-top: 20px;">周工时超限员工 ({{ totalOverLimitCount }}人)</h4>
        <div v-if="weeklyLimitEmployees.length > 0">
          <table class="schedule-table">
            <thead>
              <tr>
                <th>员工姓名</th>
                <th>周工时</th>
                <th>周上限</th>
                <th>超限工时</th>
                <th>部门</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="emp in weeklyLimitEmployees" :key="emp.id + emp.weeklyPeriodStart">
                <td>{{ emp.name }}</td>
                <td>{{ emp.weeklyHours !== undefined ? emp.weeklyHours.toFixed(1) : '0.0' }}</td>
                <td>{{ emp.weeklyLimit !== undefined ? emp.weeklyLimit.toFixed(1) : '0.0' }}</td>
                <td>{{ emp.overLimitHours !== undefined ? emp.overLimitHours.toFixed(1) : '0.0' }}</td>
                <td>{{ emp.departmentName || emp.department }}</td>
              </tr>
            </tbody>
          </table>
          <div class="pagination-container">
            <span class="pagination-info">共 {{ totalOverLimitCount }} 条</span>
          </div>
        </div>
        <div v-else>
          <p>没有发现周工时超限的员工。</p>
        </div>

        <h4 class="section-title" style="margin-top: 20px;">公差补卡申请 ({{ errandFixList.length }}条)</h4>
        <div v-if="errandFixList.length > 0">
          <table class="schedule-table">
            <thead>
              <tr>
                <th>申请人</th>
                <th>日期</th>
                <th>开始时间</th>
                <th>结束时间</th>
                <th>原因</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in errandFixList" :key="item.id">
                <td>{{ item.employeeName }}</td>
                <td>{{ item.errandDate }}</td>
                <td>{{ item.startTime }}</td>
                <td>{{ item.endTime }}</td>
                <td>{{ item.reason }}</td>
                <td>{{ item.status }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else>
          <p>没有公差补卡申请记录。</p>
        </div>

      </div>
    </template>

    <!-- 特殊工时内容 -->
    <template v-else-if="subTab.id === 'special'">
      <SpecialWorkingHoursPage />
    </template>

    <!-- 考勤汇总内容 -->
    <template v-else-if="subTab.id === 'attendance'">
      <div class="attendance-section">
        <h3 class="section-title">考勤汇总</h3>
        
        <div class="sub-tabs-sub">
          <div :class="{'tab-item-sub': true, 'active': attendanceSubTab.id === 'overtime'}" @click="attendanceSubTab = attendanceSubTabsOptions.find(t => t.id === 'overtime')!">临时加班</div>
          <div :class="{'tab-item-sub': true, 'active': attendanceSubTab.id === 'leave'}" @click="attendanceSubTab = attendanceSubTabsOptions.find(t => t.id === 'leave')!">临时请假</div>
        </div>

        <div v-if="attendanceSubTab.id === 'overtime'">
          <h4 class="section-title">临时加班记录 ({{ temporaryOvertimes.length }}条)</h4>
          <div v-if="temporaryOvertimes.length > 0">
            <table class="schedule-table">
              <thead>
                <tr>
                  <th>员工姓名</th>
                  <th>加班日期</th>
                  <th>开始时间</th>
                  <th>结束时间</th>
                  <th>总时长(H)</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in temporaryOvertimes" :key="item.id">
                  <td>{{ item.employeeName }}</td>
                  <td>{{ item.overtimeDate }}</td>
                  <td>{{ item.startTime }}</td>
                  <td>{{ item.endTime }}</td>
                  <td>{{ item.totalHours !== undefined ? item.totalHours.toFixed(1) : '0.0' }}</td>
                  <td>{{ item.status }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else>
            <p>没有临时加班记录。</p>
          </div>
        </div>

        <div v-else-if="attendanceSubTab.id === 'leave'">
          <h4 class="section-title">临时请假记录 ({{ temporaryLeaves.length }}条)</h4>
          <div v-if="temporaryLeaves.length > 0">
            <table class="schedule-table">
              <thead>
                <tr>
                  <th>员工姓名</th>
                  <th>请假日期</th>
                  <th>开始时间</th>
                  <th>结束时间</th>
                  <th>总时长(H)</th>
                  <th>请假类型</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in temporaryLeaves" :key="item.id">
                  <td>{{ item.employeeName }}</td>
                  <td>{{ item.leaveDate }}</td>
                  <td>{{ item.startTime }}</td>
                  <td>{{ item.endTime }}</td>
                  <td>{{ item.totalHours !== undefined ? item.totalHours.toFixed(1) : '0.0' }}</td>
                  <td>{{ item.leaveType }}</td>
                  <td>{{ item.status }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else>
            <p>没有临时请假记录。</p>
          </div>
        </div>
      </div>
    </template>
  </div>

  <!-- 对话框组件 -->
  <ShiftEditDialog 
    v-if="isShiftEditDialogOpen"
    :employee="currentEditingEmployee"
    :date="currentEditingDate"
    @close="isShiftEditDialogOpen = false"
    @success="handleShiftEditSuccess"
  />
  <ImportScheduleDialog 
    v-if="isImportDialogOpen"
    @close="isImportDialogOpen = false"
    @success="handleImportSuccess"
  />
  <BatchShiftDialog 
    v-if="isBatchShiftEditOpen"
    :selected-cells="selectedCells"
    :available-shifts="availableShifts"
    @close="isBatchShiftEditOpen = false"
    @success="handleBatchShiftSuccess"
  />
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import dayjs from '@/plugins/dayjs';
import 'dayjs/locale/zh-cn';
import ExcelJS from 'exceljs';
import SpecialWorkingHoursPage from '../SpecialWorkingHoursPage.vue';
import request from '@/utils/request';

import { 
  Employee,
  ScheduleViewMode,
  SubTab,
  Shift,
  Day,
  ScheduleItem,
  TemporaryOvertimeItem,
  TemporaryLeaveItem,
  ErrandFixItem,
  ErrandFixForm,
  IgnoredOverworkItem,
  AttendanceSubTab,
  Plant,
  Department,
  DepartmentSummaryItem,
  EmployeeWithOverworkDetails,
  EmployeeWithWeeklyLimitDetails
} from '../../types/schedule';

import { useSchedulePeriod } from '../../composables/useSchedulePeriod';
import { useShiftUtils, getWorkHoursWithConfig } from '../../composables/useShiftUtils';
import { useEmployeeData } from '../../composables/useEmployeeData';
import { useScheduleOperations } from '../../composables/useScheduleOperations';
import { useTemporaryData } from '../../composables/useTemporaryData';
import { useBreak7Check } from '../../composables/useBreak7Check';
import { useExportAndPrint } from '../../composables/useExportAndPrint';

import ShiftEditDialog from '../../components/ShiftEditDialog.vue';
import ImportScheduleDialog from '../../components/ImportScheduleDialog.vue';
import BatchShiftDialog from '../../components/BatchShiftDialog.vue';

dayjs.locale('zh-cn');

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
const savedAttendanceSubTab = localStorage.getItem('employeeAttendanceSubTab');

const subTabsOptions: SubTab[] = [
  { id: 'overview', label: '排班总览' },
  { id: 'break7', label: '破7休1和周工时上限、公差补卡申请' },
  { id: 'attendance', label: '考勤汇总' },
  { id: 'special', label: '特殊工时' },
];

const attendanceSubTabsOptions: AttendanceSubTab[] = [
  { id: 'overtime', label: '临时加班' },
  { id: 'leave', label: '临时请假' },
];

const defaultSubTab = subTabsOptions[0] || { id: 'overview', label: '排班总览' };
const subTab = ref<SubTab>(
  subTabsOptions.find(tab => tab.id === savedSubTab) ?? defaultSubTab
);

const schedulePositionFilter = ref<string[]>(
  savedPositionFilter ? JSON.parse(savedPositionFilter) : []
);
const scheduleShiftFilter = ref<string[]>(
  savedShiftFilter ? JSON.parse(savedShiftFilter) : []
);

const currentPlantFilter = ref<number | null>(null);
const currentDepartmentFilter = ref<number | null>(null);

const currentPage = ref(savedCurrentPage ? parseInt(savedCurrentPage) : 1);
const pageSize = ref(savedPageSize ? parseInt(savedPageSize) : 20);
const overworkCurrentPage = ref(savedOverworkPage ? parseInt(savedOverworkPage) : 1);
const weeklyLimitCurrentPage = ref(savedWeeklyLimitPage ? parseInt(savedWeeklyLimitPage) : 1);

const isLoading = ref(false);
const employees = ref<Employee[]>([]);

const isShiftEditDialogOpen = ref(false);
const isImportDialogOpen = ref(false);
const isBatchShiftEditOpen = ref(false);
const isErrandFixDialogOpen = ref(false);
const availableShifts = ref<Shift[]>([]);

const errandFixForm = ref<ErrandFixForm>({
  employeeId: null,
  errandDate: dayjs().format('YYYY-MM-DD'),
  startTime: '08:00',
  endTime: '17:00',
  reason: '',
});

const defaultAttendanceSubTab = attendanceSubTabsOptions[0] || { id: 'overtime', label: '临时加班' };
const attendanceSubTab = ref<AttendanceSubTab>(
  attendanceSubTabsOptions.find(tab => tab.id === savedAttendanceSubTab) ?? defaultAttendanceSubTab
);

const plants = ref<Plant[]>([]);
const departments = ref<Department[]>([]);

const statutoryHolidays = new Set([
  '2026-01-01'
]);

let fetchEmployees: (() => Promise<void>) | undefined;

const filteredEmployees = computed(() => {
  return employees.value.filter(emp => {
    if (schedulePositionFilter.value.length > 0) {
      if (!emp.position || !schedulePositionFilter.value.includes(emp.position)) {
        return false;
      }
    }

    if (currentPlantFilter.value !== null) {
      if (emp.plantId !== currentPlantFilter.value) {
        return false;
      }
    }
    if (currentDepartmentFilter.value !== null) {
      if (emp.departmentId !== currentDepartmentFilter.value) {
        return false;
      }
    }
    return true;
  });
});

const totalPages = computed(() => {
  return Math.ceil(filteredEmployees.value.length / pageSize.value) || 1;
});

const paginatedEmployees = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return filteredEmployees.value.slice(start, start + pageSize.value);
});

const visiblePages = computed(() => {
  const pages = [];
  const start = Math.max(1, currentPage.value - 2);
  const end = Math.min(totalPages.value, start + 4);
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }
  return pages;
});

const schedulePeriodComposable = useSchedulePeriod(
  savedPeriodStart || dayjs().startOf('week').format('YYYY-MM-DD'),
  savedCustomRangeEnd || dayjs().endOf('week').format('YYYY-MM-DD'),
  'schedule-view'  // scope 隔离，不同页面使用不同的 localStorage key
);

const {
  scheduleViewMode,
  weekDays,
  monthDays,
  customRangeDays,
  formattedWeekRange,
  formattedMonthRange,
  formattedCustomRange,
  currentCalculatedDateRange,
  switchViewMode,
  prevPeriod,
  nextPeriod,
  today,
  goToDate,
  currentPeriodStart,
  customRangeEnd
} = schedulePeriodComposable;



const {
  temporaryOvertimes,
  temporaryLeaves,
  fetchTemporaryData,
  calculateEmployeeOvertimeHours,
  calculateEmployeeLeaveHours,
  errandFixList
} = useTemporaryData({ employees });

const {
  overworkingEmployees,
  normalEmployees,
  weeklyLimitEmployees,
  weeklyNormalEmployees,
  weeklyLimitSetting,
  ignoredOverworkItems,
  loadIgnoredItems,
  saveIgnoredItems,
  toggleIgnoreOverwork,
  checkOverworking,
  checkWeeklyHours
} = useBreak7Check({
    currentPeriodStart,
    customRangeEnd,
  getWorkHours: getWorkHoursWithConfig,
  calculateEmployeeOvertimeHours
});

const fetchEmployeesWrapper = async () => {
  if (fetchEmployees) {
    await fetchEmployees();
  } 
};

const {
  selectedCells,
  isSelecting,
  selectionStart,
  copiedCells,
  hasDragged,
  currentEditingEmployee,
  currentEditingDate,
  selectedDateForButtons,
  isContextMenuOpen,
  contextMenuPosition,
  isCellSelected,
  startSelection,
  updateSelection,
  endSelection,
  clearSelection,
  handleClearSelection,
  copySelection,
  pasteSelection,
  handleClearSchedule,
  handleSingleDateSelect,
  handleDateHeaderClick,
  closeContextMenu,
  oneClickSchedule,
  openShiftEditDialog,
  openBatchShiftEdit,
  handleRightClick,
} = useScheduleOperations({
  paginatedEmployees: paginatedEmployees.value,
  weekDays: weekDays.value,
  monthDays: monthDays.value,
  customRangeDays: customRangeDays.value,
  fetchEmployees: fetchEmployeesWrapper,
});

const {
  printData,
  exportToExcel,
  exportAttendance: doExportAttendance
} = useExportAndPrint();

// Wrapper function to satisfy Vue's onClick type signature
const exportAttendance = (_event: PointerEvent) => {
  doExportAttendance(currentPeriodStart.value, summaryData.value, overworkingEmployees.value, weeklyLimitEmployees.value, errandFixList.value);
};

const getEmployeeHours = (
  employee: Employee,
  daysArray: Day[],
  calculateOvertime: (employeeId: number, startDate: string, endDate: string) => number,
  calculateLeave: (employeeId: number, startDate: string, endDate: string) => number
) => {
  let scheduleHours = 0;
  if (!daysArray || daysArray.length === 0) {
    return { scheduleHours: 0, overtimeHours: 0, leaveHours: 0, totalHours: 0 };
  }
  daysArray.forEach(day => {
    const scheduleItem = employee.schedule?.[day.date];
    if (scheduleItem && scheduleItem.shift) {
      scheduleHours += getWorkHoursWithConfig(scheduleItem.shift);
    }
  });

  const startDate = daysArray[0]!.date;
  const endDate = daysArray[daysArray.length - 1]!.date;

  const overtimeHours = calculateOvertime(employee.id, startDate, endDate);
  const leaveHours = calculateLeave(employee.id, startDate, endDate);

  const totalHours = scheduleHours + overtimeHours - leaveHours;

  return { scheduleHours, overtimeHours, leaveHours, totalHours };
};

const getShiftClass = (shift: string): string => {
  if (!shift) return 'shift-empty';
  const className = shift.replace(/[^a-zA-Z0-9]/g, ''); // Remove special characters
  return `shift-${className}`;
};

const levelHoursSummary = computed(() => {
  const summary: { [key: string]: {
    employeeCount: number,
    totalScheduleHours: number,
    totalOvertimeHours: number,
    totalLeaveHours: number,
    totalHours: number
  } } = {};
  
  filteredEmployees.value.forEach(emp => {
    const level = emp.level || '未设置级别';
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
    // Determine the correct days array based on the current schedule view mode
    let currentPeriodDaysArray: Day[] = [];
    if (scheduleViewMode.value === 'week') {
      currentPeriodDaysArray = weekDays.value;
    } else if (scheduleViewMode.value === 'month') {
      currentPeriodDaysArray = monthDays.value;
    } else { // custom range
      currentPeriodDaysArray = customRangeDays.value;
    }
    const hours = getEmployeeHours(emp, currentPeriodDaysArray, calculateEmployeeOvertimeHours, calculateEmployeeLeaveHours);
    summary[level].totalScheduleHours += hours.scheduleHours;
    summary[level].totalOvertimeHours += hours.overtimeHours;
    summary[level].totalLeaveHours += hours.leaveHours;
    summary[level].totalHours += hours.totalHours;
  });
  
  return summary;
});

const summaryData = computed<DepartmentSummaryItem[]>(() => {
  const deptMap = new Map<string, DepartmentSummaryItem>();

  [...overworkingEmployees.value, ...weeklyLimitEmployees.value].forEach(emp => {
    const dept = emp.departmentName || emp.department || '未知部门';
    if (!deptMap.has(dept)) {
      deptMap.set(dept, {
        department: dept,
        applicant: '',
        overworkCount: 0,
        overLimitCount: 0,
        totalOverHours: 0,
        period: currentPeriodStart.value,
        reason: ''
      });
    }
    const item = deptMap.get(dept)!;
    if ('consecutiveDays' in emp) {
      item.overworkCount++;
    }
    if ('overLimitHours' in emp) {
      item.overLimitCount++;
      item.totalOverHours += (emp as EmployeeWithWeeklyLimitDetails).overLimitHours;
    }
  });

  return Array.from(deptMap.values());
});

const totalOverworkCount = computed(() => overworkingEmployees.value.length);
const totalOverLimitCount = computed(() => weeklyLimitEmployees.value.length);

const currentFilterDays = computed(() => {
  if (scheduleViewMode.value === 'week') {
    return weekDays.value.length;
  } else if (scheduleViewMode.value === 'month') {
    return monthDays.value.filter(d => d.isCurrentMonth).length;
  } else {
    return customRangeDays.value.length;
  }
});

const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--;
  }
};

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
  }
};

const goToPage = (page: number) => {
  currentPage.value = page;
};

const loadPlants = async () => {
  try {
    const res = await request.get<{ plants: Plant[] }>('/plants');
    plants.value = res?.plants || [];
  } catch (error) {
    console.error('加载厂区列表失败:', error);
  }
};

const loadDepartments = async () => {
  try {
    const res = await request.get<{ departments: Department[] }>('/departments');
    departments.value = res?.departments || [];
  } catch (error) {
    console.error('加载部门列表失败:', error);
  }
};

const loadAvailableShifts = async () => {
  try {
    const res = await request.get<{ shifts: Shift[] }>('/schedule/shifts');
    availableShifts.value = res?.shifts || [];
  } catch (error) {
    console.error('加载可用班次失败:', error);
  }
};

const togglePositionFilter = () => {
  if (!selectedDateForButtons.value) return;
};

const toggleShiftFilter = () => {
  if (!selectedDateForButtons.value) return;
};
const importSchedule = () => {
  isImportDialogOpen.value = true;
};
const handleShiftEditSuccess = () => {
  fetchEmployeesWrapper();
};

const handleImportSuccess = () => {
  fetchEmployeesWrapper();
};

const handleBatchShiftSuccess = () => {
  fetchEmployeesWrapper();
  clearSelection();
  isContextMenuOpen.value = false;
};

const refreshData = () => {
  loadIgnoredItems();
  checkOverworking(
    employees.value, 
    scheduleViewMode.value, 
    currentPeriodStart.value, 
    customRangeEnd.value
  );
  checkWeeklyHours(
    employees.value,
    scheduleViewMode.value,
    currentPeriodStart.value,
    customRangeEnd.value
  );
};

const submitErrandFix = async () => {
  isErrandFixDialogOpen.value = false;
};

fetchEmployees = async () => {
  isLoading.value = true;
  try {
    const { startDate, endDate } = currentCalculatedDateRange.value;

    try {
          await fetchTemporaryData(startDate, endDate);
        } catch (tempError) {
          
        }

    const response = await request.get<{ employees: Employee[] }>(`/schedule/employees`, {
      params: { startDate, endDate }
    });

    const data = (response as any)?.data || response;

    if (data?.employees) {
      const viewStartDate = dayjs(startDate);
      const filteredEmployeesList = data.employees.filter((emp: any) => {
        // Filter out admin user
        if (emp.username === 'admin') {
          return false;
        }
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

      employees.value = filteredEmployeesList.map((emp: Employee) => {
        let scheduleHours = 0;
        Object.values(emp.schedule || {}).forEach((scheduleInfo: ScheduleItem) => {
          const shift = scheduleInfo?.shift || '';
          scheduleHours += getWorkHoursWithConfig(shift);
        });

        const overtimeHours = 0;
        const leaveHours = 0;

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

      if (subTab.value.id === 'break7') {
        refreshData();
      }
    } else {
      employees.value = [];
    }
  } catch (error) {
  } finally {
    isLoading.value = false;
  }
};

watch(subTab, (newValue) => {
  localStorage.setItem('employeeScheduleSubTab', newValue.id);
  if (newValue.id === 'break7') {
    setTimeout(() => {
      refreshData();
    }, 100);
  }
}, { immediate: true });

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

watch(attendanceSubTab, (newVal) => {
  localStorage.setItem('employeeAttendanceSubTab', newVal.id);
});

watch([scheduleViewMode, currentPeriodStart, customRangeEnd], () => {
  fetchEmployees();
});
onMounted(async () => {
  await loadPlants();
  await loadDepartments();
  await fetchEmployeesWrapper();
  await loadAvailableShifts();
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

/* 顶部汇总区域 */
.summary-top-section {
  display: flex;
  gap: 16px;
  align-items: stretch;
  margin-bottom: 24px;
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
  overflow-x: auto;
  overflow-y: visible;
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
  padding: 6px 8px;
  text-align: center;
  vertical-align: middle;
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
}

.schedule-table th.sticky-col {
  z-index: 30;
  background-color: #F9FAFB;
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
.schedule-table td.cell-single-selected {
  background-color: #ffe0b2; /* Light orange for single selected date */
  border: 2px solid #ff9800; /* Orange border */
}

.schedule-table td.cell-selected .shift-cell {
  background-color: transparent !important;
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
  font-size: 12px;
  color: #6B7280;
}

.schedule-table tbody tr:hover {
  background-color: #F9FAFB;
}

.employee-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.employee-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, #0066CC 0%, #0052A3 100%);
  color: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 12px;
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
  color: #D1D5DB;
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

/* 班次选择弹窗里的颜色 - 更美观协调的配色 */
.shift-option.shift-a { 
  background: linear-gradient(135deg, #E2E8F0 0%, #CBD5E1 100%); 
  color: #1E293B; 
  border: 1px solid #94A3B8; 
}
.shift-option.shift-b { 
  background: linear-gradient(135deg, #60A5FA 0%, #3B82F6 100%); 
  color: white; 
  border: 1px solid #2563EB; 
}
.shift-option.shift-c { 
  background: linear-gradient(135deg, #6EE7B7 0%, #34D399 100%); 
  color: #065F46; 
  border: 1px solid #10B981; 
}
.shift-option.shift-n { 
  background: linear-gradient(135deg, #A78BFA 0%, #8B5CF6 100%); 
  color: white; 
  border: 1px solid #7C3AED; 
}
.shift-option.shift-a-plus { 
  background: linear-gradient(135deg, #FCD34D 0%, #F59E0B 100%); 
  color: #92400E; 
  border: 1px solid #D97706; 
}
.shift-option.shift-b-plus { 
  background: linear-gradient(135deg, #FCA5A5 0%, #EF4444 100%); 
  color: white; 
  border: 1px solid #DC2626; 
}
.shift-option.shift-c-plus { 
  background: linear-gradient(135deg, #67E8F9 0%, #06B6D4 100%); 
  color: white; 
  border: 1px solid #0891B2; 
}
.shift-option.shift-n-plus { 
  background: linear-gradient(135deg, #FBCFE8 0%, #EC4899 100%); 
  color: white; 
  border: 1px solid #DB2777; 
}
.shift-option.shift-a2 { 
  background: linear-gradient(135deg, #818CF8 0%, #6366F1 100%); 
  color: white; 
  border: 1px solid #4F46E5; 
}
.shift-option.shift-rest { 
  background: linear-gradient(135deg, #D1D5DB 0%, #9CA3AF 100%); 
  color: #374151; 
  border: 1px solid #6B7280; 
}
.shift-option.shift-leave { 
  background: linear-gradient(135deg, #FEE2E2 0%, #FCA5A5 100%); 
  color: #DC2626; 
  border: 1px solid #F87171; 
}
.shift-option.shift-annual-leave { 
  background: linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%); 
  color: #065F46; 
  border: 1px solid #34D399; 
}
.shift-option.shift-absent { 
  background: linear-gradient(135deg, #FFEDD5 0%, #FED7AA 100%); 
  color: #92400E; 
  border: 1px solid #FDBA74; 
}

.shift-cell.shift-A, .shift-cell.shift-A班 { 
  background: linear-gradient(135deg, #E2E8F0 0%, #CBD5E1 100%); 
  color: #1E293B; 
  border: 1px solid #94A3B8; 
}
.shift-cell.shift-B, .shift-cell.shift-B班 { 
  background: linear-gradient(135deg, #60A5FA 0%, #3B82F6 100%); 
  color: white; 
  border: 1px solid #2563EB; 
}
.shift-cell.shift-C, .shift-cell.shift-C班 { 
  background: linear-gradient(135deg, #6EE7B7 0%, #34D399 100%); 
  color: #065F46; 
  border: 1px solid #10B981; 
}
.shift-cell.shift-N, .shift-cell.shift-N班 { 
  background: linear-gradient(135deg, #A78BFA 0%, #8B5CF6 100%); 
  color: white; 
  border: 1px solid #7C3AED; 
}
.shift-cell.shift-A\+, .shift-cell.shift-A\+班 { 
  background: linear-gradient(135deg, #FCD34D 0%, #F59E0B 100%); 
  color: #92400E; 
  border: 1px solid #D97706; 
}
.shift-cell.shift-B\+, .shift-cell.shift-B\+班 { 
  background: linear-gradient(135deg, #FCA5A5 0%, #EF4444 100%); 
  color: white; 
  border: 1px solid #DC2626; 
}
.shift-cell.shift-C\+, .shift-cell.shift-C\+班 { 
  background: linear-gradient(135deg, #67E8F9 0%, #06B6D4 100%); 
  color: white; 
  border: 1px solid #0891B2; 
}
.shift-cell.shift-N\+, .shift-cell.shift-N\+班 { 
  background: linear-gradient(135deg, #FBCFE8 0%, #EC4899 100%); 
  color: white; 
  border: 1px solid #DB2777; 
}
.shift-cell.shift-A2, .shift-cell.shift-A2班 { 
  background: linear-gradient(135deg, #818CF8 0%, #6366F1 100%); 
  color: white; 
  border: 1px solid #4F46E5; 
}
.shift-cell.shift-休, .shift-cell.shift-休息, .shift-cell.shift-调休 { 
  background: linear-gradient(135deg, #D1D5DB 0%, #9CA3AF 100%); 
  color: #374151; 
  border: 1px solid #6B7280; 
}

.shift-cell.shift-请假 {
  background: linear-gradient(135deg, #FEE2E2 0%, #FCA5A5 100%); 
  color: #DC2626; 
  border: 1px solid #F87171; 
}

.shift-cell.shift-年假 {
  background: linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%); 
  color: #065F46; 
  border: 1px solid #34D399; 
}

.shift-cell.shift-旷工 {
  background: linear-gradient(135deg, #FFEDD5 0%, #FED7AA 100%); 
  color: #92400E; 
  border: 1px solid #FDBA74; 
}
/* 子页面Tab样式 */
.sub-tabs {
  display: flex;
  border-bottom: 2px solid #E5E7EB;
  margin-bottom: 20px;
  margin-top: 10px; /* Adjust as needed */
}

.sub-tabs .tab-item {
  padding: 10px 15px;
  cursor: pointer;
  font-size: 15px;
  font-weight: 500;
  color: #6B7280;
  border-bottom: 2px solid transparent;
  transition: all 0.2s ease;
}

.sub-tabs .tab-item.active {
  color: #0066CC;
  border-bottom: 2px solid #0066CC;
  font-weight: 600;
}

/* break7 Tab Specific Styles */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  margin-top: 30px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.btn-secondary {
  background-color: #F3F4F6;
  color: #4B5563;
  border: 1px solid #D1D5DB;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  background-color: #E5E7EB;
}

.attendance-section {
  margin-top: 20px;
}

.sub-tabs-sub {
  display: flex;
  margin-bottom: 15px;
  border-bottom: 1px solid #E5E7EB;
  padding-bottom: 5px;
}

.tab-item-sub {
  padding: 8px 12px;
  cursor: pointer;
  font-size: 14px;
  color: #4B5563;
  border-bottom: 2px solid transparent;
  transition: all 0.2s ease;
}

.tab-item-sub:hover {
  color: #0066CC;
}

.tab-item-sub.active {
  color: #0066CC;
  border-bottom: 2px solid #0066CC;
  font-weight: 500;
}

.filter-item-plant {
  width: 150px;
}

.filter-item-department {
  width: 150px;
}
</style>