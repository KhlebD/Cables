import React, { useState } from 'react';
import './styles.css'; 

function RemoveButton({ itemType, onRemove }) {
    const [isPopupOpen, setIsPopupOpen] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleRemove = async () => {
        try {
            await onRemove();
            setSuccess(`${itemType} removed successfully!`);
            setTimeout(() => {
                setIsPopupOpen(false);
                setSuccess('');
            }, 3000);
        } catch (error) {
            setError(error.message);
        }
    };

    return (
        <div className="add-building-container">
            <button 
                className="remove-button"
                onClick={() => setIsPopupOpen(!isPopupOpen)}
            >
                Remove {itemType}
            </button>

            {isPopupOpen && (
                <div className="form-popup">
                    <div className="form">
                        <h3>Remove {itemType}</h3>
                        <p>Are you sure you want to remove this {itemType}? This action CANNOT be undone!</p>
                        
                        {error && <div className="error-message">{error}</div>}
                        {success && <div className="success-message">{success}</div>}

                        <div className="form-actions">
                            <button 
                                className="confirm-remove-button"
                                onClick={handleRemove}
                            >
                                Confirm Remove
                            </button>
                            <button 
                                className="cancel-button"
                                onClick={() => setIsPopupOpen(false)}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default RemoveButton;