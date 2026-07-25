import { ref, computed, watch } from 'vue';
import dayjs from '@/plugins/dayjs';
import request from '@/utils/request';
import { Employee, SelectedCell, ScheduleItem } from '../types/schedule';
import { ElMessage, ElMessageBox } from 'element-plus';

interface UseScheduleOperationsParams {
  paginatedEmployees: any[]; // Employee[]
  weekDays: any[]; // Day[]
  monthDays: any[]; // Day[]
  customRangeDays: any[]; // Day[]
  fetchEmployees: () => Promise<void>;
}

export function useScheduleOperations(params: UseScheduleOperationsParams) {
  const selectedCells = ref<SelectedCell[]>([]);
  const isSelecting = ref(false);
  const selectionStart = ref<SelectedCell | null>(null);
  const copiedCells = ref<SelectedCell[]>([]);
  const hasDragged = ref(false);
  const currentEditingEmployee = ref<Employee | null>(null);
  const currentEditingDate = ref<string | null>(null);
  const selectedDateForButtons = ref<string | null>(null);
  const isContextMenuOpen = ref(false);
  const contextMenuPosition = ref({ x: 0, y: 0 });

  // Helper to check if a cell is selected
  const isCellSelected = (employeeId: number, date: string): boolean => {
    return selectedCells.value.some(
      (cell) => cell.employeeId === employeeId && cell.date === date
    );
  };

  // Selection logic
  const startSelection = (employeeId: number, date: string, event: MouseEvent) => {
    if (event.button !== 0) return; // Only left-click
    clearSelection();
    isSelecting.value = true;
    selectionStart.value = { employeeId, date };
    selectedCells.value.push({ employeeId, date });
  };

  const updateSelection = (
    employeeId: number,
    date: string,
    allEmployees: Employee[],
    allDays: { date: string }[]
  ) => {
    if (!isSelecting.value || !selectionStart.value) return;

    const start = selectionStart.value;
    const end = { employeeId, date };

    const startIndex = allEmployees.findIndex((emp) => emp.id === start.employeeId);
    const endIndex = allEmployees.findIndex((emp) => emp.id === end.employeeId);
    const startDayIndex = allDays.findIndex((d) => d.date === start.date);
    const endDayIndex = allDays.findIndex((d) => d.date === end.date);

    const minEmpIndex = Math.min(startIndex, endIndex);
    const maxEmpIndex = Math.max(startIndex, endIndex);
    const minDayIndex = Math.min(startDayIndex, endDayIndex);
    const maxDayIndex = Math.max(startDayIndex, endDayIndex);

    const newSelectedCells: SelectedCell[] = [];
    for (let i = minEmpIndex; i <= maxEmpIndex; i++) {
      for (let j = minDayIndex; j <= maxDayIndex; j++) {
        const emp = allEmployees[i];
        const day = allDays[j];
        if (emp && day) {
          newSelectedCells.push({
            employeeId: emp.id,
            date: day.date,
          });
        }
      }
    }
    selectedCells.value = newSelectedCells;
  };

  const endSelection = () => {
    isSelecting.value = false;
    selectionStart.value = null;
    hasDragged.value = selectedCells.value.length > 1; // Only set if more than one cell selected
  };

  const clearSelection = () => {
    selectedCells.value = [];
    selectionStart.value = null;
    selectedDateForButtons.value = null;
    hasDragged.value = false;
  };

  const handleClearSelection = () => {
    clearSelection();
    isContextMenuOpen.value = false;
  };

  const handleSingleDateSelect = (date: string) => {
    selectedDateForButtons.value = date;
  };

  const handleDateHeaderClick = (date: string) => {
    selectedDateForButtons.value = date;
  };

  const closeContextMenu = () => {
    isContextMenuOpen.value = false;
  };

  const copySelection = (employees: Employee[]) => {
    if (selectedCells.value.length === 0) return;
    copiedCells.value = selectedCells.value.map((cell) => {
      const employee = employees.find((e) => e.id === cell.employeeId);
      const schedule = employee?.schedule[cell.date];
      return {
        employeeId: cell.employeeId,
        date: cell.date,
        shift: schedule?.shift || '',
        specialStatus: schedule?.specialStatus || '',
      };
    });
  };

  const pasteSelection = async (employees: Employee[], fetchEmployees: () => Promise<void>) => {
    if (copiedCells.value.length === 0 || selectedCells.value.length === 0) return;

    const firstSelected = selectedCells.value[0]!;
    const firstCopied = copiedCells.value[0]!;

    // Calculate offset
    const empOffset = firstSelected.employeeId - firstCopied.employeeId;
    const dateOffset = dayjs(firstSelected.date).diff(dayjs(firstCopied.date), 'day');

    const changes: { employeeId: number; date: string; shift: string; specialStatus: string }[] = [];

    copiedCells.value.forEach((copiedCell: SelectedCell) => {
      const targetEmployeeId = copiedCell.employeeId + empOffset;
      const targetDate = dayjs(copiedCell.date).add(dateOffset, 'day').format('YYYY-MM-DD');

      // Check if target cell is within the current view's employees and dates
      const targetEmployee = employees.find((emp) => emp.id === targetEmployeeId);
      // For dates, we'll rely on the backend to handle valid dates for an employee
      if (targetEmployee) {
        changes.push({
          employeeId: targetEmployeeId,
          date: targetDate,
          shift: copiedCell.shift || '',
          specialStatus: copiedCell.specialStatus || '',
        });
      }
    });

    if (changes.length > 0) {
      try {
        await request.post('/schedule/batch-update', { schedules: changes });
        ElMessage.success('排班粘贴成功！');
        await fetchEmployees(); // Refresh data
        clearSelection();
      } catch (error: any) {
        console.error('粘贴排班失败:', error);
        ElMessage.error('粘贴排班失败: ' + (error.message || '未知错误'));
      }
    }
  };

  const handleClearSchedule = async (employees: Employee[], closeMenu: () => void, fetchEmps: () => Promise<void>) => {
    if (selectedCells.value.length === 0) {
      ElMessage.warning('请先选择要清空的排班单元格！');
      return;
    }

    ElMessageBox.confirm(
      '确定要清空所选排班吗？',
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
      .then(async () => {
        const changes = selectedCells.value.map((cell: SelectedCell) => ({
          employeeId: cell.employeeId,
          date: cell.date,
          shift: '', // Clear the shift
          specialStatus: '', // Clear special status
        }));

        try {
          await request.post('/schedule/batch-update', { schedules: changes });
          ElMessage.success('排班清空成功！');
          await fetchEmps(); // Refresh data
          clearSelection();
          closeMenu();
        } catch (error: any) {
          console.error('清空排班失败:', error);
          ElMessage.error('清空排班失败: ' + (error.message || '未知错误'));
        }
      })
      .catch(() => {
        ElMessage.info('已取消清空');
      });
  };

  const openShiftEditDialog = (employee: Employee, date: string) => {
    currentEditingEmployee.value = employee;
    currentEditingDate.value = date;
    // isShiftEditDialogOpen.value = true; // This needs to be managed externally or returned
  };

  const openBatchShiftEdit = () => {
    // isBatchShiftEditOpen.value = true; // This needs to be managed externally or returned
    isContextMenuOpen.value = false;
  };

  const handleRightClick = (event: MouseEvent, employeeId: number, date: string) => {
    event.preventDefault();
    selectedDateForButtons.value = date;
    contextMenuPosition.value = { x: event.clientX, y: event.clientY };
    isContextMenuOpen.value = true;
  };

  const oneClickSchedule = () => {
    // Placeholder implementation, actual logic would go here
  };


  return {
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
  };
}