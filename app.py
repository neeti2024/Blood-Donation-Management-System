from flask import Flask, jsonify, request, render_template, g
import sqlite3
import os

app = Flask(__name__)
DATABASE = 'blood_donation.db'

def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
        db.row_factory = sqlite3.Row
    return db

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

def init_db():
    with app.app_context():
        db = get_db()
        cursor = db.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS donors (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                blood_type TEXT NOT NULL,
                quantity INTEGER NOT NULL
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS blood_inventory (
                blood_type TEXT PRIMARY KEY,
                quantity INTEGER NOT NULL
            )
        ''')
        # Initialize blood_inventory if empty
        cursor.execute('SELECT COUNT(*) FROM blood_inventory')
        count = cursor.fetchone()[0]
        if count == 0:
            blood_types = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
            for bt in blood_types:
                cursor.execute('INSERT INTO blood_inventory (blood_type, quantity) VALUES (?, ?)', (bt, 0))
        db.commit()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/donors', methods=['GET'])
def get_donors():
    db = get_db()
    cursor = db.cursor()
    cursor.execute('SELECT * FROM donors')
    donors = [dict(row) for row in cursor.fetchall()]
    return jsonify(donors)

@app.route('/api/blood_inventory', methods=['GET'])
def get_blood_inventory():
    db = get_db()
    cursor = db.cursor()
    cursor.execute('SELECT * FROM blood_inventory')
    inventory = {row['blood_type']: row['quantity'] for row in cursor.fetchall()}
    return jsonify(inventory)

@app.route('/api/donors', methods=['POST'])
def add_donor():
    data = request.json
    name = data.get('name')
    blood_type = data.get('blood_type')
    quantity = data.get('quantity', 0)

    if not name or blood_type not in ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] or quantity <= 0:
        return jsonify({"error": "Invalid input"}), 400

    db = get_db()
    cursor = db.cursor()
    cursor.execute('INSERT INTO donors (name, blood_type, quantity) VALUES (?, ?, ?)', (name, blood_type, quantity))
    cursor.execute('UPDATE blood_inventory SET quantity = quantity + ? WHERE blood_type = ?', (quantity, blood_type))
    db.commit()
    return jsonify({"message": "Donor added successfully"}), 201

@app.route('/api/donors/<int:donor_id>', methods=['DELETE'])
def delete_donor(donor_id):
    db = get_db()
    cursor = db.cursor()
    cursor.execute('SELECT blood_type, quantity FROM donors WHERE id = ?', (donor_id,))
    donor = cursor.fetchone()
    if donor is None:
        return jsonify({"error": "Donor not found"}), 404
    blood_type = donor['blood_type']
    quantity = donor['quantity']
    cursor.execute('DELETE FROM donors WHERE id = ?', (donor_id,))
    cursor.execute('UPDATE blood_inventory SET quantity = quantity - ? WHERE blood_type = ?', (quantity, blood_type))
    db.commit()
    return jsonify({"message": "Donor deleted successfully"}), 200

if __name__ == '__main__':
    if not os.path.exists(DATABASE):
        init_db()
    app.run(debug=True)
