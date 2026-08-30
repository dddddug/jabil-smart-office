$ErrorActionPreference = "SilentlyContinue"
$networkPath = "\\CNHUAM0AWSFGW01\s3000-475137724643-hua-icdata\System\Z_HISTORY_GRN"
$outputFile = "C:\Users\1167023\Desktop\Jabil\backend\scripts\GRN_sample.txt"

try {
    $content = Get-Content -Path $networkPath\GRN08_20260818_010629.txt -TotalCount 5 -Encoding UTF8
    $content | Out-File -FilePath $outputFile -Encoding UTF8
    Write-Host "文件已复制到: $outputFile"
    Write-Host "内容预览:"
    $content | Select-Object -First 5
} catch {
    Write-Host "错误: $($_.Exception.Message)"
}
