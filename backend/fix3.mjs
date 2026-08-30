import fs from 'fs';
let code = fs.readFileSync('routes/warehouseMonitorRoutes.js', 'utf8');

// Fix the interval calculation - replace the problematic syntax
code = code.replace(
  /TO_CHAR\(\(TO_DATE\(h\.date_code, 'YYWW'\) \+ \(sl\.shelf_life \|\| ' months'\)::interval\)::date, 'YYYY-MM-DD'\)/g,
  "TO_CHAR((TO_DATE(h.date_code, 'YYWW')::date + make_interval(days => sl.shelf_life * CASE sl.period_indicator WHEN 'D' THEN 1 WHEN 'W' THEN 7 WHEN 'M' THEN 30 WHEN 'Y' THEN 365 ELSE 30 END))::date, 'YYYYMMDD')"
);

// Remove sl.period_indicator IS NOT NULL from the conditions since we handle null now
code = code.replace(
  /AND sl\.period_indicator IS NOT NULL AND h\.date_code ~ '\^\[0-9\]\{4\}\$'/g,
  "AND h.date_code ~ '^[0-9]{4}$'"
);

fs.writeFileSync('routes/warehouseMonitorRoutes.js', code);
console.log('Done');
