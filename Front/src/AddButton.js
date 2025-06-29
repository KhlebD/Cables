import React, { useState, useEffect, useRef } from 'react';
import './styles.css'; 

function AddButton({ itemType, fields, onAdd, initialValues = {} }){
    const [isPopupOpen, setIsPopupOpen] = useState(false);
    const [formData, setFormData] = useState(initialValues);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const formRef = useRef(null);
    const buttonRef = useRef(null);

    // Reset form data when popup closes
    useEffect(() => {
        if (!isPopupOpen) {
            setFormData(initialValues);
            setError('');
            setSuccess('');
        }
    }, [isPopupOpen, initialValues]);

    // Handle clicks outside the form
    useEffect(() => {
        const handleClickOutside = (e) => {
            // If the form is open and the click is outside both the form and the button
            if (isPopupOpen && formRef.current && buttonRef.current && 
                !formRef.current.contains(e.target) && 
                !buttonRef.current.contains(e.target)) {
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await onAdd(formData);
            setSuccess(`${itemType} added successfully!`);
            setFormData({});  // Clear form
            setTimeout(() => {
                setIsPopupOpen(false);
                setSuccess('');
            }, 1500);
        } catch (error) {
            setError(error.message);
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
        <div className="add-building-container">
            <button 
                ref={buttonRef}
                className="add-button"
                onClick={() => setIsPopupOpen(!isPopupOpen)}
            >
                הוסף {itemType}  
            </button>

            {isPopupOpen && (
                <div className="form-popup">
                    <form ref={formRef} onSubmit={handleSubmit} className="form">
                        <h3>הוסף {itemType}</h3>
                        
                        {fields.map(field => (
                            <div key={field.name} className="form-group">
                                <label>{field.label}</label>
                                {field.type === 'select' ? (
                                    <select
                                        value={formData[field.name] || ''}
                                        onChange={(e) => handleInputChange(field.name, e.target.value)}
                                        required={field.required}
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
                                    />
                                )}
                            </div>
                        ))}

                        {error && <div className="error-message">{error}</div>}
                        {success && <div className="success-message">{success}</div>}

                        <div className="form-actions">
                            <button type="submit" className="submit-button">
                                הוסף {itemType}
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

export default AddButton;