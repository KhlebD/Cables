import React, { useState, useEffect } from 'react';
import BuildingGrid from './BuildingGrid';
import BuildingConnections from './BuildingConnections';
import CableDisplay from './CablesDisplay';
import FiberDisplay from './FiberDisplay';
import Store from './Store';
import BoxDisplay from './BoxDisplay';

export default function App() {
    const fetchNetwork = Store(state => state.fetchNetwork);
    const loading = Store(state => state.loading);
    const error = Store(state => state.error);
    const buildings = Store(state => state.buildings);
    
    const [selectedGridBuilding, setSelectedGridBuilding] = useState(null);
    const [selectedConnectBuilding, setSelectedConnectBuilding] = useState(null);
    const [selectedGridCabinet, setSelectedGridCabinet] = useState(null);
    const [selectedConnectCabinet, setSelectedConnectCabinet] = useState(null);
    const [selectedCable, setSelectedCable] = useState(null);
    const [selectedFiber, setSelectedFiber] = useState(null);
    
    useEffect(() => {
        fetchNetwork().then(result => {
        }).catch(err => {
            console.error('❌ fetchNetwork error:', err);
        });
    }, []); // Empty dependency array - only run once on mount

    // Show loading state
    if (loading) {
        return (
            <div className="app-container">
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    height: '100vh',
                    fontSize: '18px'
                }}>
                    טוען נתוני רשת...
                </div>
            </div>
        );
    }

    // Show error state
    if (error) {
        return (
            <div className="app-container">
                <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    height: '100vh',
                    color: 'red'
                }}>
                    <h2>שגיאה בטעינת הנתונים</h2>
                    <p>{error}</p>
                    <button 
                        onClick={() => fetchNetwork()}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: '#2196F3',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        נסה שוב
                    </button>
                </div>
            </div>
        );
    }


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