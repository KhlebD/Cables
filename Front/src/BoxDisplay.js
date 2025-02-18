import React, { useState, useMemo } from 'react';
import Store from './Store';
import AddButton from './AddButton';
import RemoveButton from './RemoveButton';
import './styles.css';

function BoxDisplay({ leftBuilding, rightBuilding, selectedCable, onCableSelect }) {
    const buildings = Store(state => state.buildings);
    const [hoveredCableId, setHoveredCableId] = useState(null);

    // Get cabinets for both buildings
    const leftBuildingCabinets = useMemo(() => {
        const building = buildings?.find(b => b.name === leftBuilding);
        return building?.cabinets || [];
    }, [buildings, leftBuilding]);

    const rightBuildingCabinets = useMemo(() => {
        const building = buildings?.find(b => b.name === rightBuilding);
        return building?.cabinets || [];
    }, [buildings, rightBuilding]);

    // Filter same-cabinet choice in form
    const getSecondCabinetOptions = (formData) => {

        if (leftBuilding === rightBuilding) {
            return rightBuildingCabinets
                .filter(cab => cab.identifier !== formData.cabinet1)
                .map(cab => cab.identifier);
        }
        return rightBuildingCabinets.map(cab => cab.identifier);
    };

    const connectingCables = useMemo(() => {
        // If either building is not selected, return empty array
        if (!leftBuilding || !rightBuilding) return [];

        const building1 = buildings?.find(b => b.name === leftBuilding);
        const building2 = buildings?.find(b => b.name === rightBuilding);

        // If either building not found, return empty array
        if (!building1 || !building2) return [];

        let cables = [];
        // Only look for cables if both buildings are selected
        building1.cabinets?.forEach(cab1 => {
            if (!cab1.cables) return;  // Skip if no cables

            cab1.cables.forEach(cable => {
                // Skip if cable has no number
                if (!cable.number) return;

                // Check if this cable connects to the other building
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
                        cabinet2: connectedCabinet.identifier

                    });
                }
            });
        });

        return cables;
    }, [buildings, leftBuilding, rightBuilding]);

    // Calculate cable positions
    const getCablePosition = (index, totalCables) => {
        const spacing = 150 / (totalCables + 1);  // Use box height
        return spacing * (index + 1);  // Position relative to box height
    };

    return (
        <div className="cable-display">
            <div className="building-boxes">
                <div className={`building-box ${!leftBuilding ? 'empty-box' : ''}`}>
                    {leftBuilding ? (
                        <div className="building-content">
                            <h3>{leftBuilding}</h3>
                        </div>
                    ) : (
                        <div className="empty-content">
                            בחר בניין מצד שמאל
                        </div>
                    )}
                </div>
                {/* SVG for cables */}
                <svg className="cables-svg">
                    {connectingCables.length > 0 && connectingCables.map((cable, index) => (
                        <g key={cable.uid}>
                            {/* Glow effect for hover */}
                            {hoveredCableId === cable.uid && (
                                <line
                                    x1="0"
                                    y1={getCablePosition(index, connectingCables.length)}
                                    x2="100%"
                                    y2={getCablePosition(index, connectingCables.length)}
                                    stroke="blue"
                                    strokeWidth="16"
                                    opacity="0.4"
                                />
                            )}
                            {/* Main cable line */}
                            <line
                                x1="0"
                                y1={getCablePosition(index, connectingCables.length)}
                                x2="100%"
                                y2={getCablePosition(index, connectingCables.length)}
                                stroke={selectedCable === cable.uid ? "blue" : "black"}
                                strokeWidth="8"
                                onMouseEnter={() => setHoveredCableId(cable.uid)}
                                onMouseLeave={() => setHoveredCableId(null)}

                                onClick={() => {
                                    onCableSelect(cable.uid)
                                }}
                                style={{ cursor: 'pointer' }}
                            />
                            {/* Cable label */}
                            <text
                                x="200"
                                y={getCablePosition(index, connectingCables.length) - 10}
                                textAnchor="middle"
                                className="cable-label"
                            >
                                {`${cable.cable_type} כבל  ${cable.number} (${cable.num_of_fibers} סיבים) `}
                            </text>
                        </g>
                    ))}
                </svg>
                <div className={`building-box ${!rightBuilding ? 'empty-box' : ''}`}>
                    {rightBuilding ? (
                        <div className="building-content">
                            <h3>{rightBuilding}</h3>
                        </div>
                    ) : (
                        <div className="empty-content">
                            בחר בניין מצד ימין
                        </div>
                    )}
                </div>

            </div>
            <div className='add-remove-container'>
                {/* Only show add cable when both buildings selected */}
                {leftBuilding && rightBuilding && (
                    <AddButton
                        itemType="כבל"
                        fields={[
                            {
                                name: 'number',
                                label: 'מזהה כבל',
                                type: 'text',
                                required: true
                            },
                            {
                                name: 'cabinet1',
                                label: `ארון בבניין שמאל`,
                                type: 'select',
                                required: true,
                                options: leftBuildingCabinets.map(cab => cab.identifier)
                            },
                            {
                                name: 'cabinet2',
                                label: `ארון בבניין ימין`,
                                type: 'select',
                                required: true,
                                options: getSecondCabinetOptions,
                                dependsOn: ['cabinet1']
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
                                label: 'מספר התחלתי ארון שמאל',
                                type: 'text',
                                required: true
                            },
                            {
                                name: 'cabinet2_start',
                                label: 'מספר התחלתי ארון ימין',
                                type: 'text',
                                required: true
                            }
                        ]}
                        onAdd={async (formData) => {
                            await Store.getState().addCable({
                                cabinet1: formData.cabinet1,
                                cabinet2: formData.cabinet2,
                                number: formData.number,
                                num_of_fibers: formData.num_of_fibers,
                                cable_type: formData.cable_type,
                                cabinet1_start: formData.cabinet1_start,
                                cabinet2_start: formData.cabinet2_start
                            });
                        }}
                    />
                )}
                {leftBuilding && rightBuilding && selectedCable && (
                    <RemoveButton
                        itemType="כבל"
                        onRemove={async () => {
                            await Store.getState().removeCable(selectedCable);
                        }}
                    />
                )}
            </div>
        </div>
    )
};
export default BoxDisplay;