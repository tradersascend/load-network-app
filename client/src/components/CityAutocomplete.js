import React, { useState, useEffect, useRef } from 'react';
import loadService from '../services/loadService';

const CityAutocomplete = ({ 
    value, 
    onChange, 
    placeholder = "Enter city name", 
    className = "",
    name = "city"
}) => {
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [loading, setLoading] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const inputRef = useRef(null);
    const suggestionsRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchSuggestions = async (query) => {
        if (query.length < 2) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        setLoading(true);
        try {
            const response = await loadService.getCitySuggestions(query);
            setSuggestions(response.data.suggestions || []);
            setShowSuggestions(true);
            setHighlightedIndex(-1);
        } catch (error) {
            console.error('Error fetching city suggestions:', error);
            setSuggestions([]);
            setShowSuggestions(false);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const newValue = e.target.value;
        onChange(newValue);
        
       
        const timeoutId = setTimeout(() => {
            fetchSuggestions(newValue);
        }, 300);

        return () => clearTimeout(timeoutId);
    };

    const handleSuggestionClick = (suggestion) => {
        onChange(suggestion.description);
        setShowSuggestions(false);
        setSuggestions([]);
    };

    const handleKeyDown = (e) => {
        if (!showSuggestions || suggestions.length === 0) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setHighlightedIndex(prev => 
                    prev < suggestions.length - 1 ? prev + 1 : 0
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setHighlightedIndex(prev => 
                    prev > 0 ? prev - 1 : suggestions.length - 1
                );
                break;
            case 'Enter':
                e.preventDefault();
                if (highlightedIndex >= 0) {
                    handleSuggestionClick(suggestions[highlightedIndex]);
                }
                break;
            case 'Escape':
                setShowSuggestions(false);
                setHighlightedIndex(-1);
                break;
        }
    };

    return (
        <div className="relative" ref={suggestionsRef}>
            <input
                ref={inputRef}
                type="text"
                name={name}
                value={value}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${className}`}
                autoComplete="off"
            />
            
            {loading && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                </div>
            )}

            {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {suggestions.map((suggestion, index) => (
                        <div
                            key={suggestion.place_id}
                            className={`px-3 py-2 cursor-pointer hover:bg-gray-100 ${
                                index === highlightedIndex ? 'bg-blue-100' : ''
                            }`}
                            onClick={() => handleSuggestionClick(suggestion)}
                            onMouseEnter={() => setHighlightedIndex(index)}
                        >
                            <div className="font-medium text-gray-900">
                                {suggestion.main_text}
                            </div>
                            <div className="text-sm text-gray-500">
                                {suggestion.secondary_text}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showSuggestions && suggestions.length === 0 && !loading && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                    <div className="px-3 py-2 text-gray-500 text-sm">
                        No cities found
                    </div>
                </div>
            )}
        </div>
    );
};

export default CityAutocomplete;