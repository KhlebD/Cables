from flask import Flask, request, jsonify
from flask_cors import CORS
import pg8000
import json

app = Flask(__name__)
CORS(app)

# Database connection parameters
DB_PARAMS = {
    'host': 'localhost',
    'database': 'network_database',
    'user': 'cable_admin',
    'password': 'your_secure_password',
    'port': 5432
}

# Database connection helper
def get_db_connection():
    conn = pg8000.connect(
        host=DB_PARAMS['host'],
        database=DB_PARAMS['database'],
        user=DB_PARAMS['user'],
        password=DB_PARAMS['password'],
        port=DB_PARAMS['port']
    )
    return conn

# Initialize the database schema
def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Create tables
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS buildings (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL
    )
    ''')
    
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS cabinets (
        id SERIAL PRIMARY KEY,
        identifier TEXT UNIQUE NOT NULL,
        cabinet_type TEXT NOT NULL,
        building_id INTEGER NOT NULL,
        FOREIGN KEY (building_id) REFERENCES buildings (id) ON DELETE CASCADE
    )
    ''')
    
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS cables (
        id SERIAL PRIMARY KEY,
        cableID TEXT UNIQUE NOT NULL,
        number TEXT NOT NULL,
        num_of_fibers INTEGER NOT NULL,
        cable_type TEXT NOT NULL,
        cabinet1 TEXT NOT NULL,
        cabinet2 TEXT NOT NULL,
        cabinet1_start INTEGER NOT NULL,
        cabinet2_start INTEGER NOT NULL
    )
    ''')
    
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS fibers (
        id SERIAL PRIMARY KEY,
        number_cabinet1 INTEGER NOT NULL,
        number_cabinet2 INTEGER NOT NULL,
        fiber_type TEXT DEFAULT '0',
        network TEXT DEFAULT NULL,
        cable_id TEXT NOT NULL,
        FOREIGN KEY (cable_id) REFERENCES cables (cableID) ON DELETE CASCADE
    )
    ''')
    
    conn.commit()
    conn.close()

# Initialize database on startup
try:
    init_db()
    print("Database initialized successfully")
except Exception as e:
    print(f"Database initialization error: {e}")

# Helper to convert row to dict
def row_to_dict(cursor, row):
    columns = [desc[0] for desc in cursor.description]
    return dict(zip(columns, row))

# Fetch all network data
@app.route('/database', methods=['GET'])
def get_database():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Fetch buildings
        cursor.execute('SELECT * FROM buildings')
        buildings_rows = cursor.fetchall()
        
        # Convert rows to dictionaries
        buildings_data = []
        for row in buildings_rows:
            building = row_to_dict(cursor, row)
            buildings_data.append(building)
        
        # For each building, fetch its cabinets
        for building in buildings_data:
            cursor.execute(
                'SELECT * FROM cabinets WHERE building_id = %s', 
                (building['id'],)
            )
            cabinets_rows = cursor.fetchall()
            cabinets = [row_to_dict(cursor, row) for row in cabinets_rows]
            
            # For each cabinet, fetch its cables
            for cabinet in cabinets:
                cursor.execute('''
                    SELECT * FROM cables 
                    WHERE cabinet1 = %s OR cabinet2 = %s
                ''', (cabinet['identifier'], cabinet['identifier']))
                cables_rows = cursor.fetchall()
                cables = [row_to_dict(cursor, row) for row in cables_rows]
                
                # For each cable, fetch its fibers
                for cable in cables:
                    cursor.execute(
                        'SELECT * FROM fibers WHERE cable_id = %s',
                        (cable['cableid'],)
                    )
                    fibers_rows = cursor.fetchall()
                    fibers = [row_to_dict(cursor, row) for row in fibers_rows]
                    cable['fibers'] = fibers
                
                cabinet['cables'] = cables
            
            building['cabinets'] = cabinets
            # Remove the id field which is not needed in the frontend
            building.pop('id', None)
        
        conn.close()
        return jsonify(buildings_data)
    
    except Exception as e:
        print(f"Error fetching database: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

# Add new building
@app.route('/buildings/add', methods=['POST'])
def add_building():
    try:
        data = request.json
        name = data.get('name')
        
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('INSERT INTO buildings (name) VALUES (%s)', (name,))
        conn.commit()
        conn.close()
        
        return jsonify({"success": True})
    
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# Remove building
@app.route('/buildings/remove/<name>', methods=['DELETE'])
def remove_building(name):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('DELETE FROM buildings WHERE name = %s', (name,))
        conn.commit()
        conn.close()
        
        return jsonify({"success": True})
    
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# Add cabinet
@app.route('/cabinets/add', methods=['POST'])
def add_cabinet():
    try:
        data = request.json
        building_name = data.get('building_name')
        identifier = data.get('identifier')
        cabinet_type = data.get('cabinet_type')
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get building id
        cursor.execute('SELECT id FROM buildings WHERE name = %s', (building_name,))
        building_row = cursor.fetchone()
        
        if not building_row:
            return jsonify({"success": False, "error": "Building not found"}), 404
        
        building_id = building_row[0]
        
        # Insert cabinet
        cursor.execute('''
            INSERT INTO cabinets (identifier, cabinet_type, building_id) 
            VALUES (%s, %s, %s)
        ''', (identifier, cabinet_type, building_id))
        
        conn.commit()
        conn.close()
        
        return jsonify({"success": True})
    
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# Remove cabinet
@app.route('/cabinets/remove/<identifier>', methods=['DELETE'])
def remove_cabinet(identifier):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('DELETE FROM cabinets WHERE identifier = %s', (identifier,))
        conn.commit()
        conn.close()
        
        return jsonify({"success": True})
    
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# Add cable
@app.route('/cables/add', methods=['POST'])
def add_cable():
    try:
        data = request.json
        cableID = data.get('cableID')
        cabinet1 = data.get('cabinet1')
        cabinet2 = data.get('cabinet2')
        number = data.get('number')
        num_of_fibers = int(data.get('num_of_fibers'))
        cable_type = data.get('cable_type')
        cabinet1_start = int(data.get('cabinet1_start'))
        cabinet2_start = int(data.get('cabinet2_start'))
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Insert cable
        cursor.execute('''
            INSERT INTO cables (
                cableID, number, num_of_fibers, cable_type, 
                cabinet1, cabinet2, cabinet1_start, cabinet2_start
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        ''', (
            cableID, number, num_of_fibers, cable_type,
            cabinet1, cabinet2, cabinet1_start, cabinet2_start
        ))
        
        # Create fibers for this cable
        for i in range(num_of_fibers):
            cursor.execute('''
                INSERT INTO fibers (
                    number_cabinet1, number_cabinet2, fiber_type, network, cable_id
                ) VALUES (%s, %s, %s, %s, %s)
            ''', (
                cabinet1_start + i, 
                cabinet2_start + i, 
                "0", 
                None, 
                cableID
            ))
        
        conn.commit()
        conn.close()
        
        return jsonify({"success": True})
    
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# Remove cable
@app.route('/cables/remove/<cableID>', methods=['DELETE'])
def remove_cable(cableID):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        # The fibers will be deleted automatically due to the ON DELETE CASCADE
        cursor.execute('DELETE FROM cables WHERE cableID = %s', (cableID,))
        conn.commit()
        conn.close()
        
        return jsonify({"success": True})
    
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# Update fiber network
@app.route('/fibers/update-network', methods=['POST'])
def update_fiber_network():
    try:
        data = request.json
        cableID = data.get('cableID')
        fiber_number = int(data.get('fiberNumber'))
        network = data.get('network')
        
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE fibers 
            SET network = %s 
            WHERE cable_id = %s AND number_cabinet1 = %s
        ''', (network, cableID, fiber_number))
        
        conn.commit()
        conn.close()
        
        return jsonify({"success": True})
    
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)