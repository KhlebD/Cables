from neomodel import (StructuredNode, StringProperty, IntegerProperty, 
                     RelationshipTo, RelationshipFrom, UniqueIdProperty)

class Building(StructuredNode):
    name = StringProperty(unique_index = True)
    cabinets = RelationshipTo('Cabinet', 'LOCATED_AT')

    def add_cabinet(self, identifier, cabinet_type):
        cabinet = Cabinet(identifier = identifier, cabinet_type = cabinet_type).save()
        self.cabinets.connect(cabinet)
        return cabinet
    
    def remove_cabinet(self, cab_id):
        cabinet = Cabinet.nodes.get(identifier = cab_id)
        if cabinet:
            cabinet.delete_all_relationships()
            cabinet.delete()
            return True
        return False
    
    def set_name(self, new_name):
        try:
            self.name = new_name
            self.save()
            return True
        except Exception as e:
            print(f"Error updating name: {str(e)}")
            return False


class Cabinet(StructuredNode):
    identifier = StringProperty(unique_index=True) 
    cabinet_type = StringProperty()
    building = RelationshipFrom('Building', 'LOCATED_AT')
    cables = RelationshipTo('Cable', 'CONNECTS')

    def add_cable(self, number, num_of_fibers, cable_type, other_cabinet):
        cable = Cable(number = number, num_of_fibers = num_of_fibers, cable_type = cable_type).save()
        self.cables.connect(cable)
        other_cabinet.cables.connect(cable)

        #add all fibers
        for i in range(1, int(num_of_fibers) + 1):
            cable.add_fiber(i, 0, None)

        return cable

    def remove_cable(self,cable_number):
        cable = self.CONNECTS.search(number = cable_number)
        if cable:
            
            cable.delete_all_relationships()
            cable.delete()
            return True
        return False
    
    def set_identifer(self, new_identifier):
        try:
            self.identifier = new_identifier
            self.save()
            return True
        except Exception as e:
            print(f"Error updating identifier: {str(e)}")
            return False
        
    def set_cabinet_type(self, new_cabinet_type):
        self.cabinet_type = new_cabinet_type
        self.save()
        return True

class Cable(StructuredNode):
    uid = UniqueIdProperty() 
    number = StringProperty()
    num_of_fibers = IntegerProperty()
    cable_type = StringProperty()
    fibers = RelationshipTo('Fiber', 'CONTAINS')

    def add_fiber(self, number, fiber_type, network = None):
        fiber = Fiber(number = number,  fiber_type = str(fiber_type), network = network).save()
        self.fibers.connect(fiber)
        return fiber
    
    def remove_Fiber(self, fiber_number):
        fiber = self.CONTAINS.search(number = fiber_number)
        if fiber:
            fiber.delete_all_relationships()
            fiber.delete()
            return True
        return False
    
    def set_number(self, new_number):
        self.number = new_number
        self.save()
        return True
    
    def set_num_of_fibers(self, new_num_of_fibers):
        self.num_of_fibers = new_num_of_fibers
        self.save()
        return True
    
    

class Fiber(StructuredNode):
    number = IntegerProperty()
    fiber_type = StringProperty()
    network = StringProperty(default = None)
    cable = RelationshipFrom('Cable', 'CONTAINS')

    def set_number(self, new_number):
        self.number = new_number
        self.save()
        return True
    
    def set_fiber_type(self, new_fiber_type):
        self.fiber_type = new_fiber_type
        self.save()
        return True
    
    def set_network(self, new_network):
        self.network = new_network
        self.save()
        return True
#yellow = single, #orange = multi