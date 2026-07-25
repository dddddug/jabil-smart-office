/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module '@/api/specialWorkingHours' {
  export function getSpecialWorkingHoursList(query: any): Promise<any>;
  export function addSpecialWorkingHours(data: any): Promise<any>;
  export function importSpecialWorkingHours(file: any): Promise<any>;
  export function deleteSpecialWorkingHours(ids: number[]): Promise<any>;
  export function exportSpecialWorkingHours(query: any): Promise<any>;
}

declare module '@/utils/excelUtils' {
  export function downloadFile(data: Blob, fileName: string): void;
}
