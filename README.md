# 🇮🇳 RupeeTrack - Multi-Person Shared & Individual Expense Tracker

A modern web application built with **Python (Flask)**, **SQLite**, and a responsive frontend styled with **Tailwind CSS**, designed specifically for tracking expenses in **Indian Rupees (₹ / INR)** with both **group shared balance** and **individual member tracking**.

---

## 🌟 Key Features

1. **Configurable & Mutable Initial Balance (₹ INR)**:
   - Set an overall pool balance in Indian Rupees.
   - **Update anytime**: Change the initial balance whenever you want via the dashboard or modal, and all remaining balances, progress bars, and stats will automatically recalculate.
   - Formatted using standard Indian Rupee notation (e.g., `₹50,000.00`, `₹1,50,000.00`).

2. **Decide the Number of Persons**:
   - Add as many persons as you need (e.g. roommates, family members, trip partners, colleagues).
   - Edit names, delete persons, or customize each person's badge color theme.

3. **Shared Pool vs. Individual Tracking**:
   - **Shared Pool Overview**: Tracks total starting budget, cumulative group expenses, and remaining balance with visual alerts (healthy green, amber warning at >85%, red when exceeding budget).
   - **Dedicated Individual Trackers**:
     - Switch between persons with one click.
     - View each person's total spending, percentage share of total group spending, and pool impact.
     - Filtered expense transaction history per person.

4. **Comprehensive Expense Logging**:
   - Add, edit, and delete transactions.
   - Fields: Title, Amount (₹), Category (Food, Groceries, Bills, Travel, Shopping, Health, etc.), Paid By (Person), Date, Payment Mode (UPI, Cash, Credit Card, Debit Card, Net Banking), and Notes.
   - Search by keyword and filter by Person, Category, and Date.

5. **Visual Analytics**:
   - Interactive Doughnut chart for person-wise expenditure split.
   - Bar chart showing spending breakdown by category.
   - Real-time progress bar for overall budget utilization.

6. **Instant CSV Export**:
   - Download complete financial summaries and itemized transaction sheets in CSV format anytime.

7. **Zero-Configuration SQLite Storage**:
   - Automatically stores all data in a local `expenses.db` database. Data is preserved across sessions and restarts.

---

## 🚀 How to Run

### Step 1: Open Terminal in the Project Folder
```powershell
cd "c:\Users\User\Downloads\expense tracker antigravity"
```

### Step 2: Install Dependencies (if not already installed)
```powershell
python -m pip install -r requirements.txt
```

### Step 3: Start the Application
```powershell
python app.py
```

### Step 4: Open in Your Browser
Navigate to:
```
http://127.0.0.1:5000
```

Or simply double-click `run.bat` in the project folder to start the server!

---

## 📁 Project Architecture

```
expense tracker antigravity/
├── app.py                # Flask application & REST API endpoints
├── database.py           # SQLite database schema, queries, and seeding
├── expenses.db           # SQLite database file (created automatically)
├── requirements.txt      # Python dependencies
├── run.bat               # Windows quick-launch script
├── README.md             # Project documentation
├── templates/
│   └── index.html        # Responsive Single Page UI dashboard
└── static/
    ├── css/
    │   └── custom.css    # Custom animations and styling
    └── js/
        └── app.js        # Dynamic frontend logic, charts, and API interactions
```
