import { create } from 'zustand'

const Store = create((set, get) => ({
    buildings: [], // Array of buildings with nested cabinets, cables, fibers

    // Fetch all network data
    fetchNetwork: async () => {
        try {
            const response = await fetch('http://localhost:5001/database');
            const data = await response.json();
            set({ buildings: data });
            return { success: true };
        } catch (error) {
            console.error('Error fetching network data:', error);
            return { success: false, error: error.message };
        }
    },

    // Add new building
    addBuilding: async (name) => {
        try {
            const response = await fetch('http://localhost:5001/buildings/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });

            const data = await response.json();

            if (!response.ok) {
                return { success: false, error: data.error };
            }

            // Refresh
            return await get().fetchNetwork();

        } catch (error) {
            console.error('Error adding building:', error);
            throw error;
        }
    },

    addCabinet: async (building_name, identifier, type) => {
        try {
            const response = await fetch('http://localhost:5001/cabinets/add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    building_name: building_name,
                    identifier: identifier,
                    cabinet_type: type
                })
            });

            if (!response.ok) {
                return { success: false, error: data.error };
            }

            // Refresh
            return await get().fetchNetwork();

        } catch (error) {
            console.error('Error adding cabinet:', error);
            return { success: false, error: error.message };
        }
    },

    addCable: async (cableData) => {
        try {
            const response = await fetch('http://localhost:5001/cables/add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    cabinet1: cableData.cabinet1,
                    cabinet2: cableData.cabinet2,
                    number: cableData.number,
                    num_of_fibers: cableData.num_of_fibers,
                    cable_type: cableData.cable_type,
                    cabinet1_start: cableData.cabinet1_start,
                    cabinet2_start: cableData.cabinet2_start,
                })
            });

            const data = await response.json();

            if (!response.ok) {
                return { success: false, error: data.error };
            }

            return await get().fetchNetwork();
        } catch (error) {
            console.error('Error adding cable:', error);
            return { success: false, error: error.message };
        }
    },
    removeBuilding: async (buildingName) => {
        try {
            const response = await fetch(`http://localhost:5001/buildings/remove/${buildingName}`, {
                method: 'DELETE'
            });
    
            if (!response.ok) {
                const error = await response.json();
                return { success: false, error: error.message };
            }
    
            // Fetch updated network data
            return await get().fetchNetwork();
            
        } catch (error) {
            console.error('Error removing cable:', error);
            return { success: false, error: error.message };
        }
    },
    removeCabinet: async (cabinetID) => {
        try {
            const response = await fetch(`http://localhost:5001/cabinets/remove/${cabinetID}`, {
                method: 'DELETE'
            });
    
            if (!response.ok) {
                const error = await response.json();
                return { success: false, error: error.message };
            }
    
            // Fetch updated network data
            return await get().fetchNetwork();
            
        } catch (error) {
            console.error('Error removing cable:', error);
            return { success: false, error: error.message };
        }
    },

    removeCable: async (cableID) => {
        try {
            const response = await fetch(`http://localhost:5001/cables/remove/${cableID}`, {
                method: 'DELETE'
            });
    
            if (!response.ok) {
                const error = await response.json();
                return { success: false, error: error.message };
            }
    
            // Fetch updated network data
            return await get().fetchNetwork();
            
        } catch (error) {
            console.error('Error removing cable:', error);
            return { success: false, error: error.message };
        }
    },

    updateFiberNetwork: async (cableID, fiberNumber, newNetwork) => {
        try {
            const response = await fetch('http://localhost:5001/fibers/update-network', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    cableID: cableID,
                    fiberNumber: fiberNumber,
                    network: newNetwork 
                })
            });
    
            const data = await response.json();
    
            if (!response.ok) {
                return { success: false, error: data.error };
            }
    
            // Refresh network data
            return await get().fetchNetwork();
    
        } catch (error) {
            console.error('Error updating fiber network:', error);
            throw error;
        }
    },
    // Get a specific building
    getBuilding: (buildingName) => {
        const state = Store.getState();
        return state.buildings.find(b => b.name === buildingName);
    },

    // Get cabinets for a building
    getBuildingCabinets: (buildingName) => {
        const state = Store.getState();
        const building = state.buildings.find(b => b.name === buildingName);
        return building ? building.cabinets : [];
    },

    // Get cables for a cabinet
    getCabinetCables: (buildingName, cabinetId) => {
        const state = Store.getState();
        const building = state.buildings.find(b => b.name === buildingName);
        const cabinet = building?.cabinets.find(c => c.identifier === cabinetId);
        return cabinet ? cabinet.cables : [];
    },

}));

export default Store;