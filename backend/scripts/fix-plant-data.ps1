$filePath = "C:\Users\1167023\Desktop\Jabil\frontend\jabil-smart-office-frontend\src\views\PlantManagementView.vue"
$content = Get-Content $filePath -Raw -Encoding UTF8

$oldBlock = '    // 如果API失败，使用本地默认数据
    plants.value = [
      { id: 1, name: ''MPL'', description: ''Jabil主厂'', managerId: null, managerName: null, createdAt: ''2023-01-01'' },
      { id: 2, name: ''MPL Phase V'', description: ''Jabil主厂五期'', managerId: null, managerName: null, createdAt: ''2023-03-15'' },
      { id: 3, name: ''ENE A'', description: ''Jabil分厂A栋'', managerId: null, managerName: null, createdAt: ''2026-06-20'' },
      { id: 4, name: ''ENE B'', description: ''Jabil分厂B栋'', managerId: null, managerName: null, createdAt: ''2026-06-29'' },
      { id: 5, name: ''ENE C'', description: ''Jabil分厂C栋'', managerId: null, managerName: null, createdAt: ''2026-06-29'' },
      { id: 6, name: ''DYF'', description: ''Jabil东源分厂'', managerId: null, managerName: null, createdAt: ''2026-06-29'' },
      { id: 7, name: ''IC'', description: ''IA&Buyer'', managerId: null, managerName: null, createdAt: ''2026-06-29'' },
    ];'

$newBlock = '    // 如果API失败，使用本地默认数据（必须与数据库 jso_org_plant_management 表一致）
    // 当前数据库数据: id 1=MPL PhaseV, 2=ENE A, 3=ENE B, 4=ENE C, 5=DYF, 6=IC, 7=MPL
    plants.value = [
      { id: 1, name: ''MPL PhaseV'', description: ''Jabil主厂五期'', managerId: null, managerName: null, createdAt: ''2023-01-01'' },
      { id: 2, name: ''ENE A'', description: ''Jabil分厂A栋'', managerId: null, managerName: null, createdAt: ''2023-03-15'' },
      { id: 3, name: ''ENE B'', description: ''Jabil分厂B栋'', managerId: null, managerName: null, createdAt: ''2026-06-29'' },
      { id: 4, name: ''ENE C'', description: ''Jabil分厂C栋'', managerId: null, managerName: null, createdAt: ''2026-06-29'' },
      { id: 5, name: ''DYF'', description: ''Jabil东源分厂'', managerId: null, managerName: null, createdAt: ''2026-06-29'' },
      { id: 6, name: ''IC'', description: ''IA&Buyer'', managerId: null, managerName: null, createdAt: ''2026-06-29'' },
      { id: 7, name: ''MPL'', description: ''Jabil主厂'', managerId: null, managerName: null, createdAt: ''2026-06-29'' },
    ];'

$content = $content -replace [regex]::Escape($oldBlock), $newBlock
[System.IO.File]::WriteAllText($filePath, $content, [System.Text.Encoding]::UTF8)
Write-Host "File updated successfully"
