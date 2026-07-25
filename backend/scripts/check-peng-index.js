
const { Pool } = require('pg');
const dayjs = require('dayjs');

// 数据库连接配置
const pool = new Pool({
  host: '10.114.100.171',
  port: 5432,
  database: 'stockroom_db',
  user: 'postgres',
  password: '74454321'
});

const USER_TABLE = 'jso_system_user_management';
const PLANT_TABLE = 'jso_org_plant_management';
const DEPT_TABLE = 'jso_org_department_management';

const testAPI = async () => {
  try {
    console.log('模拟 /api/schedule/employees 接口完整查询...\n');
    
    // 1. 获取所有员工（不包括超级管理员）
    let userWhere = " WHERE u.real_name != '超级管理员'";
    const userParams = [];
    
    const usersResult = await pool.query(`
      SELECT u.*, p.name as plant_name, d.name as department_name
      FROM ${USER_TABLE} u
      LEFT JOIN ${PLANT_TABLE} p ON u.plant_id = p.id
      LEFT JOIN ${DEPT_TABLE} d ON u.department_id = d.id
      ${userWhere}
      ORDER BY u.id
    `, userParams);
    
    console.log(`✅ 查询到 ${usersResult.rows.length} 个员工\n`);
    
    // 查找彭绍勇的索引
    const pengIndex = usersResult.rows.findIndex(u => u.real_name === '彭绍勇');
    if (pengIndex !== -1) {
      console.log(`✅ 彭绍勇在列表中的索引位置：${pengIndex}`);
      console.log(`   (索引从0开始，第 ${pengIndex + 1} 个员工)`);
      console.log(`   当前页大小是10，他在第 ${Math.floor(pengIndex / 10) + 1} 页`);
      
      console.log(`\n📋 员工列表前20个：`);
      usersResult.rows.slice(0, 20).forEach((u, i) => {
        const prefix = u.real_name === '彭绍勇' ? '👉' : '  ';
        console.log(`${prefix} ${i + 1}. ${u.real_name} (ID: ${u.id})`);
      });
    } else {
      console.log('❌ 未找到彭绍勇');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('错误:', error);
    process.exit(1);
  }
};

testAPI();
