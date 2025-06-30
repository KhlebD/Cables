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
    onCableSelect,
    selectedLeftCabinet,
    selectedRightCabinet
}) {
    const buildings = Store(state => state.buildings);
    const [hoveredCableId, setHoveredCableId] = useState(null);
    const [selectedLeftPort, setSelectedLeftPort] = useState(null);
    const [selectedRightPort, setSelectedRightPort] = useState(null);

    // Get cabinet objects from identifiers
    const leftCabinetObj = useMemo(() => {
        console.log(selectedLeftCabinet);
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
                    // Determine which cabinet we're looking at and get the appropriate port
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

    const leftOccupiedPorts = useMemo(() => getOccupiedPorts(leftCabinetObj), [leftCabinetObj]);
    const rightOccupiedPorts = useMemo(() => getOccupiedPorts(rightCabinetObj), [rightCabinetObj]);

    // Get cables to display based on selection mode
    const displayedCables = useMemo(() => {
        // Mode 1: One cabinet selected - show all its cables
        if (leftCabinetObj && !rightCabinetObj) {
            return leftCabinetObj.cables?.map(cable => {
                // Find which building the other end connects to
                const otherCabinetId = cable.cabinet1 === leftCabinetObj.identifier
                    ? cable.cabinet2
                    : cable.cabinet1;

                // Find the other cabinet across all buildings
                let otherCabinet = null;
                let otherBuilding = null;

                buildings.forEach(building => {
                    const foundCab = building.cabinets?.find(cab => cab.identifier === otherCabinetId);
                    if (foundCab) {
                        otherCabinet = foundCab;
                        otherBuilding = building.name;
                    }
                });

                return {
                    ...cable,
                    other_cabinet: otherCabinet,
                    other_building: otherBuilding,
                    direction: cable.cabinet1 === leftCabinetObj.identifier ? 'outgoing' : 'incoming'
                };
            }) || [];
        }

        // Mode 2: Two cabinets selected - show cables between them
        if (leftCabinetObj && rightCabinetObj) {
            return leftCabinetObj.cables?.filter(cable => {
                return cable.cabinet1 === rightCabinetObj.identifier ||
                    cable.cabinet2 === rightCabinetObj.identifier;
            }).map(cable => ({
                ...cable,
                direction: 'between'
            })) || [];
        }

        // Mode 3: No cabinets selected - show building-to-building cables (your original logic)
        if (!selectedLeftCabinet && !selectedRightCabinet && leftBuilding && rightBuilding) {
            const building1 = buildings?.find(b => b.name === leftBuilding);
            const building2 = buildings?.find(b => b.name === rightBuilding);

            if (!building1 || !building2) return [];

            let cables = [];
            building1.cabinets?.forEach(cab1 => {
                if (!cab1.cables) return;

                cab1.cables.forEach(cable => {
                    if (!cable.number) return;

                    const connectedCabinet = building2.cabinets?.find(cab2 =>
                        cab2.cables?.some(c => c.uid === cable.uid)
                    );

                    if (connectedCabinet &&
                        !(leftBuilding === rightBuilding && cab1.identifier === connectedCabinet.identifier)) {
                        cables.push({
                            uid: cable.uid,
                            number: cable.number,
                            num_of_fibers: cable.num_of_fibers,
                            cable_type: cable.cable_type,
                            cabinet1: cab1.identifier,
                            cabinet2: connectedCabinet.identifier,
                            direction: 'building-to-building'
                        });
                    }
                });
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

    // Handle port selection
    const handleLeftPortSelect = (portNumber) => {
        setSelectedLeftPort(prevPort => prevPort === portNumber ? null : portNumber);
    };

    const handleRightPortSelect = (portNumber) => {
        setSelectedRightPort(prevPort => prevPort === portNumber ? null : portNumber);
    };

    // Check if cabinet should display ports
    const shouldDisplayPorts = (cabinetObj) => {
        return cabinetObj && cabinetObj.port_count && cabinetObj.port_count > 0;
    };

    // Get building box class names based on port count
    const getBuildingBoxClass = (cabinetObj, isLeft) => {
        let classes = ['building-box'];
        
        if (!cabinetObj && !leftBuilding && !rightBuilding) {
            classes.push('empty-box');
        }
        
        if (cabinetObj) {
            classes.push('cabinet-selected');
            if (shouldDisplayPorts(cabinetObj)) {
                classes.push('has-ports');
                classes.push(`has-ports-${cabinetObj.port_count}`);
            }
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
                cableCount: `${leftCabinetObj.cables?.length || 0} כבלים`
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

        // Show targets when only left cabinet is selected
        if (leftCabinetObj && !rightCabinetObj) {
            const uniqueTargets = [...new Set(
                displayedCables.map(cable =>
                    cable.other_building ? `${cable.other_building} - ${cable.other_cabinet?.identifier}` : 'לא ידוע'
                )
            )];

            return {
                isTargetList: true,
                targets: uniqueTargets
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

    return (
        <div className="cable-display">
            <div className={`building-boxes ${shouldDisplayPorts(leftCabinetObj) || shouldDisplayPorts(rightCabinetObj) ? 'ports-mode' : ''}`}>
                {/* Left Box */}
                <div className={getBuildingBoxClass(leftCabinetObj, true)}>
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
                            
                            {shouldDisplayPorts(leftCabinetObj) && (
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
                                        side="left"
                                    />
                                    {selectedLeftPort && (
                                        <div className="selected-port-info">
                                            פורט {selectedLeftPort} נבחר
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="empty-content">
                            בחר בניין או ארון מצד שמאל
                        </div>
                    )}
                </div>

                {/* SVG for cables - only show when not displaying ports */}
                {!shouldDisplayPorts(leftCabinetObj) && !shouldDisplayPorts(rightCabinetObj) && (
                    <svg className="cables-svg">
                        {displayedCables.length > 0 && displayedCables.map((cable, index) => (
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
                                    onClick={() => onCableSelect(cable.uid)}
                                    style={{ cursor: 'pointer' }}
                                />

                                {/* Cable label */}
                                <text
                                    x="50%"
                                    y={getCablePosition(index, displayedCables.length) - 10}
                                    textAnchor="middle"
                                    className="cable-label"
                                >
                                    {`כבל ${cable.number} (${cable.num_of_fibers} סיבים)`}
                                </text>

                                {/* Direction/Type indicator */}
                                <text
                                    x="50%"
                                    y={getCablePosition(index, displayedCables.length) + 15}
                                    textAnchor="middle"
                                    className="cable-direction"
                                >
                                    {cable.direction === 'outgoing' ? '→' :
                                        cable.direction === 'incoming' ? '←' :
                                            cable.direction === 'between' ? '↔' : '⟷'}
                                </text>
                            </g>
                        ))}
                    </svg>
                )}

                {/* Right Box */}
                <div className={getBuildingBoxClass(rightCabinetObj, false) + (rightInfo?.isTargetList ? ' target-box' : '')}>
                    {rightInfo?.isTargetList ? (
                        <div className="target-content">
                            <div className="target-title">יעדי הכבלים ({rightInfo.targets.length})</div>
                            <div className="target-list">
                                {rightInfo.targets.slice(0, 6).map((target, index) => (
                                    <div key={index} className="target-item">{target}</div>
                                ))}
                                {rightInfo.targets.length > 6 && (
                                    <div className="target-more">ועוד {rightInfo.targets.length - 6}...</div>
                                )}
                            </div>
                        </div>
                    ) : rightInfo ? (
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
                            
                            {shouldDisplayPorts(rightCabinetObj) && (
                                <div className="port-display">
                                    <div className="cabinet-title">
                                        <h4>{rightInfo.title}</h4>
                                        <div className="port-info">{rightInfo.portInfo}</div>
                                    </div>
                                    <PortGrid
                                        portCount={rightCabinetObj.port_count}
                                        onPortSelect={handleRightPortSelect}
                                        selectedPort={selectedRightPort}
                                        occupiedPorts={rightOccupiedPorts}
                                        side="right"
                                    />
                                    {selectedRightPort && (
                                        <div className="selected-port-info">
                                            פורט {selectedRightPort} נבחר
                                        </div>
                                    )}
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

            {/* Port Connection Display - Show when both cabinets have ports and ports are selected */}
            {shouldDisplayPorts(leftCabinetObj) && shouldDisplayPorts(rightCabinetObj) && 
             (selectedLeftPort || selectedRightPort) && (
                <div className="port-connection-info">
                    <h4>חיבור פורטים</h4>
                    <div className="connection-details">
                        <span>פורט שמאל: {selectedLeftPort || 'לא נבחר'}</span>
                        <span>↔</span>
                        <span>פורט ימין: {selectedRightPort || 'לא נבחר'}</span>
                    </div>
                    {selectedLeftPort && selectedRightPort && (
                        <button 
                            className="create-connection-button"
                            onClick={() => {
                                // Here you would implement the port connection logic
                                console.log(`Connecting port ${selectedLeftPort} to port ${selectedRightPort}`);
                                // Reset selections after connection
                                setSelectedLeftPort(null);
                                setSelectedRightPort(null);
                            }}
                        >
                            צור חיבור
                        </button>
                    )}
                </div>
            )}

            {/* Cable Info Panel - Show when cable is selected AND has port info */}
            {selectedCable && (leftCabinetObj?.port_count > 0 || rightCabinetObj?.port_count > 0) && (
                <div className="cable-info-panel">
                    {(() => {
                        const cable = displayedCables.find(c => c.uid === selectedCable);
                        if (!cable) return null;

                        return (
                            <div className="cable-details-panel">
                                <h4>פרטי כבל {cable.number}</h4>
                                <div className="cable-stats">
                                    <span>סוג: {cable.cable_type}</span>
                                    <span>סיבים: {cable.num_of_fibers}</span>
                                    {cable.direction !== 'building-to-building' && (
                                        <span>כיוון: {
                                            cable.direction === 'outgoing' ? 'יוצא' :
                                                cable.direction === 'incoming' ? 'נכנס' : 'דו-כיווני'
                                        }</span>
                                    )}
                                </div>

                                <div className="port-assignments">
                                    <h5>הקצאת פורטים:</h5>
                                    <div className="port-list">
                                        {cable.fibers?.slice(0, 5).map(fiber => (
                                            <div key={`${fiber.number_cabinet1}-${fiber.number_cabinet2}`} className="port-assignment">
                                                <span>סיב {fiber.number_cabinet1}→{fiber.number_cabinet2}</span>
                                                {(fiber.port_cabinet1 || fiber.port_cabinet2) && (
                                                    <span className="port-info">
                                                        פורט: {fiber.port_cabinet1 || 'לא מוקצה'} → {fiber.port_cabinet2 || 'לא מוקצה'}
                                                    </span>
                                                )}
                                                {fiber.network && (
                                                    <span className="network-info">רשת: {fiber.network}</span>
                                                )}
                                            </div>
                                        )) || <div>אין מידע על סיבים</div>}
                                        {cable.fibers?.length > 5 && (
                                            <div className="more-fibers">ועוד {cable.fibers.length - 5} סיבים...</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            )}

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
                                options: ['6', '12', '24', '48']
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
            </div>
        </div>
    );
}

export default BoxDisplay;