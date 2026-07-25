interface ErrandFixItem {
  id: number;
  plant?: string;
  department?: string;
  sap: string;
  employeeName: string;
  errandDate: string;
  startTime: string;
  endTime: string;
  leaveType: string;
  reason: string;
  status: string;
  ot: number;
  evidence?: string;
}

interface ExcelImagePosition {
  tl: { col: number; row: number; nativeCol?: number; nativeRow?: number; nativeColOff?: number; nativeRowOff?: number; };
  br?: { col: number; row: number; nativeCol?: number; nativeRow?: number; nativeColOff?: number; nativeRowOff?: number; };
  editAs?: 'oneCell' | 'twoCell' | 'absolute';
}

interface Shift {
  value: string;
  label: string;
}

interface Day {
  date: string;
  monthDay: string;
  weekday: string;
  isToday: boolean;
  isCurrentMonth: boolean;
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
  plantId: number | null;
  plantName?: string;
  departmentId?: number;
  departmentName?: string;
  position?: string;
  level: string;
  schedule: { [date: string]: ScheduleItem };
  scheduleHours?: number;
  overtimeHours?: number;
  leaveHours?: number;
  totalHours?: number;
  employeeType?: string;
  employee_type?: string;
  realName?: string;
  oldEmployeeId?: string;
  [key: string]: any;
}

interface TemporaryOvertimeItem {
  id?: number;
  employeeId: number | null;
  employeeName?: string;
  overtimeDate: string;
  startTime?: string;
  endTime?: string;
  hours: number;
  totalHours: number;
  status?: string;
}

interface TemporaryLeaveItem {
  id: number;
  employeeId: number;
  employeeName?: string;
  leaveDate?: string;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  leaveType?: string;
  type?: string;
  totalHours?: number;
  status?: string;
  reason?: string;
  proofFile?: string;
}

interface Department {
  id: number;
  name: string;
  plantId: number;
}

interface Plant {
  id: number;
  name: string;
}

interface ReportedRecord {
  employeeId: number;
  type: 'overwork' | 'overlimit';
  startDate: string;
  endDate: string;
  weekNumber: string;
  reportedAt: string;
}

interface OvertimeItem {
  id: number;
  sap: string;
  name: string;
  overtimeDate: string;
  startTime: string;
  endTime: string;
  totalHours: number;
  status: string;
  date: string;
  hours: number;
}

interface LeaveItem {
  id: number;
  sap: string;
  name: string;
  leaveDate: string;
  startTime: string;
  endTime: string;
  totalHours: number;
  status: string;
  leaveType: string;
  remark?: string;
}

interface DepartmentWithEmployees extends Department {
  managerName: string;
}

interface ShiftDurationRuleForm {
  id?: number;
  plantId: number | null;
  departmentId?: number;
  shiftName: string;
  durationHours: number;
  description: string;
}

interface ScheduleViewMode {
  id: string;
  label: string;
}

interface SubTab {
  id: string;
  label: string;
}

interface AttendanceSubTab {
  id: string;
  label: string;
}

interface ErrandFixForm {
  employeeId: number | null;
  errandDate: string;
  startTime: string;
  endTime: string;
  reason: string;
}

interface IgnoredOverworkItem {
  id?: number;
  employeeId: number;
  overworkDate?: string;
  periodStart: string;
}

interface SelectedCell {
  employeeId: number;
  date: string;
  shift?: string;
  specialStatus?: string;
}

interface DepartmentSummaryItem {
  department: string;
  applicant: string;
  overworkCount: number;
  overLimitCount: number;
  totalOverHours: number;
  period: string;
  reason: string;
}

interface EmployeeWithOverworkDetails extends Employee {
  isIgnored: boolean;
}

interface EmployeeWithWeeklyLimitDetails extends Employee {
  overLimitHours: number;
}

export { 
  ErrandFixItem, 
  ExcelImagePosition, 
  Shift, 
  Day, 
  ScheduleItem, 
  Employee, 
  TemporaryOvertimeItem, 
  TemporaryLeaveItem, 
  Department, 
  Plant, 
  ReportedRecord, 
  OvertimeItem, 
  LeaveItem,
  ScheduleViewMode,
  SubTab,
  ShiftDurationRuleForm,
  ErrandFixForm,
  IgnoredOverworkItem,
  SelectedCell,
  AttendanceSubTab,
  DepartmentSummaryItem,
  EmployeeWithOverworkDetails,
  EmployeeWithWeeklyLimitDetails
};

export const _ = {};