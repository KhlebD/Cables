import React, { useState, useEffect } from 'react';
import Store from './Store';
import AddButton from './AddButton';
import RemoveButton from './RemoveButton';
import EditButton from './EditButton';
import './styles.css';


const BuildingGrid = ({ connectedBuildings, onBuildingSelect, onCableSelect, onCabinetSelect, selectedBuilding }) => {

    const buildings = Store(state => state.buildings);
    const updateBuildingOrder = Store(state => state.updateBuildingOrder);
    const [currentPage, setCurrentPage] = useState(0);  // Start at page 0
    const buildingsPerPage = 20;
    const [draggedBuilding, setDraggedBuilding] = useState(null);
    const [dragOverBuilding, setDragOverBuilding] = useState(null);


    const orderedBuildings = [...buildings].sort((a, b) =>
        (a.order !== undefined && b.order !== undefined) ?
            a.order - b.order : 0
    );

    useEffect(() => {
        const needsOrder = buildings.some(building => building.order === undefined);

        if (needsOrder && buildings.length > 0) {
            
            const newOrder = buildings.map((building, index) => ({
                name: building.name,
                order: index
            }));

            
            updateBuildingOrder(newOrder);
        }
    }, [buildings, updateBuildingOrder]);

    const getCurrentBuildings = () => {
        const start = currentPage * buildingsPerPage;
        return buildings.slice(start, start + buildingsPerPage);
    };

    const totalPages = Math.ceil(buildings.length / buildingsPerPage);


    const handleBuildingClick = (buildingName) => {
        onCabinetSelect(null);
        if (selectedBuilding != buildingName) {
            onBuildingSelect(buildingName);
            onCableSelect(null);

        }
        else {
            onBuildingSelect(null);
            onCableSelect(null);
        }
    };

    const handleDragStart = (e, building) => {
        setDraggedBuilding(building);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', building.name);
        
        // For better visual feedback
        setTimeout(() => {
            e.target.classList.add('dragging');
        }, 0);
    };

    const handleDragEnd = (e) => {
        e.target.classList.remove('dragging');
        setDraggedBuilding(null);
        setDragOverBuilding(null);
    };

    const handleDragOver = (e, building) => {
        e.preventDefault();
        if (draggedBuilding && building.name !== draggedBuilding.name) {
            setDragOverBuilding(building);
        }
    };

    const handleDragLeave = () => {
        setDragOverBuilding(null);
    };

    const handleDrop = (e, targetBuilding) => {
        e.preventDefault();
        
        if (!draggedBuilding || draggedBuilding.name === targetBuilding.name) {
            return;
        }

        const updatedOrder = orderedBuildings.map(building => ({
            name: building.name,
            order: building.order
        }));

        const draggedIndex = updatedOrder.findIndex(b => b.name === draggedBuilding.name);
        const targetIndex = updatedOrder.findIndex(b => b.name === targetBuilding.name);
        const [removed] = updatedOrder.splice(draggedIndex, 1);
        
        updatedOrder.splice(targetIndex, 0, removed);
        
        // Update the order values to match the new array indices
        updatedOrder.forEach((building, index) => {
            building.order = index;
        });
        
        // Update the order in the store
        updateBuildingOrder(updatedOrder);
    };

    return (
        <div className="connections-area">
            <h2 className="building-item connect top"> {selectedBuilding || 'בחר בניין'}</h2>

            <div className="navigation-buttons">
                <button
                    onClick={() => setCurrentPage(prev => prev - 1)}
                    disabled={currentPage === 0}
                    className="nav-button"
                >
                    קודם
                </button>
                <button
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    disabled={currentPage >= totalPages - 1}
                    className="nav-button"
                >
                    הבא
                </button>
            </div>
            
            <div className="building-grid">
                {getCurrentBuildings().map((building) => (
                    <div
                        key={building.name}
                        onClick={() => handleBuildingClick(building.name)}
                        className={`building-item 
                            ${selectedBuilding === building.name ? 'selected' : ''} 
                            ${connectedBuildings?.includes(building.name) ? 'connected' : ''}
                            ${draggedBuilding && draggedBuilding.name === building.name ? 'dragging' : ''}
                            ${dragOverBuilding && dragOverBuilding.name === building.name ? 'drag-over' : ''}`}
                        draggable="true"
                        onDragStart={(e) => handleDragStart(e, building)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => handleDragOver(e, building)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, building)}
                    >
                        {building.name}
                    </div>
                ))}
            </div>

            <div className='add-remove-container'>
                <AddButton
                    itemType="בניין"
                    fields={[
                        {
                            name: 'name',
                            label: 'שם הבניין',
                            type: 'text',
                            required: true,
                            placeholder: 'הכנס שם בניין'
                        },
                    ]}
                    onAdd={async (data) => {
                        await Store.getState().addBuilding(data.name)
                    }}
                />
                {selectedBuilding && (<RemoveButton
                    itemType="בניין"
                    onRemove={async () => {
                        const tempSelectedBuilding = selectedBuilding;
                        onBuildingSelect(null);
                        await Store.getState().removeBuilding(tempSelectedBuilding);
                    }}
                />)}
                {selectedBuilding && (<EditButton
                    itemType="בניין"
                    fields={[
                        {
                            name: 'name',
                            label: 'שם הבניין',
                            type: 'text',
                            required: true,
                            placeholder: 'הכנס שם בניין'
                        },
                    ]}
                    itemData={{
                        name: selectedBuilding,
                        oldName: selectedBuilding
                    }}
                    onUpdate={async (formData) => {
                        try {
                            const result = await Store.getState().updateBuilding(formData);
                            if (result.success) {
                                onBuildingSelect(formData.name);
                            }
                            return result;
                        } catch (error) {
                            console.error("Error updating building:", error);
                            return { success: false, error: error.message };
                        }
                    }}
                />)}
                {selectedBuilding && (<EditButton
                    itemType="בניין"
                    fields={[
                        {
                            name: 'name',
                            label: 'שם הבניין',
                            type: 'text',
                            required: true,
                            placeholder: 'הכנס שם בניין'
                        },
                    ]}
                    itemData={{
                        name: selectedBuilding,
                        oldName: selectedBuilding
                    }}
                    onUpdate={async (formData) => {
                        try {
                            const result = await Store.getState().updateBuilding(formData);
                            if (result.success) {
                                // Update the selected building in the parent component
                                onBuildingSelect(formData.name);
                            }
                            return result;
                        } catch (error) {
                            console.error("Error updating building:", error);
                            return { success: false, error: error.message };
                        }
                    }}
                />)}
            </div>
        </div>
    );
}

export default BuildingGrid;