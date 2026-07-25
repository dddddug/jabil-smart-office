# PowerShell script to batch update styles for page-header and container
$files = @(
    "c:\Users\1167023\Desktop\Jabil\jabil-smart-office-frontend\src\views\LeaveManagementView.vue",
    "c:\Users\1167023\Desktop\Jabil\jabil-smart-office-frontend\src\views\OrganizationalStructureView.vue",
    "c:\Users\1167023\Desktop\Jabil\jabil-smart-office-frontend\src\views\DepartmentManagementView.vue",
    "c:\Users\1167023\Desktop\Jabil\jabil-smart-office-frontend\src\views\PlantManagementView.vue",
    "c:\Users\1167023\Desktop\Jabil\jabil-smart-office-frontend\src\views\RoleManagementView.vue",
    "c:\Users\1167023\Desktop\Jabil\jabil-smart-office-frontend\src\views\EmployeeHourlyRateConfigView.vue",
    "c:\Users\1167023\Desktop\Jabil\jabil-smart-office-frontend\src\views\DeptCalcRulesConfigView.vue",
    "c:\Users\1167023\Desktop\Jabil\jabil-smart-office-frontend\src\views\BinVolumeManagementView.vue",
    "c:\Users\1167023\Desktop\Jabil\jabil-smart-office-frontend\src\views\ExpiredMaterialExtensionView.vue",
    "c:\Users\1167023\Desktop\Jabil\jabil-smart-office-frontend\src\views\BonusEvaluationView.vue",
    "c:\Users\1167023\Desktop\Jabil\jabil-smart-office-frontend\src\views\KpiIndicatorsView.vue",
    "c:\Users\1167023\Desktop\Jabil\jabil-smart-office-frontend\src\views\CostSummaryView.vue",
    "c:\Users\1167023\Desktop\Jabil\jabil-smart-office-frontend\src\views\PermissionManagementView.vue",
    "c:\Users\1167023\Desktop\Jabil\jabil-smart-office-frontend\src\views\SixSManagementView.vue",
    "c:\Users\1167023\Desktop\Jabil\jabil-smart-office-frontend\src\views\ProductionTrackingView.vue",
    "c:\Users\1167023\Desktop\Jabil\jabil-smart-office-frontend\src\views\ConvenientPrintView.vue",
    "c:\Users\1167023\Desktop\Jabil\jabil-smart-office-frontend\src\views\ReceiptManagementView.vue",
    "c:\Users\1167023\Desktop\Jabil\jabil-smart-office-frontend\src\views\StationArrangementView.vue",
    "c:\Users\1167023\Desktop\Jabil\jabil-smart-office-frontend\src\views\EmployeeScheduleView.vue"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "Processing: $file"
        $content = Get-Content $file -Raw
        
        # First, update the container padding
        # Find patterns like ".container-name {" or ".name-container {"
        # We need to find the main container class
        
        # Look for the style section and update page-header
        $oldPageHeader = "\.page-header\s*\{[^}]*\}"
        $newPageHeader = ".page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 52px;
  z-index: 99;
  background-color: #F9FAFB;
  padding: 24px 0;
  margin-bottom: 0;
}"
        
        # Update page-header
        $content = [regex]::Replace($content, $oldPageHeader, $newPageHeader)
        
        # Now find the main container class (first style rule)
        if ($content -match '<style scoped>\s*\.([a-z-]+)-container\s*\{') {
            $containerClass = $matches[1] + "-container"
            Write-Host "Found container class: $containerClass"
            
            # Update container padding
            $oldContainerPattern = "\.$containerClass\s*\{[^}]*\}"
            $newContainerContent = ".$containerClass {
  padding: 0 24px 24px 24px;
  background-color: #F9FAFB;
  min-height: 100%;
  padding-top: 80px;
}"
            
            $content = [regex]::Replace($content, $oldContainerPattern, $newContainerContent)
        }
        
        Set-Content $file -Value $content -NoNewline
        Write-Host "Updated: $file"
    }
}

Write-Host "Done!"
