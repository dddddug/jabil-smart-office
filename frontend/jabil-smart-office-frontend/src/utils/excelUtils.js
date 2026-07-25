// src/utils/excelUtils.js

/**
 * 下载文件
 * @param {Blob} data 文件 blob 数据
 * @param {string} fileName 文件名，包含后缀
 */
export function downloadFile(data, fileName) {
  if (!data) {
    return
  }
  const blob = new Blob([data])
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', fileName)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}
