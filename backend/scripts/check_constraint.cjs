const { Pool } = require('pg');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function checkConstraint() {
  let client;
  try {
    client = await pool.connect();

    console.log(`Checking for constraint 'jso_cost_summary_data_unique_fiscal_dept_position' on table 'jso_cost_summary_data'`);

    const constraintQuery = `
      SELECT 
          tc.constraint_name,
          tc.constraint_type,
          kcu.column_name
      FROM 
          information_schema.table_constraints AS tc 
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
      WHERE 
          tc.constraint_name = 'jso_cost_summary_data_unique_fiscal_dept_position'
          AND tc.table_name = 'jso_cost_summary_data';
    `;

    const result = await client.query(constraintQuery);

    if (result.rows.length > 0) {
      console.log(`✅ Constraint 'jso_cost_summary_data_unique_fiscal_dept_position' EXISTS.`);
      console.log("Associated columns:");
      result.rows.forEach(row => {
        console.log(`- ${row.column_name}`);
      });
    } else {
      console.error(`❌ Constraint 'jso_cost_summary_data_unique_fiscal_dept_position' DOES NOT EXIST.`);
    }

  } catch (err) {
    console.error('Error checking constraint:', err);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

checkConstraint();