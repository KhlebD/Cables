import React, { useState, useEffect, useRef } from 'react';
import './styles.css';

function RemoveButton({ itemType, onRemove }) {
    const [isPopupOpen, setIsPopupOpen] = useState(false);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const formRef = useRef(null);
    const buttonRef = useRef(null);

    useEffect(() => {
        if (!isPopupOpen) {
            setError('');
            setSuccess('');
            setPassword('');
        }
    }, [isPopupOpen]);

    // close when click outside form
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (isPopupOpen && formRef.current && buttonRef.current &&
                !formRef.current.contains(event.target) &&
                !buttonRef.current.contains(event.target)) {
                setIsPopupOpen(false);
            }
        };

        if (isPopupOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isPopupOpen]);

    const handleRemove = async () => {
        if (!password.trim()) {
            setError('יש להכניס סיסמת מנהל');
            return;
        }

        try {
            // Verify password first
            const verifyResponse = await fetch('http://localhost:5001/auth/verify-admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });

            if (!verifyResponse.ok) {
                setError('סיסמה שגויה');
                return;
            }

            await onRemove(password);
            setSuccess(`${itemType} removed successfully!`);
            setTimeout(() => {
                setIsPopupOpen(false);
                setSuccess('');
                setPassword('');
            }, 1500);
        } catch (error) {
            setError(error.message);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleRemove();
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
                        <p>האם אתה בטוח שברצונך להסיר את ה{itemType}? </p>
                        {(itemType === "בניין" || itemType === "ארון") && (
                            <p style={{ color: 'red' }}>
                                כל המידע תחת {itemType} זה ימחק לצמיתות כולל ארונות, פאנלים וחיבורים ביניהם!
                            </p>
                        )}
                        
                        {/* Password Input */}
                        <div className="form-group">
                            <label>סיסמת מנהל:</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="הכנס סיסמת מנהל"
                                autoFocus
                            />
                        </div>

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