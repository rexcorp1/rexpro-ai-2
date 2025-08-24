import React, { useState, useEffect, useRef } from 'react';
import { FileText, Download, Image, Code, MoreVertical, Eye, Trash2, ChevronDown, CheckCircle, Clock, XCircle, ArrowLeft, UploadCloud, X, Plus, Link, Loader2 } from 'lucide-react';
import { ChatMessage, Role, ChatSession, TunedModel, TuningStatus, Model, TrainingFile } from '../types';
import { ConfirmationModal } from './ConfirmationModal';

interface FilesSidebarProps {
  isSidebarOpen: boolean;
  messages: ChatMessage[];
  onDeleteAttachment: (messageIndex: number, attachmentIndex: number) => void;
  chatHistory: ChatSession[];
  tunedModels: TunedModel[];
  onStartTuning: (config: Omit<TunedModel, 'id' | 'status'>) => void;
  onUpdateTuning: (model: TunedModel) => void;
  modelOptions: { value: Model; label: string }[];
  isMobile: boolean;
}

type ActiveTab = 'files' | 'tuning';

const LocalDropdown: React.FC<{
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
    <div className="relative" ref={dropdownRef}>
      <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">{label}</label>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between p-2.5 border border-gray-200 dark:border-gray-700 rounded-lg ${
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


export const FilesSidebar: React.FC<FilesSidebarProps> = ({ isSidebarOpen, messages, onDeleteAttachment, chatHistory, tunedModels, onStartTuning, onUpdateTuning, modelOptions, isMobile }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('tuning');

  const TabButton = ({ tabId, children }: { tabId: ActiveTab; children: React.ReactNode }) => (
    <button
        onClick={() => setActiveTab(tabId)}
        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors w-1/2 ${
            activeTab === tabId
                ? 'bg-white shadow-sm text-gray-800 dark:bg-gray-700 dark:text-gray-100'
                : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
        }`}
    >
        {children}
    </button>
  );

  const FilesTabContent: React.FC = () => {
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [fileToDelete, setFileToDelete] = useState<{ messageIndex: number, attachmentIndex: number, name: string } | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
          if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
            setActiveMenu(null);
          }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
      
    const userUploads: { messageIndex: number; attachmentIndex: number; name: string; mimeType: string; dataUrl: string; }[] = [];
    const generatedFiles: { name: string; type: 'image' | 'code'; content: string; language?: string }[] = [];

    messages.forEach((msg, messageIndex) => {
        if (msg.role === Role.USER && msg.attachments) {
            msg.attachments.forEach((att, attachmentIndex) => userUploads.push({ messageIndex, attachmentIndex, ...att }));
        }

        if (msg.role === Role.MODEL) {
            const imageRegex = /!\[(.*?)\]\((data:image\/[^;]+;base64,[A-Za-z0-9+/=]+)\)/g;
            let imageMatch;
            while ((imageMatch = imageRegex.exec(msg.content)) !== null) {
                generatedFiles.push({
                    name: imageMatch[1] || `generated-image-${Date.now()}.png`,
                    type: 'image',
                    content: imageMatch[2],
                });
            }

            const codeRegex = /```(\w*)\n([\s\S]*?)\n```/g;
            let codeMatch;
            while ((codeMatch = codeRegex.exec(msg.content)) !== null) {
                const language = codeMatch[1] || 'text';
                const extension = language || 'txt';
                generatedFiles.push({
                    name: `code-snippet-${Date.now()}.${extension}`,
                    type: 'code',
                    content: codeMatch[2],
                    language: language,
                });
            }
        }
    });
    
    const handleDeleteClick = (messageIndex: number, attachmentIndex: number, name: string) => {
        setFileToDelete({ messageIndex, attachmentIndex, name });
        setIsConfirmModalOpen(true);
        setActiveMenu(null);
    };

    const handleConfirmDelete = () => {
        if (fileToDelete) {
            onDeleteAttachment(fileToDelete.messageIndex, fileToDelete.attachmentIndex);
        }
        setFileToDelete(null);
        setIsConfirmModalOpen(false);
    };

    const handleDownload = (name: string, content: string, mimeType: string = 'text/plain') => {
        setActiveMenu(null);
        const link = document.createElement('a');
        if (content.startsWith('data:')) {
            link.href = content;
        } else {
            const blob = new Blob([content], { type: mimeType });
            link.href = URL.createObjectURL(blob);
        }
        link.download = name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        if (!content.startsWith('data:')) {
            URL.revokeObjectURL(link.href);
        }
    };
    
    const getMimeTypeForLanguage = (lang?: string): string => {
        const mimeMap: { [key: string]: string } = {
            json: 'application/json',
            js: 'application/javascript',
            javascript: 'application/javascript',
            ts: 'application/typescript',
            typescript: 'application/typescript',
            html: 'text/html',
            css: 'text/css',
            md: 'text/markdown',
            python: 'text/x-python',
            shell: 'application/x-sh',
            bash: 'application/x-sh',
        };
        return mimeMap[lang?.toLowerCase() || ''] || 'text/plain';
    };

    const FileItem = ({ 
        id, 
        name, 
        type, 
        isUserUpload,
        onView, 
        onDownload, 
        onDelete 
    }: { 
        id: string;
        name: string; 
        type: 'image' | 'code' | 'generic'; 
        isUserUpload: boolean;
        onView: () => void;
        onDownload: () => void; 
        onDelete?: () => void;
    }) => {
        const getIcon = () => {
            switch (type) {
                case 'image': return <Image className="h-5 w-5 text-gray-500 flex-shrink-0" />;
                case 'code': return <Code className="h-5 w-5 text-gray-500 flex-shrink-0" />;
                default: return <FileText className="h-5 w-5 text-gray-500 flex-shrink-0" />;
            }
        };

        return (
            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/50 group">
                <div className="flex items-center gap-3 min-w-0">
                    {getIcon()}
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate" title={name}>{name}</span>
                </div>
                <div className="relative" ref={activeMenu === id ? menuRef : null}>
                    <button 
                        onClick={() => setActiveMenu(activeMenu === id ? null : id)} 
                        className="p-1 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity" 
                        aria-label={`Options for ${name}`}
                    >
                        <MoreVertical className="h-4 w-4" />
                    </button>
                    {activeMenu === id && (
                        <div className="absolute z-10 right-0 mt-2 w-36 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg py-1">
                            <button onClick={onView} className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                                <Eye className="h-4 w-4" /> View
                            </button>
                            <button onClick={onDownload} className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                                <Download className="h-4 w-4" /> Download
                            </button>
                            {isUserUpload && onDelete && (
                                <>
                                    <div className="border-t border-gray-100 dark:border-gray-700/50 my-1 mx-1"></div>
                                    <button onClick={onDelete} className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/50">
                                        <Trash2 className="h-4 w-4" /> Delete
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
      <>
        <div className="mt-6 px-1 space-y-6">
            <div>
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-1">User Uploads</h3>
                {userUploads.length > 0 ? (
                    <div className="space-y-1">
                        {userUploads.map((file) => (
                            <FileItem 
                                key={`user-${file.messageIndex}-${file.attachmentIndex}`}
                                id={`user-${file.messageIndex}-${file.attachmentIndex}`}
                                name={file.name}
                                type={file.mimeType.startsWith('image/') ? 'image' : 'generic'}
                                isUserUpload={true}
                                onView={() => window.open(file.dataUrl, '_blank')}
                                onDownload={() => handleDownload(file.name, file.dataUrl, file.mimeType)}
                                onDelete={() => handleDeleteClick(file.messageIndex, file.attachmentIndex, file.name)}
                            />
                        ))}
                    </div>
                ) : (
                    <p className="px-1 text-sm text-gray-500 dark:text-gray-400">No files uploaded.</p>
                )}
            </div>
            <div>
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-1">Generated Files</h3>
                {generatedFiles.length > 0 ? (
                    <div className="space-y-1">
                        {generatedFiles.map((file, index) => (
                            <FileItem 
                                key={`gen-${index}`}
                                id={`gen-${index}`}
                                name={file.name}
                                type={file.type}
                                isUserUpload={false}
                                onView={() => {
                                    setActiveMenu(null);
                                    const mimeType = file.type === 'image' ? 'image/png' : getMimeTypeForLanguage(file.language);
                                    const dataUrl = file.type === 'image' ? file.content : `data:${mimeType};charset=utf-8,${encodeURIComponent(file.content)}`;
                                    window.open(dataUrl, '_blank');
                                }}
                                onDownload={() => handleDownload(file.name, file.content, getMimeTypeForLanguage(file.language))}
                            />
                        ))}
                    </div>
                ) : (
                    <p className="px-1 text-sm text-gray-500 dark:text-gray-400">No files generated yet.</p>
                )}
            </div>
        </div>
        <ConfirmationModal
            isOpen={isConfirmModalOpen}
            onClose={() => setIsConfirmModalOpen(false)}
            onConfirm={handleConfirmDelete}
            title="Delete File"
        >
            Are you sure you want to delete the file "{fileToDelete?.name}"? This action cannot be undone.
        </ConfirmationModal>
      </>
    );
  };
  
const TuningTabContent: React.FC<Omit<FilesSidebarProps, 'isSidebarOpen' | 'messages' | 'onDeleteAttachment' | 'isMobile'>> = ({
    chatHistory,
    tunedModels,
    onStartTuning,
    onUpdateTuning,
    modelOptions
}) => {
    const [view, setView] = useState<'list' | 'edit'>('list');
    const [editingModel, setEditingModel] = useState<TunedModel | null>(null);

    const [displayName, setDisplayName] = useState('');
    const [baseModel, setBaseModel] = useState<Model>(Model.GEMINI_2_5_FLASH);
    const [systemInstruction, setSystemInstruction] = useState('');
    const [trainingFiles, setTrainingFiles] = useState<TrainingFile[]>([]);
    const [knowledgeUrls, setKnowledgeUrls] = useState<string[]>([]);
    const [urlInput, setUrlInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    const tunableModels = modelOptions.filter(opt =>
        [
            Model.GEMINI_2_5_PRO,
            Model.GEMINI_2_5_FLASH,
            Model.GEMINI_2_5_FLASH_LITE,
            Model.GEMINI_2_0_FLASH,
            Model.GEMINI_2_0_FLASH_LITE
        ].includes(opt.value)
    );

    useEffect(() => {
        if (view === 'edit' && editingModel) {
            setDisplayName(editingModel.displayName);
            setBaseModel(editingModel.baseModel);
            setSystemInstruction(editingModel.systemInstruction);
            setTrainingFiles(editingModel.trainingFiles);
            setKnowledgeUrls(editingModel.sourceUrls || []);
        } else {
            // Reset form for create view
            setDisplayName('');
            setBaseModel(Model.GEMINI_2_5_FLASH);
            setSystemInstruction('');
            setTrainingFiles([]);
            setKnowledgeUrls([]);
            setUrlInput('');
        }
    }, [view, editingModel]);
    
    const textToDataUrl = (text: string, mimeType: string = 'text/plain'): string => {
        // Use btoa for Base64 encoding. Handles UTF-8 characters correctly.
        return `data:${mimeType};base64,${btoa(unescape(encodeURIComponent(text)))}`;
    };

    const fetchUrlAsFile = async (url: string): Promise<TrainingFile> => {
        // NOTE: This fetch can be blocked by CORS policies on the browser.
        // For arbitrary websites, a server-side proxy would be required to bypass this.
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
            }
            const html = await response.text();
            // Use DOMParser to safely extract text content from HTML
            const doc = new DOMParser().parseFromString(html, 'text/html');
            const textContent = doc.body.textContent || '';
            
            const urlObj = new URL(url);
            const name = `${urlObj.hostname}${urlObj.pathname.replace(/\/$/, "")}.txt`;

            return {
                name,
                mimeType: 'text/plain',
                dataUrl: textToDataUrl(textContent),
            };
        } catch (error) {
            console.error(`Error fetching URL ${url}:`, error);
            throw error; // Re-throw to be caught by the handler
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = (loadEvent) => {
                const dataUrl = loadEvent.target?.result as string;
                if (dataUrl) {
                    setTrainingFiles(prev => [...prev, {
                        name: file.name,
                        mimeType: file.type,
                        dataUrl: dataUrl
                    }]);
                }
            };
            reader.readAsDataURL(file);
        });
        e.target.value = '';
    };
    
    const handleRemoveFile = (index: number) => {
        setTrainingFiles(prev => prev.filter((_, i) => i !== index));
    };
    
    const handleSubmit = async (e: React.FormEvent, isUpdate: boolean) => {
        e.preventDefault();
        if (!displayName.trim() || (isUpdate && !editingModel)) return;
        
        setIsProcessing(true);
        try {
            const urlFilesPromises = knowledgeUrls.map(url => fetchUrlAsFile(url));
            const urlFiles = await Promise.all(urlFilesPromises);
            
            // For updates, we need to filter out old URL-derived files to avoid duplication
            const nonUrlTrainingFiles = isUpdate && editingModel?.sourceUrls 
              ? trainingFiles.filter(f => !editingModel.sourceUrls?.some(url => f.name.startsWith(new URL(url).hostname)))
              : trainingFiles;

            const allTrainingFiles = [...nonUrlTrainingFiles, ...urlFiles];
            
            if (isUpdate && editingModel) {
                onUpdateTuning({
                    ...editingModel,
                    displayName,
                    systemInstruction,
                    trainingFiles: allTrainingFiles,
                    sourceUrls: knowledgeUrls,
                });
                setView('list');
            } else {
                onStartTuning({
                    displayName,
                    baseModel,
                    systemInstruction,
                    trainingFiles: allTrainingFiles,
                    sourceUrls: knowledgeUrls,
                });
                setDisplayName('');
                setSystemInstruction('');
                setTrainingFiles([]);
                setKnowledgeUrls([]);
            }
        } catch (error) {
            alert(`Failed to fetch one or more URLs. Please check the browser console for details. The request might be blocked by CORS policy.`);
        } finally {
            setIsProcessing(false);
        }
    };

    const StatusIndicator: React.FC<{ status: TuningStatus }> = ({ status }) => {
        switch (status) {
            case TuningStatus.TRAINING:
                return <div className="flex items-center gap-1.5 text-xs text-yellow-600 dark:text-yellow-400"><Clock className="h-3 w-3 animate-spin" /> Training...</div>;
            case TuningStatus.COMPLETED:
                return <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400"><CheckCircle className="h-3 w-3" /> Completed</div>;
            case TuningStatus.FAILED:
                return <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-500"><XCircle className="h-3 w-3" /> Failed</div>;
            default:
                return null;
        }
    };
    
    const UrlKnowledgeSource: React.FC = () => {
        const handleAddUrl = () => {
            if (urlInput.trim() && !knowledgeUrls.includes(urlInput.trim())) {
                try {
                    new URL(urlInput); // Basic URL validation
                    setKnowledgeUrls(prev => [...prev, urlInput.trim()]);
                    setUrlInput('');
                } catch (e) {
                    alert("Please enter a valid URL (e.g., https://example.com)");
                }
            }
        };

        const handleRemoveUrl = (urlToRemove: string) => {
            setKnowledgeUrls(prev => prev.filter(url => url !== urlToRemove));
        };
        
        return (
            <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">
                    Knowledge from URLs
                </label>
                <div className="flex gap-2">
                    <input
                        type="url"
                        value={urlInput}
                        onChange={e => setUrlInput(e.target.value)}
                        placeholder="https://example.com/docs"
                        className="flex-1 w-full p-2.5 border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 rounded-lg text-sm"
                    />
                    <button type="button" onClick={handleAddUrl} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600">Add</button>
                </div>
                {knowledgeUrls.length > 0 && (
                    <div className="mt-3 space-y-2">
                        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400">Included URLs:</h4>
                        <div className="max-h-32 overflow-y-auto space-y-1 pr-1 hover-scrollbar">
                            {knowledgeUrls.map((url, index) => (
                                <div key={index} className="flex items-center justify-between p-1.5 bg-gray-100 dark:bg-gray-800 rounded-md text-sm">
                                    <Link className="h-4 w-4 text-gray-500 flex-shrink-0 mr-2" />
                                    <span className="truncate flex-1 text-gray-700 dark:text-gray-300" title={url}>{url}</span>
                                    <button onClick={() => handleRemoveUrl(url)} aria-label={`Remove ${url}`}>
                                        <X className="h-4 w-4 text-gray-400 hover:text-red-500" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const FileUploadArea = () => (
        <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">
                Knowledge from Files
            </label>
            <div 
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
            >
                <UploadCloud className="h-6 w-6 text-gray-400 mb-2" />
                <span className="text-sm text-gray-500 dark:text-gray-400">Click to upload files</span>
                <span className="text-xs text-gray-400 dark:text-gray-500">PDF, TXT, MD, etc.</span>
                <input
                    type="file"
                    multiple
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                />
            </div>
            {trainingFiles.length > 0 && (
                <div className="mt-3 space-y-2">
                    <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400">Uploaded Files:</h4>
                    <div className="max-h-32 overflow-y-auto space-y-1 pr-1 hover-scrollbar">
                        {trainingFiles.map((file, index) => (
                            <div key={index} className="flex items-center justify-between p-1.5 bg-gray-100 dark:bg-gray-800 rounded-md text-sm">
                                <FileText className="h-4 w-4 text-gray-500 flex-shrink-0 mr-2" />
                                <span className="truncate flex-1 text-gray-700 dark:text-gray-300" title={file.name}>{file.name}</span>
                                <button onClick={() => handleRemoveFile(index)} aria-label={`Remove ${file.name}`}>
                                    <X className="h-4 w-4 text-gray-400 hover:text-red-500" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );

    if (view === 'edit' && editingModel) {
        return (
            <div className="mt-4 px-1">
                <button onClick={() => setView('list')} className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 mb-4">
                    <ArrowLeft className="h-4 w-4" /> Back to Models
                </button>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Edit Model</h3>
                <form onSubmit={(e) => handleSubmit(e, true)} className="space-y-4">
                     <div>
                        <label htmlFor="editModelName" className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">Model Name</label>
                        <input
                            id="editModelName"
                            type="text"
                            value={displayName}
                            onChange={e => setDisplayName(e.target.value)}
                            className="w-full p-2.5 border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 rounded-lg text-sm"
                            required
                        />
                    </div>
                    
                    <LocalDropdown label="Base Model" options={tunableModels} selectedValue={baseModel} onSelect={() => {}} disabled={true} />
                    
                    <div>
                        <label htmlFor="editSysInstruction" className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">System Instruction</label>
                        <textarea
                            id="editSysInstruction"
                            value={systemInstruction}
                            onChange={(e) => setSystemInstruction(e.target.value)}
                            rows={3}
                            className="w-full p-2.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-900 resize-y"
                        />
                    </div>
                    
                    <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                        <FileUploadArea />
                        <UrlKnowledgeSource />
                    </div>
                    
                    <p className="text-xs text-gray-500 dark:text-gray-400">Updating the model will retrain it using the knowledge sources above and a new snapshot of all current chat histories.</p>

                    <button
                        type="submit"
                        disabled={!displayName.trim() || isProcessing || editingModel.status === TuningStatus.TRAINING}
                        className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
                        {isProcessing ? 'Processing...' : (editingModel.status === TuningStatus.TRAINING ? 'Retraining...' : 'Update & Retune')}
                    </button>
                </form>
            </div>
        )
    }

    return (
      <div className="mt-6 px-1 space-y-8">
          <div>
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">My Tuned Models</h3>
              <div className="space-y-2">
                  {tunedModels.length > 0 ? tunedModels.map(model => (
                      <div key={model.id} onClick={() => { if (model.status !== TuningStatus.TRAINING) { setView('edit'); setEditingModel(model); } }} className={`flex items-center justify-between p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/50 ${model.status !== TuningStatus.TRAINING ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800' : ''}`}>
                          <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{model.displayName}</span>
                          <StatusIndicator status={model.status} />
                      </div>
                  )) : (
                      <div className="text-center py-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                          <p className="text-sm text-gray-500 dark:text-gray-400">No tuned models yet.</p>
                      </div>
                  )}
              </div>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-4">Create New Model</h3>
              <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-4">
                  <div>
                      <label htmlFor="modelName" className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">Model Name</label>
                      <input
                          id="modelName"
                          type="text"
                          value={displayName}
                          onChange={e => setDisplayName(e.target.value)}
                          placeholder="e.g., Marketing Copy Assistant"
                          className="w-full p-2.5 border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 rounded-lg text-sm"
                          required
                      />
                  </div>
                  
                  <LocalDropdown
                    label="Base Model"
                    options={tunableModels}
                    selectedValue={baseModel}
                    onSelect={(val) => setBaseModel(val as Model)}
                  />

                  <div>
                      <label htmlFor="sysInstruction" className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">System Instruction</label>
                      <textarea
                          id="sysInstruction"
                          value={systemInstruction}
                          onChange={(e) => setSystemInstruction(e.target.value)}
                          placeholder="You are a helpful assistant specialized in..."
                          rows={3}
                          className="w-full p-2.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-900 resize-y"
                      />
                  </div>
                  
                  <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                    <FileUploadArea />
                    <UrlKnowledgeSource />
                  </div>
                  
                  <p className="text-xs text-gray-500 dark:text-gray-400">The model will be trained using the knowledge sources above and a snapshot of all current chat histories.</p>

                  <button
                      type="submit"
                      disabled={!displayName.trim() || isProcessing}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
                  >
                      {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
                      {isProcessing ? 'Processing...' : <><Plus className="h-4 w-4" /> Start Tuning</>}
                  </button>
              </form>
          </div>
      </div>
  );
};


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
        <div className="flex items-center justify-start space-x-1 bg-gray-200/50 dark:bg-gray-800/50 p-1 rounded-lg">
            <TabButton tabId="files">Files</TabButton>
            <TabButton tabId="tuning">Tuning</TabButton>
        </div>
        
        {activeTab === 'files' ? <FilesTabContent /> : <TuningTabContent chatHistory={chatHistory} tunedModels={tunedModels} onStartTuning={onStartTuning} onUpdateTuning={onUpdateTuning} modelOptions={modelOptions} />}
      </div>
    </aside>
  );
};
