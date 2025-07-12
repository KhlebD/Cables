import React, { useState, useMemo } from 'react';
import Store from './Store';

const FiberDisplay = ({ selectedCable, selectedFiber, onFiberSelect, onLeftPortSelect, onRightPortSelect }) => {
    const [hoveredFiberId, setHoveredFiberId] = useState(null);
    const [editingFiber, setEditingFiber] = useState(null);
    const buildings = Store(state => state.buildings);
    const updateFiberNetwork = Store(state => state.updateFiberNetwork);

    const { fibers, cabinet1, cabinet2 } = useMemo(() => {
        if (!selectedCable) return { fibers: [], cabinet1: null, cabinet2: null };

        for (const building of buildings || []) {
            for (const cabinet of building.cabinets || []) {
                const cable = cabinet.cables?.find(c =>
                    c.uid === selectedCable
                );
                if (cable) {
                    // Find the other cabinet this cable connects to
                    let otherCabinet;
                    buildings.forEach(b => {
                        b.cabinets?.forEach(cab => {
                            if (cab !== cabinet && cab.cables?.some(c => c.uid === selectedCable)) {
                                otherCabinet = cab;
                            }
                        });
                    });

                    return {
                        fibers: cable.fibers || [],
                        cabinet1: cabinet,
                        cabinet2: otherCabinet
                    };
                }
            }
        }
        return { fibers: [], cabinet1: null, cabinet2: null };
    }, [buildings, selectedCable]);


    const handleFiberSelect = (selectedFiber) => {
        onFiberSelect(selectedFiber);
        // Auto-select the ports connected to this fiber
        if (onLeftPortSelect && selectedFiber.port_cabinet1) {
            onLeftPortSelect(parseInt(selectedFiber.port_cabinet1));
        }
        if (onRightPortSelect && selectedFiber.port_cabinet2) {
            onRightPortSelect(parseInt(selectedFiber.port_cabinet2));
        }
        setEditingFiber(selectedFiber.number_cabinet1);
    };

    const viewportWidth = window.innerWidth;
    const getFiberPosition = (index, totalFibers) => {

        const usableWidth = viewportWidth * 0.9;
        const fibersPerRow = totalFibers < 13 ? totalFibers : 12;
        const spacing = usableWidth / (fibersPerRow + 1);
        const adjustedIndex = index % 12;
        const startX = viewportWidth * 0.05;
        return startX + spacing * (adjustedIndex + 1);
    };
    return (
        <div className="fiber-display">
            {selectedCable && (
                <>
                    <div className="fiber-container">
                        <svg
                            className="fibers-svg"
                            viewBox={`0 0 ${viewportWidth} ${50 + (Math.ceil(fibers.length / 12) * 260) + 100}`}
                        >
                            <rect
                                x="10"
                                y="20"
                                width={viewportWidth - 20}
                                height="30"
                                fill="#e0e0e0"
                                rx="5"
                            />
                            <text
                                x={viewportWidth / 2}
                                y="40"
                                textAnchor="middle"
                                className="cabinet-header"
                            >
                                {cabinet1?.identifier} ({cabinet1?.cabinet_type})
                            </text>

                            <g transform="translate(0, 50)">
                                {[...fibers].sort((a, b) => a.number_cabinet1 - b.number_cabinet1).map((fiber, index) => {
                                    const rowNumber = Math.floor(index / 12);
                                    const baseY = rowNumber * 280;  // 260 is the vertical spacing between rows

                                    return (
                                        <g key={fiber.number_cabinet1}>
                                            {/* Glow effect */}
                                            {hoveredFiberId === fiber.number_cabinet1 && (
                                                <line
                                                    x1={getFiberPosition(index, fibers.length)}
                                                    y1={baseY + 20}
                                                    x2={getFiberPosition(index, fibers.length)}
                                                    y2={baseY + 220}
                                                    stroke="blue"
                                                    strokeWidth="24"
                                                    opacity="0.4"
                                                />
                                            )}
                                            {/* Main fiber line */}
                                            <line
                                                x1={getFiberPosition(index, fibers.length)}
                                                y1={baseY + 20}
                                                x2={getFiberPosition(index, fibers.length)}
                                                y2={baseY + 220}
                                                stroke={
                                                    (selectedFiber && fiber.number_cabinet1 === selectedFiber.number_cabinet1)
                                                        ? '#339cff'
                                                        : (fiber.network ? 'blue' : '#808080')
                                                } strokeWidth="14"
                                                onMouseEnter={() => setHoveredFiberId(fiber.number_cabinet1)}
                                                onMouseLeave={() => setHoveredFiberId(null)}
                                                onClick={() => handleFiberSelect(fiber)}
                                                style={{ cursor: 'pointer' }}
                                            />
                                            {/* Top number (Cabinet 1) */}
                                            <text
                                                x={getFiberPosition(index, fibers.length)}
                                                y={baseY + 15}
                                                textAnchor="middle"
                                                className="fiber-info"
                                                opacity={fiber.network ? "1" : "0.7"}
                                            >
                                                {fiber.number_cabinet1}
                                            </text>

                                            {/* Bottom number (Cabinet 2) */}
                                            <text
                                                x={getFiberPosition(index, fibers.length)}
                                                y={baseY + 235}
                                                textAnchor="middle"
                                                className="fiber-info"
                                                opacity={fiber.network ? "1" : "0.7"}
                                            >
                                                {fiber.number_cabinet2}
                                            </text>

                                            {editingFiber === fiber.number_cabinet1 ? (
                                                <foreignObject
                                                    x={getFiberPosition(index, fibers.length) - 50}
                                                    y={baseY + 237}
                                                    width="100"
                                                    height="30"
                                                >
                                                    <input
                                                        type="text"
                                                        value={fiber.network || ''}
                                                        onChange={async (e) => {
                                                            try {
                                                                await updateFiberNetwork(
                                                                    selectedCable,
                                                                    fiber.number_cabinet1,
                                                                    e.target.value || null
                                                                );
                                                                setEditingFiber(null);
                                                            } catch (error) {
                                                                console.error('Failed to update network:', error);
                                                            }
                                                        }}
                                                        onBlur={() => setEditingFiber(null)}
                                                        autoFocus
                                                        placeholder="הכנס רשת"
                                                    />
                                                </foreignObject>
                                            ) : (
                                                <text
                                                    x={getFiberPosition(index, fibers.length)}
                                                    y={baseY + 255}
                                                    textAnchor="middle"
                                                    className="fiber-info"
                                                    opacity={fiber.network ? "1" : "0.7"}
                                                >
                                                    {fiber.network || 'ללא רשת'}
                                                </text>
                                            )}
                                        </g>
                                    );
                                })}
                            </g>
                            <rect
                                x="10"
                                y={50 + (Math.ceil(fibers.length / 12) * 270) + 30}
                                width={viewportWidth - 20}
                                height="30"
                                fill="#e0e0e0"
                                rx="5"
                            />
                            <text
                                x={viewportWidth / 2}
                                y={50 + (Math.ceil(fibers.length / 12) * 270) + 50}
                                textAnchor="middle"
                                className="cabinet-header"
                            >
                                {cabinet2?.identifier} ({cabinet2?.cabinet_type})
                            </text>
                        </svg>
                    </div>
                </>
            )}
        </div>
    );
}

export default FiberDisplay;