import { ref, type Ref } from 'vue';
import type { Employee } from '../types/schedule';

export function useEmployeeData() {
  const employees: Ref<Employee[]> = ref([]);

  const fetchEmployees = async () => {
    employees.value = [];
  };

  return {
    employees,
    fetchEmployees,
  };
}
