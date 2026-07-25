import pool from '../config/db.js';
import { OPERATION_LOGS_TABLE } from '../config/db_constants.js';

export const logOperation = async ({ module, action, accountId, accountName, targetId = null, details = {} }) => {
  try {
    const query = `
      INSERT INTO ${OPERATION_LOGS_TABLE} (
        module, action, account_id, account_name, target_id, details
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const values = [module, action, accountId, accountName, targetId, details];
    await pool.query(query, values);
  } catch (error) {
    console.error('Failed to log operation:', error);
    // Depending on requirements, we might throw the error or just log it and continue.
    // For now, just log and don't block the main operation.
  }
};
