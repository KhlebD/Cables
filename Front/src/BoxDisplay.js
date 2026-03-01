import React, { useState, useMemo } from 'react';
import Store from './Store';
import AddButton from './AddButton';
import RemoveButton from './RemoveButton';
import PortGrid from './PortGrid';
import './styles.css';

function BoxDisplay({
    leftBuilding,
    rightBuilding,
    selectedCable,
    selectedLeftCabinet,
    selectedRightCabinet,
    selectedLeftPort,
    selectedRightPort,
    onLeftBuildingSelect,
    onRightBuildingSelect,
    onLeftCabinetSelect,
    onRightCabinetSelect,
    onCableSelect,
    onLeftPortSelect,
    onRightPortSelect,
    onFiberSelect
}) {
    const buildings = Store(state => state.buildings);
    const [hoveredCableId, setHoveredCableId] = useState(null);
    // Get cabinet objects from identifiers
    const leftCabinetObj = useMemo(() => {
        if (!selectedLeftCabinet || !leftBuilding) return null;
        const building = buildings?.find(b => b.name === leftBuilding);
        return building?.cabinets?.find(cab => cab.identifier === selectedLeftCabinet.identifier) || null;
    }, [buildings, leftBuilding, selectedLeftCabinet]);

    const rightCabinetObj = useMemo(() => {
        if (!selectedRightCabinet || !rightBuilding) return null;
        const building = buildings?.find(b => b.name === rightBuilding);
        return building?.cabinets?.find(cab => cab.identifier === selectedRightCabinet.identifier) || null;
    }, [buildings, rightBuilding, selectedRightCabinet]);

    // Get occupied ports for each cabinet
    const getOccupiedPorts = (cabinetObj) => {
        if (!cabinetObj || !cabinetObj.cables) return [];

        const occupiedPorts = [];
        cabinetObj.cables.forEach(cable => {
            if (cable.fibers) {
                cable.fibers.forEach(fiber => {
                    // Check which cabinet we're looking at and get the appropriate port
                    if (cable.cabinet1 === cabinetObj.identifier && fiber.port_cabinet1) {
                        occupiedPorts.push(parseInt(fiber.port_cabinet1));
                    } else if (cable.cabinet2 === cabinetObj.identifier && fiber.port_cabinet2) {
                        occupiedPorts.push(parseInt(fiber.port_cabinet2));
                    }
                });
            }
        });
        return [...new Set(occupiedPorts)]; // Remove duplicates
    };

    // Get ports that belong to the selected cable
    const getCablePortsForCabinet = (cabinetObj, selectedCableUid) => {
        if (!cabinetObj || !selectedCableUid) return [];

        const cable = cabinetObj.cables?.find(c => c.uid === selectedCableUid);
        if (!cable || !cable.fibers) return [];

        const cablePorts = [];
        cable.fibers.forEach(fiber => {
            // Check which cabinet we're looking at and get the appropriate port
            if (cable.cabinet1 === cabinetObj.identifier && fiber.port_cabinet1) {
                cablePorts.push(parseInt(fiber.port_cabinet1));
            } else if (cable.cabinet2 === cabinetObj.identifier && fiber.port_cabinet2) {
                cablePorts.push(parseInt(fiber.port_cabinet2));
            }
        });

        return cablePorts;
    };

    const leftOccupiedPorts = useMemo(() => getOccupiedPorts(leftCabinetObj), [leftCabinetObj]);
    const rightOccupiedPorts = useMemo(() => getOccupiedPorts(rightCabinetObj), [rightCabinetObj]);
    const leftCablePorts = useMemo(() =>
        getCablePortsForCabinet(leftCabinetObj, selectedCable),
        [leftCabinetObj, selectedCable]
    );

    const rightCablePorts = useMemo(() =>
        getCablePortsForCabinet(rightCabinetObj, selectedCable),
        [rightCabinetObj, selectedCable]
    );
    // Get cables to display based on selection mode
    const displayedCables = useMemo(() => {
        
        if (leftCabinetObj && rightCabinetObj) {
            if (leftCabinetObj.identifier === rightCabinetObj.identifier) {
                return [];
            }

            const cables = [];

            // Check cables from left cabinet to right cabinet
            leftCabinetObj.cables?.forEach(cable => {
                if (cable.cabinet1 === rightCabinetObj.identifier ||
                    cable.cabinet2 === rightCabinetObj.identifier) {
                    cables.push({
                        ...cable,
                    });
                }
            });

            // Also check cables from right cabinet to left cabinet (in case they're only stored on one side)
            rightCabinetObj.cables?.forEach(cable => {
                if ((cable.cabinet1 === leftCabinetObj.identifier ||
                    cable.cabinet2 === leftCabinetObj.identifier) &&
                    !cables.some(existingCable => existingCable.uid === cable.uid)) {
                    cables.push({
                        ...cable,
                    });
                }
            });
            return cables;
        }

        return [];
    }, [leftCabinetObj, rightCabinetObj, buildings, leftBuilding, rightBuilding, selectedLeftCabinet, selectedRightCabinet]);

    // Calculate cable positions for SVG
    const getCablePosition = (index, totalCables) => {
        const spacing = 150 / (totalCables + 1);
        return spacing * (index + 1);
    };

    const findConnectedPort = (fromCabinet, fromPort) => {
        if (!fromCabinet || !buildings) return null;

        // Search through all cables in the fromCabinet to find which one uses this port
        for (const cable of fromCabinet.cables || []) {
            if (!cable.fibers) continue;

            // Find the fiber that uses this port
            const fiber = cable.fibers.find(f => {
                if (cable.cabinet1 === fromCabinet.identifier) {
                    return parseInt(f.port_cabinet1) === fromPort;
                } else if (cable.cabinet2 === fromCabinet.identifier) {
                    return parseInt(f.port_cabinet2) === fromPort;
                }
                return false;
            });

            if (!fiber) continue; // This cable doesn't use this port

            // Get the other cabinet identifier and port from the cable/fiber
            let otherCabinetId, otherPort;

            if (cable.cabinet1 === fromCabinet.identifier) {
                otherCabinetId = cable.cabinet2;
                otherPort = parseInt(fiber.port_cabinet2);
            } else {
                otherCabinetId = cable.cabinet1;
                otherPort = parseInt(fiber.port_cabinet1);
            }

            // Find the other cabinet object in all buildings
            let otherCabinet = null;
            let otherBuilding = null;

            buildings.forEach(building => {
                const foundCab = building.cabinets?.find(cab => cab.identifier === otherCabinetId);
                if (foundCab) {
                    otherCabinet = foundCab;
                    otherBuilding = building.name;
                }
            });

            if (otherCabinet) {
                return {
                    portNumber: otherPort,
                    fiber: fiber,
                    cabinet: otherCabinet,
                    building: otherBuilding,
                    cable: cable
                };
            }
        }

        return null;
    };

    const handleLeftPortSelect = (portNumber) => {
        onFiberSelect(null);
        onCableSelect(null);
        if (selectedLeftPort === portNumber) {
            onLeftPortSelect(null);

        }
        else {
            onLeftPortSelect(portNumber);

            // Find connected port
            const connectedPort = findConnectedPort(leftCabinetObj, portNumber);
            if (connectedPort) {
                // Auto-select
                onRightBuildingSelect(connectedPort.building)
                onRightCabinetSelect(connectedPort.cabinet)
                onCableSelect(connectedPort.cable.uid);
                onRightPortSelect(connectedPort.portNumber);
                onFiberSelect(connectedPort.fiber);
            }
        }
    };

    const handleRightPortSelect = (portNumber) => {
        onFiberSelect(null);
        onCableSelect(null);
        if (selectedRightPort === portNumber) {
            onRightPortSelect(null);
        }
        else {
            onRightPortSelect(portNumber);
            // Find connected port (works for any port, any cable)
            const connectedPort = findConnectedPort(rightCabinetObj, portNumber);
            if (connectedPort) {
                // Auto-select
                onLeftBuildingSelect(connectedPort.building)
                onLeftCabinetSelect(connectedPort.cabinet)
                onCableSelect(connectedPort.cable.uid);
                onLeftPortSelect(connectedPort.portNumber);
                onFiberSelect(connectedPort.fiber);
            }
        }
    };


    // Check if cabinet should display ports
    const shouldDisplayPorts = (cabinetObj) => {
        return cabinetObj && cabinetObj.port_count && cabinetObj.port_count > 0;
    };

    // Get building box class names based on port count
    const getBuildingBoxClass = (cabinetObj) => {
        let classes = ['building-box'];

        if (!cabinetObj && !leftBuilding && !rightBuilding) {
            classes.push('empty-box');
        }

        if (cabinetObj) {
            classes.push('cabinet-selected');
        }

        return classes.join(' ');
    };

    // Get display info for left side
    const getLeftDisplayInfo = () => {
        if (leftCabinetObj) {
            return {
                title: `${leftBuilding} - ${leftCabinetObj.identifier}`,
                subtitle: leftCabinetObj.parent_cabinet ?
                    `פאנל תחת ${leftCabinetObj.parent_cabinet}` :
                    leftCabinetObj.cabinet_type,
                portInfo: leftCabinetObj.port_count > 0 ?
                    `${leftCabinetObj.port_count} פורטים` : 'ללא פורטים',
                cableCount: leftCabinetObj.cables?.length > 0 ?
                    `${leftCabinetObj.cables.length} כבלים` : 'ללא כבלים'
            };
        }

        if (leftBuilding) {
            const building = buildings?.find(b => b.name === leftBuilding);
            const totalCabinets = building?.cabinets?.length || 0;
            const totalCables = building?.cabinets?.reduce((sum, cab) =>
                sum + (cab.cables?.length || 0), 0) || 0;

            return {
                title: leftBuilding,
                subtitle: 'בניין',
                portInfo: `${totalCabinets} ארונות`,
                cableCount: `${totalCables} כבלים`
            };
        }

        return null;
    };

    // Get display info for right side
    const getRightDisplayInfo = () => {
        if (rightCabinetObj) {
            return {
                title: `${rightBuilding} - ${rightCabinetObj.identifier}`,
                subtitle: rightCabinetObj.parent_cabinet ?
                    `פאנל תחת ${rightCabinetObj.parent_cabinet}` :
                    rightCabinetObj.cabinet_type,
                portInfo: rightCabinetObj.port_count > 0 ?
                    `${rightCabinetObj.port_count} פורטים` : 'ללא פורטים',
                cableCount: `${rightCabinetObj.cables?.length || 0} כבלים`
            };
        }

        if (rightBuilding) {
            const building = buildings?.find(b => b.name === rightBuilding);
            const totalCabinets = building?.cabinets?.length || 0;
            const totalCables = building?.cabinets?.reduce((sum, cab) =>
                sum + (cab.cables?.length || 0), 0) || 0;

            return {
                title: rightBuilding,
                subtitle: 'בניין',
                portInfo: `${totalCabinets} ארונות`,
                cableCount: `${totalCables} כבלים`
            };
        }

        return null;
    };

    const leftInfo = getLeftDisplayInfo();
    const rightInfo = getRightDisplayInfo();

    // Check if has panels (for filtering in add cable form)
    const isParentCabinet = (cabinet, allCabinets) => {
        return allCabinets.some(cab => cab.parent_cabinet === cabinet.identifier);
    };

    // Get cabinet options for add cable form
    const getLeftCabinetOptions = () => {
        if (!leftBuilding) return [];
        const building = buildings?.find(b => b.name === leftBuilding);
        return building?.cabinets
            ?.filter(cab => !isParentCabinet(cab, building.cabinets))
            ?.map(cab => cab.identifier) || [];
    };

    const getRightCabinetOptions = (formData) => {
        if (!rightBuilding) return [];
        const building = buildings?.find(b => b.name === rightBuilding);
        let filteredCabinets = building?.cabinets?.filter(cab =>
            !isParentCabinet(cab, building.cabinets)
        ) || [];

        if (leftBuilding === rightBuilding && formData?.cabinet1) {
            filteredCabinets = filteredCabinets.filter(cab => cab.identifier !== formData.cabinet1);
        }

        return filteredCabinets.map(cab => cab.identifier);
    };
    const handleCableSelect = (cable) => {
        onLeftPortSelect(null);
        onRightPortSelect(null);
        onFiberSelect(null);
        if (cable?.uid === selectedCable) {
            onCableSelect(null);
        }
        else
            onCableSelect(cable.uid);
    }

    console.log(leftCabinetObj);

    return (
        <div className="cable-display">
            <div className={`building-boxes ${shouldDisplayPorts(leftCabinetObj) || shouldDisplayPorts(rightCabinetObj) ? 'ports-mode' : ''}`}>
                {/* Left Box */}
                <div className={getBuildingBoxClass(leftCabinetObj)}>
                    {leftInfo ? (
                        <div className="building-content">
                            {!shouldDisplayPorts(leftCabinetObj) && (
                                <>
                                    <h3>{leftInfo.title}</h3>
                                    <div className="building-details">
                                        <div className="building-type">{leftInfo.subtitle}</div>
                                        <div className="port-info">{leftInfo.portInfo}</div>
                                        <div className="cable-count">{leftInfo.cableCount}</div>
                                    </div>
                                </>
                            )}

                            {!!shouldDisplayPorts(leftCabinetObj) && (
                                <div className="port-display">
                                    <div className="cabinet-title">
                                        <h4>{leftInfo.title}</h4>
                                        <div className="port-info">{leftInfo.portInfo}</div>
                                    </div>
                                    <PortGrid
                                        portCount={leftCabinetObj.port_count}
                                        onPortSelect={handleLeftPortSelect}
                                        selectedPort={selectedLeftPort}
                                        occupiedPorts={leftOccupiedPorts}
                                        cablePorts={leftCablePorts}
                                        side="left"
                                    />
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="empty-content">
                            בחר בניין או ארון מצד שמאל
                        </div>
                    )}
                </div>

                {/* SVG for cables - show for buildings OR when both panels are selected */}
                {((leftBuilding && rightBuilding) || (leftCabinetObj && rightCabinetObj)) && (
                    <svg className="cables-svg">
                        {displayedCables.map((cable, index) => (
                            <g key={cable.uid}>
                                {/* Glow effect for hover */}
                                {hoveredCableId === cable.uid && (
                                    <line
                                        x1="0"
                                        y1={getCablePosition(index, displayedCables.length)}
                                        x2="100%"
                                        y2={getCablePosition(index, displayedCables.length)}
                                        stroke="blue"
                                        strokeWidth="16"
                                        opacity="0.4"
                                    />
                                )}

                                {/* Main cable line */}
                                <line
                                    x1="0"
                                    y1={getCablePosition(index, displayedCables.length)}
                                    x2="100%"
                                    y2={getCablePosition(index, displayedCables.length)}
                                    stroke={selectedCable === cable.uid ? "blue" : "black"}
                                    strokeWidth="8"
                                    onMouseEnter={() => setHoveredCableId(cable.uid)}
                                    onMouseLeave={() => setHoveredCableId(null)}
                                    onClick={() => handleCableSelect(cable)}
                                    style={{ cursor: 'pointer' }}
                                />

                                {/* Cable label */}
                                <text
                                    x="50%"
                                    y={getCablePosition(index, displayedCables.length) - 10}
                                    textAnchor="middle"
                                    className="cable-label"
                                >
                                    {`${cable.num_of_fibers === 1 ? 'סיב' : 'כבל'} ${cable.number} (${cable.num_of_fibers} סיבים)`}
                                </text>
                            </g>
                        ))}
                    </svg>
                )}

                {/* Right Box */}
                <div className={getBuildingBoxClass(rightCabinetObj) + (rightInfo?.isTargetList ? ' target-box' : '')}>
                    {rightInfo ? (
                        <div className="building-content">
                            {!shouldDisplayPorts(rightCabinetObj) && (
                                <>
                                    <h3>{rightInfo.title}</h3>
                                    <div className="building-details">
                                        <div className="building-type">{rightInfo.subtitle}</div>
                                        <div className="port-info">{rightInfo.portInfo}</div>
                                        <div className="cable-count">{rightInfo.cableCount}</div>
                                    </div>
                                </>
                            )}

                            {!!shouldDisplayPorts(rightCabinetObj) && (
                                <div className="port-display">
                                    <div className="cabinet-title">
                                        <h4>{rightInfo.title}</h4>
                                        <div className="port-info">{rightInfo.portInfo}</div>
                                    </div>
                                    <PortGrid
                                        portCount={rightCabinetObj.port_count}
                                        onPortSelect={handleRightPortSelect}
                                        onCableSelect={onCableSelect}
                                        onFiberSelect={onFiberSelect}
                                        selectedPort={selectedRightPort}
                                        occupiedPorts={rightOccupiedPorts}
                                        cablePorts={rightCablePorts}
                                        side="right"
                                    />
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="empty-content">
                            בחר בניין או ארון מצד ימין
                        </div>
                    )}
                </div>
            </div>

            {/* Add/Remove Buttons */}
            <div className='add-remove-container'>
                {/* Show add cable when both buildings selected */}
                {leftBuilding && rightBuilding && (
                    <AddButton
                        itemType="כבל"
                        initialValues={{
                            cabinet1: selectedLeftCabinet?.identifier || '',
                            cabinet2: selectedRightCabinet?.identifier || ''
                        }}
                        fields={[
                            {
                                name: 'number',
                                label: 'מזהה כבל',
                                type: 'text',
                                required: true
                            },
                            {
                                name: 'cabinet1',
                                label: `ארון בבניין ${leftBuilding}`,
                                type: 'select',
                                required: true,
                                options: getLeftCabinetOptions(),
                                defaultValue: selectedLeftCabinet?.identifier || undefined
                            },
                            {
                                name: 'cabinet2',
                                label: `ארון בבניין ${rightBuilding}`,
                                type: 'select',
                                required: true,
                                options: getRightCabinetOptions,
                                dependsOn: ['cabinet1'],
                                defaultValue: selectedRightCabinet?.identifier || undefined
                            },
                            {
                                name: 'num_of_fibers',
                                label: 'מספר סיבים',
                                type: 'select',
                                required: true,
                                options: ['6', '12']
                            },
                            {
                                name: 'cable_type',
                                label: 'סוג',
                                type: 'select',
                                required: true,
                                options: ['Single', 'Multi']
                            },
                            {
                                name: 'cabinet1_start',
                                label: `מספר התחלתי ב ${selectedLeftCabinet?.identifier || 'ארון שמאל'}`,
                                type: 'text',
                                required: true
                            },
                            {
                                name: 'cabinet2_start',
                                label: `מספר התחלתי ב ${selectedRightCabinet?.identifier || 'ארון ימין'}`,
                                type: 'text',
                                required: true
                            }
                        ]}
                        onAdd={async (formData) => {
                            await Store.getState().addCable(
                                formData.cabinet1,
                                formData.cabinet2,
                                formData.number,
                                formData.num_of_fibers,
                                formData.cable_type,
                                formData.cabinet1_start,
                                formData.cabinet2_start
                            );
                        }}
                    />
                )}

                {selectedCable && (
                    <RemoveButton
                        itemType="כבל"
                        onRemove={async () => {
                            const tempSelectedCable = selectedCable;
                            onCableSelect(null);
                            await Store.getState().removeCable(tempSelectedCable);
                        }}
                    />
                )}
                {selectedCable && (
                    <AddButton
                        itemType="רשת לכבל"
                        fields={[
                            {
                                name: 'network',
                                label: 'שם הרשת',
                                type: 'text',
                                required: true,
                                placeholder: 'הכנס שם רשת לכל הסיבים'
                            }
                        ]}
                        onAdd={async (formData) => {
                            await Store.getState().updateCableNetworks(selectedCable, formData.network);
                        }}
                    />
                )}

            </div>
        </div>
    );
}

export default BoxDisplay;