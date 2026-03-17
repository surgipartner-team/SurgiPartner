import mysql from 'mysql2/promise';

let pool;

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'surgipartner',
  port: parseInt(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  timezone: '+05:30',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
};

export async function getConnection() {
  if (!pool) {
    pool = mysql.createPool(dbConfig);
  }
  return pool;
}

export async function query(sql, params) {
  try {
    const connection = await getConnection();
    const [results] = await connection.execute(sql, params);
    return results;
  } catch (error) {
    console.error('Database query error:', error);
    
    // Provide specific error messages based on error codes
    if (error.code === 'ER_DUP_ENTRY') {
      const match = error.sqlMessage?.match(/Duplicate entry '(.*)' for key '.*\.(.*)'/);
      const field = match ? match[2].replace(/_/g, ' ') : 'field';
      const value = match && match[1] ? match[1] : 'value';
      throw new Error(`Duplicate ${field}: ${value || 'This value'} already exists`);
    }
    
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      throw new Error('Referenced record does not exist');
    }
    
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      throw new Error('Cannot delete: Record is being used by other data');
    }
    
    if (error.code === 'ER_BAD_FIELD_ERROR') {
      throw new Error('Invalid field in database query');
    }
    
    // Generic fallback with error code
    throw new Error(error.sqlMessage || error.message || 'Database operation failed');
  }
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}