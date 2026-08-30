/**
 * SAP GUI Scripting 服务
 * 通过 PowerShell 调用 SAP GUI COM 对象
 *
 * 使用方式:
 *   const sap = new SapGuiService();
 *   await sap.connect('连接名称', '客户端', '用户名', '密码');
 *   await sap.executeTransaction('MB52');
 *   const data = await sap.getGridData();
 *   await sap.close();
 *
 * 注意: 需要在 Windows 服务器上运行，且安装了 SAP GUI
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { logInfo, logError } from '../utils/logger.js';

export class SapGuiService {
  constructor(options = {}) {
    this.timeout = options.timeout || 60000;
    this.retryCount = options.retryCount || 3;
    this.tempDir = path.join(os.tmpdir(), 'sap-automation');

    // 确保临时目录存在
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * 执行 PowerShell 脚本
   */
  async runPowerShell(script) {
    return new Promise((resolve, reject) => {
      const scriptPath = path.join(this.tempDir, `sap_script_${Date.now()}.ps1`);

      // 写入脚本（使用 UTF-8 BOM 避免编码问题）
      const bom = Buffer.from([0xEF, 0xBB, 0xBF]);
      const content = Buffer.concat([bom, Buffer.from(script, 'utf8')]);
      fs.writeFileSync(scriptPath, content);

      const ps = spawn('powershell.exe', [
        '-ExecutionPolicy', 'Bypass',
        '-NoProfile',
        '-File', scriptPath
      ], {
        windowsHide: true
      });

      let stdout = '';
      let stderr = '';

      ps.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      ps.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ps.on('close', (code) => {
        // 删除临时脚本
        try {
          fs.unlinkSync(scriptPath);
        } catch {}

        if (code === 0) {
          resolve(stdout.trim());
        } else {
          reject(new Error(stderr || `PowerShell exit code: ${code}\n${stdout}`));
        }
      });

      ps.on('error', (err) => {
        try {
          fs.unlinkSync(scriptPath);
        } catch {}
        reject(err);
      });
    });
  }

  /**
   * 连接到 SAP 系统
   */
  async connect(connectionName, client, username, password) {
    let retries = 0;

    while (retries < this.retryCount) {
      try {
        console.log(`[SAP] 正在连接 ${connectionName}...`);

        const script = `
try {
    Add-Type -ComObject "SAPGUI.SAPGUIauto"
    $SapGuiAuto = [SAPGUI.SAPGUIauto]::GetScriptingEngine()

    # 关闭脚本支持提示
    $SapGuiAuto.HiddenScripting = $true

    # 打开连接
    $connection = $SapGuiAuto.OpenConnection("${connectionName}", $true)
    $session = $connection.Children(0)

    # 登录
    $session.findById("wnd[0]/usr/txtRSYST-MANDT").text = "${client}"
    $session.findById("wnd[0]/usr/txtRSYST-BNAME").text = "${username}"
    $session.findById("wnd[0]/usr/pwdRSYST-BCODE").text = "${password}"
    $session.findById("wnd[0]/tbar[0]/btn[0]").press()

    # 等待就绪
    while ($session.Busy) { Start-Sleep -Milliseconds 200 }

    $result = @{
        Success = $true
        User = $session.Info.User
        Client = $session.Info.Client
        SystemName = $session.Info.SystemName
    }
    $result | ConvertTo-Json -Compress
} catch {
    @{ Success = $false; Error = $_.Exception.Message } | ConvertTo-Json -Compress
}
`;

        const result = await this.runPowerShell(script);
        const response = JSON.parse(result);

        if (response.Success) {
          console.log(`[SAP] 连接成功，用户: ${response.User}`);
          this.connectionName = connectionName;
          this.isConnected = true;
          return response;
        } else {
          throw new Error(response.Error || '未知错误');
        }

      } catch (error) {
        retries++;
        console.error(`[SAP] 连接失败 (${retries}/${this.retryCount}):`, error.message);

        if (retries >= this.retryCount) {
          throw new Error(`SAP连接失败: ${error.message}`);
        }

        await this.sleep(3000);
      }
    }
  }

  /**
   * 执行事务代码
   */
  async executeTransaction(transactionCode) {
    if (!this.isConnected) {
      throw new Error('SAP 未连接');
    }

    console.log(`[SAP] 执行事务: ${transactionCode}`);

    const script = `
try {
    Add-Type -ComObject "SAPGUI.SAPGUIauto"
    $SapGuiAuto = [SAPGUI.SAPGUIauto]::GetScriptingEngine()
    $connection = $SapGuiAuto.Connections.Item(0)
    $session = $connection.Children(0)

    $session.StartTransaction("${transactionCode}")

    # 等待事务加载
    while ($session.Busy) { Start-Sleep -Milliseconds 200 }

    @{ Success = $true } | ConvertTo-Json -Compress
} catch {
    @{ Success = $false; Error = $_.Exception.Message } | ConvertTo-Json -Compress
}
`;

    const result = await this.runPowerShell(script);
    const response = JSON.parse(result);

    if (!response.Success) {
      throw new Error(`执行事务 ${transactionCode} 失败: ${response.Error}`);
    }

    console.log(`[SAP] 事务 ${transactionCode} 已打开`);
    return true;
  }

  /**
   * 等待 SAP 界面就绪
   */
  async waitForReady() {
    const script = `
try {
    Add-Type -ComObject "SAPGUI.SAPGUIauto"
    $SapGuiAuto = [SAPGUI.SAPGUIauto]::GetScriptingEngine()
    $connection = $SapGuiAuto.Connections.Item(0)
    $session = $connection.Children(0)

    $timeout = ${this.timeout}
    $start = Get-Date
    $ready = $false

    while (-not $ready -and ((Get-Date) - $start).TotalMilliseconds -lt $timeout) {
        if (-not $session.Busy) {
            # 检查是否有错误对话框
            try {
                $wnd1 = $session.findById("wnd[1]", $false)
                if ($wnd1) {
                    $errorText = $session.findById("wnd[1]/usr/txtMESSTXT1", $false).Text
                    @{ Ready = $false; Error = $errorText } | ConvertTo-Json -Compress
                    exit
                }
            } catch {}

            $ready = $true
        }
        Start-Sleep -Milliseconds 200
    }

    if ($ready) {
        @{ Ready = $true } | ConvertTo-Json -Compress
    } else {
        @{ Ready = $false; Error = "Timeout" } | ConvertTo-Json -Compress
    }
} catch {
    @{ Ready = $false; Error = $_.Exception.Message } | ConvertTo-Json -Compress
}
`;

    const result = await this.runPowerShell(script);
    const response = JSON.parse(result);

    if (!response.Ready) {
      if (response.Error && response.Error !== 'Timeout') {
        throw new Error(`SAP错误: ${response.Error}`);
      }
      throw new Error('SAP 界面响应超时');
    }

    return true;
  }

  /**
   * 设置输入框值
   */
  async setInput(id, value) {
    const escapedValue = value.replace(/"/g, '`"').replace(/'/g, "''");

    const script = `
try {
    Add-Type -ComObject "SAPGUI.SAPGUIauto"
    $SapGuiAuto = [SAPGUI.SAPGUIauto]::GetScriptingEngine()
    $connection = $SapGuiAuto.Connections.Item(0)
    $session = $connection.Children(0)

    $element = $session.findById("${id}")
    $element.text = "${escapedValue}"

    @{ Success = $true } | ConvertTo-Json -Compress
} catch {
    @{ Success = $false; Error = $_.Exception.Message } | ConvertTo-Json -Compress
}
`;

    const result = await this.runPowerShell(script);
    const response = JSON.parse(result);

    if (!response.Success) {
      throw new Error(`设置输入框 ${id} 失败: ${response.Error}`);
    }

    await this.sleep(100);
  }

  /**
   * 点击按钮
   */
  async pressButton(id) {
    const script = `
try {
    Add-Type -ComObject "SAPGUI.SAPGUIauto"
    $SapGuiAuto = [SAPGUI.SAPGUIauto]::GetScriptingEngine()
    $connection = $SapGuiAuto.Connections.Item(0)
    $session = $connection.Children(0)

    $element = $session.findById("${id}")
    $element.press()

    @{ Success = $true } | ConvertTo-Json -Compress
} catch {
    @{ Success = $false; Error = $_.Exception.Message } | ConvertTo-Json -Compress
}
`;

    const result = await this.runPowerShell(script);
    const response = JSON.parse(result);

    if (!response.Success) {
      throw new Error(`点击按钮 ${id} 失败: ${response.Error}`);
    }

    await this.waitForReady();
  }

  /**
   * 获取 ALV 网格数据
   */
  async getGridData(gridId = null) {
    await this.waitForReady();

    // 先尝试查找网格
    const gridScript = gridId ? `"${gridId}"` : 'null';

    const script = `
try {
    Add-Type -ComObject "SAPGUI.SAPGUIauto"
    $SapGuiAuto = [SAPGUI.SAPGUIauto]::GetScriptingEngine()
    $connection = $SapGuiAuto.Connections.Item(0)
    $session = $connection.Children(0)

    # 尝试找到 ALV 网格
    $grid = $null

    $possibleIds = @(
        "wnd[0]/usr/cntlGRID1/shellcont/shell",
        "wnd[0]/usr/cntlGRID2/shellcont/shell",
        "wnd[0]/usr/cntlGRID3/shellcont/shell",
        "wnd[0]/usr/cntlCONTAINER/shellcont/shell"
    )

    foreach ($id in $possibleIds) {
        try {
            $g = $session.findById($id, $false)
            if ($g -and $g.RowCount -ge 0) {
                $grid = $g
                break
            }
        } catch {}
    }

    if (-not $grid) {
        @{ Success = $false; Error = "未找到ALV网格" } | ConvertTo-Json -Compress
        exit
    }

    # 获取数据
    $rowCount = $grid.RowCount
    $colOrder = $grid.ColumnOrder

    # 获取列标题
    $headers = @()
    foreach ($col in $colOrder) {
        $title = $grid.GetColumnTitle($col)
        if (-not $title) { $title = $col }
        $headers += $title
    }

    # 获取行数据
    $rows = @()
    for ($i = 0; $i -lt $rowCount; $i++) {
        $row = @()
        foreach ($col in $colOrder) {
            $val = $grid.GetCellValue($i, $col)
            $row += $val
        }
        $rows += ,($row -join "|")
    }

    @{
        Success = $true
        Headers = $headers
        Rows = $rows
        RowCount = $rowCount
    } | ConvertTo-Json -Compress
} catch {
    @{ Success = $false; Error = $_.Exception.Message } | ConvertTo-Json -Compress
}
`;

    const result = await this.runPowerShell(script);
    const response = JSON.parse(result);

    if (!response.Success) {
      throw new Error(`获取网格数据失败: ${response.Error}`);
    }

    // 解析数据
    const headers = response.Headers || [];
    const rows = (response.Rows || []).map(rowStr => rowStr.split('|'));

    console.log(`[SAP] 获取到 ${response.RowCount} 行数据`);

    return {
      headers,
      rows,
      rowCount: response.RowCount
    };
  }

  /**
   * 选择菜单项
   */
  async selectMenu(menuPath) {
    // 菜单路径格式: "/menu/menu0/menu1" -> "menu0|menu1"
    const menuId = menuPath.split('/').filter(Boolean).join('|');

    const script = `
try {
    Add-Type -ComObject "SAPGUI.SAPGUIauto"
    $SapGuiAuto = [SAPGUI.SAPGUIauto]::GetScriptingEngine()
    $connection = $SapGuiAuto.Connections.Item(0)
    $session = $connection.Children(0)

    $session.findById("wnd[0]/mbar/menu").selectItem("${menuId}")
    $session.findById("wnd[0]/mbar/menu").openPopover("${menuId}")

    @{ Success = $true } | ConvertTo-Json -Compress
} catch {
    @{ Success = $false; Error = $_.Exception.Message } | ConvertTo-Json -Compress
}
`;

    const result = await this.runPowerShell(script);
    const response = JSON.parse(result);

    if (!response.Success) {
      throw new Error(`选择菜单 ${menuPath} 失败: ${response.Error}`);
    }

    await this.sleep(200);
  }

  /**
   * 关闭 SAP 连接
   */
  async close() {
    const script = `
try {
    Add-Type -ComObject "SAPGUI.SAPGUIauto"
    $SapGuiAuto = [SAPGUI.SAPGUIauto]::GetScriptingEngine()

    foreach ($conn in $SapGuiAuto.Connections) {
        $conn.Close()
    }

    @{ Success = $true } | ConvertTo-Json -Compress
} catch {
    @{ Success = $false; Error = $_.Exception.Message } | ConvertTo-Json -Compress
}
`;

    try {
      await this.runPowerShell(script);
      console.log('[SAP] 连接已关闭');
    } catch (error) {
      console.error('[SAP] 关闭连接时出错:', error.message);
    }

    this.isConnected = false;
  }

  /**
   * 工具方法：等待
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default SapGuiService;
