import sqlite3
import time
from datetime import datetime

class Database:
    def __init__(self, db_file="qrix.db"):
        self.db_file = db_file
        self.init_db()

    def connect(self):
        # Returns a connection object that can be used with a 'with' statement
        return sqlite3.connect(self.db_file)

    def init_db(self):
        with sqlite3.connect(self.db_file) as conn:
            cursor = conn.cursor()
            
            # Create QR codes table if it doesn't exist
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS qr_codes (
                    timestamp INTEGER PRIMARY KEY,
                    vendor_name TEXT NOT NULL,
                    lot_number TEXT NOT NULL,
                    item_type TEXT NOT NULL,
                    manufacture_date TEXT NOT NULL,
                    supply_date TEXT NOT NULL,
                    warranty_period TEXT NOT NULL,
                    status TEXT DEFAULT 'active',
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Check if qr_file_path column exists
            cursor.execute("PRAGMA table_info(qr_codes)")
            columns = [column[1] for column in cursor.fetchall()]
            
            # Add qr_file_path column if it doesn't exist
            if 'qr_file_path' not in columns:
                cursor.execute('ALTER TABLE qr_codes ADD COLUMN qr_file_path TEXT')
            
            # Users table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    password TEXT NOT NULL,
                    role TEXT NOT NULL CHECK(role IN ('admin', 'user')),
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Data change requests table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS data_requests (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    qr_timestamp INTEGER NOT NULL,
                    user_id INTEGER NOT NULL,
                    request_type TEXT NOT NULL,
                    request_data TEXT NOT NULL,
                    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    resolved_at TEXT,
                    resolved_by INTEGER,
                    FOREIGN KEY (qr_timestamp) REFERENCES qr_codes(timestamp),
                    FOREIGN KEY (user_id) REFERENCES users(id),
                    FOREIGN KEY (resolved_by) REFERENCES users(id)
                )
            ''')
            
            # Inspections table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS inspections (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    qr_timestamp INTEGER NOT NULL,
                    inspection_time TEXT NOT NULL,
                    inspection_report TEXT,
                    need_replacement_repair TEXT NOT NULL,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    request_id INTEGER,
                    FOREIGN KEY (qr_timestamp) REFERENCES qr_codes(timestamp),
                    FOREIGN KEY (request_id) REFERENCES data_requests(id)
                )
            ''')
            
            # Create default admin user if not exists
            cursor.execute('''
                INSERT OR IGNORE INTO users (username, password, role)
                VALUES ('admin', 'admin123', 'admin')
            ''')
            
            conn.commit()

    def add_qr_code(self, data, conn=None):
        timestamp = int(time.time())
        
        def _execute(c):
            cursor = c.cursor()
            cursor.execute(
                '''
                    INSERT INTO qr_codes (
                        timestamp, vendor_name, lot_number, 
                        item_type, manufacture_date, supply_date, 
                        warranty_period
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                ''',
                (
                    timestamp, data['vendor_name'], data['lot_number'],
                    data['item_type'], data['manufacture_date'],
                    data['supply_date'], data['warranty_period']
                )
            )

        if conn:
            _execute(conn)
        else:
            with self.connect() as new_conn:
                _execute(new_conn)

        return timestamp

    def get_qr_code(self, timestamp):
        with self.connect() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM qr_codes WHERE timestamp = ?', (timestamp,))
            row = cursor.fetchone()
            if row:
                return {
                    'timestamp': row[0],
                    'vendor_name': row[1],
                    'lot_number': row[2],
                    'item_type': row[3],
                    'manufacture_date': row[4],
                    'supply_date': row[5],
                    'warranty_period': row[6],
                    'status': row[7],
                    'created_at': row[8],
                    'qr_file_path': row[9]
                }
            return None

    def update_qr_code_path(self, timestamp, qr_file_path, conn=None):
        def _execute(c):
            cursor = c.cursor()
            cursor.execute(
                'UPDATE qr_codes SET qr_file_path = ? WHERE timestamp = ?',
                (qr_file_path, timestamp)
            )

        if conn:
            _execute(conn)
        else:
            with self.connect() as new_conn:
                _execute(new_conn)

    def authenticate_user(self, username, password):
        with self.connect() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT id, username, role FROM users WHERE username = ? AND password = ?', 
                         (username, password))
            user = cursor.fetchone()
            if user:
                return {
                    'id': user[0],
                    'username': user[1],
                    'role': user[2]
                }
            return None

    def create_user(self, username, password, role='user'):
        with self.connect() as conn:
            cursor = conn.cursor()
            try:
                cursor.execute('INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
                             (username, password, role))
                conn.commit()
                return True
            except sqlite3.IntegrityError:
                return False

    def create_data_request(self, qr_timestamp, user_id, request_type, request_data):
        with self.connect() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO data_requests 
                (qr_timestamp, user_id, request_type, request_data) 
                VALUES (?, ?, ?, ?)
            ''', (qr_timestamp, user_id, request_type, request_data))
            conn.commit()
            return cursor.lastrowid

    def get_pending_requests(self):
        with self.connect() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT dr.*, u.username, qc.item_type, qc.lot_number
                FROM data_requests dr
                JOIN users u ON dr.user_id = u.id
                JOIN qr_codes qc ON dr.qr_timestamp = qc.timestamp
                WHERE dr.status = 'pending'
                ORDER BY dr.created_at DESC
            ''')
            rows = cursor.fetchall()
            return [{
                'id': row[0],
                'qr_timestamp': row[1],
                'user_id': row[2],
                'request_type': row[3],
                'request_data': row[4],
                'status': row[5],
                'created_at': row[6],
                'resolved_at': row[7],
                'resolved_by': row[8],
                'username': row[9],
                'item_type': row[10],
                'lot_number': row[11]
            } for row in rows]

    def get_request_by_id(self, request_id):
        with self.connect() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM data_requests WHERE id = ?', (request_id,))
            row = cursor.fetchone()
            if row:
                return {
                    'id': row[0],
                    'qr_timestamp': row[1],
                    'user_id': row[2],
                    'request_type': row[3],
                    'request_data': row[4],
                    'status': row[5],
                    'created_at': row[6],
                    'resolved_at': row[7],
                    'resolved_by': row[8]
                }
            return None

    def resolve_request(self, request_id, admin_id, status, qr_timestamp=None, update_data=None):
        with self.connect() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                UPDATE data_requests 
                SET status = ?, resolved_at = CURRENT_TIMESTAMP, resolved_by = ?
                WHERE id = ?
            ''', (status, admin_id, request_id))
            
            if status == 'approved' and update_data and qr_timestamp:
                # Insert a new inspection record
                cursor.execute('''
                    INSERT INTO inspections (qr_timestamp, inspection_time, inspection_report, need_replacement_repair, request_id)
                    VALUES (?, ?, ?, ?, ?)
                ''', (qr_timestamp, update_data['inspection_time'], update_data.get('inspection_report'), update_data['need_replacement_repair'], request_id))
            
            conn.commit()
            return True

    def get_inspections_for_qr(self, qr_timestamp):
        with self.connect() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM inspections WHERE qr_timestamp = ? ORDER BY inspection_time DESC', (qr_timestamp,))
            rows = cursor.fetchall()
            return [{
                'id': row[0],
                'qr_timestamp': row[1],
                'inspection_time': row[2],
                'inspection_report': row[3],
                'need_replacement_repair': row[4],
                'created_at': row[5]
            } for row in rows]

    def get_all_qr_codes(self):
        with self.connect() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM qr_codes ORDER BY timestamp DESC')
            rows = cursor.fetchall()
            return [{
                'timestamp': row[0],
                'vendor_name': row[1],
                'lot_number': row[2],
                'item_type': row[3],
                'manufacture_date': row[4],
                'supply_date': row[5],
                'warranty_period': row[6],
                'status': row[7],
                'created_at': row[8],
                'qr_file_path': row[9]
            } for row in rows]

    def get_all_inspections(self):
        with self.connect() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT i.*, qc.item_type, qc.lot_number
                FROM inspections i
                JOIN qr_codes qc ON i.qr_timestamp = qc.timestamp
                ORDER BY i.inspection_time DESC
            ''')
            rows = cursor.fetchall()
            return [{
                'id': row[0],
                'qr_timestamp': row[1],
                'inspection_time': row[2],
                'inspection_report': row[3],
                'need_replacement_repair': row[4],
                'item_type': row[7],
                'lot_number': row[8]
            } for row in rows]

    def get_all_users(self):
        with self.connect() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT id, username, role, created_at FROM users ORDER BY username')
            rows = cursor.fetchall()
            return [{
                'id': row[0],
                'username': row[1],
                'role': row[2],
                'created_at': row[3]
            } for row in rows]

    def delete_user(self, user_id):
        with self.connect() as conn:
            cursor = conn.cursor()
            # Prevent deleting the main admin user
            cursor.execute("DELETE FROM users WHERE id = ? AND role != 'admin'", (user_id,))
            conn.commit()