

import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, Role, Attachment } from '../types';
import { ArrowUp, Copy, Check, Paperclip, X, ChevronDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { coldarkCold, coldarkDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface ChatAreaProps {
  messages: ChatMessage[];
  onSendMessage: (prompt: string, attachments: Attachment[]) => void;
  isLoading: boolean;
}

const LoadingDots: React.FC = () => (
  <div className="flex items-center space-x-1">
    <span className="w-2 h-2 bg-gray-500 rounded-full dot-1"></span>
    <span className="w-2 h-2 bg-gray-500 rounded-full dot-2"></span>
    <span className="w-2 h-2 bg-gray-500 rounded-full dot-3"></span>
  </div>
);

const WelcomeState: React.FC = () => {
  return (
    <div className="h-full flex flex-col justify-center items-center text-center p-6">
      <div className="max-w-md">
        <h1 className="text-3xl font-semibold text-gray-800 dark:text-gray-200 mb-4">How can I help you today?</h1>
        <p className="text-gray-500 dark:text-gray-400">let's finish it all together.</p>
      </div>
    </div>
  );
};

interface ReasoningCardProps {
  reasoningText: string;
  isExpanded: boolean;
  onToggle: () => void;
  markdownComponents: { [key: string]: React.ElementType };
}

const ReasoningCard: React.FC<ReasoningCardProps> = ({ reasoningText, isExpanded, onToggle, markdownComponents }) => {
    return (
        <div className="mb-4 border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg">
            <button onClick={onToggle} className="w-full p-3 text-left flex justify-between items-center">
                <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-300">{isExpanded ? 'Hide Thinking' : 'Show Thinking'}</h4>
                <ChevronDown className={`h-4 w-4 text-blue-800 dark:text-blue-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
            {isExpanded && (
                <div className="px-4 py-3 border-t border-blue-200 dark:border-blue-900/60 text-gray-800 dark:text-gray-200 leading-relaxed">
                     <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]} components={markdownComponents}>
                        {reasoningText}
                    </ReactMarkdown>
                </div>
            )}
        </div>
    );
};


const CodeBlock: React.FC<any> = ({ node, inline, className, children, ...props }) => {
    const [isDarkMode, setIsDarkMode] = useState(false);
    useEffect(() => {
        const matcher = window.matchMedia('(prefers-color-scheme: dark)');
        setIsDarkMode(matcher.matches);
        const onChange = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
        matcher.addEventListener('change', onChange);
        return () => matcher.removeEventListener('change', onChange);
    }, []);

    const [copied, setCopied] = useState(false);
    const codeString = String(children).replace(/\n$/, '');
    const isSingleLineBlock = !inline && !codeString.includes('\n');
    
    const match = /language-(\w+)/.exec(className || '');
    const language = match ? match[1] : 'text';
  
    const handleCodeCopy = () => {
      navigator.clipboard.writeText(codeString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };
    
    if (inline || isSingleLineBlock) {
      return (
        <code className="bg-slate-100 text-slate-800 rounded-md px-1.5 py-0.5 font-mono text-sm dark:bg-slate-700 dark:text-slate-200" {...props}>
          {children}
        </code>
      );
    }
  
    return (
      <div className="my-4 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden font-sans bg-gray-50 dark:bg-gray-800">
        <div className="flex justify-between items-center bg-gray-100 dark:bg-gray-900/50 px-4 py-1.5 border-b border-gray-200 dark:border-gray-700">
          <span className="text-xs text-gray-500 font-semibold">
            {language.toUpperCase()}
          </span>
          <button
            onClick={handleCodeCopy}
            aria-label="Copy code"
            className="p-1 text-gray-500 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-white transition-colors"
          >
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
        <SyntaxHighlighter
          style={isDarkMode ? coldarkDark : coldarkCold}
          language={language}
          PreTag="div"
          customStyle={{ padding: '1rem', margin: 0, overflowX: 'auto', backgroundColor: 'transparent', fontSize: '0.875rem' }}
          {...props}
        >
          {codeString}
        </SyntaxHighlighter>
      </div>
    );
  };

const ChatLog: React.FC<{ messages: ChatMessage[], isLoading: boolean }> = ({ messages, isLoading }) => {
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const [copiedMessageIndex, setCopiedMessageIndex] = useState<number | null>(null);
  const [expandedReasoning, setExpandedReasoning] = useState<{ [key: number]: boolean }>({});

  const toggleReasoning = (index: number) => {
    setExpandedReasoning(prev => ({ ...prev, [index]: !prev[index] }));
  };

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleCopy = (content: string, index: number) => {
    navigator.clipboard.writeText(content);
    setCopiedMessageIndex(index);
    setTimeout(() => {
      setCopiedMessageIndex(null);
    }, 2000);
  };

  const markdownComponents: { [key: string]: React.ElementType } = {
    h1: ({node, ...props}) => <h1 className="text-2xl font-bold mb-4 mt-5 border-b dark:border-gray-700 pb-2" {...props} />,
    h2: ({node, ...props}) => <h2 className="text-xl font-bold mb-3 mt-4 border-b dark:border-gray-700 pb-1.5" {...props} />,
    h3: ({node, ...props}) => <h3 className="text-lg font-bold mb-2 mt-3" {...props} />,
    ul: ({node, ...props}) => <ul className="list-disc list-outside ml-6 mb-4 space-y-2" {...props} />,
    ol: ({node, ...props}) => <ol className="list-decimal list-outside ml-6 mb-4 space-y-2" {...props} />,
    li: ({node, ...props}) => <li className="mb-1" {...props} />,
    p: ({node, ...props}) => <p className="mb-4" {...props} />,
    code: CodeBlock,
    blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 my-4 italic text-gray-700 dark:text-gray-400" {...props} />,
    table: ({node, ...props}) => <div className="overflow-x-auto my-4 border border-gray-200 dark:border-gray-700 rounded-lg"><table className="w-full text-sm" {...props} /></div>,
    thead: ({node, ...props}) => <thead className="bg-gray-50 dark:bg-gray-800" {...props} />,
    tr: ({node, ...props}) => <tr className="border-b border-gray-200 dark:border-gray-700 last:border-b-0" {...props} />,
    th: ({node, ...props}) => <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-gray-300" {...props} />,
    td: ({node, ...props}) => <td className="px-4 py-2 text-gray-700 dark:text-gray-300" {...props} />,
    img: ({node, ...props}) => <img className="max-w-md rounded-lg my-4" {...props} />,
    math: ({node, ...props}) => <div className="overflow-x-auto"><span {...props} /></div>,
    inlineMath: ({node, ...props}) => <span {...props} />,
  };

  return (
    <div className="py-6 pl-[22px] pr-3">
      <div className="max-w-4xl mx-auto space-y-8">
        {messages.map((msg, index) => {
          const isLastMessage = index === messages.length - 1;
          
          if (msg.role === Role.MODEL) {
            return (
                <div key={index}>
                    {msg.reasoning && msg.reasoning.trim() && (
                      <ReasoningCard
                        reasoningText={msg.reasoning}
                        isExpanded={!!expandedReasoning[index]}
                        onToggle={() => toggleReasoning(index)}
                        markdownComponents={markdownComponents}
                      />
                    )}

                    {isLastMessage && isLoading && msg.content.trim() === '' && (!msg.reasoning || msg.reasoning.trim() === '') ? (
                        msg.isThinking ? (
                            <div className="flex items-center space-x-2 p-3 text-gray-500 dark:text-gray-400">
                                <span>Thinking...</span>
                            </div>
                        ) : (
                            <div className="p-3">
                                <LoadingDots />
                            </div>
                        )
                    ) : msg.content.trim() !== '' ? (
                        <div className="w-full text-gray-800 dark:text-gray-200 leading-relaxed">
                            <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]} components={markdownComponents}>
                                {msg.content}
                            </ReactMarkdown>
                            {!(isLoading && isLastMessage) && (
                                <div className="mt-2">
                                    <button
                                        onClick={() => handleCopy(msg.content, index)}
                                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                        aria-label="Copy response"
                                    >
                                        {copiedMessageIndex === index ? <Check className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5" />}
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : null}
                </div>
            );
          }
          
          return (
            <div key={index} className="flex justify-end">
              <div className="rounded-xl rounded-tr-[0.15rem] px-4 py-3 max-w-[80%] bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {msg.attachments.map((file, fileIndex) => (
                      <div key={fileIndex} className="relative">
                        {file.mimeType.startsWith('image/') ? (
                          <img src={file.dataUrl} alt={file.name} className="max-w-xs max-h-48 rounded-lg object-contain" />
                        ) : (
                          <div className="p-2 bg-gray-200 dark:bg-gray-700 rounded-lg text-xs">
                            {file.name}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {msg.content && <div className="whitespace-pre-wrap">{msg.content}</div>}
              </div>
            </div>
          );
        })}
        <div ref={endOfMessagesRef} />
      </div>
    </div>
  );
};

export const ChatArea: React.FC<ChatAreaProps> = ({
  messages,
  onSendMessage,
  isLoading,
}) => {
  const [input, setInput] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<Attachment[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const textarea = textareaRef.current;
    if (textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() || attachedFiles.length > 0) {
      onSendMessage(input.trim(), attachedFiles);
      setInput('');
      setAttachedFiles([]);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };
  
  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const filesArray = Array.from(files);
    filesArray.forEach(file => {
      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        const dataUrl = loadEvent.target?.result as string;
        if (dataUrl) {
          setAttachedFiles(prev => [...prev, {
            name: file.name,
            mimeType: file.type,
            dataUrl: dataUrl
          }]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    e.target.value = '';
  };

  const handleRemoveFile = (indexToRemove: number) => {
    setAttachedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleDragEnter = (e: React.DragEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
        setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
        setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
        e.dataTransfer.clearData();
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-gray-900 h-full overflow-hidden">
      <div className="relative flex-1">
        <div className="absolute inset-0 overflow-y-auto [scrollbar-gutter:stable] hover-scrollbar">
            {messages.length === 0 && !isLoading ? (
            <WelcomeState />
            ) : (
            <ChatLog messages={messages} isLoading={isLoading} />
            )}
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent dark:from-gray-900 pointer-events-none"></div>
      </div>


      <div className="px-6 pt-2 pb-4 flex-shrink-0">
        <div className="max-w-4xl mx-auto">
          <form
            onSubmit={handleSubmit}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="relative"
          >
            {isDragging && (
              <div className="absolute inset-0 z-10 bg-blue-100/75 dark:bg-blue-900/75 border-2 border-dashed border-blue-500 rounded-lg flex items-center justify-center pointer-events-none">
                <span className="text-blue-600 dark:text-blue-300 font-semibold text-lg">Drop files to attach</span>
              </div>
            )}
            <div className="w-full border border-gray-200 dark:border-gray-700 rounded-lg flex flex-col overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all duration-200">
                {attachedFiles.length > 0 && (
                  <div className="px-4 pt-3 flex flex-wrap gap-2">
                    {attachedFiles.map((file, index) => (
                      <div key={index} className="relative group">
                        {file.mimeType.startsWith('image/') ? (
                          <img src={file.dataUrl} alt={file.name} className="h-16 w-16 rounded-md object-cover" />
                        ) : (
                          <div className="h-16 w-16 bg-gray-200 dark:bg-gray-700 rounded-md flex items-center justify-center p-1" title={file.name}>
                            <span className="text-xs text-gray-600 dark:text-gray-300 text-center break-all line-clamp-3">{file.name}</span>
                          </div>
                        )}
                        <button 
                          type="button"
                          onClick={() => handleRemoveFile(index)} 
                          className="absolute -top-1 -right-1 bg-gray-700 dark:bg-gray-300 text-white dark:text-black rounded-full h-4 w-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label={`Remove ${file.name}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <textarea
                    ref={textareaRef}
                    rows={1}
                    value={input}
                    onChange={handleTextareaInput}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSubmit(e);
                        }
                    }}
                    placeholder="Type your message here, or attach files..."
                    className={`w-full resize-none focus:outline-none bg-transparent text-sm hover-scrollbar [scrollbar-gutter:stable] text-gray-800 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 ${attachedFiles.length > 0 ? 'px-4 pt-2 pb-4' : 'p-4'}`}
                    disabled={isLoading}
                    style={{maxHeight: '200px'}}
                />
                <div className="flex justify-between items-center px-4 pb-3">
                    <input
                      type="file"
                      multiple
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden"
                      accept="image/*,text/*,application/pdf,application/json,application/javascript,text/html,text/css,text/markdown"
                    />
                    <button type="button" onClick={handleAttachClick} className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors dark:text-gray-500 dark:hover:text-gray-400 dark:hover:bg-gray-800" aria-label="Attach files">
                        <Paperclip className="h-5 w-5" />
                    </button>
                    <button
                        type="submit"
                        disabled={isLoading || (!input.trim() && attachedFiles.length === 0)}
                        className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                        aria-label="Send message"
                    >
                        <ArrowUp className="h-5 w-5" />
                    </button>
                </div>
            </div>
          </form>
          <div className="mt-2 h-4">
            <p className={`text-xs text-center text-gray-500 transition-opacity duration-300 ${messages.length > 0 ? 'opacity-100' : 'opacity-0'}`}>
              AI can make mistakes. Consider checking important information.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};