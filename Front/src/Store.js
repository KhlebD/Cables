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

            if (!response.ok) {
                set({ buildings: previousState });
                return { success: false };
            }

            set((state) => ({
                buildings: [...state.buildings, { name, cabinets: [] }]
            }));

            // Refresh
            return { success: true };

        } catch (error) {
            console.error('Error adding building:', error);
            throw error;
        }
    },

    addCabinet: async (building_name, identifier, cabinet_type) => {
        try {
            const response = await fetch('http://localhost:5001/cabinets/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    building_name: building_name,
                    identifier: identifier,
                    cabinet_type: cabinet_type
                })
            });

            if (!response.ok) {
                return { success: false };
            }

            set((state) => ({
                buildings: state.buildings.map(building =>
                    building.name === building_name
                        ? {
                            ...building,
                            cabinets: [...(building.cabinets || []), {
                                identifier,
                                cabinet_type,
                                cables: []
                            }]
                        }
                        : building
                )
            }));

            // Refresh
            return { success: true };

        } catch (error) {
            console.error('Error adding cabinet:', error);
            throw error;
        }
    },

    addCable: async (cabinet1, cabinet2, number, num_of_fibers, cable_type, cabinet1_start, cabinet2_start) => {
        const cableID = `${Date.now()}_${Math.floor(Math.random() * 9000) + 1000}`;
        try {
            const response = await fetch('http://localhost:5001/cables/add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    cableID: cableID,
                    cabinet1: cabinet1,
                    cabinet2: cabinet2,
                    number: number,
                    num_of_fibers: num_of_fibers,
                    cable_type: cable_type,
                    cabinet1_start: cabinet1_start,
                    cabinet2_start: cabinet2_start,
                })
            });

            if (!response.ok) {
                return { success: false };
            }

            set((state) => ({
                buildings: state.buildings.map(building => ({
                    ...building,
                    cabinets: building.cabinets?.map(cabinet => {
                        if (cabinet.identifier === cabinet1 || cabinet.identifier === cabinet2) {
                            return {
                                ...cabinet,
                                cables: [...(cabinet.cables || []), {
                                    uid: cableId,
                                    number,
                                    num_of_fibers,
                                    cable_type,
                                    fibers: Array.from({ length: num_of_fibers }, (_, i) => ({
                                        number_cabinet1: i + cabinet1_start,
                                        number_cabinet2: i + cabinet2_start,
                                        fiber_type: "0",
                                        network: null
                                    }))
                                }]
                            };
                        }
                        return cabinet;
                    })
                }))
            }));
            return { success: true };

        } catch (error) {
            console.error('Error adding cable:', error);
            throw error;
        }
    },
    removeBuilding: async (buildingName) => {
        const previousState = get().buildings;
        set((state) => ({
            buildings: state.buildings.filter(building => building.name !== buildingName)
        }));
        try {
            const response = await fetch(`http://localhost:5001/buildings/remove/${buildingName}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                set({ buildings: previousState });
                return { success: false };
            }

            // Fetch
            return { success: true };

        } catch (error) {
            set({ buildings: previousState });
            console.error('Error removing building:', error);
            throw error;
        }
    },

    removeCabinet: async (cabinetID) => {
        const previousState = get().buildings;

        // Optimistic update
        set((state) => ({
            buildings: state.buildings.map(building => ({
                ...building,
                cabinets: building.cabinets?.filter(cab => cab.identifier !== cabinetID) || []
            }))
        }));
        try {
            const response = await fetch(`http://localhost:5001/cabinets/remove/${cabinetID}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                set({ buildings: previousState });
                return { success: false };
            }

            return { success: true };

        } catch (error) {
            set({ buildings: previousState });
            console.error('Error removing cable:', error);
            return { success: false, error: error.message };
        }
    },

    removeCable: async (cableID) => {
        const previousState = get().buildings;
        // Optimistic update
        set((state) => ({
            buildings: state.buildings.map(building => ({
                ...building,
                cabinets: building.cabinets?.map(cabinet => ({
                    ...cabinet,
                    cables: cabinet.cables?.filter(cable => cable.uid !== cableID) || []
                }))
            }))
        }));
        try {
            const response = await fetch(`http://localhost:5001/cables/remove/${cableID}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                set({ buildings: previousState });
                return { success: false };
            }

            return { success: true };

        } catch (error) {
            set({ buildings: previousState });
            console.error('Error removing cable:', error);
            throw error;
        }
    },

    updateFiberNetwork: async (cableID, fiberNumber, newNetwork) => {
        const previousState = get().buildings;

        // Optimistic update
        set((state) => ({
            buildings: state.buildings.map(building => ({
                ...building,
                cabinets: building.cabinets?.map(cabinet => ({
                    ...cabinet,
                    cables: cabinet.cables?.map(cable =>
                        cable.uid === cableID
                            ? {
                                ...cable,
                                fibers: cable.fibers?.map(fiber =>
                                    fiber.number_cabinet1 === fiberNumber
                                        ? { ...fiber, network: newNetwork }
                                        : fiber
                                )
                            }
                            : cable
                    )
                }))
            }))
        }));

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

            if (!response.ok) {
                set({ buildings: previousState });
                return { success: false };
            }

            return { success: true };
        } catch (error) {
            set({ buildings: previousState });
            console.error('Error updating fiber network:', error);
            throw error;
        }
    }
}));

export default Store;