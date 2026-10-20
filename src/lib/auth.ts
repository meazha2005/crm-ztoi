import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { query, queryOne, execute } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'ztoi_tech_management_super_secure_secret_key_2026_x89q';
const COOKIE_NAME = 'ztoi_auth_token';

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: 'admin' | 'team_member';
  phone?: string | null;
  avatar?: string | null;
  status: 'active' | 'inactive';
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  if (!plain || !hash) return false;
  // Normalize PHP $2y$ prefix to $2a$ so bcryptjs handles it without error
  const normalizedHash = hash.startsWith('$2y$') ? hash.replace('$2y$', '$2a$') : hash;
  return bcrypt.compare(plain, normalizedHash);
}

export async function hashPassword(plain: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plain, salt);
}

export function createToken(user: AuthUser): string {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

export async function getSessionUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const payload = verifyToken(token);
    if (!payload?.id) return null;

    const user = await queryOne<AuthUser>(
      'SELECT id, username, email, full_name, role, phone, avatar, status FROM ztoi_mgmnt_system_users WHERE id = ? AND status = "active"',
      [payload.id]
    );

    return user || null;
  } catch (error) {
    return null;
  }
}

export async function requireAuthUser(): Promise<AuthUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new Error('UNAUTHORIZED');
  }
  return user;
}

export async function requireAdminUser(): Promise<AuthUser> {
  const user = await requireAuthUser();
  if (user.role !== 'admin') {
    throw new Error('FORBIDDEN');
  }
  return user;
}

export async function recordAuditLog(
  action: string,
  tableName: string,
  recordId: number | null = null,
  oldValues: any = null,
  newValues: any = null,
  userId: number | null = null,
  ipAddress: string = '',
  userAgent: string = ''
) {
  try {
    await execute(
      `INSERT INTO ztoi_mgmnt_system_audit_logs 
      (user_id, action, table_name, record_id, old_values, new_values, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        action,
        tableName,
        recordId,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        ipAddress || '127.0.0.1',
        userAgent || 'Web Client',
      ]
    );
  } catch (err) {
    console.error('Audit log failed:', err);
  }
}

export async function createNotification(
  userId: number,
  title: string,
  message: string,
  type: 'info' | 'warning' | 'success' | 'danger' = 'info',
  link: string | null = null
) {
  try {
    await execute(
      `INSERT INTO ztoi_mgmnt_system_notifications (user_id, title, message, type, link)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, title, message, type, link]
    );
  } catch (err) {
    console.error('Notification creation failed:', err);
  }
}

export { COOKIE_NAME };
