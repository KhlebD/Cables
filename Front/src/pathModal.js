import React, { useMemo } from 'react';
import AddButton from './AddButton';
import Store from './Store';

function PathModal({ pathData, onClose, onAddNetwork }) {
    const { steps, network } = pathData;

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

    return (
        <div className="modal-overlay path-modal-overlay" onClick={onClose}>
            <div className="modal-box path-modal-box" onClick={e => e.stopPropagation()}>

                <div className="modal-header">
                
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                        <AddButton
                            itemType="רשת למסלול"
                            fields={[
                                {
                                    name: 'network',
                                    label: 'שם הרשת',
                                    type: 'text',
                                    required: true,
                                    placeholder: 'הכנס שם רשת'
                                }
                            ]}
                            onAdd={async (formData) => {
                                await onAddNetwork(formData.network);
                            }}
                        />
                    </div>
                    <span className="modal-title">
                        {network && (
                            <span className="path-network-badge">{network}</span>
                        )}
                        מסלול רשת

                    </span>

                    <button className="modal-close" onClick={onClose}>✕</button>

                </div>

                <div className="path-scroll-area">
                    {steps.length === 0 ? (
                        <div className="modal-empty">לא נמצא מסלול</div>
                    ) : (
                        <div className="path-row">
                            {buildingGroups.map((bGroup, bIndex) => (
                                <React.Fragment key={`${bGroup.building}-${bIndex}`}>
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
                                    {bIndex < buildingGroups.length - 1 && (
                                        <div className="path-connector" />
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default PathModal;