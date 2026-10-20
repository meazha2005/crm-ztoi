const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST || '192.169.147.255',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'MEAZHA',
  password: process.env.DB_PASS || 'dZYRYi(o(0*U',
  database: process.env.DB_NAME || 'le_test',
  waitForConnections: true,
  connectionLimit: 5,
};

async function initDatabase() {
  console.log('Connecting to MySQL database...');
  const pool = mysql.createPool(dbConfig);
  const conn = await pool.getConnection();

  try {
    console.log('Starting table creation with prefix "ztoi_mgmnt_system_" ...');

    // 1. Users
    await conn.query(`
      CREATE TABLE IF NOT EXISTS ztoi_mgmnt_system_users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(60) NOT NULL UNIQUE,
        email VARCHAR(120) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        full_name VARCHAR(120) NOT NULL,
        role ENUM('admin', 'team_member') NOT NULL DEFAULT 'team_member',
        phone VARCHAR(30) DEFAULT NULL,
        avatar VARCHAR(255) DEFAULT NULL,
        status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
        last_login DATETIME DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user_status (status),
        INDEX idx_user_role (role)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 2. Expense categories
    await conn.query(`
      CREATE TABLE IF NOT EXISTS ztoi_mgmnt_system_expense_categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(80) NOT NULL UNIQUE,
        description TEXT DEFAULT NULL,
        color VARCHAR(20) DEFAULT '#FF4D00',
        status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3. Projects
    await conn.query(`
      CREATE TABLE IF NOT EXISTS ztoi_mgmnt_system_projects (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_code VARCHAR(30) NOT NULL UNIQUE,
        client_name VARCHAR(120) NOT NULL,
        client_email VARCHAR(120) DEFAULT NULL,
        client_phone VARCHAR(30) DEFAULT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT DEFAULT NULL,
        total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        initial_payment DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        initial_payment_mode VARCHAR(50) DEFAULT NULL,
        initial_payment_received_by INT DEFAULT NULL,
        payment_type ENUM('one_time', 'emi', 'undecided') NOT NULL DEFAULT 'one_time',
        has_maintenance TINYINT(1) NOT NULL DEFAULT 0,
        maintenance_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        maintenance_frequency ENUM('monthly', '2_months', 'quarterly', 'half_yearly', 'yearly', 'custom') NOT NULL DEFAULT 'monthly',
        maintenance_custom_days INT DEFAULT NULL,
        maintenance_start_date DATE DEFAULT NULL,
        maintenance_next_due_date DATE DEFAULT NULL,
        maintenance_status ENUM('active', 'paused', 'cancelled') NOT NULL DEFAULT 'active',
        emi_count INT NOT NULL DEFAULT 1,
        emi_frequency INT NOT NULL DEFAULT 1,
        start_date DATE NOT NULL,
        deadline_date DATE NOT NULL,
        submitted_date DATE DEFAULT NULL,
        status ENUM('new', 'in_progress', 'on_hold', 'completed', 'cancelled') NOT NULL DEFAULT 'new',
        priority ENUM('low', 'medium', 'high', 'urgent') NOT NULL DEFAULT 'medium',
        notes TEXT DEFAULT NULL,
        created_by INT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_project_status (status),
        INDEX idx_project_deadline (deadline_date),
        INDEX idx_project_created_by (created_by)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 4. Project Assignments
    await conn.query(`
      CREATE TABLE IF NOT EXISTS ztoi_mgmnt_system_project_assignments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_id INT NOT NULL,
        user_id INT NOT NULL,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_proj_user (project_id, user_id),
        INDEX idx_pa_project (project_id),
        INDEX idx_pa_user (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 5. EMIs
    await conn.query(`
      CREATE TABLE IF NOT EXISTS ztoi_mgmnt_system_emis (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_id INT NOT NULL,
        emi_number INT NOT NULL,
        due_date DATE NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
        paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        status ENUM('unpaid', 'partial', 'paid') NOT NULL DEFAULT 'unpaid',
        paid_date DATE DEFAULT NULL,
        ledger_id INT DEFAULT NULL,
        notes TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_emi_project (project_id),
        INDEX idx_emi_status (status),
        INDEX idx_emi_due_date (due_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 6. Expenses
    await conn.query(`
      CREATE TABLE IF NOT EXISTS ztoi_mgmnt_system_expenses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        category_id INT NOT NULL,
        expense_date DATE NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
        description TEXT NOT NULL,
        receipt_url VARCHAR(255) DEFAULT NULL,
        payment_method ENUM('cash', 'bank_transfer', 'upi', 'cheque', 'card', 'other') DEFAULT 'upi',
        ledger_id INT DEFAULT NULL,
        notes TEXT DEFAULT NULL,
        status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
        created_by INT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_expense_cat (category_id),
        INDEX idx_expense_date (expense_date),
        INDEX idx_expense_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 7. Salaries
    await conn.query(`
      CREATE TABLE IF NOT EXISTS ztoi_mgmnt_system_salaries (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        month_year VARCHAR(7) NOT NULL,
        base_salary DECIMAL(12,2) NOT NULL,
        bonus DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        deductions DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        net_salary DECIMAL(12,2) NOT NULL,
        paid_date DATE DEFAULT NULL,
        payment_mode VARCHAR(50) DEFAULT NULL,
        ledger_id INT DEFAULT NULL,
        notes TEXT DEFAULT NULL,
        status ENUM('pending', 'paid') NOT NULL DEFAULT 'pending',
        created_by INT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user_month (user_id, month_year),
        INDEX idx_salary_status (status),
        INDEX idx_salary_month (month_year)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 8. General Ledger
    await conn.query(`
      CREATE TABLE IF NOT EXISTS ztoi_mgmnt_system_ledger (
        id INT AUTO_INCREMENT PRIMARY KEY,
        transaction_date DATE NOT NULL,
        type ENUM('income', 'expense') NOT NULL,
        category VARCHAR(80) NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
        reference_type ENUM('emi', 'expense', 'salary', 'manual_income', 'maintenance', 'other') DEFAULT 'other',
        reference_id INT DEFAULT NULL,
        description TEXT DEFAULT NULL,
        payment_method ENUM('cash', 'bank_transfer', 'upi', 'cheque', 'card', 'other') DEFAULT 'cash',
        transaction_id VARCHAR(120) DEFAULT NULL,
        received_by VARCHAR(120) DEFAULT NULL,
        reference_number VARCHAR(120) DEFAULT NULL,
        notes TEXT DEFAULT NULL,
        status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
        deleted_reason TEXT DEFAULT NULL,
        deleted_by INT DEFAULT NULL,
        deleted_at DATETIME DEFAULT NULL,
        created_by INT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_ledger_date (transaction_date),
        INDEX idx_ledger_type (type),
        INDEX idx_ledger_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 9. Maintenance Payments
    await conn.query(`
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

    // 9. Notifications
    await conn.query(`
      CREATE TABLE IF NOT EXISTS ztoi_mgmnt_system_notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type ENUM('info', 'warning', 'success', 'danger') NOT NULL DEFAULT 'info',
        is_read TINYINT(1) NOT NULL DEFAULT 0,
        link VARCHAR(255) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_notif_user_read (user_id, is_read)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 10. Settings
    await conn.query(`
      CREATE TABLE IF NOT EXISTS ztoi_mgmnt_system_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        setting_key VARCHAR(60) NOT NULL UNIQUE,
        setting_value TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 11. Audit Logs
    await conn.query(`
      CREATE TABLE IF NOT EXISTS ztoi_mgmnt_system_audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT DEFAULT NULL,
        action VARCHAR(60) NOT NULL,
        table_name VARCHAR(80) NOT NULL,
        record_id INT DEFAULT NULL,
        old_values LONGTEXT DEFAULT NULL,
        new_values LONGTEXT DEFAULT NULL,
        ip_address VARCHAR(60) DEFAULT NULL,
        user_agent TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_audit_created (created_at),
        INDEX idx_audit_user (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('All 11 ztoi_mgmnt_system_ tables verified/created successfully.');

    // Seed default settings
    const defaultSettings = [
      ['company_name', 'ZTOI TECH'],
      ['company_email', 'admin@ztoitech.com'],
      ['company_phone', '+91 8072023052'],
      ['company_address', 'ZTOI TECH HQ'],
      ['currency_symbol', '₹'],
      ['date_format', 'dd MMM yyyy'],
      ['timezone', 'Asia/Kolkata'],
      ['emi_reminder_days', '3'],
      ['deadline_reminder_days', '7']
    ];
    for (const [key, val] of defaultSettings) {
      await conn.query(`
        INSERT INTO ztoi_mgmnt_system_settings (setting_key, setting_value)
        VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
      `, [key, val]);
    }

    // Default expense categories if empty
    const [catCount] = await conn.query('SELECT COUNT(*) as cnt FROM ztoi_mgmnt_system_expense_categories');
    if (catCount[0].cnt === 0) {
      const defaultCategories = [
        ['Salary', 'Employee salaries & wages', '#FF4D00'],
        ['Office Rent & Utilities', 'Workplace maintenance & bills', '#1A1A1A'],
        ['Software & Tools', 'Cloud hosting, SaaS, developer tools', '#FF6B2B'],
        ['Travel & Transportation', 'Client travel & commute expenses', '#4A4A4A'],
        ['Marketing & Sales', 'Ad spend, branding & promotion', '#FF854D'],
        ['Food & Refreshments', 'Team meals & office snacks', '#6B6B6B'],
        ['Miscellaneous', 'General agency purchases', '#8C8C8C']
      ];
      for (const [name, desc, color] of defaultCategories) {
        await conn.query(`
          INSERT INTO ztoi_mgmnt_system_expense_categories (name, description, color, status)
          VALUES (?, ?, ?, 'active')
        `, [name, desc, color]);
      }
      console.log('Seeded standard expense categories.');
    }

    // Migrate users from MGMT_users
    const [existingUsers] = await conn.query(`
      SELECT id, username, email, password, full_name, role, phone, avatar, status 
      FROM MGMT_users
    `);
    console.log(`Found ${existingUsers.length} users in MGMT_users to migrate.`);

    for (const user of existingUsers) {
      await conn.query(`
        INSERT INTO ztoi_mgmnt_system_users (id, username, email, password, full_name, role, phone, avatar, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          username = VALUES(username),
          email = VALUES(email),
          password = VALUES(password),
          full_name = VALUES(full_name),
          role = VALUES(role),
          phone = VALUES(phone),
          avatar = VALUES(avatar),
          status = VALUES(status)
      `, [
        user.id,
        user.username,
        user.email,
        user.password,
        user.full_name,
        user.role,
        user.phone,
        user.avatar,
        user.status
      ]);
    }
    console.log('User migration completed successfully.');

  } catch (error) {
    console.error('Error during database initialization:', error);
    throw error;
  } finally {
    conn.release();
    await pool.end();
  }
}

if (require.main === module) {
  initDatabase()
    .then(() => {
      console.log('Database setup completed!');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Database setup failed:', err);
      process.exit(1);
    });
}

module.exports = { initDatabase };
