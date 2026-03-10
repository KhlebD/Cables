import React from 'react';

const PortGrid = ({
    portCount,
    onPortSelect,
    selectedPort,
    occupiedPorts = [],
    cablePorts= []
}) => {
    const getPortLayout = (count) => {
        switch(count) {
            case 12:
                return { rows: 1, cols: 12, layout: 'horizontal' };
            case 24:
                return { rows: 2, cols: 12, layout: 'horizontal' };
            case 48:
                return { rows: 4, cols: 12, layout: 'horizontal' };
            case 72:
                return { rows: 6, cols: 12, layout: 'vertical' };
            case 144:
                return { rows: 12, cols: 12, layout: 'vertical' };
            default:
                return { rows: 1, cols: 1, layout: 'horizontal' };
        }
    };

    const getPortNumber = (rowIndex, colIndex, layout) => {
        if (layout === 'horizontal') {
            // 24/48 ports: rows of 12, left to right
            // Row 0: 1-12, Row 1: 13-24, etc.
            // Reverse column index for RTL display: 12-1, 24-13, etc.
            return (rowIndex * 12) + (12 - colIndex);
        } else {
            // 72/144 ports: columns, left to right
            // 72: each column has 6 ports (1-6, 7-12, 13-18, etc.)
            // 144: each column has 12 ports (1-12, 13-24, 25-36, etc.)
            const layout_obj = getPortLayout(portCount);
            const portsPerCol = layout_obj.rows;
            // Reverse column index for RTL display
            const reversedCol = (layout_obj.cols - 1) - colIndex;
            return (reversedCol * portsPerCol) + (rowIndex + 1);
        }
    };

    const isPortOccupied = (portNumber) => {
        return occupiedPorts.includes(portNumber);
    };

    const isPortSelected = (portNumber) => {
        return selectedPort === portNumber;
    };

    const handlePortSelect = (portNumber) => {
        onPortSelect(portNumber);
    };
    
    const isPortInSelectedCable = (portNumber) => {
        return cablePorts.includes(portNumber);
    };
    const layout = getPortLayout(portCount);
   
    // Create grid of ports
    const renderPorts = () => {
        const ports = [];
       
        for (let row = 0; row < layout.rows; row++) {
            for (let col = 0; col < layout.cols; col++) {
                const portNumber = getPortNumber(row, col, layout.layout);
               
                // Don't render ports beyond the total count
                if (portNumber > portCount) continue;
               
                const isOccupied = isPortOccupied(portNumber);
                const isSelected = isPortSelected(portNumber);
               
                const portClasses = [
                    'port-circle',
                    isOccupied ? 'port-occupied' : 'port-free',
                    isSelected ? 'port-selected' : '',
                    isPortInSelectedCable(portNumber) ? 'port-cable-selected' : ''
                ].filter(Boolean).join(' ');
               
                ports.push(
                    <div
                        key={`port-${portNumber}`}
                        className={portClasses}
                        onClick={() => handlePortSelect(portNumber)}
                        style={{
                            gridRow: row + 1,
                            gridColumn: col + 1
                        }}
                        title={`Port ${portNumber}`}
                    >
                        <span className="port-number">{portNumber}</span>
                    </div>
                );
            }
        }
       
        return ports;
    };

    const gridClasses = [
        'port-grid',
        `port-grid-${portCount}`,
        `port-grid-${layout.layout}`
    ].join(' ');

    return (
        <div className={gridClasses}>
            {renderPorts()}
        </div>
    );
};

export default PortGrid;