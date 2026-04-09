import React, { useState, useMemo } from 'react';
import Store from './Store';
import PortGrid from './PortGrid';
import AddButton from './AddButton';
import RemoveButton from './RemoveButton';

const CABINET_ICONS = {
    'ארון': '🗄️',
    'פאנל': '☰',
    'באקבון': '⬡',
    'חפרפר': '⬇',
    'מתג': '⇄',
    'נתב': '⊕'
};

const ACTIVE_TYPES = ['מתג', 'נתב'];

function CabinetModal({ cabinet, onClose }) {
    const buildings = Store(state => state.buildings);
    const [selectedLeftComponent, setSelectedLeftComponent] = useState(null);
    const [selectedRightComponent, setSelectedRightComponent] = useState(null);
    const [selectedLeftPort, setSelectedLeftPort] = useState(null);
    const [selectedRightPort, setSelectedRightPort] = useState(null);
    const [selectedCable, setSelectedCable] = useState(null);
    const [selectedFiber, setSelectedFiber] = useState(null);

    const buildingName = useMemo(() => {
        return buildings?.find(b =>
            b.cabinets?.some(c => c.identifier === cabinet.identifier)
        )?.name;
    }, [buildings, cabinet]);

    const children = useMemo(() => {
        const building = buildings?.find(b => b.name === buildingName);
        return building?.cabinets?.filter(c => c.parent_cabinet === cabinet.identifier) || [];
    }, [buildings, buildingName, cabinet]);

    const passiveChildren = children.filter(c => !ACTIVE_TYPES.includes(c.cabinet_type));
    const activeChildren = children.filter(c => ACTIVE_TYPES.includes(c.cabinet_type));

    const getComponentObj = (comp) => {
        if (!comp) return null;
        const building = buildings?.find(b => b.name === buildingName);
        return building?.cabinets?.find(c => c.identifier === comp.identifier) || null;
    };

    const leftObj = useMemo(() => getComponentObj(selectedLeftComponent), [buildings, selectedLeftComponent]);
    const rightObj = useMemo(() => getComponentObj(selectedRightComponent), [buildings, selectedRightComponent]);

    const handleComponentClick = (component) => {
        setSelectedLeftPort(null);
        setSelectedRightPort(null);
        setSelectedCable(null);
        setSelectedFiber(null);

        if (selectedLeftComponent?.identifier === component.identifier) {
            setSelectedLeftComponent(null);
            return;
        }
        if (selectedRightComponent?.identifier === component.identifier) {
            setSelectedRightComponent(null);
            return;
        }
        if (!selectedLeftComponent) {
            setSelectedLeftComponent(component);
            return;
        }
        if (!selectedRightComponent) {
            setSelectedRightComponent(component);
            return;
        }
        // Both selected → new click becomes left, clear right
        setSelectedLeftComponent(component);
        setSelectedRightComponent(null);
    };

    const getOccupiedFrontPorts = (componentObj) => {
        if (!componentObj?.cables) return [];
        const ports = [];
        componentObj.cables.forEach(cable => {
            cable.fibers?.forEach(fiber => {
                if (fiber.side === 'front') {
                    if (cable.cabinet1 === componentObj.identifier && fiber.port_cabinet1)
                        ports.push(parseInt(fiber.port_cabinet1));
                    else if (cable.cabinet2 === componentObj.identifier && fiber.port_cabinet2)
                        ports.push(parseInt(fiber.port_cabinet2));
                }
            });
        });
        return [...new Set(ports)];
    };

    const frontCables = useMemo(() => {
        if (!leftObj || !rightObj) return [];
        const cables = [];
        leftObj.cables?.forEach(cable => {
            if (!cable.fibers?.some(f => f.side === 'front')) return;
            if (cable.cabinet1 === rightObj.identifier || cable.cabinet2 === rightObj.identifier)
                cables.push(cable);
        });
        rightObj.cables?.forEach(cable => {
            if (!cable.fibers?.some(f => f.side === 'front')) return;
            if ((cable.cabinet1 === leftObj.identifier || cable.cabinet2 === leftObj.identifier)
                && !cables.some(c => c.uid === cable.uid))
                cables.push(cable);
        });
        return cables;
    }, [leftObj, rightObj]);

    const findConnectedFrontPort = (fromComponent, fromPort) => {
        for (const cable of fromComponent.cables || []) {
            const fiber = cable.fibers?.find(f => {
                if (f.side !== 'front') return false;
                if (cable.cabinet1 === fromComponent.identifier) return parseInt(f.port_cabinet1) === fromPort;
                if (cable.cabinet2 === fromComponent.identifier) return parseInt(f.port_cabinet2) === fromPort;
                return false;
            });
            if (!fiber) continue;
            const otherComponentId = cable.cabinet1 === fromComponent.identifier ? cable.cabinet2 : cable.cabinet1;
            const otherPort = cable.cabinet1 === fromComponent.identifier
                ? parseInt(fiber.port_cabinet2) : parseInt(fiber.port_cabinet1);
            const otherComponent = children.find(c => c.identifier === otherComponentId);
            if (otherComponent) return { component: otherComponent, port: otherPort, fiber, cable };
        }
        return null;
    };

    const handleLeftPortSelect = (port) => {
        setSelectedFiber(null);
        setSelectedCable(null);
        if (selectedLeftPort === port) { setSelectedLeftPort(null); return; }
        setSelectedLeftPort(port);
        const connected = findConnectedFrontPort(leftObj, port);
        if (connected) {
            setSelectedRightComponent(connected.component);
            setSelectedRightPort(connected.port);
            setSelectedCable(connected.cable.uid);
            setSelectedFiber(connected.fiber);
        }
    };

    const handleRightPortSelect = (port) => {
        setSelectedFiber(null);
        setSelectedCable(null);
        if (selectedRightPort === port) { setSelectedRightPort(null); return; }
        setSelectedRightPort(port);
        const connected = findConnectedFrontPort(rightObj, port);
        if (connected) {
            setSelectedLeftComponent(connected.component);
            setSelectedLeftPort(connected.port);
            setSelectedCable(connected.cable.uid);
            setSelectedFiber(connected.fiber);
        }
    };

    const leftOccupied = useMemo(() => getOccupiedFrontPorts(leftObj), [leftObj]);
    const rightOccupied = useMemo(() => getOccupiedFrontPorts(rightObj), [rightObj]);
    const leftConnectedPorts = useMemo(() => {
        if (!leftObj) return [];
        const ports = [];
        frontCables.forEach(cable => {
            cable.fibers?.filter(f => f.side === 'front').forEach(f => {
                if (cable.cabinet1 === leftObj.identifier && f.port_cabinet1)
                    ports.push(parseInt(f.port_cabinet1));
                else if (cable.cabinet2 === leftObj.identifier && f.port_cabinet2)
                    ports.push(parseInt(f.port_cabinet2));
            });
        });
        return ports;
    }, [leftObj, frontCables]);

    const rightConnectedPorts = useMemo(() => {
        if (!rightObj) return [];
        const ports = [];
        frontCables.forEach(cable => {
            cable.fibers?.filter(f => f.side === 'front').forEach(f => {
                if (cable.cabinet1 === rightObj.identifier && f.port_cabinet1)
                    ports.push(parseInt(f.port_cabinet1));
                else if (cable.cabinet2 === rightObj.identifier && f.port_cabinet2)
                    ports.push(parseInt(f.port_cabinet2));
            });
        });
        return ports;
    }, [rightObj, frontCables]);
    const leftCablePorts = useMemo(() => {
        if (!leftObj || !selectedCable) return [];
        const cable = leftObj.cables?.find(c => c.uid === selectedCable);
        if (!cable) return [];
        return cable.fibers?.filter(f => f.side === 'front')
            .map(f => cable.cabinet1 === leftObj.identifier
                ? parseInt(f.port_cabinet1) : parseInt(f.port_cabinet2)) || [];
    }, [leftObj, selectedCable]);

    const rightCablePorts = useMemo(() => {
        if (!rightObj || !selectedCable) return [];
        const cable = rightObj.cables?.find(c => c.uid === selectedCable);
        if (!cable) return [];
        return cable.fibers?.filter(f => f.side === 'front')
            .map(f => cable.cabinet1 === rightObj.identifier
                ? parseInt(f.port_cabinet1) : parseInt(f.port_cabinet2)) || [];
    }, [rightObj, selectedCable]);

    const renderComponent = (comp) => {
        const isLeft = selectedLeftComponent?.identifier === comp.identifier;
        const isRight = selectedRightComponent?.identifier === comp.identifier;
        return (
            <div
                key={comp.identifier}
                className={`modal-component-card
                    ${ACTIVE_TYPES.includes(comp.cabinet_type) ? 'active' : ''}
                    ${isLeft ? 'selected-left' : ''}
                    ${isRight ? 'selected-right' : ''}`}
                onClick={() => handleComponentClick(comp)}
            >
                <div className="modal-component-label">
                    {CABINET_ICONS[comp.cabinet_type] || ''} {comp.identifier}
                </div>
                {isLeft && <div className="modal-component-side-tag">שמאל</div>}
                {isRight && <div className="modal-component-side-tag">ימין</div>}
            </div>
        );
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="modal-header">
                    <div />
                    <span className="modal-title">
                        {CABINET_ICONS[cabinet.cabinet_type] || ''} {cabinet.identifier}
                        <span className="modal-subtitle"> — {buildingName}</span>
                    </span>
                    <button className="modal-close"  onClick={onClose} >✕</button>
                </div>

                {/* Single component list */}
                <div className="modal-cabinet-overview">
                    {children.length === 0 ? (
                        <div className="modal-empty">אין רכיבים בארון זה</div>
                    ) : (
                        <>
                            {passiveChildren.length > 0 && (
                                <>
                                    <div className="modal-category-divider">
                                        <span>פאנלים</span>
                                    </div>
                                    <div className="modal-component-row">
                                        {passiveChildren.map(renderComponent)}
                                    </div>
                                </>
                            )}
                            {passiveChildren.length > 0 && activeChildren.length > 0 && (
                                <div className="modal-category-divider">
                                    <span>רכיבים פעילים</span>
                                </div>
                            )}
                            {activeChildren.length > 0 && (
                                <div className="modal-component-row">
                                    {activeChildren.map(renderComponent)}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Port area */}
                {(leftObj || rightObj) && (
                    <div className="modal-port-area">
                        <div className="modal-port-side">
                            {leftObj ? (
                                <>
                                    <div className="modal-port-title">{leftObj.identifier}</div>
                                    <div style={{ direction: 'rtl' }}>
                                        <PortGrid
                                            portCount={leftObj.port_count}
                                            onPortSelect={handleLeftPortSelect}
                                            selectedPort={selectedLeftPort}
                                            occupiedPorts={leftOccupied}
                                            cablePorts={leftCablePorts}
                                            connectedPorts={leftConnectedPorts}
                                            side="right"
                                        />
                                    </div>
                                </>
                            ) : (
                                <div className="modal-port-placeholder">בחר רכיב שמאל</div>
                            )}
                        </div>

                        <div className="modal-cables-middle">
                            {leftObj && rightObj && frontCables.map(cable => (
                                <div
                                    key={cable.uid}
                                    className={`modal-cable-label ${selectedCable === cable.uid ? 'selected' : ''}`}
                                    onClick={() => {
                                        setSelectedLeftPort(null);
                                        setSelectedRightPort(null);
                                        setSelectedFiber(null);
                                        setSelectedCable(prev => prev === cable.uid ? null : cable.uid);
                                    }}
                                >
                                    {cable.number} סיב
                                </div>
                            ))}
                            {leftObj && rightObj && frontCables.length === 0 && (
                                <div className="modal-no-cables">אין חיבורים</div>
                            )}
                            {leftObj && rightObj && (
                                <div className="add-remove-container" style={{ marginTop: 12 }}>
                                    <AddButton
                                        itemType="כבל"
                                        initialValues={{
                                            cabinet1_start: selectedLeftPort || '',
                                            cabinet2_start: selectedRightPort || ''
                                        }}
                                        fields={[
                                            { name: 'number', label: 'מזהה כבל', type: 'text', required: true },
                                            { name: 'num_of_fibers', label: 'מספר סיבים', type: 'select', required: true, options: ['1', '2', '4', '6', '12'] },
                                            { name: 'cable_type', label: 'סוג', type: 'select', required: true, options: ['Single', 'Multi'] },
                                            { name: 'cabinet1_start', label: `פורט התחלה — ${leftObj.identifier}`, type: 'text', required: true },
                                            { name: 'cabinet2_start', label: `פורט התחלה — ${rightObj.identifier}`, type: 'text', required: true },
                                        ]}
                                        onAdd={async (formData) => {
                                            await Store.getState().addCable(
                                                leftObj.identifier,
                                                rightObj.identifier,
                                                formData.number,
                                                formData.num_of_fibers,
                                                formData.cable_type,
                                                formData.cabinet1_start,
                                                formData.cabinet2_start,
                                                'front'
                                            );
                                        }}
                                    />
                                    {selectedCable && (
                                        <RemoveButton
                                            itemType="כבל"
                                            onRemove={async () => {
                                                const tmp = selectedCable;
                                                setSelectedCable(null);
                                                await Store.getState().removeCable(tmp);
                                            }}
                                        />
                                    )}
                                    {selectedCable && (
                                        <AddButton
                                            itemType="רשת"
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
                                                await Store.getState().updateCableNetworks(selectedCable, formData.network);
                                            }}
                                        />
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="modal-port-side">
                            {rightObj ? (
                                <>
                                    <div className="modal-port-title">{rightObj.identifier}</div>
                                    <div style={{ direction: 'rtl' }}>
                                        <PortGrid
                                            portCount={rightObj.port_count}
                                            onPortSelect={handleRightPortSelect}
                                            selectedPort={selectedRightPort}
                                            occupiedPorts={rightOccupied}
                                            cablePorts={rightCablePorts}
                                            connectedPorts={rightConnectedPorts}
                                            side="left"
                                        />
                                    </div>
                                </>
                            ) : (
                                <div className="modal-port-placeholder">בחר רכיב ימין</div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default CabinetModal;