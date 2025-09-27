import os
import sys
import traceback

try:
    import base64
    import time
    from flask import Flask, request, jsonify, send_from_directory
    from flask_cors import CORS
    from pathlib import Path
    
    # Add the parent directory to Python path to find the db package
    current_dir = os.path.dirname(os.path.abspath(__file__))
    parent_dir = os.path.dirname(current_dir)
    sys.path.append(parent_dir)
    print(f"Python path: {sys.path}")
    print(f"Current directory: {os.getcwd()}")
    
    from db.database import Database
    
    # Ensure QR codes directory exists
    QR_CODES_DIR = Path(parent_dir) / 'static' / 'qr_codes'
    QR_CODES_DIR.mkdir(parents=True, exist_ok=True)
except Exception as e:
    print("Error during imports:")
    print(traceback.format_exc())
    sys.exit(1)

# Print Python environment information
print(f"Python executable: {sys.executable}")
print(f"Python version: {sys.version}")
print("Installed packages:")
try:
    import pkg_resources
    for package in pkg_resources.working_set:
        print(f"  {package.key} - Version: {package.version}")
except Exception as e:
    print(f"Error listing packages: {str(e)}")

app = Flask(__name__)
CORS(app, supports_credentials=True)  # Enable CORS with credentials support
db = Database()

# Authentication routes
@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.json
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return jsonify({'success': False, 'error': 'Missing credentials'}), 400
        
        user = db.authenticate_user(username, password)
        if user:
            return jsonify({
                'success': True,
                'user': user
            }), 200
        return jsonify({'success': False, 'error': 'Invalid credentials'}), 401
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    return jsonify({'success': True}), 200

@app.route('/api/auth/register', methods=['POST'])
def register():
    try:
        data = request.json
        username = data.get('username')
        password = data.get('password')
        role = data.get('role', 'user')
        
        if not username or not password:
            return jsonify({'success': False, 'error': 'Missing credentials'}), 400
        
        success = db.create_user(username, password, role)
        if success:
            return jsonify({'success': True}), 201
        return jsonify({'success': False, 'error': 'Username already exists'}), 400
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/qr-codes', methods=['POST'])
def create_qr_code():
    try:
        if not request.is_json:
            return jsonify({'success': False, 'error': 'Request must be JSON'}), 400

        data = request.json
        
        if not isinstance(data, dict):
            return jsonify({'success': False, 'error': 'Invalid data format'}), 400
            
        # Use a single database connection for the entire transaction
        with db.connect() as conn:
            # The database will generate the timestamp, which we will use for the QR code.
            # First, save the data to get the timestamp.
            timestamp = db.add_qr_code(data, conn=conn)
    
            # Prepare data for QR code (including the DB-generated timestamp)
            qr_data_for_image = data.copy()
            qr_data_for_image['timestamp'] = timestamp
    
            # Create QR code filename
            qr_file_name = f'qr_{timestamp}.png'
            qr_file_path = QR_CODES_DIR / qr_file_name
            relative_path = f'static/qr_codes/{qr_file_name}'
            
            try:
                import qrcode
                import json
                qr = qrcode.QRCode(version=1, error_correction=qrcode.constants.ERROR_CORRECT_H, box_size=10, border=4)
                qr.add_data(json.dumps(qr_data_for_image))
                qr.make(fit=True)
                img = qr.make_image(fill_color="black", back_color="white")
                img.save(qr_file_path)
            except Exception as e:
                print(f"Error saving QR code: {str(e)}")
                raise Exception(f"Failed to save QR code: {str(e)}")

            # Now update the database record with the path to the QR code image
            db.update_qr_code_path(timestamp, relative_path, conn=conn)
        
        return jsonify({
            'success': True,
            'timestamp': timestamp,
            'qr_file_path': relative_path
        }), 201
    except Exception as e:
        print(f"Error in create_qr_code: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/api/qr-codes/<int:timestamp>', methods=['GET'])
def get_qr_code(timestamp):
    try:
        qr_data = db.get_qr_code(timestamp)
        if qr_data:
            return jsonify({'success': True, 'data': qr_data}), 200
        return jsonify({'success': False, 'error': 'QR code not found'}), 404
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/api/qr-codes', methods=['GET'])
def get_all_qr_codes():
    try:
        qr_codes = db.get_all_qr_codes()
        return jsonify({'success': True, 'data': qr_codes}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/api/qr-codes/<int:timestamp>/inspections', methods=['GET'])
def get_qr_inspections(timestamp):
    try:
        inspections = db.get_inspections_for_qr(timestamp)
        return jsonify({'success': True, 'data': inspections}), 200
    except Exception as e:
        print(f"Error fetching inspections: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/inspections', methods=['GET'])
def get_all_inspections():
    try:
        inspections = db.get_all_inspections()
        return jsonify({'success': True, 'data': inspections}), 200
    except Exception as e:
        print(f"Error fetching all inspections: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

# --- Data Request Routes ---

@app.route('/api/requests', methods=['POST'])
def create_data_request():
    try:
        data = request.json
        qr_timestamp = data.get('qr_timestamp')
        request_type = data.get('request_type')
        request_data = data.get('request_data')

        # For now, we'll hardcode the user_id. In a real app, you'd get this from the session.
        # Let's assume the default admin user (id=1) is making the request.
        user_id = 1 

        if not all([qr_timestamp, request_type, request_data]):
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400

        request_id = db.create_data_request(qr_timestamp, user_id, request_type, request_data)
        
        return jsonify({'success': True, 'request_id': request_id}), 201
    except Exception as e:
        print(f"Error creating data request: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/requests', methods=['GET'])
def get_pending_requests():
    try:
        requests = db.get_pending_requests()
        return jsonify({'success': True, 'data': requests}), 200
    except Exception as e:
        print(f"Error fetching pending requests: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/requests/<int:request_id>', methods=['PUT'])
def resolve_request(request_id):
    try:
        data = request.json
        status = data.get('status')

        if status not in ['approved', 'rejected']:
            return jsonify({'success': False, 'error': 'Invalid status'}), 400

        # For now, we'll hardcode the admin_id. In a real app, you'd get this from the session.
        # Let's assume the default admin user (id=1) is resolving the request.
        admin_id = 1

        update_data = None
        qr_timestamp = None

        if status == 'approved':
            # Fetch the request to get the data to be updated
            request_details = db.get_request_by_id(request_id)
            if request_details and request_details['request_type'] == 'inspection_report':
                import json
                update_data = json.loads(request_details['request_data'])
                qr_timestamp = request_details['qr_timestamp']

        db.resolve_request(request_id, admin_id, status, qr_timestamp, update_data)

        return jsonify({'success': True}), 200
    except Exception as e:
        print(f"Error resolving request: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

# --- Admin specific routes ---

@app.route('/api/users', methods=['GET'])
def get_all_users():
    # In a real app, you'd add role-based authentication here
    try:
        users = db.get_all_users()
        return jsonify({'success': True, 'data': users}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/api/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    # In a real app, you'd add role-based authentication here
    try:
        db.delete_user(user_id)
        return jsonify({'success': True}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

# Serve static files from the root directory
@app.route('/')
def serve_index():
    return send_from_directory('../', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('../', path)

if __name__ == '__main__':
    app.run(debug=True, port=5000)