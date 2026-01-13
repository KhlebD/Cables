import React, { useState, useEffect, useRef } from 'react';
import './base.css';
import './components.css';
import './networkDisplay.css';

function AddButton({ itemType, fields, onAdd, initialValues = {} }) {
    const [isPopupOpen, setIsPopupOpen] = useState(false);
    const [formData, setFormData] = useState(initialValues);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const formRef = useRef(null);
    const buttonRef = useRef(null);

    const prevInitialValuesRef = useRef(initialValues);

    useEffect(() => {
        if (!isPopupOpen) {
            setFormData(initialValues);
            setError('');
            setSuccess('');
        }
    }, [isPopupOpen]);

    useEffect(() => {
        const hasChanged = JSON.stringify(prevInitialValuesRef.current) !== JSON.stringify(initialValues);

        if (hasChanged) {
            setFormData(initialValues);
            prevInitialValuesRef.current = initialValues;
        }
    }, [initialValues]);

    // close when click outside form
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (isPopupOpen && formRef.current && buttonRef.current &&
                !formRef.current.contains(e.target) &&
                !buttonRef.current.contains(e.target)) {
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
            await onAdd(formData);
            setSuccess(`${itemType} added successfully!`);
            setFormData(initialValues); 
            setTimeout(() => {
                setIsPopupOpen(false);
                setSuccess('');
            }, 1500);
        } catch (error) {
            setError(error.message);
        }
    };

    // options for field
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
                className="add-button"
                onClick={() => setIsPopupOpen(!isPopupOpen)}
            >
                {itemType.includes('רשת') ? 'עדכן' : 'הוסף'} {itemType}
            </button>

            {isPopupOpen && (
                <div className="form-popup">
                    <form ref={formRef} onSubmit={handleSubmit} className="form">
                        <h3>{itemType.includes('רשת') ? 'עדכן' : 'הוסף'} {itemType}</h3>

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