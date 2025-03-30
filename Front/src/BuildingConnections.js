import React, { useMemo, useRef } from 'react';
import BuildingGrid from './BuildingGrid';
import Store from './Store';
import AddButton from './AddButton';
import RemoveButton from './RemoveButton';
import EditButton from './EditButton';
import './styles.css';
import { CSSTransition } from 'react-transition-group';

function BuildingConnections({ onBuildingSelect, onCableSelect, selectedConnectBuilding, selectedCabinet, onCabinetSelect, filterBy, filterByCabinet }) {

    const buildings = Store(state => state.buildings);
    const selectedBuilding = buildings?.find(b => b.name === selectedConnectBuilding);
    const nodeRef = useRef(null);

    const findConnections = (sourceId, isBuilding = true) => {
        if (!sourceId)
            return [];
        const connectedSet = new Set();
        buildings?.forEach(building => {
            building.cabinets?.forEach(cabinet => {
                if (!cabinet.identifier) return;

                cabinet.cables?.forEach(cable => {
                    if (!cable.uid) return;

                    buildings?.forEach(otherBuilding => {
                        otherBuilding.cabinets?.forEach(otherCabinet => {
                            if (!otherCabinet.identifier) return;

                            if (cabinet.identifier === otherCabinet.identifier) return;

                            const isConnected = otherCabinet.cables?.some(c => c.uid && c.uid === cable.uid);

                            if (isConnected) {
                                if (isBuilding) {
                                    if (building.name === sourceId) {
                                        connectedSet.add(otherBuilding.name);
                                    }
                                } else {

                                    if (cabinet.identifier === sourceId.identifier) {
                                        connectedSet.add(otherCabinet.identifier);
                                    }
                                }
                            }
                        });
                    });
                });
            });
        });


        return Array.from(connectedSet);
    };


    const connectedBuildings = useMemo(() => {
        // If a cabinet is selected, show buildings connected to that cabinet
        if (filterByCabinet) {
            return findConnections(filterByCabinet, false)
                .map(cabinetId => {
                    // Find which building each connected cabinet belongs to
                    let buildingName;
                    buildings?.forEach(building => {
                        building.cabinets?.forEach(cabinet => {
                            if (cabinet.identifier === cabinetId) {
                                buildingName = building.name;
                            }
                        });
                    });
                    return buildingName;
                })
                .filter(Boolean); // Remove any undefined values
        }

        // Otherwise, show buildings connected to the selected building
        return findConnections(filterBy, true);
    }, [filterByCabinet, filterBy, buildings]);

    const connectedCabinets = useMemo(() => {
        const result = findConnections(filterByCabinet, false);
        return result;
    }, [filterByCabinet, buildings]);

    const handleCabinetClick = (cabinet) => {
        if (cabinet?.identifier === selectedCabinet?.identifier) {
            console.log(cabinet?.identifier, selectedCabinet?.identifier);
            onCabinetSelect(null);
        }
        else
            onCabinetSelect(cabinet);
    }

    return (

        <div className="connected-view">
            {/* Connected Buildings Section */}
            <div className="connected-buildings">
                <div>
                    <BuildingGrid
                        connectedBuildings={connectedBuildings}
                        onBuildingSelect={onBuildingSelect}
                        onCableSelect={onCableSelect}
                        selectedBuilding={selectedConnectBuilding}
                        onCabinetSelect={onCabinetSelect}
                    />
                </div>
            </div>

            {/* Cabinets Section */}
            <CSSTransition
                in={ Boolean(selectedConnectBuilding) }
                timeout={300}
                classNames="section"
                unmountOnExit
                appear
                nodeRef={nodeRef}
            >
                <div  ref={nodeRef} className="section">
                    <div className="section-header">
                        <h3>ארונות</h3>

                    </div>

                    <div className="cabinets-list">
                        {selectedBuilding?.cabinets?.filter(cabinet => (cabinet.identifier != null)).map(cabinet => (
                            <div
                                key={cabinet.identifier}
                                className={`cabinet-item 
                                ${selectedCabinet?.identifier === cabinet.identifier ? 'selected' : ''} 
                                ${connectedCabinets.includes(cabinet.identifier) ? 'connected' : ''}`}
                                onClick={() => handleCabinetClick(cabinet)}
                            >
                                <div className="identifier">{cabinet.identifier}</div>
                                <div className="cabinet-type">{cabinet.cabinet_type}</div>
                            </div>
                        ))}
                    </div>
                    <div className='add-remove-container'>
                        <AddButton
                            itemType="ארון"
                            fields={[
                                {
                                    name: 'identifier',
                                    label: 'מזהה ארון',
                                    type: 'text',
                                    required: true,
                                    placeholder: 'הכנס מזהה ארון'
                                },
                                {
                                    name: 'cabinet_type',
                                    label: 'סוג',
                                    type: 'select',
                                    required: true,
                                    options: ['ארון', 'חפרפר', 'באקבון']
                                }
                            ]}
                            onAdd={async (formData) => {
                                await Store.getState().addCabinet(
                                    selectedConnectBuilding,
                                    formData.identifier,
                                    formData.cabinet_type
                                );
                            }}
                        />
                        {selectedCabinet && (<RemoveButton
                            itemType="ארון"
                            onRemove={async () => {
                                const tempSelectedCabinetID= selectedCabinet.identifier;
                                onCabinetSelect(null);
                                await Store.getState().removeCabinet(tempSelectedCabinetID);
                            }}
                        />)}
                        {selectedCabinet && (<EditButton
                            itemType="ארון"
                            fields={[
                                {
                                    name: 'identifier',
                                    label: 'מזהה ארון',
                                    type: 'text',
                                    required: true,
                                    placeholder: 'הכנס מזהה ארון'
                                },
                                {
                                    name: 'cabinet_type',
                                    label: 'סוג',
                                    type: 'select',
                                    required: true,
                                    options: ['ארון', 'חפרפר', 'באקבון']
                                },
                                {
                                    name: 'building_name',
                                    label: 'בניין',
                                    type: 'text',
                                    required: true,
                                    readOnly: true
                                }
                            ]}
                            itemData={{
                                identifier: selectedCabinet.identifier,
                                cabinet_type: selectedCabinet.cabinet_type,
                                building_name: selectedConnectBuilding,
                                oldIdentifier: selectedCabinet.identifier
                            }}
                            onUpdate={async (formData) => {
                                try {
                                    const result = await Store.getState().updateCabinet(formData);
                                    if (result.success) {
                                        // Update the selected cabinet in the parent component
                                        const updatedCabinet = {
                                            ...selectedCabinet,
                                            identifier: formData.identifier,
                                            cabinet_type: formData.cabinet_type
                                        };
                                        onCabinetSelect(updatedCabinet);
                                    }
                                    return result;
                                } catch (error) {
                                    console.error("Error updating cabinet:", error);
                                    return { success: false, error: error.message };
                                }
                            }}
                        />)}
                    </div>
                </div>
            </CSSTransition>
        </div>
    );
}

export default BuildingConnections;