/**
 * 下载文件
 * @param data 文件 blob 或 array buffer 数据
 * @param fileName 文件名，包含后缀
 */
export function downloadFile(data: Blob | ArrayBuffer, fileName: string): void {
  if (!data) {
    return;
  }
  const blob = new Blob([data]);
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
