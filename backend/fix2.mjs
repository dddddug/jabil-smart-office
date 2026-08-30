import fs from 'fs';
let code = fs.readFileSync('routes/warehouseMonitorRoutes.js', 'utf8');

// 替换 calcExpiryDateText 中的日期计算逻辑
const oldCalc = `// 计算到期日期（用于判断是否过期）- 全部返回文本格式以便字符串比较
    const calcExpiryDateText = \`
      CASE
        -- 33类物料有延期日期
        WHEN \${class33} IS NOT NULL AND e.extension_date IS NOT NULL THEN TO_CHAR(e.extension_date, 'YYYYMMDD')
        -- 33类物料无延期日期，使用DC+SLife
        WHEN \${class33} IS NOT NULL AND e.extension_date IS NULL AND sl.shelf_life IS NOT NULL AND sl.period_indicator IS NOT NULL AND h.date_code ~ '^[0-9]{4}\$' THEN TO_CHAR((TO_DATE(h.date_code, 'YYWW') + (sl.shelf_life || ' months')::interval)::date, 'YYYY-MM-DD')
        -- 非33类，SLED和延期日期都为空，使用DC+SLife
        WHEN \${class33} IS NULL AND e.extension_date IS NULL AND h.sled IS NULL AND sl.shelf_life IS NOT NULL AND sl.period_indicator IS NOT NULL AND h.date_code ~ '^[0-9]{4}\$' THEN TO_CHAR((TO_DATE(h.date_code, 'YYWW') + (sl.shelf_life || ' months')::interval)::date, 'YYYY-MM-DD')
        -- 非33类，SLED和延期日期都有值，延期日期>SLED
        WHEN \${class33} IS NULL AND e.extension_date IS NOT NULL AND h.sled IS NOT NULL AND e.extension_date > TO_DATE(h.sled, 'MM/DD/YYYY') THEN TO_CHAR(e.extension_date, 'YYYYMMDD')
        -- 非33类，SLED有值，延期日期为空
        WHEN \${class33} IS NULL AND e.extension_date IS NULL AND h.sled IS NOT NULL THEN h.sled
        -- 非33类，SLED和延期日期都有值
        WHEN \${class33} IS NULL AND e.extension_date IS NOT NULL AND h.sled IS NOT NULL THEN TO_CHAR(e.extension_date, 'YYYYMMDD')
        ELSE NULL
      END
    \`;`;

const newCalc = `// 计算到期日期的文本格式 - YYYYMMDD
    // 使用 make_interval(days => ...) 避免类型问题
    const calcExpiryDateText = \`
      CASE
        -- 33类物料有延期日期
        WHEN \${class33} IS NOT NULL AND e.extension_date IS NOT NULL THEN TO_CHAR(e.extension_date, 'YYYYMMDD')
        -- 33类物料无延期日期，使用DC+SLife (简单天数估算: M=30天)
        WHEN \${class33} IS NOT NULL AND e.extension_date IS NULL AND sl.shelf_life IS NOT NULL AND h.date_code ~ '^[0-9]{4}\$' THEN
          TO_CHAR((TO_DATE(h.date_code, 'YYWW')::date + make_interval(days => sl.shelf_life * CASE sl.period_indicator WHEN 'D' THEN 1 WHEN 'W' THEN 7 WHEN 'M' THEN 30 WHEN 'Y' THEN 365 ELSE 30 END))::date, 'YYYYMMDD')
        -- 非33类，SLED和延期日期都为空，使用DC+SLife
        WHEN \${class33} IS NULL AND e.extension_date IS NULL AND h.sled IS NULL AND sl.shelf_life IS NOT NULL AND h.date_code ~ '^[0-9]{4}\$' THEN
          TO_CHAR((TO_DATE(h.date_code, 'YYWW')::date + make_interval(days => sl.shelf_life * CASE sl.period_indicator WHEN 'D' THEN 1 WHEN 'W' THEN 7 WHEN 'M' THEN 30 WHEN 'Y' THEN 365 ELSE 30 END))::date, 'YYYYMMDD')
        -- 非33类，SLED和延期日期都有值，延期日期>SLED
        WHEN \${class33} IS NULL AND e.extension_date IS NOT NULL AND h.sled IS NOT NULL AND e.extension_date > TO_DATE(h.sled, 'MM/DD/YYYY') THEN TO_CHAR(e.extension_date, 'YYYYMMDD')
        -- 非33类，SLED有值，延期日期为空
        WHEN \${class33} IS NULL AND e.extension_date IS NULL AND h.sled IS NOT NULL THEN REPLACE(h.sled, '/', '')
        -- 非33类，SLED和延期日期都有值
        WHEN \${class33} IS NULL AND e.extension_date IS NOT NULL AND h.sled IS NOT NULL THEN TO_CHAR(e.extension_date, 'YYYYMMDD')
        ELSE NULL
      END
    \`;`;

code = code.replace(oldCalc, newCalc);

fs.writeFileSync('routes/warehouseMonitorRoutes.js', code);
console.log('Done');
