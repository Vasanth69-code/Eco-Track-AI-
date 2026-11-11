import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Search, Loader2, Navigation, Check, Globe } from 'lucide-react';
import { getPlaceSuggestions } from '../../services/authService';

const PlaceAutocompleteInput = ({
  label,
  value,
  onChange,
  onSelect,
  placeholder = 'Type 3 letters (e.g. Mys, Del, Mum)...',
  required = false,
  testId = 'autocomplete-input',
  accentColor = 'primary', // 'primary' | 'secondary'
  tooltip,
  rightAction,
}) => {
  const [query, setQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const wrapperRef = useRef(null);
  const debounceTimerRef = useRef(null);

  // Sync external value changes (e.g. Quick Routes or GPS)
  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch real suggestions when user types >= 3 characters
  const handleInputChange = (e) => {
    const text = e.target.value;
    setQuery(text);
    onChange(text);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!text || text.trim().length < 3) {
      setSuggestions([]);
      setIsOpen(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const results = await getPlaceSuggestions(text.trim());
        setSuggestions(results);
        setIsOpen(results.length > 0);
        setSelectedIndex(-1);
      } catch (err) {
        console.warn('Autocomplete fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    }, 250);
  };

  const handleSelectSuggestion = (item) => {
    const selectedText = item.displayName || item.name;
    setQuery(selectedText);
    onChange(selectedText);
    if (onSelect) onSelect(item);
    setIsOpen(false);
    setSuggestions([]);
  };

  const handleKeyDown = (e) => {
    if (!isOpen || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        e.preventDefault();
        handleSelectSuggestion(suggestions[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const borderFocusClass =
    accentColor === 'secondary'
      ? 'focus:border-secondary focus:ring-secondary/30'
      : 'focus:border-primary focus:ring-primary/30';
  const iconColorClass = accentColor === 'secondary' ? 'text-secondary' : 'text-primary';

  return (
    <div ref={wrapperRef} className="relative w-full">
      {label && (
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-xs font-medium dark:text-dark-muted text-light-muted uppercase tracking-wide">
            {label}
          </label>
          {tooltip && (
            <span className="text-[11px] text-slate-400 font-normal">{tooltip}</span>
          )}
        </div>
      )}

      <div className="relative">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
          {isLoading ? (
            <Loader2 className={`w-4 h-4 ${iconColorClass} animate-spin`} />
          ) : (
            <MapPin className={`w-4 h-4 ${iconColorClass}`} />
          )}
        </div>

        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          className={`w-full pl-10 pr-12 py-3 rounded-xl border dark:border-dark-border border-light-border dark:bg-dark-highlight bg-light-highlight dark:text-dark-text text-light-text text-sm focus:outline-none focus:ring-1 transition-all ${borderFocusClass}`}
          data-testid={testId}
          required={required}
          autoComplete="off"
        />

        {rightAction && (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center">
            {rightAction}
          </div>
        )}
      </div>

      {/* Google Maps Style Autocomplete Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-50 dark:bg-dark-surface bg-white border dark:border-dark-border border-light-border rounded-xl shadow-2xl overflow-hidden backdrop-blur-md animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="px-3 py-1.5 bg-dark-bg/40 border-b dark:border-dark-border/60 border-light-border/60 flex items-center justify-between text-[10px] font-semibold tracking-wider uppercase text-slate-400">
            <span className="flex items-center gap-1">
              <Globe className="w-3 h-3 text-primary" /> Real OpenStreetMap Locations
            </span>
            <span className="text-[9px] text-primary lowercase font-mono">live typeahead</span>
          </div>

          <ul className="max-h-60 overflow-y-auto divide-y dark:divide-dark-border/40 divide-light-border/40">
            {suggestions.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <li
                  key={item.id || index}
                  onClick={() => handleSelectSuggestion(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`px-3.5 py-2.5 flex items-start gap-3 cursor-pointer transition-colors ${
                    isSelected
                      ? 'dark:bg-primary/15 bg-primary/10 text-primary'
                      : 'hover:dark:bg-dark-highlight hover:bg-light-highlight'
                  }`}
                  data-testid={`suggestion-item-${index}`}
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      isSelected
                        ? 'bg-primary/20 text-primary'
                        : 'dark:bg-dark-highlight bg-light-highlight dark:text-dark-muted text-light-muted'
                    }`}
                  >
                    <MapPin className="w-3.5 h-3.5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold dark:text-dark-text text-light-text truncate">
                        {item.name}
                      </p>
                      {item.type && (
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-dark-bg/60 text-slate-400 flex-shrink-0">
                          {item.type}
                        </span>
                      )}
                    </div>
                    {item.secondaryText && (
                      <p className="text-xs dark:text-dark-muted text-light-muted truncate mt-0.5">
                        {item.secondaryText}
                      </p>
                    )}
                  </div>

                  {isSelected && (
                    <Check className="w-4 h-4 text-primary flex-shrink-0 mt-1" />
                  )}
                </li>
              );
            })}
          </ul>

          <div className="px-3 py-1 bg-dark-bg/60 text-[10px] text-slate-500 flex items-center justify-between border-t dark:border-dark-border/40 border-light-border/40">
            <span>Use ↑↓ arrows and Enter to select</span>
            <span>Esc to close</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlaceAutocompleteInput;
