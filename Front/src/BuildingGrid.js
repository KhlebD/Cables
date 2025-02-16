import React, { useState } from 'react';
import Store from './Store';
import AddButton from './AddButton';
import RemoveButton from './RemoveButton';
import './styles.css';

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
            onBuildingSelect(null);
    };

    return (
        <div className="connections-area ">
            <h2 className="building-item connect top"> {selectedBuilding || 'Select Building'}</h2>

            <div className="navigation-buttons">
                <button
                    onClick={() => setCurrentPage(prev => prev - 1)}
                    disabled={currentPage === 0}
                    className="nav-button"
                >
                    Prev
                </button>
                <button
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    disabled={currentPage >= totalPages - 1}
                    className="nav-button"
                >
                    Next
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
                    itemType="building"
                    fields={[
                        {
                            name: 'name',
                            label: 'Building Name',
                            type: 'text',
                            required: true,
                            placeholder: 'Enter building name'
                        },

                    ]}
                    onAdd={async (data) => {
                        await Store.getState().addBuilding(data.name)
                    }}
                />
                {selectedBuilding && (<RemoveButton
                    itemType="building"
                    onRemove={async () => {
                        await Store.getState().removeBuilding(selectedBuilding);
                    }}
                />)}
            </div>
        </div>

    );
}
export default BuildingGrid;