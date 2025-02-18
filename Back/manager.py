from flask import Flask, request, jsonify
from flask_cors import CORS  
from neomodel import config, db
from models import Building, Cabinet, Cable, Fiber
import time
import random

#app = Flask(__name__)
config.DATABASE_URL = 'neo4j://neo4j:ramonramon@localhost:7687'
app = Flask(__name__)
CORS(app)

def test():
    try:
        b1 = Building(name = "BCC").save()
        b2 = Building(name = "SBC").save()

        c1 = b1.add_cabinet(identifier = "Aron A", cabinet_type = "black")
        c2 = b2.add_cabinet(identifier = "Aron B", cabinet_type = "black")

        cable1 = c1.add_cable(number = 1, num_of_fibers = 12, other_cabinet = c2)
        for i in range(1, 13):
            cable1.add_fiber(number = i, fiber_type = "yellow", network = "bezek")
    except Exception as e:
        print(f"Error creating test data: {str(e)}")

# RETRIEVE ALL
@app.route('/database', methods=['GET'])
def get_network():
    try:
        query = """
        MATCH (b:Building)
        OPTIONAL MATCH (b)-[:LOCATED_AT]->(cab:Cabinet)
        OPTIONAL MATCH (cab)-[:CONNECTS]->(cable:Cable)
        OPTIONAL MATCH (cable)-[:CONTAINS]->(fiber:Fiber)
        WITH b, cab, cable, collect({
            number_cabinet1: fiber.number_cabinet1,
            number_cabinet2: fiber.number_cabinet2,
            fiber_type: fiber.fiber_type,
            network: fiber.network
        }) as fibers
        WITH b, cab, collect({
            uid: cable.uid,
            number: cable.number,
            num_of_fibers: cable.num_of_fibers,
            cable_type: cable.cable_type,
            fibers: fibers
        }) as cables
        WITH b, collect({
            identifier: cab.identifier,
            cabinet_type: cab.cabinet_type,
            cables: cables
        }) as cabinets
        RETURN collect({
            name: b.name,
            cabinets: cabinets
        }) as buildings
        """
        results, _ = db.cypher_query(query)
        
        if results and results[0]:
            return jsonify(results[0][0])
        return jsonify([])

    except Exception as e:
        print("Error in get_network:", str(e))
        return jsonify({'error': str(e)}), 500
    
# GETTERS

# Buildings
@app.route('/buildings', methods=['GET'])
def get_buildings():
    buildings = Building.nodes.all()
    return jsonify([{'name': b.name} for b in buildings])

# Cabinets
@app.route('/buildings/<building_name>/cabinets', methods=['GET'])
def get_building_cabinets(building_name):
    building = Building.nodes.get(name=building_name)
    return jsonify([{
        'identifier': cab.identifier,
        'type': cab.cabinet_type
    } for cab in building.LOCATED_AT])

# Cables
@app.route('/cabinets/<cabinet_id>/cables', methods=['GET'])
def get_cabinet_cables(cabinet_id):
    cabinet = Cabinet.nodes.get(identifier=cabinet_id)
    return jsonify([{
        'number': cable.number,
        'num_of_fibers': cable.num_of_fibers,
    } for cable in cabinet.CONNECTS])

# Fibers
@app.route('/cabinets/<cabinet_id>/<cable_num>/fibers', methods=['GET'])
def get_cable_fibers(cabinet_id, cable_number):
    cabinet = Cabinet.nodes.get(identifier=cabinet_id)
    cable = cabinet.CONNECTS.search(number = cable_number)
    return jsonify([{
        'number': fiber.number,
        'fiber_type': fiber.num_of_fibers,
        'network': fiber.number,
    } for fiber in cable.CONTAINS])
    
# ADDERS
@app.route('/buildings/add', methods=['POST'])
def add_building():
    data = request.json
    query = """
        CREATE (b:Building {name: $name})
        RETURN b
    """
    try:
        db.cypher_query(query, {'name': data['name']})
        return jsonify({"message": "Building added successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/cabinets/add', methods=['POST'])
def add_cabinet():
    data = request.json
    query = """
        MATCH (b:Building {name: $building_name})
        CREATE (c:Cabinet {
            identifier: $identifier,
            cabinet_type: $cabinet_type
        })
        CREATE (b)-[:LOCATED_AT]->(c)
        RETURN c
    """
    try:
        params = {
            'building_name': data['building_name'],
            'identifier': data['identifier'],
            'cabinet_type': data['cabinet_type']
        }
        db.cypher_query(query, params)
        return jsonify({"message": "Cabinet added successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/cables/add', methods=['POST'])
def add_cable():
    data = request.json
    unique_id = data['cableID']
    query = """
    MATCH (c1:Cabinet {identifier: $cabinet1})
    MATCH (c2:Cabinet {identifier: $cabinet2})
    
    // Create cable
    CREATE (cable:Cable {
        number: $number,
        num_of_fibers: $num_of_fibers,
        cable_type: $cable_type,
        uid: $uid
    })
    
    // Connect cable to both cabinets
    CREATE (c1)-[:CONNECTS]->(cable)
    CREATE (c2)-[:CONNECTS]->(cable)
    
    // Create all fibers with UNWIND
    WITH cable, range(1, $num_of_fibers) as numbers
    UNWIND numbers as fiber_number
    CREATE (f:Fiber {
        number_cabinet1: fiber_number + $cabinet1_start - 1,
        number_cabinet2: fiber_number + $cabinet2_start - 1,
        fiber_type: "0",
        network: null
    })

    CREATE (cable)-[:CONTAINS]->(f)
    RETURN cable
    """
    
    try:
        params = {
            'cabinet1': data['cabinet1'],
            'cabinet2': data['cabinet2'],
            'number': data['number'],
            'num_of_fibers': int(data['num_of_fibers']),
            'cable_type': data['cable_type'],
            'uid' : unique_id,
            'cabinet1_start': int(data['cabinet1_start']),
            'cabinet2_start': int(data['cabinet2_start'])
        }
        
        db.cypher_query(query, params)
        return jsonify({"message": "Cable and fibers added successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/fibers/add', methods=['POST'])
def add_fiber():
    data = request.json
    cabinet = cabinet.nodes.get(name=data['building_name'])
    cable = cabinet.CONNECTS.search(number = data['cable_number'])
    cable.add_fiber(data['number'], data['fiber_type'], data['network'])
    return jsonify({"message": "Cable added successfully"})

# REMOVERS
@app.route('/buildings/remove/<building_name>', methods=['DELETE'])
def remove_building(building_name):
    query = """
    MATCH (b:Building {name: $building_name})
    OPTIONAL MATCH (b)-[:LOCATED_AT]->(cab:Cabinet)
    OPTIONAL MATCH (cab)-[:CONNECTS]->(c:Cable)
    OPTIONAL MATCH (c)-[:CONTAINS]->(f:Fiber)
    DETACH DELETE f, c, cab, b
    """
    db.cypher_query(query, {'building_name': building_name})
    return jsonify({"message": "Building and all connected elements removed successfully"})

@app.route('/cabinets/remove/<cabinet_id>', methods=['DELETE'])
def remove_cabinet(cabinet_id):
    query = """
    MATCH (cab:Cabinet {identifier: $cabinet_id})
    OPTIONAL MATCH (cab)-[:CONNECTS]->(c:Cable)
    OPTIONAL MATCH (c)-[:CONTAINS]->(f:Fiber)
    DETACH DELETE f, c, cab
    """
    db.cypher_query(query, {'cabinet_id': cabinet_id})
    return jsonify({"message": "Cabinet and all connected elements removed successfully"})

@app.route('/cables/remove/<cable_id>', methods=['DELETE'])
def remove_cable(cable_id):
    query = """
        MATCH (c:Cable {uid: $cable_id})
        OPTIONAL MATCH (c)-[:CONTAINS]->(f:Fiber)
        DETACH DELETE f, c
        """
    db.cypher_query(query, {'cable_id': cable_id})
    return jsonify({"message": "Cable and all fibers removed successfully"})

@app.route('/fibers/remove/', methods=['DELETE'])
def remove_fiber():
    data = request.json
    cabinet = Cabinet.nodes.get(identifier = data['identifier'])
    cable = cabinet.CONNECTS.search(number = data['cable_number']) 
    cable.remove_fiber(data['fiber_number'])
    return jsonify({"message": "fiber removed successfully"})


# UPDATERS
@app.route('/fibers/update-network', methods=['POST'])
def update_network():

    data = request.get_json()
    cable_id = data.get('cableID')
    number_cabinet1 = data.get('fiberNumber')
    print(number_cabinet1)
    new_network = data.get('network')

    query = """
        MATCH (c:Cable {uid: $cable_id})
        MATCH (c)-[:CONTAINS]->(f:Fiber {number_cabinet1: $number_cabinet1})
        SET f.network = $new_network
        RETURN f
    """
    params = {
        'cable_id': cable_id,
        'number_cabinet1': number_cabinet1,
        'new_network': new_network
    }
    
    result = db.cypher_query(query, params)
    return jsonify({"message": "Fiber network updated successfully"})


def main():
    db.cypher_query("MATCH (n) DETACH DELETE n")
    test()
    building = Building.nodes.get(name="BCC")
    building.add_cabinet("790-123-5", True)

if __name__ == "__main__":
    app.run(debug=True, port=5001)



