import React, { useMemo } from 'react';

const BUILDINGS_PER_ROW = 5;

function PathModal({ pathData, onClose }) {
    const { steps, network } = pathData;

    // Group steps by cabinet, preserving order
    const cabinetGroups = useMemo(() => {
        const groups = [];
        steps.forEach(step => {
            const last = groups[groups.length - 1];
            if (last && last.cabinet === step.cabinet) {
                last.ports.push(step.port);
            } else {
                groups.push({
                    cabinet: step.cabinet,
                    building: step.building,
                    ports: [step.port]
                });
            }
        });
        return groups;
    }, [steps]);

    // Group cabinet groups by building, preserving order
    const buildingGroups = useMemo(() => {
        const groups = [];
        cabinetGroups.forEach(cabGroup => {
            const last = groups[groups.length - 1];
            if (last && last.building === cabGroup.building) {
                last.cabinets.push(cabGroup);
            } else {
                groups.push({
                    building: cabGroup.building,
                    cabinets: [cabGroup]
                });
            }
        });
        return groups;
    }, [cabinetGroups]);

    // Split buildings into rows of BUILDINGS_PER_ROW, snake pattern
    const rows = useMemo(() => {
        const result = [];
        for (let i = 0; i < buildingGroups.length; i += BUILDINGS_PER_ROW) {
            const row = buildingGroups.slice(i, i + BUILDINGS_PER_ROW);
            const rowIndex = Math.floor(i / BUILDINGS_PER_ROW);
            // Reverse every other row for snake pattern
            result.push(rowIndex % 2 === 1 ? [...row].reverse() : row);
        }
        return result;
    }, [buildingGroups]);

    const renderCabinet = (cabGroup) => (
        <div key={cabGroup.cabinet} className="path-cabinet">
            <div className="path-cabinet-label">{cabGroup.cabinet}</div>
            <div className="path-ports">
                {cabGroup.ports.map((port, i) => (
                    <div key={i} className="path-port">
                        <div className="path-port-circle">{port}</div>
                        {i < cabGroup.ports.length - 1 && (
                            <div className="path-port-connector" />
                        )}
                    </div>
                ))}
            </div>
        </div>
    );

    const renderBuilding = (bGroup, bIndex, row, rowIndex) => {
        const isLast = bIndex === row.length - 1;
        const isLastRow = rowIndex === rows.length - 1;
        const isSnakeEnd = isLast && !isLastRow;

        return (
            <React.Fragment key={`${bGroup.building}-${rowIndex}-${bIndex}`}>
                <div className="path-building">
                    <div className="path-building-label">{bGroup.building}</div>
                    <div className="path-building-content">
                        {bGroup.cabinets.map((cabGroup, cIndex) => (
                            <React.Fragment key={cabGroup.cabinet}>
                                {renderCabinet(cabGroup)}
                                {cIndex < bGroup.cabinets.length - 1 && (
                                    <div className="path-connector" />
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </div>
                {!isLast && <div className="path-connector" />}
                {isSnakeEnd && <div className="path-snake-turn" />}
            </React.Fragment>
        );
    };

    return (
        <div className="modal-overlay path-modal-overlay" onClick={onClose}>
            <div className="modal-box path-modal-box" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="modal-header">
                    <span className="modal-title">
                        מסלול רשת
                        {network && (
                            <span className="path-network-badge">{network}</span>
                        )}
                    </span>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>

                {/* Path visualization */}
                <div className="path-scroll-area">
                    {steps.length === 0 ? (
                        <div className="modal-empty">לא נמצא מסלול</div>
                    ) : (
                        <div className="path-rows">
                            {rows.map((row, rowIndex) => (
                                <div key={rowIndex} className={`path-row ${rowIndex % 2 === 1 ? 'path-row-reversed' : ''}`}>
                                    {row.map((bGroup, bIndex) =>
                                        renderBuilding(bGroup, bIndex, row, rowIndex)
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default PathModal;