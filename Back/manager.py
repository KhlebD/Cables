from flask import Flask, request, jsonify
from neomodel import config, db
from models import Building, Cabinet, Panel, Cable, Fiber

#app = Flask(__name__)
config.DATABASE_URL = 'neo4j://neo4j:ramonramon@localhost:7687'

def test():
    try:
        b1 = Building(name = "BCC").save()
        b2 = Building(name = "SBC").save()

        c1 = b1.add_cabinet(identifier = "Aron A", cabinet_type = "black")
        c2 = b2.add_cabinet(identifier = "Aron B", cabinet_type = "black")
        
        p1 = c1.add_panel(identifier = "72-1-1", is_male_mole = False)
        p2 = c2.add_panel(identifier = "72-4-5", is_male_mole = False)

        cable1 = p1.add_cable(number = 1, slot1 = 1, slot2 = 3, num_of_fibers = 12, other_panel = p2)
        for i in range(1, 13):
            cable1.add_fiber(number = i, fiber_type = "yellow", network = "bezek")
    except Exception as e:
        print(f"Error creating test data: {str(e)}")

def main():
    pass

def add_building(name):
    b = Building(name = name).save()
    return b

def add_cabinet_to_building(building, identifier, cabinet_type):
    c = building.add_cabinet(cabinet_type = cabinet_type, identifier = identifier)
    return c

def add_panel_to_building
    


if __name__ == "__main__":
    test()


