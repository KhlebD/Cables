import React, { useState, useMemo } from 'react';
import Store from './Store';

const FiberDisplay = ({ selectedCable, selectedFiber, onFiberClick }) => {
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


    const handleFiberClick = (selectedFiber) => {
        onFiberClick(selectedFiber);
        setEditingFiber(selectedFiber.number_cabinet1);
    };

    const viewportWidth = window.innerWidth;
    const getFiberPosition = (index, totalFibers) => {

        const spacing = totalFibers < 25 ? viewportWidth / (totalFibers + 1) : viewportWidth / (25);
        index = index < 24 ? index : index - 24;
        return spacing * (index) + (spacing / 2);
    };

    return (
        <div className="fiber-display">
            {selectedCable && (
                <>
                    <div className="fiber-container">
                        <svg className="fibers-svg" viewBox={`0 0 ${viewportWidth} ${fibers.length > 24 ? 700 : 500}`}>
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
                                {/* Top Cabinet Header */}

                                {[...fibers].sort((a, b) => a.number - b.number).map((fiber, index) => (
                                    <g key={fiber.number_cabinet1}>
                                        {/* Glow effect */}
                                        {hoveredFiberId === fiber.number_cabinet1 && (
                                            <line
                                                x1={getFiberPosition(index, fibers.length)}
                                                y1={index < 24 ? '20' : '280'}
                                                x2={getFiberPosition(index, fibers.length)}
                                                y2={index < 24 ? '220' : '480'}
                                                stroke="blue"
                                                strokeWidth="24"
                                                opacity="0.4"
                                            />
                                        )}
                                        {/* Main fiber line */}
                                        <line
                                            x1={getFiberPosition(index, fibers.length)}
                                            y1={index < 24 ? '20' : '280'}
                                            x2={getFiberPosition(index, fibers.length)}
                                            y2={index < 24 ? '220' : '480'}
                                            stroke={fiber === selectedFiber ? 'cyan' : 'blue'}
                                            strokeWidth="14"
                                            onMouseEnter={() => setHoveredFiberId(fiber.number_cabinet1)}
                                            onMouseLeave={() => setHoveredFiberId(null)}
                                            onClick={() => {
                                                handleFiberClick(fiber)
                                            }}
                                            style={{ cursor: 'pointer' }}
                                        />
                                        {/* Fiber info */}
                                        <text
                                            x={getFiberPosition(index, fibers.length)}
                                            y={index < 24 ? '15' : '275'}  // Moved up to make room for cabinet header
                                            textAnchor="middle"
                                            className="fiber-info"
                                        >
                                            {fiber.number_cabinet1}
                                        </text>

                                        {/* Cabinet 2 number */}
                                        <text
                                            x={getFiberPosition(index, fibers.length)}
                                            y={index < 24 ? '235' : '495'}  // Where the original number was
                                            textAnchor="middle"
                                            className="fiber-info"
                                        >
                                            {fiber.number_cabinet2}
                                        </text>

                                        {editingFiber === fiber.number_cabinet1 ? (
                                            <foreignObject
                                                x={getFiberPosition(index, fibers.length) - 40}
                                                y={index < 24 ? '235' : '495'}
                                                width="100"
                                                height="30"
                                            >
                                                <select
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
                                                            // Optionally add error handling UI here
                                                        }
                                                    }}
                                                    onBlur={() => setEditingFiber(null)}
                                                    autoFocus
                                                >
                                                    <option value="">No network</option>
                                                    <option value="network1">Network 1</option>
                                                    <option value="network2">Network 2</option>
                                                    {/* Add your actual network options here */}
                                                </select>
                                            </foreignObject>
                                        ) : (
                                            <text
                                                x={getFiberPosition(index, fibers.length)}
                                                y={index < 24 ? '255' : '510'}
                                                textAnchor="middle"
                                                className="fiber-info"
                                            >
                                                {fiber.network || 'No network'}
                                            </text>
                                        )}
                                    </g>
                                ))}
                            </g>
                            <rect
                                x="10"
                                y={fibers.length > 24 ? 590 : 330}
                                width={viewportWidth - 20}
                                height="30"
                                fill="#e0e0e0"
                                rx="5"
                            />
                            <text
                                x={viewportWidth / 2}
                                y={fibers.length > 24 ? 610 : 350} 
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