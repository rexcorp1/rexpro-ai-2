import React, { useState, useRef, useEffect } from 'react';
import { Model, MediaResolution } from '../types';
import { ChevronDown } from 'lucide-react';

interface SidebarProps {
  selectedModel: Model;
  setSelectedModel: (model: Model) => void;
  isSidebarOpen: boolean;
  modelOptions: { value: Model; label: string }[];
  systemInstruction: string;
  setSystemInstruction: (instruction: string) => void;
  temperature: number;
  setTemperature: (temp: number) => void;
  topP: number;
  setTopP: (topP: number) => void;
  maxOutputTokens: number;
  setMaxOutputTokens: (tokens: number) => void;
  stopSequence: string;
  setStopSequence: (seq: string) => void;
  tokenCount: number;
  modelMaxTokens: number;
  mediaResolution: MediaResolution;
  setMediaResolution: (resolution: MediaResolution) => void;
  useThinking: boolean;
  setUseThinking: (enabled: boolean) => void;
  useThinkingBudget: boolean;
  setUseThinkingBudget: (enabled: boolean) => void;
  thinkingBudget: number;
  setThinkingBudget: (budget: number) => void;
  
  useStructuredOutput: boolean;
  setUseStructuredOutput: (enabled: boolean) => void;
  openSchemaModal: () => void;
  
  useCodeExecution: boolean;
  setUseCodeExecution: (enabled: boolean) => void;

  useFunctionCalling: boolean;
  setUseFunctionCalling: (enabled: boolean) => void;
  openFunctionModal: () => void;

  useGoogleSearch: boolean;
  setUseGoogleSearch: (use: boolean) => void;

  useUrlContext: boolean;
  setUseUrlContext: (enabled: boolean) => void;
  urlContext: string;
  setUrlContext: (url: string) => void;
  isMobile: boolean;
}

const Dropdown: React.FC<{
  label: string;
  options: { value: string; label: string }[];
  selectedValue: string;
  onSelect: (value: string) => void;
  disabled?: boolean;
}> = ({ label, options, selectedValue, onSelect, disabled = false }) => {
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

  const selectedLabel = options.find(opt => opt.value === selectedValue)?.label || selectedValue;

  return (
    <div className="mb-4 relative" ref={dropdownRef}>
      <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block px-1">{label}</label>
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg ${
          disabled
            ? 'bg-gray-50 dark:bg-gray-800 cursor-not-allowed'
            : 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer'
        }`}
        disabled={disabled}
      >
        <span className={`text-sm truncate ${disabled ? 'text-gray-500' : 'text-gray-800 dark:text-gray-200'}`}>{selectedLabel}</span>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && !disabled && (
        <div className="absolute z-10 top-full mt-1 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto hover-scrollbar [scrollbar-gutter:stable]">
          {options.map(option => (
            <div
              key={option.value}
              onClick={() => {
                onSelect(option.value);
                setIsOpen(false);
              }}
              className="px-3 py-2 text-sm text-gray-800 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer truncate"
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const CollapsibleSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center mb-4">
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{title}</h3>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && <div className="space-y-4">{children}</div>}
    </div>
  );
};

const SliderInput: React.FC<{
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
}> = ({ label, value, onChange, min, max, step }) => (
  <div>
    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex justify-between items-center">
      <span>{label}</span>
    </label>
    <div className="flex items-center gap-2 mt-2">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
      />
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-20 p-1 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 rounded-lg text-sm text-center"
      />
    </div>
  </div>
);

const ToggleSwitch: React.FC<{
    label: string;
    enabled: boolean;
    onToggle: (enabled: boolean) => void;
    description?: React.ReactNode;
    disabled?: boolean;
}> = ({ label, enabled, onToggle, description, disabled = false }) => (
    <div className="flex items-center justify-between">
        <div>
            <span className={`text-sm font-medium ${disabled ? 'text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'}`}>{label}</span>
            {description && <div className="text-xs text-gray-500 dark:text-gray-400">{description}</div>}
        </div>
        <button
            type="button"
            onClick={() => !disabled && onToggle(!enabled)}
            className={`${
                enabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
            } relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            role="switch"
            aria-checked={enabled}
            disabled={disabled}
        >
            <span
                aria-hidden="true"
                className={`${
                    enabled ? 'translate-x-5' : 'translate-x-0'
                } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
            />
        </button>
    </div>
);


export const Sidebar: React.FC<SidebarProps> = ({
  selectedModel,
  setSelectedModel,
  isSidebarOpen,
  modelOptions,
  systemInstruction,
  setSystemInstruction,
  temperature,
  setTemperature,
  topP,
  setTopP,
  maxOutputTokens,
  setMaxOutputTokens,
  stopSequence,
  setStopSequence,
  tokenCount,
  modelMaxTokens,
  mediaResolution,
  setMediaResolution,
  useThinking,
  setUseThinking,
  useThinkingBudget,
  setUseThinkingBudget,
  thinkingBudget,
  setThinkingBudget,
  useStructuredOutput,
  setUseStructuredOutput,
  openSchemaModal,
  useCodeExecution,
  setUseCodeExecution,
  useFunctionCalling,
  setUseFunctionCalling,
  openFunctionModal,
  useGoogleSearch,
  setUseGoogleSearch,
  useUrlContext,
  setUseUrlContext,
  urlContext,
  setUrlContext,
  isMobile,
}) => {
  const mediaResolutionOptions = [
    { value: MediaResolution.DEFAULT, label: 'Default' },
    { value: MediaResolution.LOW, label: 'Low' },
    { value: MediaResolution.MEDIUM, label: 'Medium' },
    { value: MediaResolution.HIGH, label: 'High (Zoomed Reframing)' },
  ];
  
  const isGemmaModel = selectedModel.startsWith('gemma');
  const isImageGenModel = selectedModel === Model.GEMINI_2_0_FLASH_PREVIEW_IMAGE_GENERATION;
  const isThinkingModel = [Model.GEMINI_2_5_PRO, Model.GEMINI_2_5_FLASH, Model.GEMINI_2_5_FLASH_LITE].includes(selectedModel);
  const isProModel = selectedModel === Model.GEMINI_2_5_PRO;
  const maxThinkingBudget = isProModel ? 32768 : 24576;

  return (
    <aside className={`
      bg-white dark:bg-gray-900 flex-shrink-0 overflow-hidden
      ${ isMobile
        ? `fixed inset-y-0 right-0 z-30 w-[320px] border-l border-gray-200 dark:border-gray-700 shadow-lg transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`
        : `border-gray-200 dark:border-gray-700 rounded-lg transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-[320px] border ml-4' : 'w-0 border-none'}`
      }
    `}>
      <div className={`
        p-4 w-[320px] transition-opacity duration-150 ease-in-out overflow-y-auto h-full hover-scrollbar [scrollbar-gutter:stable]
        ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}
      `}>
        {isImageGenModel ? (
          <div className="px-1">
            <Dropdown
              label="MODELS"
              options={modelOptions}
              selectedValue={selectedModel}
              onSelect={(val) => setSelectedModel(val as Model)}
            />
            
            <div className="mb-4">
               <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block px-1">Output format</label>
               <div className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <span className="text-sm text-gray-800 dark:text-gray-200">Images & text</span>
               </div>
            </div>
  
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4 space-y-4">
              <div className="flex justify-between items-center text-sm text-gray-700 dark:text-gray-300">
                  <span>Token count</span>
                  <span className="text-gray-500 dark:text-gray-400">{tokenCount.toLocaleString()} / {modelMaxTokens.toLocaleString()}</span>
              </div>
  
              <SliderInput
                  label="Temperature"
                  value={temperature}
                  onChange={setTemperature}
                  min={0} max={2} step={0.01}
              />
            </div>
  
            <CollapsibleSection title="Advanced settings">
                <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700 dark:text-gray-300">Safety settings</span>
                    <button className="text-blue-600 dark:text-blue-500 hover:underline">Edit</button>
                </div>
                <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">Add stop sequence</label>
                    <input
                        type="text"
                        value={stopSequence}
                        onChange={e => setStopSequence(e.target.value)}
                        placeholder="Add stop..."
                        className="w-full p-2 border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 rounded-lg text-sm"
                    />
                </div>
                <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">Output length</label>
                    <input
                        type="number"
                        value={maxOutputTokens}
                        onChange={e => setMaxOutputTokens(parseInt(e.target.value, 10))}
                        className="w-full p-2 border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 rounded-lg text-sm"
                    />
                </div>
                <SliderInput
                    label="Top P"
                    value={topP}
                    onChange={setTopP}
                    min={0} max={1} step={0.01}
                />
            </CollapsibleSection>
          </div>
        ) : (
          <div className="px-1">
            <Dropdown
              label="MODELS"
              options={modelOptions}
              selectedValue={selectedModel}
              onSelect={(val) => setSelectedModel(val as Model)}
            />
            <div className="mb-4">
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block px-1">
                System Instruction
              </label>
              <textarea
                value={systemInstruction}
                onChange={(e) => setSystemInstruction(e.target.value)}
                placeholder={isGemmaModel ? "Not available for Gemma models" : "You are a helpful assistant."}
                rows={1}
                className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y min-h-[46px] align-middle disabled:cursor-not-allowed disabled:bg-gray-50 dark:disabled:bg-gray-800/50"
                aria-label="System Instruction"
                disabled={isGemmaModel}
              />
              {isGemmaModel && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 px-1">
                  System instructions are not supported for Gemma models.
                </p>
              )}
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4 space-y-4">
              <div className="flex justify-between items-center text-sm text-gray-700 dark:text-gray-300">
                  <span>Token count</span>
                  <span className="text-gray-500 dark:text-gray-400">{tokenCount.toLocaleString()} / {modelMaxTokens.toLocaleString()}</span>
              </div>

              <SliderInput
                  label="Temperature"
                  value={temperature}
                  onChange={setTemperature}
                  min={0} max={2} step={0.01}
              />

              <Dropdown
                label="Media resolution"
                options={mediaResolutionOptions}
                selectedValue={mediaResolution}
                onSelect={(val) => setMediaResolution(val as MediaResolution)}
              />
            </div>

            {isThinkingModel && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4 space-y-4">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-1">Thinking</h3>
                <ToggleSwitch 
                  label="Thinking"
                  enabled={isProModel || useThinking}
                  onToggle={setUseThinking}
                  disabled={isProModel}
                />
                {(isProModel || useThinking) && (
                  <>
                    <ToggleSwitch 
                      label="Set thinking budget"
                      enabled={useThinkingBudget}
                      onToggle={setUseThinkingBudget}
                    />
                    {useThinkingBudget && (
                      <SliderInput
                        label="Thinking budget"
                        value={thinkingBudget}
                        onChange={setThinkingBudget}
                        min={0}
                        max={maxThinkingBudget}
                        step={1}
                      />
                    )}
                  </>
                )}
              </div>
            )}

            <CollapsibleSection title="Tools">
              <ToggleSwitch 
                  label="Structured output" 
                  enabled={useStructuredOutput}
                  onToggle={setUseStructuredOutput}
                  disabled={useGoogleSearch}
                  description={
                      <>
                          <button onClick={openSchemaModal} className="text-xs text-blue-600 dark:text-blue-500 hover:underline disabled:text-gray-400 disabled:no-underline disabled:cursor-not-allowed" disabled={!useStructuredOutput}>Edit</button>
                          {useGoogleSearch && <span className="text-xs text-gray-500 ml-2">(Unavailable with Google Search)</span>}
                      </>
                  }
              />
              <ToggleSwitch label="Code execution" enabled={useCodeExecution} onToggle={setUseCodeExecution} />
              <ToggleSwitch 
                  label="Function calling"
                  enabled={useFunctionCalling}
                  onToggle={setUseFunctionCalling}
                  description={<button onClick={openFunctionModal} className="text-xs text-blue-600 dark:text-blue-500 hover:underline disabled:text-gray-400 disabled:no-underline disabled:cursor-not-allowed" disabled={!useFunctionCalling}>Edit</button>}
              />
              <div>
                <ToggleSwitch
                    label="Grounding with Google Search"
                    enabled={useGoogleSearch}
                    onToggle={setUseGoogleSearch}
                    description={<span className="inline-flex items-center">Source: <img src="https://www.google.com/favicon.ico" alt="Google icon" className="w-3 h-3 mx-1"/> Google Search</span>}
                />
                <div className="mt-4">
                  <ToggleSwitch 
                      label="URL context"
                      enabled={useUrlContext}
                      onToggle={setUseUrlContext}
                      disabled={!useGoogleSearch}
                      description={!useGoogleSearch && <span className="text-xs text-gray-500">(Requires Google Search)</span>}
                  />
                  {useUrlContext && useGoogleSearch && (
                      <div className="mt-2">
                          <input
                              type="url"
                              value={urlContext}
                              onChange={e => setUrlContext(e.target.value)}
                              placeholder="https://example.com"
                              className="w-full p-2 border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 rounded-lg text-sm"
                              aria-label="URL for context"
                          />
                      </div>
                  )}
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="Advanced settings">
                <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700 dark:text-gray-300">Safety settings</span>
                    <button className="text-blue-600 dark:text-blue-500 hover:underline">Edit</button>
                </div>
                <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">Add stop sequence</label>
                    <input
                        type="text"
                        value={stopSequence}
                        onChange={e => setStopSequence(e.target.value)}
                        placeholder="Add stop..."
                        className="w-full p-2 border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 rounded-lg text-sm"
                    />
                </div>
                <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">Output length</label>
                    <input
                        type="number"
                        value={maxOutputTokens}
                        onChange={e => setMaxOutputTokens(parseInt(e.target.value, 10))}
                        className="w-full p-2 border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 rounded-lg text-sm"
                    />
                </div>
                <SliderInput
                    label="Top P"
                    value={topP}
                    onChange={setTopP}
                    min={0} max={1} step={0.01}
                />
            </CollapsibleSection>

          </div>
        )}
        
      </div>
    </aside>
  );
};
