// Type declarations for the JS API modules

declare module '@/api/specialWorkingHours' {
  export function getSpecialWorkingHoursList(query?: any): Promise<any>;
  export function addSpecialWorkingHours(data: any): Promise<any>;
  export function importSpecialWorkingHours(file: File): Promise<any>;
  export function deleteSpecialWorkingHours(ids: number[]): Promise<any>;
  export function deleteSpecialWorkingHoursByCondition(employeeName: string, date: string, event: string): Promise<any>;
  export function exportSpecialWorkingHours(query?: any): Promise<any>;
  export function downloadImportTemplate(): Promise<any>;
}
