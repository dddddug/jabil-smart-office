import fs from 'fs';
let code = fs.readFileSync('routes/warehouseMonitorRoutes.js', 'utf8');

// Replace remaining calcExpiryDate references with calcExpiryDateText
code = code.replace(/\$\{calcExpiryDate\} IS NOT NULL/g, '${calcExpiryDateText} IS NOT NULL');
code = code.replace(/\$\{calcExpiryDate\} <=/g, '${calcExpiryDateText} <=');
code = code.replace(/REPLACE\(\$\{p\.length\}, '-', ''\)/g, "REPLACE($${p.length}, '-', '')");

fs.writeFileSync('routes/warehouseMonitorRoutes.js', code);
console.log('Done');
