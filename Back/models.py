from flask import Flask, request, jsonify
from neomodel import (StructuredNode, StringProperty, IntegerProperty, 
                     RelationshipTo, RelationshipFrom, BooleanProperty)

class Building(StructuredNode):
    name = StringProperty(unique_index = True)
    cabinets = RelationshipTo('Cabinet', 'LOCATED_AT')
    panels = RelationshipTo('Panel', 'LOCATED_AT')

    def add_cabinet(self, cabinet_type, identifier):
        cabinet = Cabinet(identifier = identifier, cabinet_type = cabinet_type).save()
        self.cabinets.connect(cabinet)
        return cabinet
    
    def add_panel(self, identifier, is_male_mole):
        panel = Panel(identifier = identifier, is_male_mole = is_male_mole).save()
        self.panels.connect(panel)
        return panel

class Cabinet(StructuredNode):
    identifier = StringProperty()
    cabinet_type = StringProperty()
    building = RelationshipFrom('Building', 'LOCATED_AT')
    panels = RelationshipTo('Panel', 'CONTAINS')

    def add_panel(self, identifier, is_male_mole):
        panel = Panel(identifier = identifier, is_male_mole = is_male_mole).save()
        self.panels.connect(panel)
        return panel


class Panel(StructuredNode):
    identifier = StringProperty()
    building = RelationshipFrom('Building', 'LOCATED_AT')
    cabinet = RelationshipFrom('Panel', 'CONTAINS')
    cables = RelationshipTo('Cable', 'CONNECTS')
    is_male_mole = BooleanProperty(default = False)

    def add_cable(self, number, slot1, slot2, num_of_fibers, other_panel):
        cable = Cable(number = number, slot1 = slot1, slot2 = slot2,
                       num_of_fibers = num_of_fibers, panel1 = self, panel2 = other_panel).save()
        self.cables.connect(cable)
        other_panel.cables.connect(cable)
        return cable

class Cable(StructuredNode):
    number = IntegerProperty()
    slot1 = IntegerProperty()
    slot2 = IntegerProperty()
    num_of_fibers = IntegerProperty()
    panel1 = RelationshipFrom('Panel', 'CONNECTS')
    panel2 = RelationshipFrom('Panel', 'CONNECTS')
    fibers = RelationshipTo('Fiber', 'CONTAINS')

    def add_fiber(self, number, fiber_type, network = None):
        fiber = Fiber(number = number, network = network, fiber_type = fiber_type).save()
        self.fibers.connect(fiber)
        return fiber
    
    def change_fiber_network(self, fiber, network):
        pass

class Fiber(StructuredNode):
    number = IntegerProperty()
    fiber_type = StringProperty()
    network = StringProperty(default = None)
    cable = RelationshipFrom('Cable', 'CONTAINS')
#yellow = single, #orange = multi