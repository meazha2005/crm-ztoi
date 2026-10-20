import mysql from 'mysql2/promise';

let pool: mysql.Pool;

export function getDbPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || '192.169.147.255',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USER || 'MEAZHA',
      password: process.env.DB_PASS || 'dZYRYi(o(0*U',
      database: process.env.DB_NAME || 'le_test',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
    });
  }
  return pool;
}

export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const db = getDbPool();
  const [rows] = await db.query(sql, params);
  return rows as T[];
}

export async function queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export async function execute(sql: string, params: any[] = []): Promise<mysql.ResultSetHeader> {
  const db = getDbPool();
  const [result] = await db.execute(sql, params);
  return result as mysql.ResultSetHeader;
}

export default getDbPool;
