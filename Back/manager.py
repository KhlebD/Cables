from flask import Flask, request, jsonify
import psycopg2
import psycopg2.extras
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Database connection helper
def get_db_connection():
    conn = psycopg2.connect(
        host="localhost",
        database="postgres",
        user="postgres",
        password="12345"
    )
    conn.autocommit = False  # Disable autocommit to manage transactions manually
    return conn

# Database schema initialization
def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Create tables
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS buildings (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        display_order INTEGER DEFAULT 9999
    )
    ''')
    
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS cabinets (
        id SERIAL PRIMARY KEY,
        identifier TEXT UNIQUE NOT NULL,
        cabinet_type TEXT NOT NULL,
        building_id INTEGER NOT NULL,
        parent_cabinet TEXT NULL,
        FOREIGN KEY (building_id) REFERENCES buildings (id) ON DELETE CASCADE,
        FOREIGN KEY (parent_cabinet) REFERENCES cabinets(identifier) ON UPDATE CASCADE ON DELETE CASCADE
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
        cabinet2_start INTEGER NOT NULL,
        FOREIGN KEY (cabinet1) REFERENCES cabinets(identifier) ON UPDATE CASCADE ON DELETE CASCADE,
        FOREIGN KEY (cabinet2) REFERENCES cabinets(identifier) ON UPDATE CASCADE ON DELETE CASCADE
    )
    ''')
    
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS fibers (
        id SERIAL PRIMARY KEY,
        number_cabinet1 INTEGER NOT NULL,
        number_cabinet2 INTEGER NOT NULL,
        fiber_type TEXT NOT NULL DEFAULT '0',
        network TEXT,
        cable_id TEXT NOT NULL,
        FOREIGN KEY (cable_id) REFERENCES cables(cableID) ON UPDATE CASCADE ON DELETE CASCADE
    )
    ''')
    
    # Add parent_cabinet column if it doesn't exist (for existing databases)
    try:
        cursor.execute('ALTER TABLE cabinets ADD COLUMN parent_cabinet TEXT NULL')
        cursor.execute('ALTER TABLE cabinets ADD CONSTRAINT fk_parent_cabinet FOREIGN KEY (parent_cabinet) REFERENCES cabinets(identifier) ON UPDATE CASCADE ON DELETE CASCADE')
    except psycopg2.Error:
        # Column already exists, rollback and continue
        conn.rollback()
    
    conn.commit()
    conn.close()

# RETRIEVE ALL
@app.route('/database', methods=['GET'])
def get_network():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        # Get all buildings ordered by display_order
        cursor.execute('''
        SELECT id, name, display_order FROM buildings 
        ORDER BY display_order, name
        ''')
        buildings_data = cursor.fetchall()
        
        result = []
        
        # For each building, get its cabinets
        for building in buildings_data:
            building_info = {
                "name": building["name"],
                "order": building["display_order"],
                "cabinets": []
            }
            
            # Get cabinets for this building (including parent_cabinet field)
            cursor.execute('''
            SELECT id, identifier, cabinet_type, parent_cabinet FROM cabinets 
            WHERE building_id = %s
            ''', (building["id"],))
            cabinets_data = cursor.fetchall()
            
            # For each cabinet, get its cables
            for cabinet in cabinets_data:
                cabinet_info = {
                    "identifier": cabinet["identifier"],
                    "cabinet_type": cabinet["cabinet_type"],
                    "parent_cabinet": cabinet["parent_cabinet"],
                    "cables": []
                }
                
                # Get cables connected to this cabinet
                cursor.execute('''
                SELECT id, cableID, number, num_of_fibers, cable_type, cabinet1, cabinet2, 
                       cabinet1_start, cabinet2_start 
                FROM cables 
                WHERE cabinet1 = %s OR cabinet2 = %s
                ''', (cabinet["identifier"], cabinet["identifier"]))
                cables_data = cursor.fetchall()
                
                # For each cable, get its fibers
                for cable in cables_data:
                    cable_info = {
                        "uid": cable["cableID"],
                        "number": cable["number"],
                        "num_of_fibers": cable["num_of_fibers"],
                        "cable_type": cable["cable_type"],
                        "fibers": []
                    }
                    
                    # Get fibers for this cable
                    cursor.execute('''
                    SELECT number_cabinet1, number_cabinet2, fiber_type, network 
                    FROM fibers 
                    WHERE cable_id = %s
                    ORDER BY number_cabinet1
                    ''', (cable["cableID"],))
                    fibers_data = cursor.fetchall()
                    
                    for fiber in fibers_data:
                        fiber_info = {
                            "number_cabinet1": fiber["number_cabinet1"],
                            "number_cabinet2": fiber["number_cabinet2"],
                            "fiber_type": fiber["fiber_type"],
                            "network": fiber["network"]
                        }
                        cable_info["fibers"].append(fiber_info)
                    
                    cabinet_info["cables"].append(cable_info)
                
                building_info["cabinets"].append(cabinet_info)
            
            result.append(building_info)
        
        conn.close()
        return jsonify(result)
        
    except Exception as e:
        print("Error in get_network:", str(e))
        return jsonify({'error': str(e)}), 500

# ADDERS
@app.route('/buildings/add', methods=['POST'])
def add_building():
    data = request.get_json()
    
    if not data or 'name' not in data:
        return jsonify({'error': 'Invalid data'}), 400
        
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get the highest current order
        cursor.execute('SELECT MAX(display_order) FROM buildings')
        result = cursor.fetchone()
        max_order = result[0] if result[0] is not None else -1
        new_order = max_order + 1
        
        # Add new building with order
        cursor.execute(
            'INSERT INTO buildings (name, display_order) VALUES (%s, %s) RETURNING id',
            (data['name'], new_order)
        )
        
        conn.commit()
        conn.close()
        
        return jsonify({"message": "Building added successfully"}), 200
        
    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({'error': str(e)}), 500

@app.route('/cabinets/add', methods=['POST'])
def add_cabinet():
    data = request.get_json()
    
    if not data or 'building_name' not in data or 'identifier' not in data or 'cabinet_type' not in data:
        return jsonify({'error': 'Invalid data'}), 400
        
    parent_cabinet = data.get('parent_cabinet')
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get building id
        cursor.execute(
            'SELECT id FROM buildings WHERE name = %s',
            (data['building_name'],)
        )
        building = cursor.fetchone()
        
        if not building:
            conn.close()
            return jsonify({'error': 'Building not found'}), 404
            
        building_id = building[0]
        
        # Check if parent_cabinet exists (if provided)
        if parent_cabinet:
            cursor.execute(
                'SELECT identifier FROM cabinets WHERE identifier = %s AND building_id = %s',
                (parent_cabinet, building_id)
            )
            if not cursor.fetchone():
                conn.close()
                return jsonify({'error': 'Parent cabinet does not exist'}), 400
        
        # Add cabinet
        cursor.execute(
            'INSERT INTO cabinets (identifier, cabinet_type, building_id, parent_cabinet) VALUES (%s, %s, %s, %s)',
            (data['identifier'], data['cabinet_type'], building_id, parent_cabinet)
        )
        
        conn.commit()
        conn.close()
        
        return jsonify({"message": "Cabinet added successfully"}), 200
        
    except psycopg2.IntegrityError as e:
        conn.rollback()
        conn.close()
        if 'unique constraint' in str(e).lower():
            return jsonify({'error': 'Cabinet with this identifier already exists'}), 409
        return jsonify({'error': 'Database integrity error'}), 400
    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({'error': str(e)}), 500

@app.route('/cables/add', methods=['POST'])
def add_cable():
    data = request.get_json()
    
    if not data or not all(key in data for key in ['cableID', 'cabinet1', 'cabinet2', 'number', 'num_of_fibers', 'cable_type', 'cabinet1_start', 'cabinet2_start']):
        return jsonify({'error': 'Invalid data'}), 400
        
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Add cable
        cursor.execute(
            '''INSERT INTO cables (cableID, number, num_of_fibers, cable_type, cabinet1, cabinet2, cabinet1_start, cabinet2_start) 
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s)''',
            (data['cableID'], data['number'], data['num_of_fibers'], data['cable_type'], 
             data['cabinet1'], data['cabinet2'], data['cabinet1_start'], data['cabinet2_start'])
        )
        
        # Add fibers
        for i in range(int(data['num_of_fibers'])):
            cursor.execute(
                '''INSERT INTO fibers (number_cabinet1, number_cabinet2, fiber_type, cable_id) 
                   VALUES (%s, %s, %s, %s)''',
                (int(data['cabinet1_start']) + i, int(data['cabinet2_start']) + i, "0", data['cableID'])
            )
        
        conn.commit()
        conn.close()
        
        return jsonify({"message": "Cable and fibers added successfully"}), 200
        
    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({'error': str(e)}), 500

# REMOVERS
@app.route('/buildings/remove/<building_name>', methods=['DELETE'])
def remove_building(building_name):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute(
            'DELETE FROM buildings WHERE name = %s',
            (building_name,)
        )
        
        conn.commit()
        conn.close()
        
        return jsonify({"message": "Building and all connected elements removed successfully"}), 200
        
    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({'error': str(e)}), 500

@app.route('/cabinets/remove/<path:cabinet_id>', methods=['DELETE'])
def remove_cabinet(cabinet_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # First, remove all cables associated with this cabinet and its children
        cursor.execute('''
            DELETE FROM cables 
            WHERE cabinet1 = %s OR cabinet2 = %s
            OR cabinet1 IN (
                SELECT identifier FROM cabinets WHERE parent_cabinet = %s
            )
            OR cabinet2 IN (
                SELECT identifier FROM cabinets WHERE parent_cabinet = %s
            )
        ''', (cabinet_id, cabinet_id, cabinet_id, cabinet_id))
        
        # Remove all child cabinets (panels) first
        cursor.execute('''
            DELETE FROM cabinets WHERE parent_cabinet = %s
        ''', (cabinet_id,))
        
        # Then remove the main cabinet
        cursor.execute('''
            DELETE FROM cabinets WHERE identifier = %s
        ''', (cabinet_id,))
        
        conn.commit()
        conn.close()
        
        return jsonify({"message": "Cabinet and all related items removed successfully"}), 200
        
    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({'error': str(e)}), 500

@app.route('/cables/remove/<cable_id>', methods=['DELETE'])
def remove_cable(cable_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute(
            'DELETE FROM cables WHERE cableID = %s',
            (cable_id,)
        )
        
        conn.commit()
        conn.close()
        
        return jsonify({"message": "Cable and all fibers removed successfully"}), 200
        
    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({'error': str(e)}), 500

# UPDATERS
@app.route('/buildings/update', methods=['PUT'])
def update_building():
    data = request.get_json()
    print(data)
    if not data or 'oldName' not in data or 'newName' not in data:
        return jsonify({'error': 'Invalid data'}), 400
        
    old_name = data['oldName']
    new_name = data['newName']
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Update the building name
        cursor.execute(
            'UPDATE buildings SET name = %s WHERE name = %s',
            (new_name, old_name)
        )
        
        if cursor.rowcount == 0:
            conn.close()
            return jsonify({'error': 'Building not found'}), 404
            
        conn.commit()
        conn.close()
        
        return jsonify({'success': True}), 200
        
    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({'error': str(e)}), 500

@app.route('/cabinets/update', methods=['PUT'])
def update_cabinet():
    data = request.get_json()
    
    if not data or 'old_identifier' not in data or 'new_identifier' not in data or 'cabinet_type' not in data:
        return jsonify({'error': 'Invalid data'}), 400
        
    old_identifier = data['old_identifier']
    new_identifier = data['new_identifier']
    cabinet_type = data['cabinet_type']
    building_name = data['building_name']
    parent_cabinet = data.get('parent_cabinet')
    
    # Prevent circular reference
    if parent_cabinet == new_identifier:
        return jsonify({'error': 'Cabinet cannot be parent of itself'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get building id
        cursor.execute(
            'SELECT id FROM buildings WHERE name = %s',
            (building_name,)
        )
        building = cursor.fetchone()
        
        if not building:
            conn.close()
            return jsonify({'error': 'Building not found'}), 404
            
        building_id = building[0]
        
        # Check if the old cabinet exists
        cursor.execute(
            'SELECT identifier FROM cabinets WHERE identifier = %s AND building_id = %s',
            (old_identifier, building_id)
        )
        if not cursor.fetchone():
            conn.close()
            return jsonify({'error': 'Cabinet not found'}), 404
        
        # Check if parent_cabinet exists (if provided)
        if parent_cabinet:
            cursor.execute(
                'SELECT identifier FROM cabinets WHERE identifier = %s AND building_id = %s',
                (parent_cabinet, building_id)
            )
            if not cursor.fetchone():
                conn.close()
                return jsonify({'error': 'Parent cabinet does not exist'}), 400
        
        # Update the cabinet
        cursor.execute('''
            UPDATE cabinets 
            SET identifier = %s, cabinet_type = %s, parent_cabinet = %s
            WHERE identifier = %s AND building_id = %s
        ''', (new_identifier, cabinet_type, parent_cabinet, old_identifier, building_id))
        
        # Update any children that reference this cabinet as parent
        if old_identifier != new_identifier:
            cursor.execute('''
                UPDATE cabinets 
                SET parent_cabinet = %s 
                WHERE parent_cabinet = %s AND building_id = %s
            ''', (new_identifier, old_identifier, building_id))
        
        # Update any cables that reference this cabinet (ON UPDATE CASCADE should handle this, but being explicit)
        # The foreign key constraints should handle this automatically
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True}), 200
        
    except psycopg2.IntegrityError as e:
        conn.rollback()
        conn.close()
        if 'unique constraint' in str(e).lower():
            return jsonify({'error': 'Cabinet with this identifier already exists'}), 409
        return jsonify({'error': 'Database integrity error'}), 400
    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({'error': str(e)}), 500

@app.route('/cables/update', methods=['PUT'])
def update_cable():
    data = request.get_json()
    
    if not data or 'cableID' not in data:
        return jsonify({'error': 'Invalid data'}), 400
        
    cable_id = data['cableID']
    number = data.get('number')
    cable_type = data.get('cable_type')
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Build update query based on provided fields
        update_fields = []
        params = []
        
        if number:
            update_fields.append('number = %s')
            params.append(number)
            
        if cable_type:
            update_fields.append('cable_type = %s')
            params.append(cable_type)
            
        if not update_fields:
            conn.close()
            return jsonify({'error': 'No fields to update'}), 400
            
        # Create the SQL query
        query = 'UPDATE cables SET ' + ', '.join(update_fields) + ' WHERE cableID = %s'
        params.append(cable_id)
        
        # Execute the update
        cursor.execute(query, params)
        
        if cursor.rowcount == 0:
            conn.rollback()
            conn.close()
            return jsonify({'error': 'Cable not found'}), 404
                
        conn.commit()
        conn.close()
        
        return jsonify({'success': True}), 200
        
    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({'error': str(e)}), 500

@app.route('/fibers/update-network', methods=['POST'])
def update_network():
    data = request.get_json()
    
    if not data or 'cableID' not in data or 'fiberNumber' not in data:
        return jsonify({'error': 'Invalid data'}), 400
        
    cable_id = data.get('cableID')
    fiber_number = data.get('fiberNumber')
    new_network = data.get('network')
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute(
            'UPDATE fibers SET network = %s WHERE cable_id = %s AND number_cabinet1 = %s',
            (new_network, cable_id, fiber_number)
        )
        
        if cursor.rowcount == 0:
            conn.rollback()
            conn.close()
            return jsonify({'error': 'Fiber not found'}), 404
                
        conn.commit()
        conn.close()
        
        return jsonify({'success': True}), 200
        
    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({'error': str(e)}), 500

@app.route('/buildings/update-order', methods=['PUT'])
def update_building_order():
    data = request.get_json()
    
    if not data or not isinstance(data, list):
        return jsonify({'error': 'Invalid data format, expected an array of buildings with name and order'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Start a transaction
        cursor.execute("BEGIN")
        
        # Update each building's order
        for building_data in data:
            if 'name' not in building_data or 'order' not in building_data:
                conn.rollback()
                conn.close()
                return jsonify({'error': 'Each building must have name and order properties'}), 400
            
            cursor.execute(
                'UPDATE buildings SET display_order = %s WHERE name = %s',
                (building_data['order'], building_data['name'])
            )
        
        # Commit the transaction
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': 'Building order updated successfully'}), 200
        
    except Exception as e:
        conn.rollback()
        conn.close()
        print(f"Error updating building order: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == "__main__":
    init_db()
    app.run(debug=True, port=5001)