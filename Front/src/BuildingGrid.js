import React, { useState } from 'react';
import Store from './Store';
import AddButton from './AddButton';
import RemoveButton from './RemoveButton';
import './styles.css';
import EditButton from './EditButton';

const BuildingGrid = ({ connectedBuildings, onBuildingSelect, onCableSelect, onCabinetSelect, selectedBuilding }) => {

    const buildings = Store(state => state.buildings);
    const [currentPage, setCurrentPage] = useState(0);  // Start at page 0
    const buildingsPerPage = 20;  // 4x3 grid

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
        else
        {
            onBuildingSelect(null);
            onCableSelect(null);
        }
    };

    return (
        <div className="connections-area ">
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
                        className={`building-item ${selectedBuilding === building.name ? 'selected' : ''} 
                              ${connectedBuildings?.includes(building.name) ? 'connected' : ''}`}
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