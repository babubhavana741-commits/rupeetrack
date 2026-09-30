import csv
import io
import os
from flask import Flask, render_template, request, jsonify, Response
import database

app = Flask(__name__)

# Initialize DB on start
database.init_db()

@app.route('/')
def index():
    return render_template('index.html')

# --- Summary & Settings Endpoints ---
@app.route('/api/summary', methods=['GET'])
def get_summary():
    try:
        summary = database.get_financial_summary()
        return jsonify({'success': True, 'data': summary})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/settings/initial-balance', methods=['POST'])
def update_initial_balance():
    try:
        data = request.get_json() or {}
        new_balance = float(data.get('initial_balance', 0))
        if new_balance < 0:
            return jsonify({'success': False, 'error': 'Initial balance cannot be negative'}), 400
        database.update_setting('initial_balance', f"{new_balance:.2f}")
        return jsonify({'success': True, 'initial_balance': new_balance})
    except ValueError:
        return jsonify({'success': False, 'error': 'Invalid balance amount entered'}), 400
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# --- Persons Endpoints ---
@app.route('/api/persons', methods=['GET'])
def get_persons():
    try:
        persons = database.get_all_persons()
        return jsonify({'success': True, 'data': persons})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/persons', methods=['POST'])
def add_person():
    try:
        data = request.get_json() or {}
        name = data.get('name', '').strip()
        color = data.get('color', '#4F46E5')
        if not name:
            return jsonify({'success': False, 'error': 'Person name is required'}), 400
        person_id = database.add_person(name, color)
        return jsonify({'success': True, 'id': person_id, 'name': name, 'color': color})
    except Exception as e:
        if 'UNIQUE constraint failed' in str(e):
            return jsonify({'success': False, 'error': f'Person with name "{name}" already exists'}), 400
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/persons/<int:person_id>', methods=['PUT'])
def update_person(person_id):
    try:
        data = request.get_json() or {}
        name = data.get('name', '').strip()
        color = data.get('color', '#4F46E5')
        if not name:
            return jsonify({'success': False, 'error': 'Person name is required'}), 400
        database.update_person(person_id, name, color)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/persons/<int:person_id>', methods=['DELETE'])
def delete_person(person_id):
    try:
        database.delete_person(person_id)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# --- Expenses Endpoints ---
@app.route('/api/expenses', methods=['GET'])
def get_expenses():
    try:
        person_id = request.args.get('person_id', type=int)
        category = request.args.get('category')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        search = request.args.get('search')
        
        expenses = database.get_all_expenses(
            person_id=person_id,
            category=category,
            start_date=start_date,
            end_date=end_date,
            search=search
        )
        return jsonify({'success': True, 'data': expenses})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/expenses', methods=['POST'])
def add_expense():
    try:
        data = request.get_json() or {}
        title = data.get('title', '').strip()
        amount = float(data.get('amount', 0))
        category = data.get('category', 'Others')
        person_id = int(data.get('person_id'))
        date = data.get('date', '').strip()
        payment_mode = data.get('payment_mode', 'UPI')
        notes = data.get('notes', '').strip()
        
        if not title:
            return jsonify({'success': False, 'error': 'Expense title is required'}), 400
        if amount <= 0:
            return jsonify({'success': False, 'error': 'Expense amount must be greater than ₹0'}), 400
        if not date:
            return jsonify({'success': False, 'error': 'Date is required'}), 400
            
        new_id = database.add_expense(title, amount, category, person_id, date, payment_mode, notes)
        return jsonify({'success': True, 'id': new_id})
    except (ValueError, TypeError) as e:
        return jsonify({'success': False, 'error': f'Invalid input: {str(e)}'}), 400
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/expenses/<int:expense_id>', methods=['GET'])
def get_expense(expense_id):
    try:
        expense = database.get_expense_by_id(expense_id)
        if not expense:
            return jsonify({'success': False, 'error': 'Expense not found'}), 404
        return jsonify({'success': True, 'data': expense})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/expenses/<int:expense_id>', methods=['PUT'])
def update_expense(expense_id):
    try:
        data = request.get_json() or {}
        title = data.get('title', '').strip()
        amount = float(data.get('amount', 0))
        category = data.get('category', 'Others')
        person_id = int(data.get('person_id'))
        date = data.get('date', '').strip()
        payment_mode = data.get('payment_mode', 'UPI')
        notes = data.get('notes', '').strip()
        
        if not title:
            return jsonify({'success': False, 'error': 'Expense title is required'}), 400
        if amount <= 0:
            return jsonify({'success': False, 'error': 'Expense amount must be greater than ₹0'}), 400
            
        database.update_expense(expense_id, title, amount, category, person_id, date, payment_mode, notes)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/expenses/<int:expense_id>', methods=['DELETE'])
def delete_expense(expense_id):
    try:
        database.delete_expense(expense_id)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# --- Export CSV ---
@app.route('/api/export/csv', methods=['GET'])
def export_csv():
    try:
        expenses = database.get_all_expenses()
        summary = database.get_financial_summary()
        
        output = io.StringIO()
        writer = csv.writer(output)
        
        writer.writerow(['EXPENSE TRACKER EXPORT (INR - ₹)'])
        writer.writerow(['Initial Balance', f"₹ {summary['initial_balance']:,.2f}"])
        writer.writerow(['Total Spent', f"₹ {summary['total_spent']:,.2f}"])
        writer.writerow(['Remaining Balance', f"₹ {summary['remaining_balance']:,.2f}"])
        writer.writerow([])
        writer.writerow(['ID', 'Title', 'Amount (INR)', 'Category', 'Paid By', 'Date', 'Payment Mode', 'Notes'])
        
        for exp in expenses:
            writer.writerow([
                exp['id'],
                exp['title'],
                exp['amount'],
                exp['category'],
                exp['person_name'],
                exp['date'],
                exp['payment_mode'],
                exp['notes']
            ])
            
        csv_data = output.getvalue()
        output.close()
        
        return Response(
            csv_data,
            mimetype="text/csv",
            headers={"Content-disposition": "attachment; filename=Expense_Tracker_Export.csv"}
        )
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"Starting Expense Tracker server on http://0.0.0.0:{port} ...")
    app.run(host='0.0.0.0', port=port, debug=False)
