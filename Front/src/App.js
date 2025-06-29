import React, { useState, useEffect } from 'react';
import BuildingGrid from './BuildingGrid';
import BuildingConnections from './BuildingConnections';
import CableDisplay from './CablesDisplay';
import FiberDisplay from './FiberDisplay';

import Store from './Store';
import BoxDisplay from './BoxDisplay';

export default function App() {
    const fetchNetwork = Store(state => state.fetchNetwork);
    useEffect(() => {
        fetchNetwork();
    }, []);

    const [selectedGridBuilding, setSelectedGridBuilding] = useState(null);
    const [selectedConnectBuilding, setSelectedConnectBuilding] = useState(null);
    const [selectedGridCabinet, setSelectedGridCabinet] = useState(null);
    const [selectedConnectCabinet, setSelectedConnectCabinet] = useState(null);
    const [selectedCable, setSelectedCable] = useState(null);
    const [selectedFiber, setSelectedFiber] = useState(null);

    
    return (
        <div className="app-container">
            <div className="top-section">
                <div className="left-section">
                <BuildingConnections
                        onBuildingSelect={setSelectedGridBuilding}
                        onCableSelect={setSelectedCable}
                        selectedConnectBuilding={selectedGridBuilding}
                        selectedCabinet={selectedGridCabinet}
                        onCabinetSelect={setSelectedGridCabinet}
                        filterBy={selectedConnectBuilding}
                        filterByCabinet={selectedConnectCabinet}
                    />
                </div>
                <div className="right-section">
                    <BuildingConnections
                        onBuildingSelect={setSelectedConnectBuilding}
                        onCableSelect={setSelectedCable}
                        selectedConnectBuilding={selectedConnectBuilding}
                        selectedCabinet={selectedConnectCabinet}
                        onCabinetSelect={setSelectedConnectCabinet}
                        filterBy={selectedGridBuilding} 
                        filterByCabinet={selectedGridCabinet}
                    />
                </div>
            </div>
            <div>
                <BoxDisplay
                    leftBuilding={selectedGridBuilding}
                    rightBuilding={selectedConnectBuilding}
                    selectedCable={selectedCable}
                    onCableSelect={setSelectedCable}
                    selectedLeftCabinet={selectedGridCabinet}   
                    selectedRightCabinet={selectedConnectCabinet} 
                />
                <FiberDisplay
                    selectedCable={selectedCable}
                    selectedFiber={selectedFiber}
                    onFiberClick={setSelectedFiber}
                /> 
            </div>


        </div>
    )
};
