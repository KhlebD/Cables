import React, { useState, useMemo, useRef } from 'react';
import { CSSTransition } from 'react-transition-group';
import Store from './Store';
import PortGrid from './PortGrid';
import AddButton from './AddButton';
import RemoveButton from './RemoveButton';

const CABINET_ICONS = {
    'ארון': '🗄️',
    'פאנל': '☰',
    'באקבון': '⬡',
    'חפרפר': '⬇',
    'switch': '⇄',
    'router': '⊕'
};

const ACTIVE_TYPES = ['switch', 'router'];

function CabinetModal({ cabinet, onClose }) {
    const buildings = Store(state => state.buildings);
    const [selectedLeftComponent, setSelectedLeftComponent] = useState(null);
    const [selectedRightComponent, setSelectedRightComponent] = useState(null);
    const [selectedLeftPort, setSelectedLeftPort] = useState(null);
    const [selectedRightPort, setSelectedRightPort] = useState(null);
    const [selectedCable, setSelectedCable] = useState(null);
    const [selectedFiber, setSelectedFiber] = useState(null);
    const nodeRef = useRef(null);
    const buildingName = useMemo(() => {
        return buildings?.find(b =>
            b.cabinets?.some(c => c.identifier === cabinet.identifier)
        )?.name;
    }, [buildings, cabinet]);
    // Get fresh cabinet data from store
    const cabinetObj = useMemo(() => {
        const building = buildings?.find(b => b.name === buildingName);
        return building?.cabinets?.find(c => c.identifier === cabinet.identifier) || cabinet;
    }, [buildings, buildingName, cabinet]);

    // Get all child components (panels, switches, routers) of this cabinet
    const children = useMemo(() => {
        const building = buildings?.find(b => b.name === buildingName);
        return building?.cabinets?.filter(c => c.parent_cabinet === cabinetObj.identifier) || [];
    }, [buildings, buildingName, cabinetObj]);

    const passiveChildren = children.filter(c => !ACTIVE_TYPES.includes(c.cabinet_type));
    const activeChildren = children.filter(c => ACTIVE_TYPES.includes(c.cabinet_type));
    const allComponents = [...passiveChildren, ...activeChildren];

    // Get left and right component objects
    const leftObj = useMemo(() =>
        allComponents.find(c => c.identifier === selectedLeftComponent?.identifier) || null,
        [allComponents, selectedLeftComponent]
    );

    const rightObj = useMemo(() =>
        allComponents.find(c => c.identifier === selectedRightComponent?.identifier) || null,
        [allComponents, selectedRightComponent]
    );

    // Get occupied front ports for a component
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

    // Get front cables between left and right components
    const frontCables = useMemo(() => {
        if (!leftObj || !rightObj) return [];
        const cables = [];
        leftObj.cables?.forEach(cable => {
            const isFront = cable.fibers?.some(f => f.side === 'front');
            if (!isFront) return;
            if (cable.cabinet1 === rightObj.identifier || cable.cabinet2 === rightObj.identifier)
                cables.push(cable);
        });
        rightObj.cables?.forEach(cable => {
            const isFront = cable.fibers?.some(f => f.side === 'front');
            if (!isFront) return;
            if ((cable.cabinet1 === leftObj.identifier || cable.cabinet2 === leftObj.identifier)
                && !cables.some(c => c.uid === cable.uid))
                cables.push(cable);
        });
        return cables;
    }, [leftObj, rightObj]);

    // Find connected front port
    const findConnectedFrontPort = (fromComponent, fromPort) => {
        if (!fromComponent || !buildings) return null;
        for (const cable of fromComponent.cables || []) {
            if (!cable.fibers) continue;
            const fiber = cable.fibers.find(f => {
                if (f.side !== 'front') return false;
                if (cable.cabinet1 === fromComponent.identifier)
                    return parseInt(f.port_cabinet1) === fromPort;
                if (cable.cabinet2 === fromComponent.identifier)
                    return parseInt(f.port_cabinet2) === fromPort;
                return false;
            });
            if (!fiber) continue;

            const otherComponentId = cable.cabinet1 === fromComponent.identifier
                ? cable.cabinet2 : cable.cabinet1;
            const otherPort = cable.cabinet1 === fromComponent.identifier
                ? parseInt(fiber.port_cabinet2) : parseInt(fiber.port_cabinet1);

            const otherComponent = allComponents.find(c => c.identifier === otherComponentId);
            if (otherComponent) return { component: otherComponent, port: otherPort, fiber, cable };
        }
        return null;
    };

    const handleLeftPortSelect = (port) => {
        setSelectedFiber(null);
        setSelectedCable(null);
        if (selectedLeftPort === port) {
            setSelectedLeftPort(null);
            return;
        }
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
        if (selectedRightPort === port) {
            setSelectedRightPort(null);
            return;
        }
        setSelectedRightPort(port);
        const connected = findConnectedFrontPort(rightObj, port);
        if (connected) {
            setSelectedLeftComponent(connected.component);
            setSelectedLeftPort(connected.port);
            setSelectedCable(connected.cable.uid);
            setSelectedFiber(connected.fiber);
        }
    };

    const handleComponentClick = (component, side) => {
        setSelectedLeftPort(null);
        setSelectedRightPort(null);
        setSelectedCable(null);
        setSelectedFiber(null);
        if (side === 'left') setSelectedLeftComponent(prev =>
            prev?.identifier === component.identifier ? null : component
        );
        else setSelectedRightComponent(prev =>
            prev?.identifier === component.identifier ? null : component
        );
    };

    const leftOccupied = useMemo(() => getOccupiedFrontPorts(leftObj), [leftObj]);
    const rightOccupied = useMemo(() => getOccupiedFrontPorts(rightObj), [rightObj]);

    const leftCablePorts = useMemo(() => {
        if (!leftObj || !selectedCable) return [];
        const cable = leftObj.cables?.find(c => c.uid === selectedCable);
        if (!cable) return [];
        return cable.fibers
            ?.filter(f => f.side === 'front')
            .map(f => cable.cabinet1 === leftObj.identifier
                ? parseInt(f.port_cabinet1) : parseInt(f.port_cabinet2)) || [];
    }, [leftObj, selectedCable]);

    const rightCablePorts = useMemo(() => {
        if (!rightObj || !selectedCable) return [];
        const cable = rightObj.cables?.find(c => c.uid === selectedCable);
        if (!cable) return [];
        return cable.fibers
            ?.filter(f => f.side === 'front')
            .map(f => cable.cabinet1 === rightObj.identifier
                ? parseInt(f.port_cabinet1) : parseInt(f.port_cabinet2)) || [];
    }, [rightObj, selectedCable]);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="modal-header">
                    <span className="modal-title">
                        {CABINET_ICONS[cabinetObj.cabinet_type] || ''} {cabinetObj.identifier}
                        <span className="modal-subtitle"> — {buildingName}</span>
                    </span>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>

                {/* Cabinet overview - all children */}
                <div className="modal-cabinet-overview">
                    {allComponents.length === 0 ? (
                        <div className="modal-empty">אין רכיבים בארון זה</div>
                    ) : (
                        <>
                            {/* Passive row */}
                            {passiveChildren.length > 0 && (
                                <div className="modal-component-row">
                                    {passiveChildren.map(comp => (
                                        <div key={comp.identifier} className="modal-component-card">
                                            <div className="modal-component-label">
                                                {CABINET_ICONS[comp.cabinet_type] || ''} {comp.identifier}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Divider if both categories exist */}
                            {passiveChildren.length > 0 && activeChildren.length > 0 && (
                                <div className="modal-category-divider">
                                    <span>חיבורי חזית</span>
                                </div>
                            )}

                            {/* Active row */}
                            {activeChildren.length > 0 && (
                                <div className="modal-component-row">
                                    {activeChildren.map(comp => (
                                        <div key={comp.identifier} className="modal-component-card active">
                                            <div className="modal-component-label">
                                                {CABINET_ICONS[comp.cabinet_type] || ''} {comp.identifier}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Front connection builder */}
                <div className="modal-connection-area">
                    <h4 className="modal-section-title">בחר רכיבים לחיבור חזית</h4>

                    <div className="modal-selectors">
                        <div className="modal-selector-group">
                            <div className="modal-selector-label">רכיב שמאל</div>
                            <div className="modal-component-list">
                                {allComponents.map(comp => (
                                    <div
                                        key={comp.identifier}
                                        className={`modal-selector-item ${selectedLeftComponent?.identifier === comp.identifier ? 'selected' : ''}`}
                                        onClick={() => handleComponentClick(comp, 'left')}
                                    >
                                        {CABINET_ICONS[comp.cabinet_type] || ''} {comp.identifier}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="modal-selector-group">
                            <div className="modal-selector-label">רכיב ימין</div>
                            <div className="modal-component-list">
                                {allComponents
                                    .filter(c => c.identifier !== selectedLeftComponent?.identifier)
                                    .map(comp => (
                                        <div
                                            key={comp.identifier}
                                            className={`modal-selector-item ${selectedRightComponent?.identifier === comp.identifier ? 'selected' : ''}`}
                                            onClick={() => handleComponentClick(comp, 'right')}
                                        >
                                            {CABINET_ICONS[comp.cabinet_type] || ''} {comp.identifier}
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </div>

                    {/* Port display - only when both components selected */}
                    {leftObj && rightObj && (
                        <div className="modal-port-area">
                            <div className="modal-port-side">
                                <div className="modal-port-title">{leftObj.identifier}</div>
                                <PortGrid
                                    portCount={leftObj.port_count}
                                    onPortSelect={handleLeftPortSelect}
                                    selectedPort={selectedLeftPort}
                                    occupiedPorts={leftOccupied}
                                    cablePorts={leftCablePorts}
                                    side="left"
                                />
                            </div>

                            <div className="modal-cables-middle">
                                {frontCables.map(cable => (
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
                                        {cable.number} ({cable.num_of_fibers} סיבים)
                                    </div>
                                ))}
                                {frontCables.length === 0 && (
                                    <div className="modal-no-cables">אין חיבורים</div>
                                )}
                            </div>

                            <div className="modal-port-side">
                                <div className="modal-port-title">{rightObj.identifier}</div>
                                <PortGrid
                                    portCount={rightObj.port_count}
                                    onPortSelect={handleRightPortSelect}
                                    selectedPort={selectedRightPort}
                                    occupiedPorts={rightOccupied}
                                    cablePorts={rightCablePorts}
                                    side="right"
                                />
                            </div>
                        </div>
                    )}

                    {/* Add/Remove cable buttons */}
                    {leftObj && rightObj && (
                        <div className="add-remove-container" style={{ marginTop: 16 }}>
                            <AddButton
                                itemType="כבל חזית"
                                initialValues={{
                                    cabinet1: leftObj.identifier,
                                    cabinet2: rightObj.identifier,
                                }}
                                fields={[
                                    { name: 'number', label: 'מזהה כבל', type: 'text', required: true },
                                    {
                                        name: 'num_of_fibers',
                                        label: 'מספר סיבים',
                                        type: 'select',
                                        required: true,
                                        options: ['1', '2', '4', '6', '12']
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
                                        label: `פורט התחלה — ${leftObj.identifier}`,
                                        type: 'text',
                                        required: true
                                    },
                                    {
                                        name: 'cabinet2_start',
                                        label: `פורט התחלה — ${rightObj.identifier}`,
                                        type: 'text',
                                        required: true
                                    },
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
                                    itemType="כבל חזית"
                                    onRemove={async () => {
                                        const tmp = selectedCable;
                                        setSelectedCable(null);
                                        await Store.getState().removeCable(tmp);
                                    }}
                                />
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default CabinetModal;