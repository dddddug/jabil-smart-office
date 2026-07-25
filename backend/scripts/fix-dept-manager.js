const { Pool } = require('pg');

const pool = new Pool({
  host: '10.114.100.171',
  port: 5432,
  database: 'stockroom_db',
  user: 'postgres',
  password: '74454321'
});

const fixData = async () => {
  try {
    console.log('=== 检查 MPL_Stockroom 部门 (ID=2) ===');
    const mplDeptResult = await pool.query(`SELECT * FROM jso_org_department_management WHERE id = 2`);
    if (mplDeptResult.rows.length > 0) {
      console.log('MPL_Stockroom部门当前信息:', mplDeptResult.rows[0]);
      
      // 找一个存在的用户，设置为负责人
      // 可以选择 ID=48 的用户 (LINX5)
      const userResult = await pool.query(`SELECT * FROM jso_system_user_management WHERE id = 48`);
      if (userResult.rows.length > 0) {
        console.log('找到用户ID=48:', userResult.rows[0]);
        
        // 更新 MPL_Stockroom 的负责人为用户ID=48
        await pool.query(`
          UPDATE jso_org_department_management 
          SET manager_id = 48 
          WHERE id = 2
        `);
        console.log('已更新 MPL_Stockroom 部门负责人为用户ID=48 (LINX5)');
        
        // 重新查询验证
        const verifyResult = await pool.query(`
          SELECT d.*, u.real_name as manager_name 
          FROM jso_org_department_management d 
          LEFT JOIN jso_system_user_management u ON d.manager_id = u.id 
          WHERE d.id = 2
        `);
        console.log('更新后的 MPL_Stockroom 信息:', verifyResult.rows[0]);
      }
    }
    
    console.log('\n✅ 数据修复完成');
    process.exit(0);
  } catch (error) {
    console.error('修复数据失败:', error);
    process.exit(1);
  }
};

fixData();
