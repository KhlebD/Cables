import React, { useState, useEffect, useRef } from 'react';
import './styles.css';

function RemoveButton({ itemType, onRemove }) {
    const [isPopupOpen, setIsPopupOpen] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const formRef = useRef(null);
    const buttonRef = useRef(null);

    // Reset error and success when popup closes
    useEffect(() => {
        if (!isPopupOpen) {
            setError('');
            setSuccess('');
        }
    }, [isPopupOpen]);

    // Handle clicks outside the form
    useEffect(() => {
        const handleClickOutside = (event) => {
            // If the form is open and the click is outside both the form and the button
            if (isPopupOpen && formRef.current && buttonRef.current && 
                !formRef.current.contains(event.target) && 
                !buttonRef.current.contains(event.target)) {
                setIsPopupOpen(false);
            }
        };

        // Add event listener when the popup is open
        if (isPopupOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        // Clean up the event listener
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isPopupOpen]);

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
                ref={buttonRef}
                className="remove-button"
                onClick={() => setIsPopupOpen(!isPopupOpen)}
            >
                הסר {itemType}
            </button>
            {isPopupOpen && (
                <div className="form-popup">
                    <div ref={formRef} className="form">
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