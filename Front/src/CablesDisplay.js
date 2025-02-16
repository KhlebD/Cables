import React, { useState, useRef, useEffect } from 'react';

const CableDisplay = ({ buildingTop, buildingBottom, onCableClick, selected }) => {

    const svgRef = useRef(null);

    const [containerWidth, setContainerWidth] = useState(() => {
        // get width immediately
        if (document.querySelector('.button-container')) {
            return document.querySelector('.button-container').getBoundingClientRect().width;
        }
        return 681; // fallback default
    });

    const [hoveredCableId, setHoveredCableId] = useState(null);

    // Cabinet dimensions
    const cabinetWidth = 80;
    const cabinetHeight = 30;

    // Example: 3 cabinets per building
    const numCabinets = 3;

    // Gets width of the element (UPDATE LATER TO ADD ZOOM)
    useEffect(() => {
        if (svgRef.current) {
            
            const width = svgRef.current.getBoundingClientRect().width;
            console.log(width);

            setContainerWidth(width);
        }
    }, []);

    // Calculate spacing between cabinets
    const totalCabinetSpace = containerWidth - (cabinetWidth * numCabinets);
    const spaceBetween = totalCabinetSpace / (numCabinets + 1);

    // Calculate cabinet position function
    const getCabinetX = (index) => {
        return spaceBetween + (index * (cabinetWidth + spaceBetween));
    };

    const handleCableClick = (cableID) => {
        onCableClick(cableID);
    }
    return (
        buildingTop === null || buildingBottom === null ? null :

            <div className="grid-container">
                <div className="button-container ">
                    <div className="building-item cable top"> {buildingTop?.name}</div>
                    <div></div>
                    <svg width="100%" height="100%" ref={svgRef}>
                        {/* Top Building's Cabinets - at 25% height */}
                        {Array(numCabinets).fill(null).map((_, index) => (
                            <rect
                                key={`top-cabinet-${index}`}
                                x={getCabinetX(index)}
                                y="5%"
                                width={cabinetWidth}
                                height={cabinetHeight}
                                fill="gray"
                                stroke = {selected === index ? "mediumblue" : "black"}
                                stroke-width = {selected === index ? "3" : "1"}
                                onClick={() => handleCableClick(index)}
                                style={{ cursor: 'pointer' }}
                            />
                        ))}

                        {/* Bottom Building's Cabinets - at 75% height */}
                        {Array(numCabinets).fill(null).map((_, index) => (
                            <rect
                                key={`bottom-cabinet-${index}`}
                                x={getCabinetX(index)}
                                y="75%"
                                width={cabinetWidth}
                                height={cabinetHeight}
                                fill="gray"
                                stroke = {selected === index ? "mediumblue" : "black"}
                                stroke-width = {selected === index ? "3" : "1"}
                                onClick={() => handleCableClick(index)}
                                style={{ cursor: 'pointer' }}
                            />
                        ))}

                        {/* Cables connecting corresponding cabinets */}
                        {Array(numCabinets).fill(null).map((_, index) => {
                            const cabinetX = getCabinetX(index) + (cabinetWidth / 2);
                            return (
                                <g key={`cable-${index}`}>
                                    <line
                                        x1={cabinetX}
                                        y1="calc(5% + 30px)"
                                        x2={cabinetX}
                                        y2="75%"
                                        stroke = {selected === index ? "mediumblue" : "black"}
                                        strokeWidth="10"
                                        onClick={() => handleCableClick(index)}
                                        style={{ cursor: 'pointer' }}
                                    />
                                </g>
                            );
                        })}

                        {/* Cabinet Labels */}
                        {Array(numCabinets).fill(null).map((_, index) => (
                            <g key={`labels-${index}`}>
                                <text
                                    x={getCabinetX(index) + (cabinetWidth / 2)}
                                    y="19%"
                                    textAnchor="middle"
                                    style={{ pointerEvents: 'none' }} 
                                >
                                    {`Cabinet ${index + 1}`}
                                </text>
                                <text
                                    x={getCabinetX(index) + (cabinetWidth / 2)}
                                    y="88%"
                                    textAnchor="middle"
                                    style={{ pointerEvents: 'none' }}
                                >
                                    {`Cabinet ${index + 1}`}
                                </text>
                            </g>
                        ))}
                    </svg>
                    <div className="building-item cable bottom"> {buildingBottom?.name}</div>

                </div>
            </div>
    )
}
export default CableDisplay;
