

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { Model, ChatMessage, Role, MediaResolution, Attachment, ChatSession, TunedModel, TuningStatus, TrainingFile } from './types';
import { streamChatResponse, countTokens } from './services/geminiService';
import { Plus, PanelLeft, Settings, Settings2, Trash2 } from 'lucide-react';
import { HeaderModelSelector } from './components/HeaderModelSelector';
import { Modal } from './components/Modal';
import { GenerateContentResponse, Type } from '@google/genai';
import { FilesSidebar } from './components/FilesSidebar';

const useMediaQuery = (query: string) => {
    const [matches, setMatches] = React.useState(() => window.matchMedia(query).matches);

    React.useEffect(() => {
        const mediaQuery = window.matchMedia(query);
        const handler = (event: MediaQueryListEvent) => setMatches(event.matches);
        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }, [query]);

    return matches;
};


const NavigationSidebar: React.FC<{
  isSidebarOpen: boolean;
  onNewChat: () => void;
  chatHistory: ChatSession[];
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
  isMobile: boolean;
}> = ({ isSidebarOpen, onNewChat, chatHistory, activeChatId, onSelectChat, onDeleteChat, isMobile }) => {
  const isActuallyOpen = isMobile ? true : isSidebarOpen;
  
  return (
    <aside
      className={`
        bg-white dark:bg-gray-900 flex flex-col p-4
        transition-all duration-300 ease-in-out flex-shrink-0
        ${ isMobile
            ? `fixed inset-y-0 left-0 z-30 w-[260px] shadow-lg ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`
            : `${isSidebarOpen ? 'w-[260px]' : 'w-20'}`
        }
      `}
    >
      <div className={`flex items-center gap-2 mb-6 px-1 flex-shrink-0 overflow-hidden ${isMobile ? 'hidden' : ''}`}>
          <div className="w-8 h-8 bg-black rounded-md flex items-center justify-center flex-shrink-0">
              <span className="font-bold text-white text-xl">R</span>
          </div>
          <h1 className={`text-lg font-semibold text-gray-800 dark:text-gray-200 whitespace-nowrap transition-opacity duration-200 ${isActuallyOpen ? 'opacity-100' : 'opacity-0'}`}>REXPro AI</h1>
      </div>
      <button
        onClick={onNewChat}
        className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
      >
        <Plus className="w-4 h-4 flex-shrink-0" />
        <span className={`ml-2 whitespace-nowrap overflow-hidden transition-all duration-200 ${isActuallyOpen ? 'w-auto opacity-100' : 'w-0 opacity-0'}`}>New Chat</span>
      </button>

      <div className={`mt-6 flex-1 overflow-y-auto overflow-x-hidden transition-opacity duration-200 hover-scrollbar [scrollbar-gutter:stable] ${isActuallyOpen ? 'opacity-100' : 'opacity-0'}`}>
        <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-3">HISTORY</h2>
        <nav className="space-y-1">
          {chatHistory.map((chat) => (
            <div
              key={chat.id}
              onClick={() => onSelectChat(chat.id)}
              className={`group flex items-center justify-between px-3 py-2 text-sm text-gray-600 dark:text-gray-400 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 ${chat.id === activeChatId ? 'bg-gray-100 dark:bg-gray-800/80 font-semibold' : ''}`}
            >
              <span className="truncate">{chat.title}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteChat(chat.id);
                }}
                className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 p-0.5 rounded transition-opacity flex-shrink-0"
                aria-label={`Delete chat: ${chat.title}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </nav>
      </div>

      <div className={`mt-auto flex-shrink-0 whitespace-nowrap overflow-hidden transition-opacity duration-200 ${isActuallyOpen ? 'opacity-100' : 'opacity-0'}`}>
        <p className="text-sm text-gray-500 dark:text-gray-400">Signed in as <span className="font-bold text-gray-800 dark:text-gray-100">omniverse1</span></p>
      </div>
    </aside>
  );
};

const dataUrlToText = (dataUrl: string): string => {
    try {
        const base64 = dataUrl.substring(dataUrl.indexOf(',') + 1);
        // Use atob for Base64 decoding
        const decodedString = atob(base64);
        // Handle potential non-UTF8 characters by decoding properly
        return decodeURIComponent(escape(decodedString));
    } catch (e) {
        console.error("Failed to decode base64 content from data URL:", e);
        return "[Error: Could not decode file content]";
    }
};


const App: React.FC = () => {
  const isMobile = useMediaQuery('(max-width: 767px)');
  const [selectedModel, setSelectedModel] = useState<Model>(Model.GEMINI_2_5_FLASH);
  const [chatHistory, setChatHistory] = useState<ChatSession[]>(() => {
    try {
      const savedHistory = localStorage.getItem('chatHistory');
      return savedHistory ? JSON.parse(savedHistory) : [];
    } catch (error) {
      console.error("Failed to load chat history from localStorage", error);
      return [];
    }
  });
  const [activeChatId, setActiveChatId] = useState<string | null>(() => {
    try {
      const savedActiveId = localStorage.getItem('activeChatId');
      return savedActiveId ? JSON.parse(savedActiveId) : null;
    } catch (error) {
      console.error("Failed to load active chat ID from localStorage", error);
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isNavSidebarOpen, setIsNavSidebarOpen] = useState<boolean>(true);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState<boolean>(false);
  const [isFilesSidebarOpen, setIsFilesSidebarOpen] = useState<boolean>(false);
  
  // Sidebar settings state
  const [systemInstruction, setSystemInstruction] = useState<string>('');
  const [temperature, setTemperature] = useState<number>(1);
  const [topP, setTopP] = useState<number>(0.95);
  const [maxOutputTokens, setMaxOutputTokens] = useState<number>(8192);
  const [stopSequence, setStopSequence] = useState<string>('');
  const [useGoogleSearch, setUseGoogleSearch] = useState<boolean>(false);
  const [mediaResolution, setMediaResolution] = useState<MediaResolution>(MediaResolution.DEFAULT);
  const [tokenCount, setTokenCount] = useState<number>(0);
  const [useThinking, setUseThinking] = useState<boolean>(false);
  const [useThinkingBudget, setUseThinkingBudget] = useState<boolean>(false);
  const [thinkingBudget, setThinkingBudget] = useState<number>(8000);

  // Tools state
  const [useStructuredOutput, setUseStructuredOutput] = useState<boolean>(false);
  const [structuredOutputSchema, setStructuredOutputSchema] = useState<string>('');
  const [isSchemaModalOpen, setIsSchemaModalOpen] = useState<boolean>(false);
  const [tempSchema, setTempSchema] = useState<string>('');

  const [useCodeExecution, setUseCodeExecution] = useState<boolean>(false);

  const [useFunctionCalling, setUseFunctionCalling] = useState<boolean>(false);
  const [functionDeclarations, setFunctionDeclarations] = useState<string>('');
  const [isFunctionModalOpen, setIsFunctionModalOpen] = useState<boolean>(false);
  const [tempDeclarations, setTempDeclarations] = useState<string>('');

  const [useUrlContext, setUseUrlContext] = useState<boolean>(false);
  const [urlContext, setUrlContext] = useState<string>('');
  
  // Tuning state
  const [tunedModels, setTunedModels] = useState<TunedModel[]>([]);

  const modelMaxTokens: Record<Model, number> = {
    [Model.GEMINI_2_5_PRO]: 1048576,
    [Model.GEMINI_2_5_FLASH]: 1048576,
    [Model.GEMINI_2_5_FLASH_LITE]: 1048576,
    [Model.GEMINI_2_0_FLASH]: 1048576,
    [Model.GEMINI_2_0_FLASH_PREVIEW_IMAGE_GENERATION]: 32768,
    [Model.GEMINI_2_0_FLASH_LITE]: 1048576,
    [Model.GEMMA_3N_E2B]: 8192,
    [Model.GEMMA_3N_E4B]: 8192,
    [Model.GEMMA_3_1B]: 32768,
    [Model.GEMMA_3_4B]: 32768,
    [Model.GEMMA_3_12B]: 32768,
    [Model.GEMMA_3_27B]: 131072,
  };

  const handleNewChat = useCallback(() => {
    const newChatId = Date.now().toString();
    const newChat: ChatSession = { id: newChatId, title: 'New Chat', messages: [] };
    setChatHistory(prev => [newChat, ...prev]);
    setActiveChatId(newChatId);
  }, []);

  useEffect(() => {
    const matcher = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };
    matcher.addEventListener('change', onChange);

    // Set initial theme
    if (matcher.matches) {
      document.documentElement.classList.add('dark');
    }

    return () => {
      matcher.removeEventListener('change', onChange);
    };
  }, []);

  useEffect(() => {
    try {
        localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
        if (activeChatId) {
            localStorage.setItem('activeChatId', JSON.stringify(activeChatId));
        } else {
            localStorage.removeItem('activeChatId');
        }
    } catch (error) {
        console.error("Failed to save chat state to localStorage", error);
    }
  }, [chatHistory, activeChatId]);
  
  useEffect(() => {
    // On initial load, validate the state loaded from localStorage.
    
    // 1. Validate that the active chat exists in the history.
    const activeChatExists = chatHistory.some(chat => chat.id === activeChatId);
    
    // 2. If there's history but the active chat is invalid (or null), set the most recent one as active.
    if (chatHistory.length > 0 && !activeChatExists) {
        setActiveChatId(chatHistory[0].id);
    } 
    // 3. If there's no history at all (first visit or cleared storage), create a new chat.
    else if (chatHistory.length === 0) {
        handleNewChat();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount to initialize/validate state.
  
  useEffect(() => {
    try {
        const savedModels = localStorage.getItem('tunedModels');
        if (savedModels) {
            setTunedModels(JSON.parse(savedModels));
        }
    } catch (error) {
        console.error("Failed to load tuned models from localStorage", error);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('tunedModels', JSON.stringify(tunedModels));
  }, [tunedModels]);

  useEffect(() => {
    // When the model changes, cap the thinking budget to the new model's max.
    const modelMaxBudgets: Record<Model, number> = {
      [Model.GEMINI_2_5_PRO]: 32768,
      [Model.GEMINI_2_5_FLASH]: 24576,
      [Model.GEMINI_2_5_FLASH_LITE]: 24576,
      [Model.GEMINI_2_0_FLASH]: 0,
      [Model.GEMINI_2_0_FLASH_PREVIEW_IMAGE_GENERATION]: 0,
      [Model.GEMINI_2_0_FLASH_LITE]: 0,
      [Model.GEMMA_3N_E2B]: 0,
      [Model.GEMMA_3N_E4B]: 0,
      [Model.GEMMA_3_1B]: 0,
      [Model.GEMMA_3_4B]: 0,
      [Model.GEMMA_3_12B]: 0,
      [Model.GEMMA_3_27B]: 0
    };
    const maxBudgetForModel = modelMaxBudgets[selectedModel];

    if (maxBudgetForModel && thinkingBudget > maxBudgetForModel) {
      setThinkingBudget(maxBudgetForModel);
    }
  }, [selectedModel, thinkingBudget]);

  const placeholderSchema = JSON.stringify({
    type: Type.OBJECT,
    properties: {
      recipeName: { type: Type.STRING, description: "The name of the recipe." },
    },
  }, null, 2);

  const placeholderDeclarations = JSON.stringify([
      {
        name: "find_recipes",
        description: "Find recipes for a given dish and list ingredients.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            dish: {
              type: Type.STRING,
              description: "The dish to search recipes for."
            },
            ingredients: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
            }
          },
          required: ["dish"]
        }
      }
  ], null, 2);


  const modelNameMap: Record<Model, string> = {
    [Model.GEMINI_2_5_PRO]: 'Gemini 2.5 Pro',
    [Model.GEMINI_2_5_FLASH]: 'Gemini 2.5 Flash',
    [Model.GEMINI_2_5_FLASH_LITE]: 'Gemini 2.5 Flash-Lite',
    [Model.GEMINI_2_0_FLASH]: 'Gemini 2.0 Flash',
    [Model.GEMINI_2_0_FLASH_PREVIEW_IMAGE_GENERATION]: 'Gemini 2.0 Flash Preview Image Generation',
    [Model.GEMINI_2_0_FLASH_LITE]: 'Gemini 2.0 Flash-Lite',
    [Model.GEMMA_3N_E2B]: 'Gemma 3n E2B',
    [Model.GEMMA_3N_E4B]: 'Gemma 3n E4B',
    [Model.GEMMA_3_1B]: 'Gemma 3 1B',
    [Model.GEMMA_3_4B]: 'Gemma 3 4B',
    [Model.GEMMA_3_12B]: 'Gemma 3 12B',
    [Model.GEMMA_3_27B]: 'Gemma 3 27B',
  };

  const modelOptions = useMemo(() => (Object.keys(modelNameMap) as Model[]).map(modelKey => ({
    value: modelKey,
    label: modelNameMap[modelKey],
  })), [modelNameMap]);
  
  const combinedModelOptions = useMemo(() => {
    const customModels = tunedModels
      .filter(m => m.status === TuningStatus.COMPLETED)
      .map(m => ({
        value: m.id as Model,
        label: `[Custom] ${m.displayName}`,
      }));

    if (customModels.length > 0) {
      return [...modelOptions, ...customModels];
    }

    return modelOptions;
  }, [tunedModels, modelOptions]);
  
  const activeChat = chatHistory.find(c => c.id === activeChatId);
  const messages = activeChat ? activeChat.messages : [];

  useEffect(() => {
    const calculateTokens = async () => {
      if (messages.length > 0) {
        let modelForApi = selectedModel;
        if (selectedModel.startsWith('tunedModels/')) {
            const customModel = tunedModels.find(m => m.id === selectedModel);
            if (customModel) {
                modelForApi = customModel.baseModel;
            } else {
                console.error(`Custom model ${selectedModel} not found, falling back.`);
                modelForApi = Model.GEMINI_2_5_FLASH;
            }
        }
        const count = await countTokens(messages, modelForApi);
        setTokenCount(count);
      } else {
        setTokenCount(0);
      }
    };
    calculateTokens();
  }, [messages, selectedModel, tunedModels]);

  const handleSendMessage = useCallback(async (prompt: string, attachments: Attachment[]) => {
    if ((!prompt.trim() && attachments.length === 0) || isLoading || !activeChatId) return;
    
    const currentChat = chatHistory.find(c => c.id === activeChatId);
    if (!currentChat) return;

    setIsLoading(true);

    let modelForApi = selectedModel;
    let systemInstructionForApi = systemInstruction;
    
    // This is the message that will be sent to the Gemini API.
    // It may be augmented with context from tuned model files.
    let apiUserMessage: ChatMessage = { role: Role.USER, content: prompt, attachments };
    
    if (selectedModel.startsWith('tunedModels/')) {
        const customModel = tunedModels.find(m => m.id === selectedModel);
        if (customModel) {
            modelForApi = customModel.baseModel;
            systemInstructionForApi = customModel.systemInstruction;

            if (customModel.trainingFiles.length > 0) {
                // Separate text files from media files (images, PDFs, etc.)
                const textFiles = customModel.trainingFiles.filter(f => f.mimeType.startsWith('text/'));
                const mediaFiles = customModel.trainingFiles.filter(f => !f.mimeType.startsWith('text/'));

                // Process text files into a string to be included in the prompt
                const textFileContents = textFiles.map(file => {
                    const content = dataUrlToText(file.dataUrl);
                    return `--- DOCUMENT: ${file.name} ---\n${content}\n--- END DOCUMENT ---`;
                }).join('\n\n');
                
                // Create a preamble for the prompt with instructions and text content
                let contextPreamble = `You have access to the following documents for context:\n\n`;
                if (textFileContents) {
                    contextPreamble += `${textFileContents}\n\n`;
                }
                contextPreamble += `Based ONLY on the provided documents and your system instruction, answer the user's question. If the answer is not in the documents, say you do not have that information in your provided knowledge files.`;
                
                const augmentedPrompt = `${contextPreamble}\n\nUser's question: ${prompt}`;

                // Process media files into Attachment objects
                const mediaAttachments: Attachment[] = mediaFiles.map(file => ({
                    name: file.name,
                    mimeType: file.mimeType,
                    dataUrl: file.dataUrl,
                }));
                
                // Construct the final user message for the API, combining context and current user input
                apiUserMessage = { 
                    role: Role.USER, 
                    content: augmentedPrompt, 
                    // Combine attachments from tuning files and the current user message
                    attachments: [...mediaAttachments, ...attachments] 
                };
            }
        } else {
            console.error(`Custom model ${selectedModel} not found, falling back.`);
            modelForApi = Model.GEMINI_2_5_FLASH;
        }
    } else if (useGoogleSearch && useUrlContext && urlContext) {
      // Augment prompt for URL context with Google Search
      apiUserMessage.content = `Using the content from the URL: ${urlContext}, answer the following question: ${prompt}`;
    }

    // This is the history including the new augmented message for the API call
    const newMessagesForApi: ChatMessage[] = [...currentChat.messages, apiUserMessage];
    
    const isFirstUserMessage = currentChat.messages.length === 0;
    const newTitle = isFirstUserMessage
      ? prompt.substring(0, 40) + (prompt.length > 40 ? '...' : '')
      : currentChat.title;

    const isThinkingModel = [Model.GEMINI_2_5_PRO, Model.GEMINI_2_5_FLASH, Model.GEMINI_2_5_FLASH_LITE].includes(modelForApi as Model);
    const isProModel = modelForApi === Model.GEMINI_2_5_PRO;
    const isThinkingActive = isThinkingModel && (isProModel || useThinking);
    
    // This is the message to display in the UI, with the original, un-augmented prompt.
    const uiUserMessage: ChatMessage = { role: Role.USER, content: prompt, attachments };

    // Add user message (the original one) and a model placeholder to the UI state
    setChatHistory(prev =>
      prev.map(chat =>
        chat.id === activeChatId
          ? {
              ...chat,
              title: newTitle,
              messages: [
                ...chat.messages,
                uiUserMessage,
                { role: Role.MODEL, content: '', reasoning: '', isThinking: isThinkingActive }
              ],
            }
          : chat
      )
    );

    try {
      const tools = [];
      if (useGoogleSearch) {
        tools.push({ googleSearch: {} });
      }
      if (useCodeExecution) {
        tools.push({ codeExecution: {} });
      }
      if (useFunctionCalling && functionDeclarations) {
        try {
          const declarations = JSON.parse(functionDeclarations);
          tools.push({ functionDeclarations: declarations });
        } catch (e) {
          console.error("Invalid function declarations JSON:", e);
        }
      }

      const config: any = {
        temperature,
        topP,
        maxOutputTokens,
        stopSequences: stopSequence ? [stopSequence] : undefined,
      };

      if (isThinkingModel) {
        const thinkingModeActive = isProModel || useThinking;
        if (thinkingModeActive) {
          if (useThinkingBudget) {
            config.thinkingConfig = { thinkingBudget };
          }
        } else {
          config.thinkingConfig = { thinkingBudget: 0 };
        }
      }

      if (tools.length > 0) {
        config.tools = tools;
      }
      
      if (useStructuredOutput && structuredOutputSchema && !useGoogleSearch) {
        try {
          const schema = JSON.parse(structuredOutputSchema);
          config.responseMimeType = "application/json";
          config.responseSchema = schema;
        } catch (e) {
          console.error("Invalid structured output schema JSON:", e);
        }
      }

      let finalSystemInstruction = systemInstructionForApi;
      if (isThinkingActive) {
        finalSystemInstruction = `${systemInstructionForApi}\n\nWhen providing an answer, first output your reasoning steps inside <thinking> tags. After the </thinking> tag, provide the final answer.`.trim();
      }

      const options = {
        systemInstruction: finalSystemInstruction,
        config,
      };

      await streamChatResponse(newMessagesForApi, modelForApi, options, (chunk: GenerateContentResponse) => {
        let chunkText = '';
        const parts = chunk.candidates?.[0]?.content?.parts || [];
        for (const part of parts) {
             if (part.text) {
                chunkText += part.text;
            }
        }
        if (!chunkText) return;

        setChatHistory(prevHistory => prevHistory.map(chat => {
            if (chat.id !== activeChatId) return chat;

            const prevMessages = chat.messages;
            if (prevMessages.length === 0 || prevMessages[prevMessages.length - 1].role !== Role.MODEL) return chat;
            
            const lastMessage = prevMessages[prevMessages.length - 1];
            let updatedMessage = { 
                ...lastMessage, 
                content: lastMessage.content || '', 
                reasoning: lastMessage.reasoning || ''
            };
            
            let parsingState = updatedMessage.isParsingReasoning ?? false;
            
            while (chunkText.length > 0) {
                if (parsingState) {
                    const endTagIndex = chunkText.indexOf('</thinking>');
                    if (endTagIndex !== -1) {
                        updatedMessage.reasoning += chunkText.substring(0, endTagIndex);
                        chunkText = chunkText.substring(endTagIndex + '</thinking>'.length);
                        parsingState = false;
                    } else {
                        updatedMessage.reasoning += chunkText;
                        chunkText = '';
                    }
                } else {
                    const startTagIndex = chunkText.indexOf('<thinking>');
                    if (startTagIndex !== -1) {
                        updatedMessage.content += chunkText.substring(0, startTagIndex);
                        chunkText = chunkText.substring(startTagIndex + '<thinking>'.length);
                        parsingState = true;
                    } else {
                        updatedMessage.content += chunkText;
                        chunkText = '';
                    }
                }
            }
            
            updatedMessage.isParsingReasoning = parsingState;
            
            for (const part of parts) {
                if (part.functionCall) {
                    updatedMessage.content += `\n\n**Function Call:**\n\`\`\`json\n${JSON.stringify(part.functionCall, null, 2)}\n\`\`\`\n`;
                } else if (part.executableCode) {
                    const language = (part.executableCode.language || 'code').toLowerCase();
                    updatedMessage.content += `\n\n**Executing Code:**\n\`\`\`${language}\n${part.executableCode.code}\n\`\`\`\n`;
                } else if (part.inlineData) {
                    const dataUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                    updatedMessage.content += `\n\n![Generated Image](${dataUrl})\n\n`;
                }
            }
            
            return {
              ...chat,
              messages: [...prevMessages.slice(0, -1), updatedMessage]
            };
        }));
      });
    } catch (error) {
      console.error("Error streaming chat response:", error);
      setChatHistory(prev =>
        prev.map(chat => {
          if (chat.id !== activeChatId) return chat;
          const lastMessage = chat.messages[chat.messages.length - 1];
          if (lastMessage && lastMessage.role === Role.MODEL) {
            return {
              ...chat,
              messages: [
                ...chat.messages.slice(0, -1),
                { ...lastMessage, content: 'Sorry, I encountered an error. Please try again.' },
              ],
            };
          }
          return chat;
        })
      );
    } finally {
      setIsLoading(false);
      setChatHistory(prev =>
        prev.map(chat => {
          if (chat.id !== activeChatId) return chat;
          if (chat.messages.length === 0 || chat.messages[chat.messages.length - 1].role !== Role.MODEL) return chat;
          const lastMsg = chat.messages[chat.messages.length - 1];
          const { isParsingReasoning, ...rest } = lastMsg;
          return {
            ...chat,
            messages: [...chat.messages.slice(0, -1), { ...rest, isThinking: false }],
          };
        })
      );
    }
  }, [chatHistory, activeChatId, isLoading, selectedModel, systemInstruction, temperature, topP, maxOutputTokens, stopSequence, useGoogleSearch, useStructuredOutput, structuredOutputSchema, useCodeExecution, useFunctionCalling, functionDeclarations, useUrlContext, urlContext, useThinking, useThinkingBudget, thinkingBudget, tunedModels]);

  const handleSelectChat = useCallback((id: string) => {
    setActiveChatId(id);
    if(isMobile) {
        setIsNavSidebarOpen(false);
    }
  }, [isMobile]);
  
  const handleDeleteChat = useCallback((idToDelete: string) => {
    const currentActiveId = activeChatId;
    setChatHistory(prevHistory => {
        const newHistory = prevHistory.filter(chat => chat.id !== idToDelete);
        
        if (currentActiveId === idToDelete) {
            if (newHistory.length > 0) {
                setActiveChatId(newHistory[0].id);
            } else {
                setActiveChatId(null);
            }
        }
        return newHistory;
    });
  }, [activeChatId]);

  const handleDeleteAttachment = useCallback((messageIndex: number, attachmentIndex: number) => {
    setChatHistory(prev =>
        prev.map(chat => {
            if (chat.id !== activeChatId) {
                return chat;
            }
            const updatedMessages = [...chat.messages];
            const targetMessage = updatedMessages[messageIndex];
            if (targetMessage && targetMessage.attachments) {
                const updatedAttachments = targetMessage.attachments.filter((_, idx) => idx !== attachmentIndex);
                updatedMessages[messageIndex] = { ...targetMessage, attachments: updatedAttachments };
                return { ...chat, messages: updatedMessages };
            }
            return chat;
        })
    );
  }, [activeChatId]);

  const handleStartTuning = useCallback((config: Omit<TunedModel, 'id' | 'status'>) => {
    const newModel: TunedModel = {
        ...config,
        id: `tunedModels/custom-${config.displayName.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`,
        status: TuningStatus.TRAINING,
    };
    setTunedModels(prev => [...prev, newModel]);

    // Simulate the tuning process completing after a delay
    setTimeout(() => {
        setTunedModels(prev => prev.map(m => m.id === newModel.id ? { ...m, status: TuningStatus.COMPLETED } : m));
    }, 15000);
  }, []);
  
  const handleUpdateTuning = useCallback((updatedModel: TunedModel) => {
    setTunedModels(prev =>
        prev.map(m =>
            m.id === updatedModel.id
                ? { ...updatedModel, status: TuningStatus.TRAINING }
                : m
        )
    );

    // Simulate the retuning process
    setTimeout(() => {
        setTunedModels(prev =>
            prev.map(m =>
                m.id === updatedModel.id
                    ? { ...m, status: TuningStatus.COMPLETED }
                    : m
            )
        );
    }, 15000);
  }, []);


  const toggleNavSidebar = useCallback(() => {
    if (!isNavSidebarOpen && isMobile) {
        setIsRightSidebarOpen(false);
        setIsFilesSidebarOpen(false);
    }
    setIsNavSidebarOpen(prev => !prev);
  }, [isMobile, isNavSidebarOpen]);

  const toggleRightSidebar = useCallback(() => {
    if (!isRightSidebarOpen && isMobile) {
        setIsNavSidebarOpen(false);
        setIsFilesSidebarOpen(false);
    }
    setIsRightSidebarOpen(prev => !prev);
  }, [isMobile, isRightSidebarOpen]);

  const toggleFilesSidebar = useCallback(() => {
    if (!isFilesSidebarOpen && isMobile) {
        setIsNavSidebarOpen(false);
        setIsRightSidebarOpen(false);
    }
    setIsFilesSidebarOpen(prev => !prev);
  }, [isMobile, isFilesSidebarOpen]);
  
  const closeAllSidebars = () => {
    setIsNavSidebarOpen(false);
    setIsRightSidebarOpen(false);
    setIsFilesSidebarOpen(false);
  };


  const openSchemaModal = () => {
    setTempSchema(structuredOutputSchema || placeholderSchema);
    setIsSchemaModalOpen(true);
  };
  const saveSchema = (schema: string) => {
      setStructuredOutputSchema(schema);
  };

  const openFunctionModal = () => {
      setTempDeclarations(functionDeclarations || placeholderDeclarations);
      setIsFunctionModalOpen(true);
  };
  const saveDeclarations = (declarations: string) => {
      setFunctionDeclarations(declarations);
  };

  const toggleStructuredOutput = (enabled: boolean) => {
      if (enabled && useGoogleSearch) return;
      setUseStructuredOutput(enabled);
  };
  
  const toggleGoogleSearch = (enabled: boolean) => {
      if (enabled && useStructuredOutput) {
          setUseStructuredOutput(false);
      }
      if (!enabled) { // If disabling Google Search, also disable URL context
        setUseUrlContext(false);
        setUrlContext('');
      }
      setUseGoogleSearch(enabled);
  };

  return (
    <div className="h-screen font-sans bg-white dark:bg-gray-950 text-gray-800 dark:text-gray-200 flex">
        {isMobile && (isNavSidebarOpen || isRightSidebarOpen || isFilesSidebarOpen) && (
          <div 
            className="fixed inset-0 bg-black/50 z-20"
            onClick={closeAllSidebars}
          />
        )}
        <NavigationSidebar
          isSidebarOpen={isNavSidebarOpen}
          onNewChat={handleNewChat}
          chatHistory={chatHistory}
          activeChatId={activeChatId}
          onSelectChat={handleSelectChat}
          onDeleteChat={handleDeleteChat}
          isMobile={isMobile}
        />
        
        <div className="flex-1 flex flex-col min-w-0 md:p-4">
            <header className="flex items-center justify-between pb-4 flex-shrink-0 max-md:p-2 max-md:pb-2 border-b md:border-none dark:border-gray-800">
                <div className="flex items-center gap-4 min-w-0">
                    <button onClick={toggleNavSidebar} className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200">
                        <PanelLeft className="h-6 w-6" />
                    </button>
                    <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-200 truncate hidden md:block" title={activeChat?.title}>
                      {activeChat?.title || 'New Chat'}
                    </h1>
                </div>
                <div className="flex items-center gap-2">
                    <HeaderModelSelector
                      selectedModel={selectedModel}
                      setSelectedModel={setSelectedModel}
                      modelOptions={combinedModelOptions}
                      isMobile={isMobile}
                    />
                    <button onClick={toggleFilesSidebar} className="text-gray-500 hover:text-gray-800 p-2 rounded-lg hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800">
                        <Settings2 className="h-5 w-5" />
                    </button>
                    <button onClick={toggleRightSidebar} className="text-gray-500 hover:text-gray-800 p-2 rounded-lg hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800">
                        <Settings className="h-5 w-5" />
                    </button>
                </div>
            </header>

            <div className="flex-1 flex min-h-0">
                <main className="flex-1 flex flex-col min-w-0 bg-white dark:bg-gray-900 md:border border-gray-200 dark:border-gray-700 md:rounded-lg overflow-hidden">
                    <ChatArea
                        messages={messages}
                        onSendMessage={handleSendMessage}
                        isLoading={isLoading}
                    />
                </main>

                <Sidebar
                    selectedModel={selectedModel}
                    setSelectedModel={setSelectedModel}
                    isSidebarOpen={isRightSidebarOpen}
                    modelOptions={combinedModelOptions}
                    systemInstruction={systemInstruction}
                    setSystemInstruction={setSystemInstruction}
                    temperature={temperature}
                    setTemperature={setTemperature}
                    topP={topP}
                    setTopP={setTopP}
                    maxOutputTokens={maxOutputTokens}
                    setMaxOutputTokens={setMaxOutputTokens}
                    stopSequence={stopSequence}
                    setStopSequence={setStopSequence}
                    tokenCount={tokenCount}
                    modelMaxTokens={modelMaxTokens[selectedModel] || 8192}
                    mediaResolution={mediaResolution}
                    setMediaResolution={setMediaResolution}
                    useThinking={useThinking}
                    setUseThinking={setUseThinking}
                    useThinkingBudget={useThinkingBudget}
                    setUseThinkingBudget={setUseThinkingBudget}
                    thinkingBudget={thinkingBudget}
                    setThinkingBudget={setThinkingBudget}
                    useStructuredOutput={useStructuredOutput}
                    setUseStructuredOutput={toggleStructuredOutput}
                    openSchemaModal={openSchemaModal}
                    useCodeExecution={useCodeExecution}
                    setUseCodeExecution={setUseCodeExecution}
                    useFunctionCalling={useFunctionCalling}
                    setUseFunctionCalling={setUseFunctionCalling}
                    openFunctionModal={openFunctionModal}
                    useGoogleSearch={useGoogleSearch}
                    setUseGoogleSearch={toggleGoogleSearch}
                    useUrlContext={useUrlContext}
                    setUseUrlContext={setUseUrlContext}
                    urlContext={urlContext}
                    setUrlContext={setUrlContext}
                    isMobile={isMobile}
                />
                <FilesSidebar 
                    isSidebarOpen={isFilesSidebarOpen} 
                    messages={messages} 
                    onDeleteAttachment={handleDeleteAttachment}
                    chatHistory={chatHistory}
                    tunedModels={tunedModels}
                    onStartTuning={handleStartTuning}
                    onUpdateTuning={handleUpdateTuning}
                    modelOptions={modelOptions}
                    isMobile={isMobile}
                />
            </div>
        </div>
        <Modal
            isOpen={isSchemaModalOpen}
            onClose={() => setIsSchemaModalOpen(false)}
            onSave={saveSchema}
            title="Edit Structured Output Schema"
            content={tempSchema}
            setContent={setTempSchema}
            placeholder={placeholderSchema}
            helpText="Define the JSON schema for the model's output. The model will be forced to return JSON matching this schema."
        />
        <Modal
            isOpen={isFunctionModalOpen}
            onClose={() => setIsFunctionModalOpen(false)}
            onSave={saveDeclarations}
            title="Edit Function Declarations"
            content={tempDeclarations}
            setContent={setTempDeclarations}
            placeholder={placeholderDeclarations}
            helpText={
              <>
                Define functions the model can call. See the{' '}
                <a
                  href="https://ai.google.dev/docs/function_calling"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  documentation
                </a>{' '}
                for the correct format.
              </>
            }
        />
    </div>
  );
};

export default App;
