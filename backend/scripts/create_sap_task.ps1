$action = New-ScheduledTaskAction -Execute "node" -Argument "C:\Users\1167023\Desktop\Jabil\backend\scripts\sapDataPull.js"
$trigger = New-ScheduledTaskTrigger -Once -At "00:00"
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries

Register-ScheduledTask -TaskName "SAP_Data_Pull" -Action $action -Trigger $trigger -Settings $settings -Description "每小时从SAP拉取GRN和ITEM数据并导入数据库" -Force
