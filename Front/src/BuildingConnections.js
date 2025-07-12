import React, { useMemo, useRef } from 'react';
import BuildingGrid from './BuildingGrid';
import Store from './Store';
import AddButton from './AddButton';
import RemoveButton from './RemoveButton';
import EditButton from './EditButton';
import './styles.css';
import { CSSTransition } from 'react-transition-group';

function BuildingConnections({ onBuildingSelect, onCableSelect, selectedConnectBuilding, selectedCabinet, onCabinetSelect, onLeftPortSelect, onRightPortSelect, onFiberSelect, filterBy, filterByCabinet }) {

    const buildings = Store(state => state.buildings);
    const selectedBuilding = buildings?.find(b => b.name === selectedConnectBuilding);
    const nodeRef = useRef(null);

    // Function to group cabinets by parent-child relationships
    const groupCabinets = (cabinets) => {
        if (!cabinets) return { parentCabinets: [], standaloneCabinets: [] };

        const parentCabinets = [];
        const standaloneCabinets = [];
        const panelCabinets = [];

        // First pass: separate parents, panels, and standalone
        cabinets.filter(cabinet => cabinet.identifier != null).forEach(cabinet => {
            if (cabinet.parent_cabinet) {
                // This is a panel (child cabinet)
                panelCabinets.push(cabinet);
            } else {
                // Check if this cabinet has children
                const hasChildren = cabinets.some(c => c.parent_cabinet === cabinet.identifier);
                if (hasChildren) {
                    parentCabinets.push({
                        ...cabinet,
                        panels: cabinets.filter(c => c.parent_cabinet === cabinet.identifier)
                    });
                } else {
                    standaloneCabinets.push(cabinet);
                }
            }
        });

        return { parentCabinets, standaloneCabinets };
    };

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
        if (filterByCabinet) {
            return findConnections(filterByCabinet, false)
                .map(cabinetId => {
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
                .filter(Boolean);
        }

        return findConnections(filterBy, true);
    }, [filterByCabinet, filterBy, buildings]);

    const connectedCabinets = useMemo(() => {
        const result = findConnections(filterByCabinet, false);
        return result;
    }, [filterByCabinet, buildings]);

    const handleCabinetClick = (cabinet) => {
        onCableSelect(null);
        onFiberSelect(null);
        onLeftPortSelect(null);
        onRightPortSelect(null);
        if (cabinet?.identifier === selectedCabinet?.identifier) {
            onCabinetSelect(null);
        }
        else
            onCabinetSelect(cabinet);
    }

    // Get available parent cabinets for the dropdown
    const availableParentCabinets = useMemo(() => {
        if (!selectedBuilding?.cabinets) return [];
        return selectedBuilding.cabinets
            .filter(cabinet => !cabinet.parent_cabinet) // Only non-panel cabinets can be parents
            .map(cabinet => cabinet.identifier);
    }, [selectedBuilding]);

    const { parentCabinets, standaloneCabinets } = groupCabinets(selectedBuilding?.cabinets);

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
                        onLeftPortSelect={onLeftPortSelect}
                        onRightPortSelect={onRightPortSelect}
                        onFiberSelect={onFiberSelect}
                    />
                </div>
            </div>

            {/* Cabinets Section */}
            <CSSTransition
                in={Boolean(selectedConnectBuilding)}
                timeout={300}
                classNames="section"
                unmountOnExit
                appear
                nodeRef={nodeRef}
            >
                <div ref={nodeRef} className="section">
                    <div className="section-header">
                        <h3>ארונות</h3>
                    </div>

                    <div className="cabinets-container">
                        {/* Render parent cabinets with their panels */}
                        {parentCabinets.map(cabinet => (
                            <div key={cabinet.identifier} className="cabinet-group">
                                <div
                                    className={`main-cabinet 
                                        ${selectedCabinet?.identifier === cabinet.identifier ? 'selected' : ''} 
                                        ${connectedCabinets.includes(cabinet.identifier) ? 'connected' : ''}`}
                                    onClick={() => handleCabinetClick(cabinet)}
                                >
                                    <div className="cabinet-header">
                                        <span className="identifier">{cabinet.identifier}</span>
                                        <span className="cabinet-type">{cabinet.cabinet_type}</span>
                                    </div>

                                    {/* Panels inside the cabinet */}
                                    <div className="panels-grid">
                                        {cabinet.panels.map(panel => (
                                            <div
                                                key={panel.identifier}
                                                className={`panel-item 
                                                    ${selectedCabinet?.identifier === panel.identifier ? 'selected' : ''} 
                                                    ${connectedCabinets.includes(panel.identifier) ? 'connected' : ''}`}
                                                onClick={(e) => {
                                                    e.stopPropagation(); // Prevent parent cabinet click
                                                    handleCabinetClick(panel);
                                                }}
                                            >
                                                <div className="panel-identifier">{panel.identifier}</div>
                                                <div className="panel-type">{panel.cabinet_type}</div>
                                                <div className="panel-type">{panel.port_count}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Render standalone cabinets */}
                        {standaloneCabinets.map(cabinet => (
                            <div
                                key={cabinet.identifier}
                                className={`standalone-cabinet 
                                    ${selectedCabinet?.identifier === cabinet.identifier ? 'selected' : ''} 
                                    ${connectedCabinets.includes(cabinet.identifier) ? 'connected' : ''}`}
                                onClick={() => handleCabinetClick(cabinet)}
                            >
                                <div className="identifier">{cabinet.identifier}</div>
                                <div className="cabinet-type">{cabinet.cabinet_type}</div>
                                <div className="cabinet-type">{cabinet.port_count}</div>
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
                                    options: ['ארון', 'חפרפר', 'באקבון', 'פאנל']
                                },
                                {
                                    name: 'parent_cabinet',
                                    label: 'שייך לארון (אופציונלי)',
                                    type: 'select',
                                    required: false,
                                    options: ['ללא', ...availableParentCabinets]
                                },
                                {
                                    name: 'port_count',
                                    label: 'מספר פורטים',
                                    type: 'number',
                                    required: false,
                                    placeholder: 'מספר פורטים (0-48)'
                                }
                            ]}
                            onAdd={async (formData) => {
                                const parentCabinet = formData.parent_cabinet === 'ללא' ? null : formData.parent_cabinet;
                                await Store.getState().addCabinet(
                                    selectedConnectBuilding,
                                    formData.identifier,
                                    formData.cabinet_type,
                                    parentCabinet,
                                    formData.port_count
                                );
                            }}
                        />
                        {selectedCabinet && (
                            <RemoveButton
                                itemType="ארון"
                                onRemove={async () => {
                                    const tempSelectedCabinetID = selectedCabinet.identifier;
                                    onCabinetSelect(null);
                                    await Store.getState().removeCabinet(tempSelectedCabinetID);
                                }}
                            />
                        )}
                        {selectedCabinet && (
                            <EditButton
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
                                        options: ['ארון', 'חפרפר', 'באקבון', 'פאנל']
                                    },
                                    {
                                        name: 'parent_cabinet',
                                        label: 'שייך לארון (אופציונלי)',
                                        type: 'select',
                                        required: false,
                                        options: ['ללא', ...availableParentCabinets.filter(id => id !== selectedCabinet.identifier)]
                                    },
                                    {
                                        name: 'building_name',
                                        label: 'בניין',
                                        type: 'text',
                                        required: true,
                                        readOnly: true
                                    },
                                    {
                                        name: 'port_count',
                                        label: 'מספר פורטים',
                                        type: 'number',
                                        required: false,
                                        placeholder: 'מספר פורטים (0-48)'
                                    }
                                ]}
                                itemData={{
                                    identifier: selectedCabinet.identifier,
                                    cabinet_type: selectedCabinet.cabinet_type,
                                    parent_cabinet: selectedCabinet.parent_cabinet || 'ללא',
                                    building_name: selectedConnectBuilding,
                                    oldIdentifier: selectedCabinet.identifier,
                                    port_count: selectedCabinet.port_count || 0
                                }}
                                onUpdate={async (formData) => {
                                    try {

                                        const parentCabinet = formData.parent_cabinet === 'ללא' ? null : formData.parent_cabinet;
                                        const result = await Store.getState().updateCabinet({
                                            ...formData,
                                            parent_cabinet: parentCabinet,
                                            building_name: selectedConnectBuilding,
                                            oldIdentifier: selectedCabinet.identifier,
                                        });

                                        if (result.success) {

                                            const updatedCabinet = {
                                                ...selectedCabinet,
                                                building_name: selectedConnectBuilding,
                                                oldIdentifier: selectedCabinet.identifier,
                                                identifier: formData.identifier,
                                                cabinet_type: formData.cabinet_type,
                                                parent_cabinet: parentCabinet,
                                                port_count: formData.port_count || selectedCabinet.port_count || 0
                                            };
                                            onCabinetSelect(updatedCabinet);
                                        }
                                        return result;
                                    } catch (error) {
                                        console.error("Error updating cabinet:", error);
                                        return { success: false, error: error.message };
                                    }
                                }}
                            />
                        )}
                    </div>
                </div>
            </CSSTransition>
        </div>
    );
}

export default BuildingConnections;