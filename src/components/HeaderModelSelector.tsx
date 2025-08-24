

import React, { useState, useRef, useEffect } from 'react';
import { Model } from '../types';
import { ChevronDown } from 'lucide-react';

interface HeaderModelSelectorProps {
  selectedModel: Model;
  setSelectedModel: (model: Model) => void;
  modelOptions: { value: Model; label: string }[];
}

export const HeaderModelSelector: React.FC<HeaderModelSelectorProps> = ({
  selectedModel,
  setSelectedModel,
  modelOptions,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const selectedLabel = modelOptions.find(opt => opt.value === selectedModel)?.label || selectedModel;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-[19.5rem] flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown
          className={`h-4 w-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>
      {isOpen && (
        <div className="absolute z-10 top-full mt-1 w-[19.5rem] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-80 overflow-y-auto hover-scrollbar [scrollbar-gutter:stable]" role="listbox">
          {modelOptions.map(option => (
            <div
              key={option.value}
              onClick={() => {
                setSelectedModel(option.value);
                setIsOpen(false);
              }}
              className={`flex items-center justify-between px-3 py-2 text-sm text-gray-800 dark:text-gray-300 cursor-pointer ${
                option.value === selectedModel
                  ? 'bg-gray-100 dark:bg-gray-800 font-medium'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
              role="option"
              aria-selected={option.value === selectedModel}
            >
              <span className="truncate">{option.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};