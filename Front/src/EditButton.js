import React, { useState, useEffect, useRef } from 'react';
import './base.css';
import './components.css';
import './networkDisplay.css';

function EditButton({ itemType, fields, onUpdate, itemData }) {
    const [isPopupOpen, setIsPopupOpen] = useState(false);
    const [formData, setFormData] = useState({});
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const formRef = useRef(null);
    const buttonRef = useRef(null);

    useEffect(() => {
        if (itemData) {
            setFormData(itemData);
        }
    }, [itemData]);

    useEffect(() => {
        if (!isPopupOpen) {
            setError('');
            setSuccess('');
            setFormData({});
        }
    }, [isPopupOpen]);

    // close when click outside form
    useEffect(() => {
        const handleClickOutside = (event) => {n
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await onUpdate(formData);
            setSuccess(`${itemType} עודכן בהצלחה!`);
            setTimeout(() => {
                setIsPopupOpen(false);
            }, 1500);
        } catch (error) {
            setError(error.message || 'עדכון נכשל');
        }
    };

    // Get options for field
    const getFieldOptions = (field) => {
        if (typeof field.options === 'function') 
            return field.options(formData);
        
        return field.options;
    };

    const handleInputChange = (fieldName, value) => {
        const newFormData = {
            ...formData,
            [fieldName]: value
        };

        // Clear any fields that depend on this one
        fields.forEach(field => {
            if (field.dependsOn?.includes(fieldName)) {
                newFormData[field.name] = '';
            }
        });

        setFormData(newFormData);
        setError('');
    };

    return (
        <div className="add-building-container">
            <button 
                ref={buttonRef}
                className="edit-button"
                onClick={() => setIsPopupOpen(!isPopupOpen)}
            >
                ערוך {itemType}
            </button>

            {isPopupOpen && (
                <div className="form-popup" style={{ position: 'absolute', top: '100%', left: '0' }}>
                    <form ref={formRef} onSubmit={handleSubmit} className="form">
                        <h3>ערוך {itemType}</h3>
                        
                        {fields.map(field => (
                            <div key={field.name} className="form-group">
                                <label>{field.label}</label>
                                {field.type === 'select' ? (
                                    <select
                                        value={formData[field.name] || ''}
                                        onChange={(e) => handleInputChange(field.name, e.target.value)}
                                        required={field.required}
                                        disabled={field.readOnly}
                                    >
                                        <option value="">בחר {field.label}</option>
                                        {getFieldOptions(field).map(option => (
                                            <option key={option} value={option}>
                                                {option}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        type={field.type}
                                        value={formData[field.name] || ''}
                                        onChange={(e) => handleInputChange(field.name, e.target.value)}
                                        required={field.required}
                                        placeholder={field.placeholder}
                                        disabled={field.readOnly}
                                    />
                                )}
                            </div>
                        ))}

                        {error && <div className="error-message">{error}</div>}
                        {success && <div className="success-message">{success}</div>}

                        <div className="form-actions">
                            <button type="submit" className="submit-button">
                                עדכן {itemType}
                            </button>
                            <button 
                                type="button" 
                                className="cancel-button"
                                onClick={() => setIsPopupOpen(false)}
                            >
                                ביטול
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}

export default EditButton;