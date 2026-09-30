import sqlite3
import os
from datetime import datetime

DB_PATH = os.environ.get('DB_PATH', os.path.join(os.path.dirname(__file__), 'expenses.db'))

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Settings table (for initial balance, currency, etc.)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )
    ''')
    
    # Persons table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS persons (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            color TEXT NOT NULL DEFAULT '#4F46E5',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Expenses table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            amount REAL NOT NULL,
            category TEXT NOT NULL,
            person_id INTEGER NOT NULL,
            date TEXT NOT NULL,
            payment_mode TEXT DEFAULT 'UPI',
            notes TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE CASCADE
        )
    ''')
    
    # Check if initial balance exists
    cursor.execute("SELECT value FROM settings WHERE key = 'initial_balance'")
    row = cursor.fetchone()
    if not row:
        # Default starting balance: 50,000 INR
        cursor.execute("INSERT INTO settings (key, value) VALUES ('initial_balance', '50000.00')")
        cursor.execute("INSERT OR IGNORE INTO settings (key, value) VALUES ('currency_symbol', '₹')")
        cursor.execute("INSERT OR IGNORE INTO settings (key, value) VALUES ('currency_code', 'INR')")
    
    # Check if any persons exist; if not, seed with starter persons and sample expenses
    cursor.execute("SELECT COUNT(*) as count FROM persons")
    count = cursor.fetchone()['count']
    if count == 0:
        sample_persons = [
            ('Rahul Sharma', '#6366F1'), # Indigo
            ('Priya Patel', '#EC4899'),  # Pink
            ('Amit Verma', '#10B981')   # Emerald
        ]
        cursor.executemany("INSERT INTO persons (name, color) VALUES (?, ?)", sample_persons)
        
        # Get their IDs
        cursor.execute("SELECT id, name FROM persons")
        person_map = {p['name']: p['id'] for p in cursor.fetchall()}
        
        today_str = datetime.now().strftime('%Y-%m-%d')
        sample_expenses = [
            ('Supermarket Groceries', 3450.00, 'Groceries', person_map['Rahul Sharma'], today_str, 'UPI', 'Monthly ration & veggies'),
            ('Electricity & Wifi Bill', 2200.00, 'Bills & Utilities', person_map['Priya Patel'], today_str, 'Net Banking', 'Combined home bills'),
            ('Team Dinner @ Barbeque', 4800.00, 'Food & Dining', person_map['Amit Verma'], today_str, 'Credit Card', 'Weekend dinner with friends'),
            ('Fuel & Cab Travel', 1250.00, 'Travel & Commute', person_map['Rahul Sharma'], today_str, 'UPI', 'Petrol refill and Uber ride')
        ]
        cursor.executemany('''
            INSERT INTO expenses (title, amount, category, person_id, date, payment_mode, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', sample_expenses)
    
    conn.commit()
    conn.close()

# Balance and Settings queries
def get_setting(key, default=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT value FROM settings WHERE key = ?", (key,))
    row = cursor.fetchone()
    conn.close()
    return row['value'] if row else default

def update_setting(key, value):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", (key, str(value)))
    conn.commit()
    conn.close()

# Persons queries
def get_all_persons():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT p.id, p.name, p.color, p.created_at,
               COALESCE(SUM(e.amount), 0) AS total_spent,
               COUNT(e.id) AS expense_count
        FROM persons p
        LEFT JOIN expenses e ON p.id = e.person_id
        GROUP BY p.id
        ORDER BY p.name ASC
    ''')
    persons = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return persons

def add_person(name, color='#4F46E5'):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO persons (name, color) VALUES (?, ?)", (name.strip(), color))
    new_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return new_id

def update_person(person_id, name, color):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE persons SET name = ?, color = ? WHERE id = ?", (name.strip(), color, person_id))
    conn.commit()
    conn.close()

def delete_person(person_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM persons WHERE id = ?", (person_id,))
    conn.commit()
    conn.close()

# Expenses queries
def get_all_expenses(person_id=None, category=None, start_date=None, end_date=None, search=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    query = '''
        SELECT e.id, e.title, e.amount, e.category, e.date, e.payment_mode, e.notes, e.created_at,
               p.id AS person_id, p.name AS person_name, p.color AS person_color
        FROM expenses e
        JOIN persons p ON e.person_id = p.id
        WHERE 1=1
    '''
    params = []
    
    if person_id:
        query += " AND e.person_id = ?"
        params.append(person_id)
        
    if category and category != 'All':
        query += " AND e.category = ?"
        params.append(category)
        
    if start_date:
        query += " AND e.date >= ?"
        params.append(start_date)
        
    if end_date:
        query += " AND e.date <= ?"
        params.append(end_date)
        
    if search:
        query += " AND (e.title LIKE ? OR e.notes LIKE ?)"
        pattern = f"%{search}%"
        params.extend([pattern, pattern])
        
    query += " ORDER BY e.date DESC, e.id DESC"
    
    cursor.execute(query, params)
    expenses = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return expenses

def get_expense_by_id(expense_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT e.*, p.name as person_name, p.color as person_color
        FROM expenses e
        JOIN persons p ON e.person_id = p.id
        WHERE e.id = ?
    ''', (expense_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def add_expense(title, amount, category, person_id, date, payment_mode='UPI', notes=''):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO expenses (title, amount, category, person_id, date, payment_mode, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (title.strip(), float(amount), category, person_id, date, payment_mode, notes.strip()))
    new_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return new_id

def update_expense(expense_id, title, amount, category, person_id, date, payment_mode, notes):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE expenses
        SET title = ?, amount = ?, category = ?, person_id = ?, date = ?, payment_mode = ?, notes = ?
        WHERE id = ?
    ''', (title.strip(), float(amount), category, person_id, date, payment_mode, notes.strip(), expense_id))
    conn.commit()
    conn.close()

def delete_expense(expense_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM expenses WHERE id = ?", (expense_id,))
    conn.commit()
    conn.close()

# Overview & Analytics calculation
def get_financial_summary():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Initial balance
    cursor.execute("SELECT value FROM settings WHERE key = 'initial_balance'")
    row = cursor.fetchone()
    initial_balance = float(row['value']) if row else 0.0
    
    # Total expenses
    cursor.execute("SELECT COALESCE(SUM(amount), 0) AS total_spent, COUNT(id) AS total_count FROM expenses")
    exp_stats = cursor.fetchone()
    total_spent = float(exp_stats['total_spent'])
    total_count = int(exp_stats['total_count'])
    
    remaining_balance = initial_balance - total_spent
    percent_spent = (total_spent / initial_balance * 100) if initial_balance > 0 else 0.0
    
    # Category breakdown
    cursor.execute('''
        SELECT category, COALESCE(SUM(amount), 0) AS total, COUNT(id) AS count
        FROM expenses
        GROUP BY category
        ORDER BY total DESC
    ''')
    categories = [dict(r) for r in cursor.fetchall()]
    
    # Person breakdown
    cursor.execute('''
        SELECT p.id, p.name, p.color,
               COALESCE(SUM(e.amount), 0) AS total_spent,
               COUNT(e.id) AS expense_count
        FROM persons p
        LEFT JOIN expenses e ON p.id = e.person_id
        GROUP BY p.id
        ORDER BY total_spent DESC
    ''')
    person_breakdown = [dict(r) for r in cursor.fetchall()]
    for p in person_breakdown:
        p_spent = float(p['total_spent'])
        p['share_of_spent'] = round((p_spent / total_spent * 100), 1) if total_spent > 0 else 0.0
        p['share_of_initial'] = round((p_spent / initial_balance * 100), 1) if initial_balance > 0 else 0.0
        
    conn.close()
    
    return {
        'initial_balance': initial_balance,
        'total_spent': total_spent,
        'remaining_balance': remaining_balance,
        'total_count': total_count,
        'percent_spent': round(percent_spent, 1),
        'categories': categories,
        'persons': person_breakdown
    }

def reset_all_data():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM expenses")
    cursor.execute("DELETE FROM persons")
    cursor.execute("UPDATE settings SET value = '0.00' WHERE key = 'initial_balance'")
    conn.commit()
    conn.close()
