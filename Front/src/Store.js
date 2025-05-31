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

    updateBuildingOrder: async (newOrder) => {
        const previousState = get().buildings;

        // Optimistic update - immediately update the UI
        set((state) => {
            // Create a map of building orders
            const orderMap = {};
            newOrder.forEach(item => {
                orderMap[item.name] = item.order;
            });

            // Update the buildings array with the new order
            const updatedBuildings = state.buildings.map(building => ({
                ...building,
                order: orderMap[building.name] !== undefined ? orderMap[building.name] : building.order
            }));

            return { buildings: updatedBuildings };
        });

        try {
            // Send the update to the backend
            const response = await fetch('http://localhost:5001/buildings/update-order', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newOrder)
            });

            if (!response.ok) {
                // Revert to previous state if the update failed
                set({ buildings: previousState });
                return { success: false };
            }

            return { success: true };
        } catch (error) {
            // Revert to previous state if there was an error
            set({ buildings: previousState });
            console.error('Error updating building order:', error);
            throw error;
        }
    },

    // Add new building
    addBuilding: async (name) => {
        try {
            // Find the highest current order
            let maxOrder = -1;
            get().buildings.forEach(building => {
                if (building.order !== undefined && building.order > maxOrder) {
                    maxOrder = building.order;
                }
            });

            // Set the new building's order
            const newOrder = maxOrder + 1;

            // Send both the name and order to the backend
            const response = await fetch('http://localhost:5001/buildings/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    display_order: newOrder
                })
            });

            if (!response.ok) {
                return { success: false };
            }

            // Update the local store
            set((state) => ({
                buildings: [...state.buildings, {
                    name,
                    cabinets: [],
                    order: newOrder
                }]
            }));

            return { success: true };
        } catch (error) {
            console.error('Error adding building:', error);
            throw error;
        }
    },
    addCabinet: async (buildingName, identifier, cabinetType, parentCabinet = null) => {
        const previousState = get().buildings;

        // Optimistic update
        set((state) => ({
            buildings: state.buildings.map(building =>
                building.name === buildingName
                    ? {
                        ...building,
                        cabinets: [
                            ...(building.cabinets || []),
                            {
                                identifier,
                                cabinet_type: cabinetType,
                                parent_cabinet: parentCabinet,
                                cables: []
                            }
                        ]
                    }
                    : building
            )
        }));

        try {
            const requestBody = {
                identifier,
                cabinet_type: cabinetType,
                building_name: buildingName
            };

            // Only include parent_cabinet if it's not null
            if (parentCabinet !== null) {
                requestBody.parent_cabinet = parentCabinet;
            }

            const response = await fetch('http://localhost:5001/cabinets/add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                set({ buildings: previousState });
                return { success: false };
            }

            await get().fetchNetwork();
            return { success: true };

        } catch (error) {
            set({ buildings: previousState });
            console.error('Error adding cabinet:', error);
            return { success: false, error: error.message };
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
                                    uid: cableID,
                                    number,
                                    num_of_fibers,
                                    cable_type,
                                    fibers: Array.from({ length: num_of_fibers }, (_, i) => ({
                                        number_cabinet1: parseInt(cabinet1_start) + i,
                                        number_cabinet2: parseInt(cabinet2_start) + i,
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

        // Optimistic update - remove cabinet and all its children
        set((state) => ({
            buildings: state.buildings.map(building => ({
                ...building,
                cabinets: building.cabinets?.filter(cab =>
                    cab.identifier !== cabinetID && cab.parent_cabinet !== cabinetID
                ) || []
            }))
        }));

        try {
            const encodedCabinetID = encodeURIComponent(cabinetID);
            const response = await fetch(`http://localhost:5001/cabinets/remove/${encodedCabinetID}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                set({ buildings: previousState });
                return { success: false };
            }

            return { success: true };

        } catch (error) {
            set({ buildings: previousState });
            console.error('Error removing cabinet:', error);
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
    },

    updateBuilding: async (oldName, newName) => {
        const previousState = get().buildings;
        // Optimistic update
        set((state) => ({
            buildings: state.buildings.map(building =>
                building.name === oldName
                    ? { ...building, name: newName }
                    : building
            )
        }));

        try {
            const response = await fetch('http://localhost:5001/buildings/update', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    oldName,
                    newName
                })
            });

            if (!response.ok) {
                set({ buildings: previousState });
                return { success: false };
            }

            return { success: true };
        } catch (error) {
            set({ buildings: previousState });
            console.error('Error updating building:', error);
            throw error;
        }
    },
    // Update cabinet
    updateCabinet: async (formData) => {
        const previousState = get().buildings;

        // Optimistic update
        set((state) => ({
            buildings: state.buildings.map(building =>
                building.name === formData.building_name
                    ? {
                        ...building,
                        cabinets: building.cabinets?.map(cabinet =>
                            cabinet.identifier === formData.oldIdentifier
                                ? {
                                    ...cabinet,
                                    identifier: formData.identifier,
                                    cabinet_type: formData.cabinet_type,
                                    parent_cabinet: formData.parent_cabinet
                                }
                                : cabinet
                        ) || []
                    }
                    : building
            )
        }));

        try {
            const requestBody = {
                new_identifier: formData.identifier,
                cabinet_type: formData.cabinet_type,
                building_name: formData.building_name,
                old_identifier: formData.oldIdentifier,
                parent_cabinet: formData.parent_cabinet
            };

            const response = await fetch('http://localhost:5001/cabinets/update', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                set({ buildings: previousState });
                return { success: false };
            }

            await get().fetchNetwork();
            return { success: true };

        } catch (error) {
            set({ buildings: previousState });
            console.error('Error updating cabinet:', error);
            return { success: false, error: error.message };
        }
    },
}));



export default Store;