const mysql = require('mysql2/promise');

async function runMigration() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '192.169.147.255',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'MEAZHA',
    password: process.env.DB_PASS || 'dZYRYi(o(0*U',
    database: process.env.DB_NAME || 'le_test',
  });

  console.log('Connected to MySQL. Inspecting ztoi_mgmnt_system_projects...');

  const [cols] = await conn.execute('DESCRIBE ztoi_mgmnt_system_projects');
  const existingCols = cols.map(c => c.Field);

  if (!existingCols.includes('has_maintenance')) {
    await conn.execute('ALTER TABLE ztoi_mgmnt_system_projects ADD COLUMN has_maintenance TINYINT(1) NOT NULL DEFAULT 0 AFTER payment_type');
    console.log('Added has_maintenance');
  }
  if (!existingCols.includes('maintenance_amount')) {
    await conn.execute('ALTER TABLE ztoi_mgmnt_system_projects ADD COLUMN maintenance_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER has_maintenance');
    console.log('Added maintenance_amount');
  }
  if (!existingCols.includes('maintenance_frequency')) {
    await conn.execute("ALTER TABLE ztoi_mgmnt_system_projects ADD COLUMN maintenance_frequency ENUM('monthly', '2_months', 'quarterly', 'half_yearly', 'yearly', 'custom') NOT NULL DEFAULT 'monthly' AFTER maintenance_amount");
    console.log('Added maintenance_frequency');
  }
  if (!existingCols.includes('maintenance_custom_days')) {
    await conn.execute('ALTER TABLE ztoi_mgmnt_system_projects ADD COLUMN maintenance_custom_days INT DEFAULT NULL AFTER maintenance_frequency');
    console.log('Added maintenance_custom_days');
  }
  if (!existingCols.includes('maintenance_start_date')) {
    await conn.execute('ALTER TABLE ztoi_mgmnt_system_projects ADD COLUMN maintenance_start_date DATE DEFAULT NULL AFTER maintenance_custom_days');
    console.log('Added maintenance_start_date');
  }
  if (!existingCols.includes('maintenance_next_due_date')) {
    await conn.execute('ALTER TABLE ztoi_mgmnt_system_projects ADD COLUMN maintenance_next_due_date DATE DEFAULT NULL AFTER maintenance_start_date');
    console.log('Added maintenance_next_due_date');
  }
  if (!existingCols.includes('maintenance_status')) {
    await conn.execute("ALTER TABLE ztoi_mgmnt_system_projects ADD COLUMN maintenance_status ENUM('active', 'paused', 'cancelled') NOT NULL DEFAULT 'active' AFTER maintenance_next_due_date");
    console.log('Added maintenance_status');
  }

  // Update ledger reference_type ENUM
  await conn.execute("ALTER TABLE ztoi_mgmnt_system_ledger MODIFY COLUMN reference_type ENUM('emi', 'expense', 'salary', 'manual_income', 'maintenance', 'other') DEFAULT 'other'");
  console.log('Updated ztoi_mgmnt_system_ledger reference_type');

  // Create ztoi_mgmnt_system_maintenance_payments table
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS ztoi_mgmnt_system_maintenance_payments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      project_id INT NOT NULL,
      amount DECIMAL(12,2) NOT NULL,
      billing_period_start DATE DEFAULT NULL,
      billing_period_end DATE DEFAULT NULL,
      payment_date DATE NOT NULL,
      due_date DATE DEFAULT NULL,
      payment_method ENUM('cash', 'bank_transfer', 'upi', 'cheque', 'card', 'other') NOT NULL DEFAULT 'upi',
      transaction_id VARCHAR(120) DEFAULT NULL,
      reference_number VARCHAR(120) DEFAULT NULL,
      received_by VARCHAR(120) DEFAULT NULL,
      receipt_url VARCHAR(500) DEFAULT NULL,
      ledger_id INT DEFAULT NULL,
      status ENUM('paid', 'partial', 'pending', 'waived') NOT NULL DEFAULT 'paid',
      notes TEXT DEFAULT NULL,
      created_by INT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_mp_project (project_id),
      INDEX idx_mp_payment_date (payment_date),
      INDEX idx_mp_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('Created or verified ztoi_mgmnt_system_maintenance_payments');

  await conn.end();
  console.log('Migration finished successfully!');
}

runMigration().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
