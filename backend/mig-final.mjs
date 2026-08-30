import { Pool } from 'pg';
const pool = new Pool({
  host: '10.114.100.171',
  port: 5432,
  database: 'stockroom_db',
  user: 'postgres',
  password: '74454321'
});

async function migrate() {
  try {
    // Clear and insert
    await pool.query('BEGIN');
    await pool.query('DELETE FROM jso_system_permissions');
    await pool.query('COMMIT');
    console.log('Cleared');

    // Batch 1
    await pool.query(`INSERT INTO jso_system_permissions (code, name, type, module, action, description, sort_order) VALUES
('employee-schedule:view', 'view emp schedule', 'button', 'employee-schedule', 'view', 'view', 1),
('employee-schedule:edit', 'edit emp schedule', 'button', 'employee-schedule', 'edit', 'edit', 2),
('employee-schedule:export', 'export emp schedule', 'button', 'employee-schedule', 'export', 'export', 3),
('station-arrangement:view', 'view station', 'button', 'station-arrangement', 'view', 'view', 1),
('station-arrangement:edit', 'edit station', 'button', 'station-arrangement', 'edit', 'edit', 2),
('k045:view', 'view k045', 'button', 'k045', 'view', 'view', 1),
('k045:edit', 'edit k045', 'button', 'k045', 'edit', 'edit', 2),
('k045:approve', 'approve k045', 'button', 'k045', 'approve', 'approve', 3),
('da-material:view', 'view da', 'button', 'da-material', 'view', 'view', 1),
('da-material:edit', 'edit da', 'button', 'da-material', 'edit', 'edit', 2),
('da-material:approve', 'approve da', 'button', 'da-material', 'approve', 'approve', 3),
('kpi-indicators:view', 'view kpi', 'button', 'kpi-indicators', 'view', 'view', 1),
('kpi-indicators:export', 'export kpi', 'button', 'kpi-indicators', 'export', 'export', 2),
('cost-summary:view', 'view cost', 'button', 'cost-summary', 'view', 'view', 1),
('cost-summary:export', 'export cost', 'button', 'cost-summary', 'export', 'export', 2),
('production-tracking:view', 'view production', 'button', 'production-tracking', 'view', 'view', 1),
('production-tracking:export', 'export production', 'button', 'production-tracking', 'export', 'export', 2),
('bonus-evaluation:view', 'view bonus', 'button', 'bonus-evaluation', 'view', 'view', 1),
('bonus-evaluation:edit', 'edit bonus', 'button', 'bonus-evaluation', 'edit', 'edit', 2),
('bonus-evaluation:export', 'export bonus', 'button', 'bonus-evaluation', 'export', 'export', 3)`);
    console.log('Batch 1 done');

    // Batch 2
    await pool.query(`INSERT INTO jso_system_permissions (code, name, type, module, action, description, sort_order) VALUES
('employee-roster:view', 'view roster', 'button', 'employee-roster', 'view', 'view', 1),
('employee-roster:edit', 'edit roster', 'button', 'employee-roster', 'edit', 'edit', 2),
('employee-roster:export', 'export roster', 'button', 'employee-roster', 'export', 'export', 3),
('leave-management:view', 'view leave', 'button', 'leave-management', 'view', 'view', 1),
('leave-management:edit', 'edit leave', 'button', 'leave-management', 'edit', 'edit', 2),
('leave-management:approve', 'approve leave', 'button', 'leave-management', 'approve', 'approve', 3),
('convenient-print:view', 'view print', 'button', 'convenient-print', 'view', 'view', 1),
('convenient-print:edit', 'edit print', 'button', 'convenient-print', 'edit', 'edit', 2),
('convenient-print:export', 'export print', 'button', 'convenient-print', 'export', 'export', 3),
('organizational-structure:view', 'view org', 'button', 'organizational-structure', 'view', 'view', 1),
('organizational-structure:edit', 'edit org', 'button', 'organizational-structure', 'edit', 'edit', 2),
('plant-management:view', 'view plant', 'button', 'plant-management', 'view', 'view', 1),
('plant-management:edit', 'edit plant', 'button', 'plant-management', 'edit', 'edit', 2),
('department-management:view', 'view dept', 'button', 'department-management', 'view', 'view', 1),
('department-management:edit', 'edit dept', 'button', 'department-management', 'edit', 'edit', 2),
('bin-volume-management:view', 'view bin', 'button', 'bin-volume-management', 'view', 'view', 1),
('bin-volume-management:edit', 'edit bin', 'button', 'bin-volume-management', 'edit', 'edit', 2),
('expired-material-extension:view', 'view expired', 'button', 'expired-material-extension', 'view', 'view', 1),
('expired-material-extension:edit', 'edit expired', 'button', 'expired-material-extension', 'edit', 'edit', 2),
('six-s-management:view', 'view 6s', 'button', 'six-s-management', 'view', 'view', 1),
('six-s-management:edit', 'edit 6s', 'button', 'six-s-management', 'edit', 'edit', 2)`);
    console.log('Batch 2 done');

    // Batch 3
    await pool.query(`INSERT INTO jso_system_permissions (code, name, type, module, action, description, sort_order) VALUES
('k2-diff-registration:view', 'view k2', 'button', 'k2-diff-registration', 'view', 'view', 1),
('k2-diff-registration:edit', 'edit k2', 'button', 'k2-diff-registration', 'edit', 'edit', 2),
('announcement-management:view', 'view announce', 'button', 'announcement-management', 'view', 'view', 1),
('announcement-management:edit', 'edit announce', 'button', 'announcement-management', 'edit', 'edit', 2),
('user-management:view', 'view user', 'button', 'user-management', 'view', 'view', 1),
('user-management:edit', 'edit user', 'button', 'user-management', 'edit', 'edit', 2),
('role-management:view', 'view role', 'button', 'role-management', 'view', 'view', 1),
('role-management:edit', 'edit role', 'button', 
