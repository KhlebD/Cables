import React, { useState, useEffect, useRef } from 'react';
import Store from './Store';
import AddButton from './AddButton';
import RemoveButton from './RemoveButton';
import EditButton from './EditButton';
import './styles.css';

const BuildingGrid = ({ connectedBuildings, onBuildingSelect, onCableSelect, onCabinetSelect, onLeftPortSelect, onRightPortSelect, onFiberSelect, selectedBuilding }) => {

    const buildings = Store(state => state.buildings);
    const updateBuildingOrder = Store(state => state.updateBuildingOrder);
    const [currentPage, setCurrentPage] = useState(0);
    const [draggedBuilding, setDraggedBuilding] = useState(null);
    const [dragOverBuilding, setDragOverBuilding] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [showLeftIndicator, setShowLeftIndicator] = useState(false);
    const [showRightIndicator, setShowRightIndicator] = useState(false);
    const gridRef = useRef(null);
    const gridContainerRef = useRef(null);
    const pageChangeTimerRef = useRef(null);
    const buildingsPerPage = 20;

    // Get ordered buildings
    const orderedBuildings = [...buildings].sort((a, b) =>
        (a.order !== undefined && b.order !== undefined) ?
            a.order - b.order : 0
    );

    // Initialize order if not already set
    useEffect(() => {
        const needsOrder = buildings.some(building => building.order === undefined);
        if (needsOrder && buildings.length > 0) {
            const newOrder = buildings.map((building, index) => ({
                name: building.name,
                order: index
            }));

            updateBuildingOrder(newOrder);
        }
    }, [buildings, updateBuildingOrder]);

    // Get buildings for current page
    const getCurrentBuildings = () => {
        const start = currentPage * buildingsPerPage;
        return orderedBuildings.slice(start, start + buildingsPerPage);
    };

    const totalPages = Math.ceil(orderedBuildings.length / buildingsPerPage);

    // Clean up timers on unmount
    useEffect(() => {
        return () => {
            if (pageChangeTimerRef.current) {
                clearTimeout(pageChangeTimerRef.current);
                pageChangeTimerRef.current = null;
            }
        };
    }, []);

    // Comprehensive cleanup function for all drag states
    const cleanupDragStates = () => {
        setDraggedBuilding(null);
        setDragOverBuilding(null);
        setIsDragging(false);
        setShowLeftIndicator(false);
        setShowRightIndicator(false);

        if (pageChangeTimerRef.current) {
            clearTimeout(pageChangeTimerRef.current);
            pageChangeTimerRef.current = null;
        }

        // Remove any lingering dragging classes from all building items
        const buildingItems = document.querySelectorAll('.building-item');
        buildingItems.forEach(item => {
            item.classList.remove('dragging');
            item.classList.remove('drag-over');
        });
    };

    const handleBuildingSelect = (buildingName) => {
        if (!isDragging) {
            onCabinetSelect(null);
            onCableSelect(null);
            onFiberSelect(null);
            onLeftPortSelect(null);
            onRightPortSelect(null);
            onCableSelect(null);
            if (selectedBuilding !== buildingName) {
                onBuildingSelect(buildingName);
            } else {
                onBuildingSelect(null);

            }
        }
    };

    // Drag and drop handlers
    const handleDragStart = (e, building) => {
        setDraggedBuilding(building);
        setIsDragging(true);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', building.name);

        // For better visual feedback
        setTimeout(() => {
            e.target.classList.add('dragging');
        }, 0);
    };

    const handleDragEnd = () => {
        cleanupDragStates();
    };

    // Container dragover handler for edge detection
    const handleContainerDragOver = (e) => {
        e.preventDefault();

        if (!isDragging || !gridRef.current) return;

        const gridRect = gridRef.current.getBoundingClientRect();
        const leftEdge = gridRect.left + 50; // 50px from left edge
        const rightEdge = gridRect.right - 50; // 50px from right edge

        if (e.clientX < leftEdge && currentPage > 0) {
            setShowLeftIndicator(true);
            setShowRightIndicator(false);

            if (!pageChangeTimerRef.current) {
                pageChangeTimerRef.current = setTimeout(() => {
                    setCurrentPage(prev => prev - 1);
                    pageChangeTimerRef.current = null;
                }, 800);
            }
        } else if (e.clientX > rightEdge && currentPage < totalPages - 1) {
            setShowLeftIndicator(false);
            setShowRightIndicator(true);

            if (!pageChangeTimerRef.current) {
                pageChangeTimerRef.current = setTimeout(() => {
                    setCurrentPage(prev => prev + 1);
                    pageChangeTimerRef.current = null;
                }, 800);
            }
        } else {
            // Not near any edge
            setShowLeftIndicator(false);
            setShowRightIndicator(false);

            if (pageChangeTimerRef.current) {
                clearTimeout(pageChangeTimerRef.current);
                pageChangeTimerRef.current = null;
            }
        }
    };

    const handleBuildingDragOver = (e, building) => {
        e.preventDefault();
        if (draggedBuilding && building.name !== draggedBuilding.name) {
            setDragOverBuilding(building);
        }

        // Call the container dragover handler to check for edge detection
        handleContainerDragOver(e);
    };

    const handleDragLeave = () => {
        setDragOverBuilding(null);
    };

    const handleDrop = (e, targetBuilding) => {
        e.preventDefault();
        if (!draggedBuilding || draggedBuilding.name === targetBuilding.name) {
            cleanupDragStates(); // Still clean up even if no valid drop
            return;
        }

        // Create a new array with updated order
        const updatedOrder = orderedBuildings.map(building => ({
            name: building.name,
            order: building.order
        }));

        // Find dragged and target indices in the full list
        const draggedIndex = updatedOrder.findIndex(b => b.name === draggedBuilding.name);
        const targetIndex = updatedOrder.findIndex(b => b.name === targetBuilding.name);

        // Remove the dragged item
        const [removed] = updatedOrder.splice(draggedIndex, 1);

        // Insert it at the target position
        updatedOrder.splice(targetIndex, 0, removed);

        // Update the order values to match the new array indices
        updatedOrder.forEach((building, index) => {
            building.order = index;
        });

        // Update the order in the store
        updateBuildingOrder(updatedOrder);

        // Clean up all drag states after successful drop
        cleanupDragStates();
    };

    return (
        <div
            className="connections-area"
            ref={gridRef}
        >
            <h2 className="building-item connect top"> {selectedBuilding || 'בחר בניין'}</h2>

            <div className="navigation-buttons">
                <button
                    onClick={() => setCurrentPage(prev => prev - 1)}
                    disabled={currentPage === 0}
                    className="nav-button"
                >
                    קודם
                </button>
                <span className="page-indicator">{currentPage + 1} / {Math.max(1, totalPages)}</span>
                <button
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    disabled={currentPage >= totalPages - 1}
                    className="nav-button"
                >
                    הבא
                </button>
            </div>

            <div
                className="building-grid-container"
                ref={gridContainerRef}
                onDragOver={handleContainerDragOver}
                onDragEnd={handleDragEnd} // Add drag end handler to container too
            >
                {/* Left edge indicator */}
                {showLeftIndicator && (
                    <div className="edge-indicator left-edge">
                        <div className="arrow left-arrow"></div>
                        <span>Previous Page</span>
                    </div>
                )}

                <div className="building-grid">
                    {getCurrentBuildings().map((building) => (
                        <div
                            key={building.name}
                            onClick={() => handleBuildingSelect(building.name)}
                            className={`building-item 
                                ${selectedBuilding === building.name ? 'selected' : ''} 
                                ${connectedBuildings?.includes(building.name) ? 'connected' : ''}
                                ${draggedBuilding && draggedBuilding.name === building.name ? 'dragging' : ''}
                                ${dragOverBuilding && dragOverBuilding.name === building.name ? 'drag-over' : ''}`}
                            draggable="true"
                            onDragStart={(e) => handleDragStart(e, building)}
                            onDragEnd={handleDragEnd}
                            onDragOver={(e) => handleBuildingDragOver(e, building)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, building)}
                        >
                            {building.name}
                        </div>
                    ))}
                </div>

                {/* Right edge indicator */}
                {showRightIndicator && (
                    <div className="edge-indicator right-edge">
                        <div className="arrow right-arrow"></div>
                        <span>Next Page</span>
                    </div>
                )}
            </div>

            <div className='add-remove-container'>
                <AddButton
                    itemType="בניין"
                    fields={[
                        {
                            name: 'name',
                            label: 'שם הבניין',
                            type: 'text',
                            required: true,
                            placeholder: 'הכנס שם בניין'
                        },
                    ]}
                    onAdd={async (data) => {
                        await Store.getState().addBuilding(data.name)
                    }}
                />
                {selectedBuilding && (<RemoveButton
                    itemType="בניין"
                    onRemove={async (password) => {
                        const tempSelectedBuilding = selectedBuilding;
                        onBuildingSelect(null);
                        await Store.getState().removeBuilding(tempSelectedBuilding, password);
                    }}
                />)}
                {selectedBuilding && (<EditButton
                    itemType="בניין"
                    fields={[
                        {
                            name: 'name',
                            label: 'שם הבניין',
                            type: 'text',
                            required: true,
                            placeholder: 'הכנס שם בניין'
                        },
                    ]}
                    itemData={{
                        name: selectedBuilding,
                        oldName: selectedBuilding
                    }}
                    onUpdate={async (formData) => {
                        try {
                            const result = await Store.getState().updateBuilding(selectedBuilding, formData.name);
                            if (result.success) {
                                onBuildingSelect(formData.name);
                            }
                            return result;
                        } catch (error) {
                            console.error("Error updating building:", error);
                            return { success: false, error: error.message };
                        }
                    }}
                />)}
            </div>
        </div>
    );
}

export default BuildingGrid;