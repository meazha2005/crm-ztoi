'use server';

import { revalidatePath } from 'next/cache';
import { query, queryOne, execute, getDbPool } from './db';
import {
  requireAuthUser,
  requireAdminUser,
  recordAuditLog,
  createNotification,
  hashPassword,
  verifyPassword,
} from './auth';
import { addMonthsSafely, calculateNextMaintenanceDueDate, formatFrequency, formatDate } from './utils';

// Helper to generate next Project Code: PRJyy0001
export async function generateProjectCode(): Promise<string> {
  const prefix = 'PRJ';
  const year = new Date().getFullYear().toString().slice(-2);
  const row = await queryOne<{ max_id: number | null }>(
    'SELECT MAX(id) as max_id FROM ztoi_mgmnt_system_projects'
  );
  const nextId = (row?.max_id || 0) + 1;
  return `${prefix}${year}${nextId.toString().padStart(4, '0')}`;
}

// -------------------------------------------------------------
// PROJECT ACTIONS
// -------------------------------------------------------------

export async function createProjectAction(data: {
  client_name: string;
  client_email?: string;
  client_phone?: string;
  title: string;
  description?: string;
  total_amount: number;
  initial_payment?: number;
  initial_payment_mode?: string;
  initial_payment_received_by?: number;
  payment_type: 'one_time' | 'emi' | 'undecided';
  has_maintenance?: boolean;
  maintenance_amount?: number;
  maintenance_frequency?: 'monthly' | '2_months' | 'quarterly' | 'half_yearly' | 'yearly' | 'custom';
  maintenance_custom_days?: number;
  maintenance_start_date?: string;
  maintenance_next_due_date?: string;
  maintenance_status?: 'active' | 'paused' | 'cancelled';
  emi_count?: number;
  emi_frequency?: number;
  first_payment_date?: string;
  start_date: string;
  deadline_date: string;
  status: 'new' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  notes?: string;
  assigned_users?: number[];
}) {
  const user = await requireAdminUser();
  const pool = getDbPool();
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const projectCode = await generateProjectCode();
    const totalAmount = data.payment_type === 'undecided' ? 0 : Number(data.total_amount || 0);
    const initialPayment = Math.min(totalAmount, Number(data.initial_payment || 0));
    const emiCount = data.payment_type === 'emi' ? Math.max(1, Number(data.emi_count || 1)) : 1;
    const emiFreq = Math.max(1, Number(data.emi_frequency || 1));

    const hasMaintenance = Boolean(data.has_maintenance);
    const maintenanceAmount = hasMaintenance ? Number(data.maintenance_amount || 0) : 0;
    const maintenanceFreq = data.maintenance_frequency || 'monthly';
    const maintenanceCustomDays = maintenanceFreq === 'custom' ? Number(data.maintenance_custom_days || 30) : null;
    const maintenanceStartDate = hasMaintenance ? (data.maintenance_start_date || data.deadline_date || data.start_date) : null;
    const maintenanceNextDueDate = hasMaintenance ? (data.maintenance_next_due_date || maintenanceStartDate) : null;
    const maintenanceStatus = data.maintenance_status || 'active';

    // 1. Insert Project
    const [res]: any = await conn.execute(
      `INSERT INTO ztoi_mgmnt_system_projects 
      (project_code, client_name, client_email, client_phone, title, description,
       total_amount, initial_payment, initial_payment_mode, initial_payment_received_by,
       payment_type, has_maintenance, maintenance_amount, maintenance_frequency,
       maintenance_custom_days, maintenance_start_date, maintenance_next_due_date,
       maintenance_status, emi_count, emi_frequency, start_date, deadline_date, status, priority, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        projectCode,
        data.client_name.trim(),
        data.client_email?.trim() || null,
        data.client_phone?.trim() || null,
        data.title.trim(),
        data.description?.trim() || null,
        totalAmount,
        initialPayment,
        data.initial_payment_mode || null,
        data.initial_payment_received_by || null,
        data.payment_type,
        hasMaintenance ? 1 : 0,
        maintenanceAmount,
        maintenanceFreq,
        maintenanceCustomDays,
        maintenanceStartDate,
        maintenanceNextDueDate,
        maintenanceStatus,
        emiCount,
        emiFreq,
        data.start_date,
        data.deadline_date,
        data.status || 'new',
        data.priority || 'medium',
        data.notes?.trim() || null,
        user.id,
      ]
    );

    const projectId = res.insertId;

    // 2. Generate Schedule
    if (data.payment_type !== 'undecided') {
      // Down payment
      if (initialPayment > 0) {
        await conn.execute(
          `INSERT INTO ztoi_mgmnt_system_emis (project_id, emi_number, due_date, amount, status, notes)
           VALUES (?, 0, ?, ?, 'unpaid', 'Initial Down Payment')`,
          [projectId, data.start_date, initialPayment]
        );
      }

      const balance = Math.max(0, totalAmount - initialPayment);
      if (balance > 0) {
        const firstDate = data.first_payment_date || addMonthsSafely(data.start_date, 1);

        if (data.payment_type === 'emi' && emiCount > 0) {
          const baseEmi = Math.floor((balance / emiCount) * 100) / 100;
          const remainder = Math.round((balance - baseEmi * emiCount) * 100) / 100;

          for (let i = 0; i < emiCount; i++) {
            const isLast = i === emiCount - 1;
            const amount = isLast ? Number((baseEmi + remainder).toFixed(2)) : baseEmi;
            const dueDate = addMonthsSafely(firstDate, i * emiFreq);

            await conn.execute(
              `INSERT INTO ztoi_mgmnt_system_emis (project_id, emi_number, due_date, amount, status)
               VALUES (?, ?, ?, ?, 'unpaid')`,
              [projectId, i + 1, dueDate, amount]
            );
          }
        } else if (data.payment_type === 'one_time') {
          await conn.execute(
            `INSERT INTO ztoi_mgmnt_system_emis (project_id, emi_number, due_date, amount, status)
             VALUES (?, 1, ?, ?, 'unpaid')`,
            [projectId, firstDate, balance]
          );
        }
      }
    }

    // 3. Team assignments
    if (data.assigned_users && data.assigned_users.length > 0) {
      for (const uid of data.assigned_users) {
        await conn.execute(
          `INSERT INTO ztoi_mgmnt_system_project_assignments (project_id, user_id)
           VALUES (?, ?)`,
          [projectId, uid]
        );

        await createNotification(
          uid,
          'New Project Assignment',
          `You have been assigned to project: ${data.title.trim()} (${projectCode})`,
          'info',
          `/projects/${projectId}`
        );
      }
    }

    await conn.commit();
    await recordAuditLog('create', 'ztoi_mgmnt_system_projects', projectId, null, data, user.id);

    revalidatePath('/projects');
    revalidatePath('/dashboard');
    return { success: true, projectId };
  } catch (error: any) {
    await conn.rollback();
    console.error('Create project error:', error);
    return { success: false, error: error.message };
  } finally {
    conn.release();
  }
}

export async function updateProjectAction(
  id: number,
  data: {
    client_name: string;
    client_email?: string;
    client_phone?: string;
    title: string;
    description?: string;
    total_amount: number;
    initial_payment?: number;
    initial_payment_mode?: string;
    initial_payment_received_by?: number;
    payment_type: 'one_time' | 'emi' | 'undecided';
    has_maintenance?: boolean;
    maintenance_amount?: number;
    maintenance_frequency?: 'monthly' | '2_months' | 'quarterly' | 'half_yearly' | 'yearly' | 'custom';
    maintenance_custom_days?: number;
    maintenance_start_date?: string;
    maintenance_next_due_date?: string;
    maintenance_status?: 'active' | 'paused' | 'cancelled';
    emi_count?: number;
    emi_frequency?: number;
    first_payment_date?: string;
    start_date: string;
    deadline_date: string;
    status: 'new' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    notes?: string;
    assigned_users?: number[];
  }
) {
  const user = await requireAdminUser();
  const pool = getDbPool();
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [oldRows]: any = await conn.execute(
      'SELECT * FROM ztoi_mgmnt_system_projects WHERE id = ?',
      [id]
    );
    const oldProj = oldRows[0];
    if (!oldProj) throw new Error('Project not found');

    const totalAmount = data.payment_type === 'undecided' ? 0 : Number(data.total_amount || 0);
    const initialPayment = Math.min(totalAmount, Number(data.initial_payment || 0));
    const emiCount = data.payment_type === 'emi' ? Math.max(1, Number(data.emi_count || 1)) : 1;
    const emiFreq = Math.max(1, Number(data.emi_frequency || 1));

    const hasMaintenance = Boolean(data.has_maintenance);
    const maintenanceAmount = hasMaintenance ? Number(data.maintenance_amount || 0) : 0;
    const maintenanceFreq = data.maintenance_frequency || 'monthly';
    const maintenanceCustomDays = maintenanceFreq === 'custom' ? Number(data.maintenance_custom_days || 30) : null;
    const maintenanceStartDate = hasMaintenance ? (data.maintenance_start_date || oldProj.maintenance_start_date || data.deadline_date || data.start_date) : null;
    const maintenanceNextDueDate = hasMaintenance ? (data.maintenance_next_due_date || oldProj.maintenance_next_due_date || maintenanceStartDate) : null;
    const maintenanceStatus = data.maintenance_status || oldProj.maintenance_status || 'active';

    await conn.execute(
      `UPDATE ztoi_mgmnt_system_projects SET
        client_name = ?, client_email = ?, client_phone = ?, title = ?, description = ?,
        total_amount = ?, initial_payment = ?, initial_payment_mode = ?, initial_payment_received_by = ?,
        payment_type = ?, has_maintenance = ?, maintenance_amount = ?, maintenance_frequency = ?,
        maintenance_custom_days = ?, maintenance_start_date = ?, maintenance_next_due_date = ?,
        maintenance_status = ?, emi_count = ?, emi_frequency = ?, start_date = ?, deadline_date = ?,
        status = ?, priority = ?, notes = ?
       WHERE id = ?`,
      [
        data.client_name.trim(),
        data.client_email?.trim() || null,
        data.client_phone?.trim() || null,
        data.title.trim(),
        data.description?.trim() || null,
        totalAmount,
        initialPayment,
        data.initial_payment_mode || null,
        data.initial_payment_received_by || null,
        data.payment_type,
        hasMaintenance ? 1 : 0,
        maintenanceAmount,
        maintenanceFreq,
        maintenanceCustomDays,
        maintenanceStartDate,
        maintenanceNextDueDate,
        maintenanceStatus,
        emiCount,
        emiFreq,
        data.start_date,
        data.deadline_date,
        data.status,
        data.priority,
        data.notes?.trim() || null,
        id,
      ]
    );

    // Check if payment params changed
    const termsChanged =
      Number(oldProj.total_amount) !== totalAmount ||
      Number(oldProj.initial_payment) !== initialPayment ||
      oldProj.payment_type !== data.payment_type ||
      Number(oldProj.emi_count) !== emiCount ||
      Number(oldProj.emi_frequency) !== emiFreq;

    if (data.payment_type === 'undecided') {
      await conn.execute(
        "DELETE FROM ztoi_mgmnt_system_emis WHERE project_id = ? AND status != 'paid' AND paid_amount = 0",
        [id]
      );
    } else if (termsChanged) {
      // Keep paid EMIs, delete unpaid
      const [paidRows]: any = await conn.execute(
        "SELECT COUNT(*) as paid_count, COALESCE(SUM(paid_amount), 0) as paid_sum FROM ztoi_mgmnt_system_emis WHERE project_id = ? AND (status = 'paid' OR paid_amount > 0)",
        [id]
      );
      const paidSum = Number(paidRows[0]?.paid_sum || 0);

      await conn.execute(
        "DELETE FROM ztoi_mgmnt_system_emis WHERE project_id = ? AND status = 'unpaid' AND paid_amount = 0",
        [id]
      );

      const remainingBalance = Math.max(0, totalAmount - paidSum);
      if (remainingBalance > 0) {
        const [existingCount]: any = await conn.execute(
          'SELECT COUNT(*) as cnt FROM ztoi_mgmnt_system_emis WHERE project_id = ?',
          [id]
        );
        const alreadyCount = Number(existingCount[0]?.cnt || 0);
        const installmentsNeeded = Math.max(1, emiCount - alreadyCount);
        const baseEmi = Math.floor((remainingBalance / installmentsNeeded) * 100) / 100;
        const remainder = Math.round((remainingBalance - baseEmi * installmentsNeeded) * 100) / 100;
        const firstDate = data.first_payment_date || addMonthsSafely(data.start_date, 1);

        for (let i = 0; i < installmentsNeeded; i++) {
          const isLast = i === installmentsNeeded - 1;
          const amt = isLast ? Number((baseEmi + remainder).toFixed(2)) : baseEmi;
          const due = addMonthsSafely(firstDate, i * emiFreq);

          await conn.execute(
            `INSERT INTO ztoi_mgmnt_system_emis (project_id, emi_number, due_date, amount, status)
             VALUES (?, ?, ?, ?, 'unpaid')`,
            [id, alreadyCount + i + 1, due, amt]
          );
        }
      }
    }

    // Update assignments
    if (data.assigned_users) {
      await conn.execute(
        'DELETE FROM ztoi_mgmnt_system_project_assignments WHERE project_id = ?',
        [id]
      );
      for (const uid of data.assigned_users) {
        await conn.execute(
          'INSERT INTO ztoi_mgmnt_system_project_assignments (project_id, user_id) VALUES (?, ?)',
          [id, uid]
        );
      }
    }

    await conn.commit();
    await recordAuditLog('update', 'ztoi_mgmnt_system_projects', id, oldProj, data, user.id);

    revalidatePath(`/projects/${id}`);
    revalidatePath('/projects');
    return { success: true };
  } catch (error: any) {
    await conn.rollback();
    console.error('Update project error:', error);
    return { success: false, error: error.message };
  } finally {
    conn.release();
  }
}

export async function updateProjectSubmissionAction(id: number, submittedDate: string) {
  const user = await requireAuthUser();
  await execute(
    `UPDATE ztoi_mgmnt_system_projects 
     SET submitted_date = ?, status = 'completed'
     WHERE id = ?`,
    [submittedDate, id]
  );
  await recordAuditLog('submit', 'ztoi_mgmnt_system_projects', id, null, { submittedDate }, user.id);
  revalidatePath(`/projects/${id}`);
  revalidatePath('/projects');
  return { success: true };
}

// -------------------------------------------------------------
// EMI PAYMENT ACTIONS
// -------------------------------------------------------------

export async function recordEmiPaymentAction(data: {
  emiId: number;
  paymentAmount: number;
  paymentDate: string;
  paymentMethod: 'cash' | 'bank_transfer' | 'upi' | 'cheque' | 'card' | 'other';
  transactionId?: string;
  receivedBy?: string;
  referenceNumber?: string;
  receipt_url?: string;
  notes?: string;
}) {
  const user = await requireAdminUser();
  const pool = getDbPool();
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [emiRows]: any = await conn.execute(
      `SELECT e.*, p.project_code, p.title as project_title, p.client_name 
       FROM ztoi_mgmnt_system_emis e
       JOIN ztoi_mgmnt_system_projects p ON e.project_id = p.id
       WHERE e.id = ?`,
      [data.emiId]
    );
    const emi = emiRows[0];
    if (!emi) throw new Error('EMI installment not found');

    const paymentAmount = Number(data.paymentAmount);
    const currentPaid = Number(emi.paid_amount || 0);
    const emiAmount = Number(emi.amount);
    const pending = emiAmount - currentPaid;

    if (paymentAmount <= 0 || paymentAmount > pending + 0.01) {
      throw new Error(`Invalid payment amount. Maximum allowed: ₹${pending.toFixed(2)}`);
    }

    // 1. Post to General Ledger as Income
    const description = `EMI #${emi.emi_number} payment for ${emi.project_code} - ${emi.project_title}`;
    const [ledgRes]: any = await conn.execute(
      `INSERT INTO ztoi_mgmnt_system_ledger (
        transaction_date, type, category, amount, reference_type, reference_id,
        description, payment_method, transaction_id, received_by, reference_number, receipt_url, notes, created_by
      ) VALUES (?, 'income', 'EMI Payment', ?, 'emi', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.paymentDate,
        paymentAmount,
        data.emiId,
        description,
        data.paymentMethod,
        data.transactionId || null,
        data.receivedBy || null,
        data.referenceNumber || null,
        data.receipt_url || null,
        data.notes || null,
        user.id,
      ]
    );
    const ledgerId = ledgRes.insertId;

    // 2. Update EMI Record
    const newPaidAmount = currentPaid + paymentAmount;
    const newStatus = newPaidAmount >= emiAmount - 0.01 ? 'paid' : 'partial';
    const paidDate = newStatus === 'paid' ? data.paymentDate : null;

    let auditNote = `\n[${data.paymentDate}] Payment of ₹${paymentAmount.toFixed(2)} via ${data.paymentMethod}`;
    if (data.transactionId) auditNote += ` (Txn: ${data.transactionId})`;
    if (data.receivedBy) auditNote += ` (Received by: ${data.receivedBy})`;

    await conn.execute(
      `UPDATE ztoi_mgmnt_system_emis SET
        paid_amount = ?, status = ?, paid_date = ?, ledger_id = ?, receipt_url = IFNULL(?, receipt_url),
        notes = CONCAT(IFNULL(notes, ''), ?)
       WHERE id = ?`,
      [newPaidAmount, newStatus, paidDate, ledgerId, data.receipt_url || null, auditNote, data.emiId]
    );

    await conn.commit();
    await recordAuditLog('payment', 'ztoi_mgmnt_system_emis', data.emiId, { currentPaid }, { newPaidAmount, ledgerId }, user.id);

    revalidatePath(`/emis/${data.emiId}`);
    revalidatePath('/emis');
    revalidatePath('/ledger');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error: any) {
    await conn.rollback();
    console.error('Payment record error:', error);
    return { success: false, error: error.message };
  } finally {
    conn.release();
  }
}

// -------------------------------------------------------------
// EXPENSE ACTIONS
// -------------------------------------------------------------

export async function createExpenseAction(data: {
  category_id: number;
  expense_date: string;
  amount: number;
  description: string;
  payment_method: 'cash' | 'bank_transfer' | 'upi' | 'cheque' | 'card' | 'other';
  receipt_url?: string;
  notes?: string;
}) {
  const user = await requireAdminUser();
  const pool = getDbPool();
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // Get Category name
    const [catRows]: any = await conn.execute(
      'SELECT name FROM ztoi_mgmnt_system_expense_categories WHERE id = ?',
      [data.category_id]
    );
    const catName = catRows[0]?.name || 'Expense';

    // 1. Ledger Entry
    const [ledgRes]: any = await conn.execute(
      `INSERT INTO ztoi_mgmnt_system_ledger (
        transaction_date, type, category, amount, reference_type, description,
        payment_method, receipt_url, notes, created_by
      ) VALUES (?, 'expense', ?, ?, 'expense', ?, ?, ?, ?, ?)`,
      [
        data.expense_date,
        catName,
        data.amount,
        data.description.trim(),
        data.payment_method,
        data.receipt_url || null,
        data.notes || null,
        user.id,
      ]
    );
    const ledgerId = ledgRes.insertId;

    // 2. Expense Entry
    const [expRes]: any = await conn.execute(
      `INSERT INTO ztoi_mgmnt_system_expenses (
        category_id, expense_date, amount, description, receipt_url, payment_method,
        ledger_id, notes, status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
      [
        data.category_id,
        data.expense_date,
        data.amount,
        data.description.trim(),
        data.receipt_url || null,
        data.payment_method,
        ledgerId,
        data.notes || null,
        user.id,
      ]
    );
    const expenseId = expRes.insertId;

    // Link reference in ledger
    await conn.execute(
      'UPDATE ztoi_mgmnt_system_ledger SET reference_id = ? WHERE id = ?',
      [expenseId, ledgerId]
    );

    await conn.commit();
    await recordAuditLog('create', 'ztoi_mgmnt_system_expenses', expenseId, null, data, user.id);

    revalidatePath('/expenses');
    revalidatePath('/ledger');
    revalidatePath('/dashboard');
    return { success: true, expenseId };
  } catch (error: any) {
    await conn.rollback();
    console.error('Create expense error:', error);
    return { success: false, error: error.message };
  } finally {
    conn.release();
  }
}

export async function deleteExpenseAction(id: number, reason: string) {
  const user = await requireAdminUser();
  const pool = getDbPool();
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [expRows]: any = await conn.execute(
      'SELECT * FROM ztoi_mgmnt_system_expenses WHERE id = ?',
      [id]
    );
    const expense = expRows[0];
    if (!expense) throw new Error('Expense record not found');

    // Soft delete expense
    await conn.execute(
      "UPDATE ztoi_mgmnt_system_expenses SET status = 'inactive' WHERE id = ?",
      [id]
    );

    // Soft delete ledger entry if exists
    if (expense.ledger_id) {
      await conn.execute(
        `UPDATE ztoi_mgmnt_system_ledger SET
          status = 'inactive', deleted_reason = ?, deleted_by = ?, deleted_at = NOW()
         WHERE id = ?`,
        [reason.trim(), user.id, expense.ledger_id]
      );
    }

    await conn.commit();
    await recordAuditLog('delete', 'ztoi_mgmnt_system_expenses', id, null, { reason }, user.id);

    revalidatePath('/expenses');
    revalidatePath('/ledger');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error: any) {
    await conn.rollback();
    console.error('Delete expense error:', error);
    return { success: false, error: error.message };
  } finally {
    conn.release();
  }
}

// -------------------------------------------------------------
// LEDGER ACTIONS
// -------------------------------------------------------------

export async function addManualIncomeAction(data: {
  transaction_date: string;
  amount: number;
  category?: string;
  received_by?: string;
  description: string;
  payment_method?: 'cash' | 'bank_transfer' | 'upi' | 'cheque' | 'card' | 'other';
  reference_number?: string;
}) {
  const user = await requireAdminUser();
  const [res]: any = await execute(
    `INSERT INTO ztoi_mgmnt_system_ledger (
      transaction_date, type, category, amount, reference_type, description,
      payment_method, received_by, reference_number, created_by, status
    ) VALUES (?, 'income', ?, ?, 'manual_income', ?, ?, ?, ?, ?, 'active')`,
    [
      data.transaction_date,
      data.category?.trim() || 'General Income',
      data.amount,
      data.description.trim(),
      data.payment_method || 'cash',
      data.received_by || user.full_name,
      data.reference_number || null,
      user.id,
    ]
  );

  await recordAuditLog('create', 'ztoi_mgmnt_system_ledger', res.insertId, null, data, user.id);
  revalidatePath('/ledger');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function deleteLedgerEntryAction(id: number, reason: string) {
  const user = await requireAdminUser();
  const pool = getDbPool();
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // 1. Soft delete ledger entry
    await conn.execute(
      `UPDATE ztoi_mgmnt_system_ledger SET
        status = 'inactive', deleted_reason = ?, deleted_by = ?, deleted_at = NOW()
       WHERE id = ?`,
      [reason.trim(), user.id, id]
    );

    // 2. If it was linked to an EMI, revert the EMI payment!
    await conn.execute(
      `UPDATE ztoi_mgmnt_system_emis SET
        ledger_id = NULL, paid_amount = 0, status = 'unpaid', paid_date = NULL
       WHERE ledger_id = ?`,
      [id]
    );

    // 3. If it was linked to an expense, soft delete the expense
    await conn.execute(
      "UPDATE ztoi_mgmnt_system_expenses SET status = 'inactive' WHERE ledger_id = ?",
      [id]
    );

    await conn.commit();
    await recordAuditLog('delete', 'ztoi_mgmnt_system_ledger', id, null, { reason }, user.id);

    revalidatePath('/ledger');
    revalidatePath('/emis');
    revalidatePath('/expenses');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error: any) {
    await conn.rollback();
    console.error('Delete ledger entry error:', error);
    return { success: false, error: error.message };
  } finally {
    conn.release();
  }
}

// -------------------------------------------------------------
// SALARY & PAYROLL ACTIONS
// -------------------------------------------------------------

export async function createSalaryAction(data: {
  user_id: number;
  month_year: string;
  base_salary: number;
  bonus?: number;
  deductions?: number;
  notes?: string;
}) {
  const admin = await requireAdminUser();
  const base = Number(data.base_salary || 0);
  const bonus = Number(data.bonus || 0);
  const deductions = Number(data.deductions || 0);
  const netSalary = base + bonus - deductions;

  // Check unique month
  const existing = await queryOne(
    'SELECT id FROM ztoi_mgmnt_system_salaries WHERE user_id = ? AND month_year = ?',
    [data.user_id, data.month_year]
  );
  if (existing) {
    return { success: false, error: 'Salary record for this employee and month already exists' };
  }

  const res = await execute(
    `INSERT INTO ztoi_mgmnt_system_salaries (
      user_id, month_year, base_salary, bonus, deductions, net_salary, notes, created_by, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [
      data.user_id,
      data.month_year,
      base,
      bonus,
      deductions,
      netSalary,
      data.notes?.trim() || null,
      admin.id,
    ]
  );

  await recordAuditLog('create', 'ztoi_mgmnt_system_salaries', res.insertId, null, data, admin.id);
  revalidatePath('/salaries');
  return { success: true };
}

export async function updateSalaryAction(
  id: number,
  data: {
    base_salary: number;
    bonus?: number;
    deductions?: number;
    notes?: string;
  }
) {
  const admin = await requireAdminUser();
  const salary = await queryOne<any>(
    'SELECT status FROM ztoi_mgmnt_system_salaries WHERE id = ?',
    [id]
  );
  if (!salary) return { success: false, error: 'Salary record not found' };
  if (salary.status === 'paid') return { success: false, error: 'Cannot edit an already paid salary' };

  const base = Number(data.base_salary || 0);
  const bonus = Number(data.bonus || 0);
  const deductions = Number(data.deductions || 0);
  const netSalary = base + bonus - deductions;

  await execute(
    `UPDATE ztoi_mgmnt_system_salaries SET
      base_salary = ?, bonus = ?, deductions = ?, net_salary = ?, notes = ?
     WHERE id = ?`,
    [base, bonus, deductions, netSalary, data.notes?.trim() || null, id]
  );

  await recordAuditLog('update', 'ztoi_mgmnt_system_salaries', id, null, data, admin.id);
  revalidatePath('/salaries');
  return { success: true };
}

export async function paySalaryAction(
  id: number,
  paidDate: string,
  paymentMode: string
) {
  const admin = await requireAdminUser();
  const pool = getDbPool();
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [salRows]: any = await conn.execute(
      `SELECT s.*, u.full_name 
       FROM ztoi_mgmnt_system_salaries s
       JOIN ztoi_mgmnt_system_users u ON s.user_id = u.id
       WHERE s.id = ?`,
      [id]
    );
    const salary = salRows[0];
    if (!salary || salary.status === 'paid') {
      throw new Error('Salary record not found or already paid');
    }

    const desc = `Salary payout for ${salary.full_name} (${salary.month_year}) via ${paymentMode}`;

    // 1. Ledger Entry
    const [ledgRes]: any = await conn.execute(
      `INSERT INTO ztoi_mgmnt_system_ledger (
        transaction_date, type, category, amount, reference_type, reference_id,
        description, payment_method, created_by
      ) VALUES (?, 'expense', 'Salary', ?, 'salary', ?, ?, ?, ?)`,
      [
        paidDate,
        salary.net_salary,
        id,
        desc,
        paymentMode.toLowerCase(),
        admin.id,
      ]
    );
    const ledgerId = ledgRes.insertId;

    // 2. Mark salary as paid
    await conn.execute(
      `UPDATE ztoi_mgmnt_system_salaries SET
        status = 'paid', paid_date = ?, payment_mode = ?, ledger_id = ?
       WHERE id = ?`,
      [paidDate, paymentMode, ledgerId, id]
    );

    await conn.commit();
    await recordAuditLog('pay', 'ztoi_mgmnt_system_salaries', id, null, { paidDate, paymentMode }, admin.id);

    revalidatePath('/salaries');
    revalidatePath('/ledger');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error: any) {
    await conn.rollback();
    console.error('Pay salary error:', error);
    return { success: false, error: error.message };
  } finally {
    conn.release();
  }
}

// -------------------------------------------------------------
// USER & PROFILE ACTIONS
// -------------------------------------------------------------

export async function createUserAction(data: {
  username: string;
  email: string;
  password: string;
  full_name: string;
  role: 'admin' | 'team_member';
  phone?: string;
  status: 'active' | 'inactive';
}) {
  const admin = await requireAdminUser();
  const hashedPassword = await hashPassword(data.password);

  try {
    const res = await execute(
      `INSERT INTO ztoi_mgmnt_system_users (username, email, password, full_name, role, phone, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        data.username.trim(),
        data.email.trim(),
        hashedPassword,
        data.full_name.trim(),
        data.role,
        data.phone?.trim() || null,
        data.status || 'active',
      ]
    );
    await recordAuditLog('create', 'ztoi_mgmnt_system_users', res.insertId, null, data, admin.id);
    revalidatePath('/users');
    return { success: true };
  } catch (err: any) {
    if (err.message.includes('Duplicate')) {
      return { success: false, error: 'Username or email already exists' };
    }
    return { success: false, error: err.message };
  }
}

export async function updateUserAction(
  id: number,
  data: {
    username: string;
    email: string;
    password?: string;
    full_name: string;
    role: 'admin' | 'team_member';
    phone?: string;
    status: 'active' | 'inactive';
  }
) {
  const admin = await requireAdminUser();
  try {
    let sql = `UPDATE ztoi_mgmnt_system_users SET
      username = ?, email = ?, full_name = ?, role = ?, phone = ?, status = ?`;
    const params: any[] = [
      data.username.trim(),
      data.email.trim(),
      data.full_name.trim(),
      data.role,
      data.phone?.trim() || null,
      data.status,
    ];

    if (data.password && data.password.trim().length >= 6) {
      const hashed = await hashPassword(data.password.trim());
      sql += ', password = ?';
      params.push(hashed);
    }

    sql += ' WHERE id = ?';
    params.push(id);

    await execute(sql, params);
    await recordAuditLog('update', 'ztoi_mgmnt_system_users', id, null, data, admin.id);
    revalidatePath('/users');
    return { success: true };
  } catch (err: any) {
    if (err.message.includes('Duplicate')) {
      return { success: false, error: 'Username or email already exists' };
    }
    return { success: false, error: err.message };
  }
}

export async function updateProfileAction(data: {
  full_name: string;
  email: string;
  phone?: string;
  avatar?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireAuthUser();
    let sql = 'UPDATE ztoi_mgmnt_system_users SET full_name = ?, email = ?, phone = ?';
    const params: any[] = [data.full_name.trim(), data.email.trim(), data.phone?.trim() || null];

    if (data.avatar !== undefined) {
      sql += ', avatar = ?';
      params.push(data.avatar || null);
    }

    sql += ' WHERE id = ?';
    params.push(user.id);

    await execute(sql, params);
    await recordAuditLog('update_profile', 'ztoi_mgmnt_system_users', user.id, null, data, user.id);
    revalidatePath('/', 'layout');
    revalidatePath('/profile');
    revalidatePath('/dashboard');
    revalidatePath('/projects');
    revalidatePath('/users');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function changePasswordAction(currentPass: string, newPass: string, confirmPass: string) {
  const user = await requireAuthUser();
  if (newPass !== confirmPass) {
    return { success: false, error: 'New password and confirmation do not match' };
  }
  if (newPass.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters' };
  }

  const row = await queryOne<any>('SELECT password FROM ztoi_mgmnt_system_users WHERE id = ?', [user.id]);
  const isMatch = await verifyPassword(currentPass, row?.password);
  if (!isMatch) {
    return { success: false, error: 'Current password is incorrect' };
  }

  const hashed = await hashPassword(newPass);
  await execute('UPDATE ztoi_mgmnt_system_users SET password = ? WHERE id = ?', [hashed, user.id]);
  await recordAuditLog('password_change', 'ztoi_mgmnt_system_users', user.id, null, null, user.id);
  return { success: true };
}

// -------------------------------------------------------------
// SETTINGS & CATEGORIES
// -------------------------------------------------------------

export async function updateSettingsAction(settingsMap: Record<string, string>): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = await requireAdminUser();
    for (const [key, val] of Object.entries(settingsMap)) {
      await execute(
        `INSERT INTO ztoi_mgmnt_system_settings (setting_key, setting_value)
         VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
        [key, val]
      );
    }
    await recordAuditLog('update_settings', 'ztoi_mgmnt_system_settings', null, null, settingsMap, admin.id);
    revalidatePath('/settings');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createExpenseCategoryAction(name: string, description?: string, color?: string) {
  const admin = await requireAdminUser();
  try {
    const res = await execute(
      'INSERT INTO ztoi_mgmnt_system_expense_categories (name, description, color, status) VALUES (?, ?, ?, "active")',
      [name.trim(), description?.trim() || null, color || '#FF4D00']
    );
    await recordAuditLog('create', 'ztoi_mgmnt_system_expense_categories', res.insertId, null, { name }, admin.id);
    revalidatePath('/settings');
    revalidatePath('/expenses');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteExpenseCategoryAction(id: number) {
  const admin = await requireAdminUser();
  const countRow = await queryOne<any>(
    'SELECT COUNT(*) as cnt FROM ztoi_mgmnt_system_expenses WHERE category_id = ?',
    [id]
  );
  if (countRow?.cnt > 0) {
    return { success: false, error: `Category is currently in use by ${countRow.cnt} expense(s)` };
  }

  await execute('DELETE FROM ztoi_mgmnt_system_expense_categories WHERE id = ?', [id]);
  await recordAuditLog('delete', 'ztoi_mgmnt_system_expense_categories', id, null, null, admin.id);
  revalidatePath('/settings');
  revalidatePath('/expenses');
  return { success: true };
}

export async function markAllNotificationsReadAction(): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireAuthUser();
    await execute('UPDATE ztoi_mgmnt_system_notifications SET is_read = 1 WHERE user_id = ?', [user.id]);
    revalidatePath('/notifications');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// -------------------------------------------------------------
// MAINTENANCE ACTIONS
// -------------------------------------------------------------

export async function recordMaintenancePaymentAction(data: {
  projectId: number;
  amount: number;
  paymentDate: string;
  billingPeriodStart?: string;
  billingPeriodEnd?: string;
  paymentMethod: 'cash' | 'bank_transfer' | 'upi' | 'cheque' | 'card' | 'other';
  transactionId?: string;
  referenceNumber?: string;
  receivedBy?: string;
  receipt_url?: string;
  notes?: string;
  advanceNextDueDate?: boolean;
}): Promise<{
  success: boolean;
  paymentId?: number;
  receiptData?: any;
  error?: string;
}> {
  const user = await requireAdminUser();
  const pool = getDbPool();
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [projRows]: any = await conn.execute(
      'SELECT * FROM ztoi_mgmnt_system_projects WHERE id = ?',
      [data.projectId]
    );
    const project = projRows[0];
    if (!project) throw new Error('Project not found');

    const paymentAmount = Number(data.amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      throw new Error('Please enter a valid maintenance fee payment amount');
    }

    // 1. Post to General Ledger as Income under category 'Maintenance Fee'
    const periodDesc = data.billingPeriodStart
      ? ` (${data.billingPeriodStart}${data.billingPeriodEnd ? ' to ' + data.billingPeriodEnd : ''})`
      : '';
    const description = `Maintenance fee for ${project.project_code} - ${project.title}${periodDesc}`;

    const [ledgRes]: any = await conn.execute(
      `INSERT INTO ztoi_mgmnt_system_ledger (
        transaction_date, type, category, amount, reference_type, reference_id,
        description, payment_method, transaction_id, received_by, reference_number, receipt_url, notes, created_by
      ) VALUES (?, 'income', 'Maintenance Fee', ?, 'maintenance', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.paymentDate,
        paymentAmount,
        data.projectId,
        description,
        data.paymentMethod,
        data.transactionId || null,
        data.receivedBy || null,
        data.referenceNumber || null,
        data.receipt_url || null,
        data.notes || null,
        user.id,
      ]
    );
    const ledgerId = ledgRes.insertId;

    // 2. Insert into ztoi_mgmnt_system_maintenance_payments
    const [payRes]: any = await conn.execute(
      `INSERT INTO ztoi_mgmnt_system_maintenance_payments (
        project_id, amount, billing_period_start, billing_period_end, payment_date,
        due_date, payment_method, transaction_id, reference_number, received_by,
        receipt_url, ledger_id, status, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'paid', ?, ?)`,
      [
        data.projectId,
        paymentAmount,
        data.billingPeriodStart || null,
        data.billingPeriodEnd || null,
        data.paymentDate,
        project.maintenance_next_due_date || data.paymentDate,
        data.paymentMethod,
        data.transactionId || null,
        data.referenceNumber || null,
        data.receivedBy || null,
        data.receipt_url || null,
        ledgerId,
        data.notes || null,
        user.id,
      ]
    );
    const paymentId = payRes.insertId;

    // 3. Advance Next Due Date if requested (default: true)
    let nextDue = project.maintenance_next_due_date;
    if (data.advanceNextDueDate !== false) {
      const baseDueDate = project.maintenance_next_due_date || data.billingPeriodEnd || data.paymentDate;
      nextDue = calculateNextMaintenanceDueDate(
        baseDueDate,
        project.maintenance_frequency || 'monthly',
        project.maintenance_custom_days
      );
      await conn.execute(
        'UPDATE ztoi_mgmnt_system_projects SET maintenance_next_due_date = ?, maintenance_status = "active" WHERE id = ?',
        [nextDue, data.projectId]
      );
    }

    await conn.commit();
    await recordAuditLog('maintenance_payment', 'ztoi_mgmnt_system_maintenance_payments', paymentId, null, data, user.id);

    revalidatePath('/maintenance');
    revalidatePath(`/projects/${data.projectId}`);
    revalidatePath('/projects');
    revalidatePath('/ledger');
    revalidatePath('/dashboard');

    return {
      success: true,
      paymentId,
      receiptData: {
        type: 'income',
        receiptNo: `MNT-${String(paymentId).padStart(5, '0')}`,
        date: data.paymentDate,
        title: 'Maintenance Fee Collection Voucher',
        partyName: project.client_name,
        partyContact: project.client_phone || project.client_email,
        projectCode: project.project_code,
        projectTitle: project.title,
        category: 'Maintenance Fee',
        description,
        amount: paymentAmount,
        paymentMethod: data.paymentMethod,
        transactionId: data.transactionId,
        referenceNumber: data.referenceNumber,
        handledBy: data.receivedBy,
        notes: data.notes,
        attachedFileUrl: data.receipt_url,
      },
    };
  } catch (error: any) {
    await conn.rollback();
    console.error('Maintenance payment record error:', error);
    return { success: false, error: error.message };
  } finally {
    conn.release();
  }
}

export async function updateMaintenanceTermsAction(
  projectId: number,
  data: {
    has_maintenance: boolean;
    maintenance_amount: number;
    maintenance_frequency: 'monthly' | '2_months' | 'quarterly' | 'half_yearly' | 'yearly' | 'custom';
    maintenance_custom_days?: number;
    maintenance_start_date?: string;
    maintenance_next_due_date?: string;
    maintenance_status?: 'active' | 'paused' | 'cancelled';
  }
) {
  const user = await requireAdminUser();
  try {
    const hasMaintenance = Boolean(data.has_maintenance);
    const amount = hasMaintenance ? Number(data.maintenance_amount || 0) : 0;
    const freq = data.maintenance_frequency || 'monthly';
    const customDays = freq === 'custom' ? Number(data.maintenance_custom_days || 30) : null;
    const startDate = hasMaintenance ? (data.maintenance_start_date || null) : null;
    const nextDue = hasMaintenance ? (data.maintenance_next_due_date || startDate) : null;
    const status = data.maintenance_status || 'active';

    await execute(
      `UPDATE ztoi_mgmnt_system_projects SET
        has_maintenance = ?,
        maintenance_amount = ?,
        maintenance_frequency = ?,
        maintenance_custom_days = ?,
        maintenance_start_date = ?,
        maintenance_next_due_date = ?,
        maintenance_status = ?
       WHERE id = ?`,
      [hasMaintenance ? 1 : 0, amount, freq, customDays, startDate, nextDue, status, projectId]
    );

    await recordAuditLog('update_maintenance_terms', 'ztoi_mgmnt_system_projects', projectId, null, data, user.id);

    revalidatePath('/maintenance');
    revalidatePath(`/projects/${projectId}`);
    revalidatePath('/projects');
    return { success: true };
  } catch (error: any) {
    console.error('Update maintenance terms error:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteMaintenancePaymentAction(paymentId: number, reason?: string) {
  const user = await requireAdminUser();
  const pool = getDbPool();
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [payRows]: any = await conn.execute(
      'SELECT * FROM ztoi_mgmnt_system_maintenance_payments WHERE id = ?',
      [paymentId]
    );
    const payment = payRows[0];
    if (!payment) throw new Error('Payment record not found');

    if (payment.ledger_id) {
      await conn.execute(
        `UPDATE ztoi_mgmnt_system_ledger SET status = 'inactive', deleted_reason = ?, deleted_by = ?, deleted_at = NOW() WHERE id = ?`,
        [reason || 'Maintenance payment deleted', user.id, payment.ledger_id]
      );
    }

    await conn.execute('DELETE FROM ztoi_mgmnt_system_maintenance_payments WHERE id = ?', [paymentId]);

    await conn.commit();
    await recordAuditLog('delete_maintenance_payment', 'ztoi_mgmnt_system_maintenance_payments', paymentId, payment, { reason }, user.id);

    revalidatePath('/maintenance');
    revalidatePath(`/projects/${payment.project_id}`);
    revalidatePath('/ledger');
    revalidatePath('/dashboard');

    return { success: true };
  } catch (error: any) {
    await conn.rollback();
    console.error('Delete maintenance payment error:', error);
    return { success: false, error: error.message };
  } finally {
    conn.release();
  }
}

