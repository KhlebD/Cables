import React, { useState, useEffect } from 'react';
import BuildingConnections from './BuildingConnections';
import FiberDisplay from './FiberDisplay';
import Store from './Store';
import BoxDisplay from './BoxDisplay';

export default function App() {
    const fetchNetwork = Store(state => state.fetchNetwork);
    
    const [selectedGridBuilding, setSelectedGridBuilding] = useState(null);
    const [selectedConnectBuilding, setSelectedConnectBuilding] = useState(null);
    const [selectedGridCabinet, setSelectedGridCabinet] = useState(null);
    const [selectedConnectCabinet, setSelectedConnectCabinet] = useState(null);
    const [selectedCable, setSelectedCable] = useState(null);
    const [selectedFiber, setSelectedFiber] = useState(null);
    const [selectedLeftPort, setSelectedLeftPort] = useState(null);
    const [selectedRightPort, setSelectedRightPort] = useState(null);
    
    useEffect(() => {
        fetchNetwork().then(result => {
        }).catch(err => {
            console.error('❌ fetchNetwork error:', err);
        });
    }, []); // Empty dependency array - only run once on mount

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
                        onLeftPortSelect={setSelectedLeftPort}
                        onRightPortSelect={setSelectedRightPort}
                        onFiberSelect= {setSelectedFiber}
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
                        onLeftPortSelect={setSelectedLeftPort}
                        onRightPortSelect={setSelectedRightPort}
                        onFiberSelect= {setSelectedFiber}
                    />
                </div>
            </div>
            <div className="box-fiber-page">
                <BoxDisplay
                    leftBuilding={selectedGridBuilding}
                    rightBuilding={selectedConnectBuilding}
                    selectedCable={selectedCable}
                    onCableSelect={setSelectedCable}
                    selectedLeftCabinet={selectedGridCabinet}  
                    selectedRightCabinet={selectedConnectCabinet}
                    selectedLeftPort = {selectedLeftPort}
                    selectedRightPort = {selectedRightPort}
                    onLeftBuildingSelect = {setSelectedGridBuilding}
                    onRightBuildingSelect = {setSelectedConnectBuilding}
                    onLeftCabinetSelect = {setSelectedGridCabinet}
                    onRightCabinetSelect = {setSelectedConnectCabinet}
                    onLeftPortSelect = {setSelectedLeftPort}
                    onRightPortSelect = {setSelectedRightPort}
                    onFiberSelect= {setSelectedFiber}
                />
                <FiberDisplay
                    selectedCable={selectedCable}
                    selectedFiber={selectedFiber}
                    onFiberSelect={setSelectedFiber}
                    onLeftPortSelect = {setSelectedLeftPort}
                    onRightPortSelect = {setSelectedRightPort}
                />
            </div>
        </div>
    )
};