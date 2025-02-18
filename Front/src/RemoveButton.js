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
                הסר {itemType}
            </button>

            {isPopupOpen && (
                <div className="form-popup">
                    <div className="form">
                        <h3>הסר {itemType}</h3>
                        <p>האם אתה בטוח שברצנוך להסיר את ה{itemType}? כל המידע הנכלל ימחק לצמיתות</p>
                        
                        {error && <div className="error-message">{error}</div>}
                        {success && <div className="success-message">{success}</div>}

                        <div className="form-actions">
                            <button 
                                className="confirm-remove-button"
                                onClick={handleRemove}
                            >
                                הסר
                            </button>
                            <button 
                                className="cancel-button"
                                onClick={() => setIsPopupOpen(false)}
                            >
                                ביטול
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default RemoveButton;