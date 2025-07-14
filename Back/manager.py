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
    print("Starting database initialization...")
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Create all main tables
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
        
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS ports (
            id SERIAL PRIMARY KEY,
            cabinet_id TEXT NOT NULL,
            port_number INTEGER NOT NULL,
            status TEXT DEFAULT 'available',
            FOREIGN KEY (cabinet_id) REFERENCES cabinets(identifier) ON UPDATE CASCADE ON DELETE CASCADE,
            UNIQUE(cabinet_id, port_number)
        )
        ''')
        
        # Commit main table creation
        conn.commit()
        
    except Exception as e:
        print(f"Error creating main tables: {e}")
        conn.rollback()
        conn.close()
        return
    
    
    # Add parent_cabinet column if it doesn't exist
    try:
        cursor.execute('ALTER TABLE cabinets ADD COLUMN parent_cabinet TEXT NULL')
        cursor.execute('ALTER TABLE cabinets ADD CONSTRAINT fk_parent_cabinet FOREIGN KEY (parent_cabinet) REFERENCES cabinets(identifier) ON UPDATE CASCADE ON DELETE CASCADE')
        conn.commit()
    except psycopg2.Error as e:
        print(f"Parent cabinet column already exists or failed: {e}")
        conn.rollback()
    
    # Add port_count to cabinets table
    try:
        cursor.execute('ALTER TABLE cabinets ADD COLUMN port_count INTEGER DEFAULT 0')
        conn.commit()
    except psycopg2.Error as e:
        print(f"Port count column already exists: {e}")
        conn.rollback()
    
    # Add port references to fibers table - ONLY if ports table exists
    try:
        # First check if ports table actually exists
        cursor.execute("SELECT to_regclass('public.ports')")
        ports_exists = cursor.fetchone()[0] is not None
        
        if ports_exists:
            cursor.execute('ALTER TABLE fibers ADD COLUMN port_cabinet1_id INTEGER REFERENCES ports(id)')
            cursor.execute('ALTER TABLE fibers ADD COLUMN port_cabinet2_id INTEGER REFERENCES ports(id)')
            conn.commit()
            
    except psycopg2.Error as e:
        print(f"Port reference columns already exist: {e}")
        conn.rollback()
    
    # Final verification
    try:
        cursor.execute("""
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        """)

    except Exception as e:
        print(f"Error verifying tables: {e}")
    finally:
        conn.close()
        print("Database initialization completed!")

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
            
            # Get cabinets for this building (including port_count)
            cursor.execute('''
            SELECT id, identifier, cabinet_type, parent_cabinet, 
                   COALESCE(port_count, 0) as port_count 
            FROM cabinets 
            WHERE building_id = %s
            ''', (building["id"],))
            cabinets_data = cursor.fetchall()
            
            # For each cabinet, get its cables and ports
            for cabinet in cabinets_data:
                cabinet_info = {
                    "identifier": cabinet["identifier"],
                    "cabinet_type": cabinet["cabinet_type"],
                    "parent_cabinet": cabinet["parent_cabinet"],
                    "port_count": cabinet["port_count"],
                    "ports": [],
                    "cables": []
                }
                
                # Get ports for this cabinet

                cursor.execute('''
                SELECT id, port_number, status 
                FROM ports 
                WHERE cabinet_id = %s 
                ORDER BY port_number
                ''', (cabinet["identifier"],))
                ports_data = cursor.fetchall()
                
                for port in ports_data:
                    cabinet_info["ports"].append({
                        "id": port["id"],
                        "port_number": port["port_number"],
                        "status": port["status"]
                    })
                
                # Get cables connected to this cabinet                
                cursor.execute('''
                SELECT id, cableid, number, num_of_fibers, cable_type, cabinet1, cabinet2, 
                       cabinet1_start, cabinet2_start 
                FROM cables 
                WHERE cabinet1 = %s OR cabinet2 = %s
                ''', (cabinet["identifier"], cabinet["identifier"]))
                cables_data = cursor.fetchall()
                
                # For each cable, get its fibers with port information
                for cable in cables_data:
                    cable_info = {
                        "uid": cable["cableid"],
                        "number": cable["number"],
                        "num_of_fibers": cable["num_of_fibers"],
                        "cable_type": cable["cable_type"],
                        "cabinet1": cable["cabinet1"],
                        "cabinet2": cable["cabinet2"],
                        "cabinet1_start": cable["cabinet1_start"],
                        "cabinet2_start": cable["cabinet2_start"],
                        "fibers": []
                    }
                    # Get fibers for this cable with port information
                    cursor.execute('''
                    SELECT f.number_cabinet1, f.number_cabinet2, f.fiber_type, f.network,
                           p1.port_number as port1_number, p2.port_number as port2_number
                    FROM fibers f
                    LEFT JOIN ports p1 ON f.port_cabinet1_id = p1.id
                    LEFT JOIN ports p2 ON f.port_cabinet2_id = p2.id
                    WHERE f.cable_id = %s
                    ORDER BY f.number_cabinet1
                    ''', (cable["cableid"],))
                    fibers_data = cursor.fetchall()
                    
                    for fiber in fibers_data:
                        fiber_info = {
                            "number_cabinet1": fiber["number_cabinet1"],
                            "number_cabinet2": fiber["number_cabinet2"],
                            "fiber_type": fiber["fiber_type"],
                            "network": fiber["network"],
                            "port_cabinet1": fiber["port1_number"],
                            "port_cabinet2": fiber["port2_number"]
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
    
    # Extract data fields
    name = data.get('name') if data else None
    
    if not name:
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
            (name, new_order)
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
    
    # Extract data fields
    building_name = data.get('building_name') if data else None
    identifier = data.get('identifier') if data else None
    cabinet_type = data.get('cabinet_type') if data else None
    parent_cabinet = data.get('parent_cabinet') if data else None
    port_count = data.get('port_count') if data else None
    
    if not all([building_name, identifier, cabinet_type]):
        return jsonify({'error': 'Invalid data'}), 400
        
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
            (identifier, cabinet_type, building_id, parent_cabinet)
        )
        
        # Handle port count if provided
        if port_count is not None:
            port_count = int(port_count)
            
            # Create ports if count > 0
            if port_count > 0:
                for port_num in range(1, port_count + 1):
                    cursor.execute(
                        "INSERT INTO ports (cabinet_id, port_number) VALUES (%s, %s)",
                        (identifier, port_num)
                    )
            
            # Update cabinet port count
            cursor.execute(
                'UPDATE cabinets SET port_count = %s WHERE identifier = %s',
                (port_count, identifier)
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
    
    # Extract data fields
    cable_id = data.get('cableID') if data else None
    cabinet1 = data.get('cabinet1') if data else None
    cabinet2 = data.get('cabinet2') if data else None
    number = data.get('number') if data else None
    num_of_fibers = data.get('num_of_fibers') if data else None
    cable_type = data.get('cable_type') if data else None
    cabinet1_start = data.get('cabinet1_start') if data else None
    cabinet2_start = data.get('cabinet2_start') if data else None
    
    if not all([cable_id, cabinet1, cabinet2, number, num_of_fibers, cable_type, cabinet1_start, cabinet2_start]):
        return jsonify({'error': 'Invalid data'}), 400
        
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Add cable
        cursor.execute(
            '''INSERT INTO cables (cableID, number, num_of_fibers, cable_type, cabinet1, cabinet2, cabinet1_start, cabinet2_start) 
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s)''',
            (cable_id, number, num_of_fibers, cable_type, cabinet1, cabinet2, cabinet1_start, cabinet2_start)
        )
        
        # Add fibers
        for i in range(int(num_of_fibers)):
            cursor.execute(
                '''INSERT INTO fibers (number_cabinet1, number_cabinet2, fiber_type, cable_id) 
                   VALUES (%s, %s, %s, %s)''',
                (int(cabinet1_start) + i, int(cabinet2_start) + i, "0", cable_id)
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
        # First, get all ports that are assigned to fibers of this cable
        cursor.execute('''
            SELECT f.port_cabinet1_id, f.port_cabinet2_id
            FROM fibers f
            WHERE f.cable_id = %s AND (f.port_cabinet1_id IS NOT NULL OR f.port_cabinet2_id IS NOT NULL)
        ''', (cable_id,))
        port_assignments = cursor.fetchall()
        
        # Collect all port IDs that need to be freed
        port_ids_to_free = []
        for assignment in port_assignments:
            if assignment[0]:  # port_cabinet1_id
                port_ids_to_free.append(assignment[0])
            if assignment[1]:  # port_cabinet2_id
                port_ids_to_free.append(assignment[1])
        
        print(f"🔄 Freeing {len(port_ids_to_free)} ports for cable {cable_id}")
        
        # Free the ports before deleting the cable
        if port_ids_to_free:
            cursor.execute('''
                UPDATE ports SET status = 'available' 
                WHERE id = ANY(%s)
            ''', (port_ids_to_free,))
            print(f"✅ Freed ports: {port_ids_to_free}")
        
        # Now delete the cable (this will cascade delete fibers)
        cursor.execute(
            'DELETE FROM cables WHERE cableid = %s',
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
    
    # Extract data fields
    old_name = data.get('oldName') if data else None
    new_name = data.get('newName') if data else None
    
    if not all([old_name, new_name]):
        return jsonify({'error': 'Invalid data'}), 400
        
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

# Replace your update_cabinet endpoint with this debug version:

@app.route('/cabinets/update', methods=['PUT'])
def update_cabinet():
    data = request.get_json()
    print(f"🔍 Received data: {data}")
    
    # Extract data fields
    old_identifier = data.get('old_identifier') if data else None
    new_identifier = data.get('new_identifier') if data else None
    cabinet_type = data.get('cabinet_type') if data else None
    building_name = data.get('building_name') if data else None
    parent_cabinet = data.get('parent_cabinet') if data else None
    port_count = data.get('port_count') if data else None
    
    print(f"🔍 Extracted fields:")
    print(f"  - old_identifier: {old_identifier}")
    print(f"  - new_identifier: {new_identifier}")
    print(f"  - cabinet_type: {cabinet_type}")
    print(f"  - building_name: {building_name}")
    print(f"  - parent_cabinet: {parent_cabinet}")
    print(f"  - port_count: {port_count}")
    
    if not all([old_identifier, new_identifier, cabinet_type]):
        print("❌ Missing required fields")
        return jsonify({'error': 'Invalid data - missing required fields'}), 400
    
    # Prevent circular reference
    if parent_cabinet == new_identifier:
        print("❌ Circular reference detected")
        return jsonify({'error': 'Cabinet cannot be parent of itself'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        print(f"🔍 Looking for building: {building_name}")
        # Get building id
        cursor.execute(
            'SELECT id FROM buildings WHERE name = %s',
            (building_name,)
        )
        building = cursor.fetchone()
        
        if not building:
            conn.close()
            print(f"❌ Building not found: {building_name}")
            return jsonify({'error': 'Building not found'}), 404
            
        building_id = building[0]
        print(f"✓ Building found with ID: {building_id}")
        
        print(f"🔍 Checking if cabinet exists: {old_identifier}")
        # Check if the old cabinet exists
        cursor.execute(
            'SELECT identifier FROM cabinets WHERE identifier = %s AND building_id = %s',
            (old_identifier, building_id)
        )
        if not cursor.fetchone():
            conn.close()
            print(f"❌ Cabinet not found: {old_identifier}")
            return jsonify({'error': 'Cabinet not found'}), 404
        
        print("✓ Cabinet exists")
        
        # Check if parent_cabinet exists (if provided)
        if parent_cabinet:
            print(f"🔍 Checking parent cabinet: {parent_cabinet}")
            cursor.execute(
                'SELECT identifier FROM cabinets WHERE identifier = %s AND building_id = %s',
                (parent_cabinet, building_id)
            )
            if not cursor.fetchone():
                conn.close()
                print(f"❌ Parent cabinet not found: {parent_cabinet}")
                return jsonify({'error': 'Parent cabinet does not exist'}), 400
            print("✓ Parent cabinet exists")
        
        print("🔄 Updating cabinet...")
        # Update the cabinet
        cursor.execute('''
            UPDATE cabinets 
            SET identifier = %s, cabinet_type = %s, parent_cabinet = %s
            WHERE identifier = %s AND building_id = %s
        ''', (new_identifier, cabinet_type, parent_cabinet, old_identifier, building_id))
        
        print(f"✓ Cabinet updated. Rows affected: {cursor.rowcount}")
        
        # Update any children that reference this cabinet as parent
        if old_identifier != new_identifier:
            print("🔄 Updating child cabinet references...")
            cursor.execute('''
                UPDATE cabinets 
                SET parent_cabinet = %s 
                WHERE parent_cabinet = %s AND building_id = %s
            ''', (new_identifier, old_identifier, building_id))
            print(f"✓ Child references updated. Rows affected: {cursor.rowcount}")
        
        # Handle port count if provided
        if port_count is not None:
            print(f"🔄 Handling port count: {port_count}")
            try:
                port_count = int(port_count)
                print(f"✓ Port count converted to int: {port_count}")
                
                # Check if ports table exists
                cursor.execute("SELECT to_regclass('public.ports')")
                ports_table_exists = cursor.fetchone()[0] is not None
                print(f"🔍 Ports table exists: {ports_table_exists}")
                
                if ports_table_exists:
                    # Delete existing ports for this cabinet
                    print(f"🔄 Deleting existing ports for cabinet: {new_identifier}")
                    cursor.execute("DELETE FROM ports WHERE cabinet_id = %s", (new_identifier,))
                    deleted_count = cursor.rowcount
                    print(f"✓ Deleted {deleted_count} existing ports")
                    
                    # Create new ports if count > 0
                    if port_count > 0:
                        print(f"🔄 Creating {port_count} new ports...")
                        for port_num in range(1, port_count + 1):
                            cursor.execute(
                                "INSERT INTO ports (cabinet_id, port_number) VALUES (%s, %s)",
                                (new_identifier, port_num)
                            )
                        print(f"✓ Created {port_count} new ports")
                    
                    # Update cabinet port count
                    print("🔄 Updating cabinet port_count field...")
                    cursor.execute(
                        'UPDATE cabinets SET port_count = %s WHERE identifier = %s',
                        (port_count, new_identifier)
                    )
                    print(f"✓ Cabinet port_count updated to {port_count}")
                else:
                    print("⚠️ Ports table doesn't exist, skipping port operations")
                    
            except ValueError as e:
                print(f"❌ Error converting port_count to int: {e}")
                conn.rollback()
                conn.close()
                return jsonify({'error': f'Invalid port_count value: {port_count}'}), 400
            except Exception as e:
                print(f"❌ Error handling ports: {e}")
                conn.rollback()
                conn.close()
                return jsonify({'error': f'Error handling ports: {str(e)}'}), 500
        
        conn.commit()
        print("✅ All changes committed successfully")
        conn.close()
        
        return jsonify({'success': True}), 200
        
    except psycopg2.IntegrityError as e:
        print(f"❌ Database integrity error: {e}")
        conn.rollback()
        conn.close()
        if 'unique constraint' in str(e).lower():
            return jsonify({'error': 'Cabinet with this identifier already exists'}), 409
        return jsonify({'error': 'Database integrity error'}), 400
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        print(f"❌ Error type: {type(e)}")
        conn.rollback()
        conn.close()
        return jsonify({'error': str(e)}), 500
    
    
@app.route('/cables/update', methods=['PUT'])
def update_cable():
    data = request.get_json()
    
    # Extract data fields
    cable_id = data.get('cableID') if data else None
    number = data.get('number') if data else None
    cable_type = data.get('cable_type') if data else None
    
    if not cable_id:
        return jsonify({'error': 'Invalid data'}), 400
        
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
    
    # Extract data fields
    cable_id = data.get('cableID') if data else None
    fiber_number = data.get('fiberNumber') if data else None
    new_network = data.get('network') if data else None
    
    if not all([cable_id, fiber_number]):
        return jsonify({'error': 'Invalid data'}), 400
        
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
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Start a transaction
        cursor.execute("BEGIN")
        
        # Update each building's order
        for building_data in data:
            building_name = building_data.get('name')
            building_order = building_data.get('order')
            
            if not all([building_name, building_order is not None]):
                conn.rollback()
                conn.close()
                return jsonify({'error': 'Each building must have name and order properties'}), 400
            
            cursor.execute(
                'UPDATE buildings SET display_order = %s WHERE name = %s',
                (building_order, building_name)
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

@app.route('/cabinets/port_update/<cabinet_id>', methods=['PUT'])
def update_cabinet_ports(cabinet_id):
    data = request.get_json()
    
    # Extract data fields
    port_count = data.get('port_count') if data else None
    
    if port_count is None:
        return jsonify({'error': 'port_count is required'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Check if cabinet exists
        cursor.execute('SELECT identifier FROM cabinets WHERE identifier = %s', (cabinet_id,))
        if not cursor.fetchone():
            conn.close()
            return jsonify({'error': 'Cabinet not found'}), 404
        
        # Delete existing ports first
        cursor.execute('DELETE FROM ports WHERE cabinet_id = %s', (cabinet_id,))
        
        # Create new ports
        for port_num in range(1, port_count + 1):
            cursor.execute('''
                INSERT INTO ports (cabinet_id, port_number, status) 
                VALUES (%s, %s, %s)
            ''', (cabinet_id, port_num, 'available'))
        
        # Update cabinet port count
        cursor.execute('''
            UPDATE cabinets SET port_count = %s WHERE identifier = %s
        ''', (port_count, cabinet_id))
        
        conn.commit()
        conn.close()
        
        return jsonify({'message': f'Successfully updated cabinet {cabinet_id} to {port_count} ports'}), 200
        
    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({'error': str(e)}), 500

@app.route('/ports/auto-assign', methods=['POST'])
def auto_assign_fibers_endpoint():
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    
    try:
        # Get all fibers that don't have port assignments
        cursor.execute('''
            SELECT f.id, f.cable_id, c.cabinet1, c.cabinet2, f.number_cabinet1, f.number_cabinet2,
                   c.cabinet1_start, c.cabinet2_start, c.num_of_fibers
            FROM fibers f
            JOIN cables c ON f.cable_id = c.cableid
            WHERE f.port_cabinet1_id IS NULL OR f.port_cabinet2_id IS NULL
            ORDER BY f.cable_id, f.number_cabinet1
        ''')
        fibers = cursor.fetchall()
        
        assignments_made = 0
        
        # Group fibers by cable to process each cable together
        cables_processed = set()
        
        for fiber in fibers:
            cable_id = fiber['cable_id']
            
            # Skip if we already processed this cable
            if cable_id in cables_processed:
                continue
                
            cables_processed.add(cable_id)
            cabinet1 = fiber['cabinet1']
            cabinet2 = fiber['cabinet2']
            cabinet1_start = fiber['cabinet1_start']
            cabinet2_start = fiber['cabinet2_start']
            num_fibers = fiber['num_of_fibers']
            
            print(f"🔄 Processing cable {cable_id}: {cabinet1} ports {cabinet1_start}-{cabinet1_start + num_fibers - 1} ↔ {cabinet2} ports {cabinet2_start}-{cabinet2_start + num_fibers - 1}")
            
            # Calculate required port ranges
            cabinet1_ports_needed = list(range(cabinet1_start, cabinet1_start + num_fibers))
            cabinet2_ports_needed = list(range(cabinet2_start, cabinet2_start + num_fibers))
            
            # Check if all required ports are available in cabinet1
            print(f"🔍 Checking port availability for cable {cable_id}:")
            print(f"  📍 Cabinet1: {cabinet1}, needs ports {cabinet1_ports_needed}")
            print(f"  📍 Cabinet2: {cabinet2}, needs ports {cabinet2_ports_needed}")
            cursor.execute('''
                SELECT port_number FROM ports 
                WHERE cabinet_id = %s AND port_number = ANY(%s) AND status != 'available'
            ''', (cabinet1, cabinet1_ports_needed))
            occupied_ports_cab1 = [row['port_number'] for row in cursor.fetchall()]
            
            if occupied_ports_cab1:
                conn.rollback()
                conn.close()
                return jsonify({
                    'error': f'Ports {occupied_ports_cab1} in cabinet {cabinet1} are already occupied'
                }), 400

            # Check if all required ports are available in cabinet2
            cursor.execute('''
                SELECT port_number FROM ports 
                WHERE cabinet_id = %s AND port_number = ANY(%s) AND status != 'available'
            ''', (cabinet2, cabinet2_ports_needed))
            occupied_ports_cab2 = [row['port_number'] for row in cursor.fetchall()]
            
            if occupied_ports_cab2:
                conn.rollback()
                conn.close()
                return jsonify({
                    'error': f'Ports {occupied_ports_cab2} in cabinet {cabinet2} are already occupied'
                }), 400
            
            # Check if all required ports exist (in case cabinet doesn't have enough ports)
            print(f"🔍 Checking if required ports exist...")
            cursor.execute('''
                SELECT port_number FROM ports 
                WHERE cabinet_id = %s 
                ORDER BY port_number
            ''', (cabinet1,))
            existing_ports_cab1 = [row['port_number'] for row in cursor.fetchall()]
            print(f"  📊 Cabinet {cabinet1} has ports: {existing_ports_cab1}")
            cursor.execute('''
                SELECT COUNT(*) as count FROM ports 
                WHERE cabinet_id = %s AND port_number = ANY(%s)
            ''', (cabinet1, cabinet1_ports_needed))
            if cursor.fetchone()['count'] != num_fibers:
                conn.rollback()
                conn.close()
                return jsonify({
                    'error': f'Cabinet {cabinet1} does not have all required ports {cabinet1_ports_needed}'
                }), 400
                
            cursor.execute('''
                SELECT COUNT(*) as count FROM ports 
                WHERE cabinet_id = %s AND port_number = ANY(%s)
            ''', (cabinet2, cabinet2_ports_needed))
            if cursor.fetchone()['count'] != num_fibers:
                conn.rollback()
                conn.close()
                return jsonify({
                    'error': f'Cabinet {cabinet2} does not have all required ports {cabinet2_ports_needed}'
                }), 400
            
            # All ports are available, now assign them
            # Get all fibers for this cable
            cursor.execute('''
                SELECT f.id, f.number_cabinet1, f.number_cabinet2
                FROM fibers f
                WHERE f.cable_id = %s
                ORDER BY f.number_cabinet1
            ''', (cable_id,))
            cable_fibers = cursor.fetchall()
            
            for i, cable_fiber in enumerate(cable_fibers):
                fiber_id = cable_fiber['id']
                port1_number = cabinet1_start + i
                port2_number = cabinet2_start + i
                
                # Get port IDs
                cursor.execute('''
                    SELECT id FROM ports 
                    WHERE cabinet_id = %s AND port_number = %s
                ''', (cabinet1, port1_number))
                port1_id = cursor.fetchone()['id']
                
                cursor.execute('''
                    SELECT id FROM ports 
                    WHERE cabinet_id = %s AND port_number = %s
                ''', (cabinet2, port2_number))
                port2_id = cursor.fetchone()['id']
                
                # Assign fiber to ports
                cursor.execute('''
                    UPDATE fibers 
                    SET port_cabinet1_id = %s, port_cabinet2_id = %s 
                    WHERE id = %s
                ''', (port1_id, port2_id, fiber_id))
                
                # Mark ports as occupied
                cursor.execute('''
                    UPDATE ports SET status = 'occupied' 
                    WHERE id IN (%s, %s)
                ''', (port1_id, port2_id))
                
                assignments_made += 1
                print(f"✅ Assigned fiber {cable_fiber['number_cabinet1']}→{cable_fiber['number_cabinet2']} to ports {port1_number}→{port2_number}")
        
        conn.commit()
        conn.close()
        
        return jsonify({'message': f'Successfully assigned {assignments_made} fibers to their designated ports'}), 200
        
    except Exception as e:
        print(f"❌ Error in auto-assign: {e}")
        conn.rollback()
        conn.close()
        return jsonify({'error': str(e)}), 500
@app.route('/cables/update-networks', methods=['POST'])
def update_cable_networks():
    data = request.get_json()
    cable_uid = data.get('cableUID')
    network = data.get('network')
    
    if not cable_uid:
        return jsonify({'error': 'Cable UID required'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute(
            'UPDATE fibers SET network = %s WHERE cable_id = %s',
            (network, cable_uid)
        )
        
        conn.commit()
        conn.close()
        
        return jsonify({'message': f'Updated network for all fibers in cable {cable_uid}'}), 200
        
    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({'error': str(e)}), 500
    
if __name__ == "__main__":
    init_db()
    app.run(debug=True, port=5001)