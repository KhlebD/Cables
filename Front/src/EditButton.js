import React, { useState, useEffect } from 'react';
import './styles.css'; 

function EditButton({ itemType, fields, onUpdate, itemData }) {
    const [isPopupOpen, setIsPopupOpen] = useState(false);
    const [formData, setFormData] = useState({});
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Initialize form data with existing item data when component mounts or itemData changes
    useEffect(() => {
        if (itemData) {
            setFormData(itemData);
        }
    }, [itemData]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await onUpdate(formData);
            setSuccess(`${itemType} עודכן בהצלחה!`);
            setTimeout(() => {
                setIsPopupOpen(false);
                setSuccess('');
            }, 3000);
        } catch (error) {
            setError(error.message || 'עדכון נכשל');
        }
    };

    // Get options for a field
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
                // Reset dependent fields
                newFormData[field.name] = '';
            }
        });

        setFormData(newFormData);
        setError('');
    };

    return (
        <div className="edit-item-container">
            <button 
                className="edit-button"
                onClick={() => setIsPopupOpen(!isPopupOpen)}
            >
                ערוך {itemType}
            </button>

            {isPopupOpen && (
                <div className="form-popup">
                    <form onSubmit={handleSubmit} className="form">
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