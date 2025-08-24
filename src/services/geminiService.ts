import { GoogleGenAI, GenerateContentParameters, Tool, GenerateContentResponse, Content } from "@google/genai";
import { Model, ChatMessage } from '../types';

const API_KEY = import.meta.env.VITE_API_KEY;

if (!API_KEY) {
  throw new Error("VITE_API_KEY environment variable not set. Please check your .env file.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });
const DEFAULT_SYSTEM_INSTRUCTION = "You are a helpful assistant.";

interface StreamOptions {
  systemInstruction: string;
  config: {
    temperature?: number;
    topP?: number;
    maxOutputTokens?: number;
    stopSequences?: string[];
    responseMimeType?: "application/json";
    responseSchema?: any;
    tools?: Tool[];
    responseModalities?: ('IMAGE' | 'TEXT')[];
    thinkingConfig?: { thinkingBudget: number };
  };
}

const dataUrlToBase64 = (dataUrl: string): string => {
    return dataUrl.substring(dataUrl.indexOf(',') + 1);
};

const buildContents = (messages: ChatMessage[]): Content[] => {
    return messages.map(msg => {
        const parts = [];

        if (msg.content.trim()) {
            parts.push({ text: msg.content });
        }

        if (msg.attachments) {
            msg.attachments.forEach(file => {
                parts.push({
                    inlineData: {
                        mimeType: file.mimeType,
                        data: dataUrlToBase64(file.dataUrl)
                    }
                });
            });
        }
        
        return {
            role: msg.role,
            parts: parts,
        };
    });
};

export async function countTokens(messages: ChatMessage[], modelName: Model): Promise<number> {
  try {
    if (messages.length === 0) {
      return 0;
    }
    const contents = buildContents(messages);

    const response = await ai.models.countTokens({
      model: modelName,
      contents: contents,
    });

    return response.totalTokens;
  } catch (error) {
    console.error("Error counting tokens:", error);
    return 0;
  }
}

export async function streamChatResponse(
  messages: ChatMessage[], 
  modelName: Model, 
  options: StreamOptions, 
  onChunk: (chunk: GenerateContentResponse) => void
): Promise<void> {
  try {
    const contents = buildContents(messages);
    const isGemmaModel = modelName.startsWith('gemma');
    const isImageGenModel = modelName === Model.GEMINI_2_0_FLASH_PREVIEW_IMAGE_GENERATION;

    const params: GenerateContentParameters = {
        model: modelName,
        contents: contents,
        config: {
            ...options.config,
        },
    };
    
    if (isImageGenModel && params.config) {
      params.config.responseModalities = ['IMAGE', 'TEXT'];
    }

    // Gemma and Image Gen models do not support system instructions.
    if (!isGemmaModel && !isImageGenModel) {
        const finalSystemInstruction = (options.systemInstruction && options.systemInstruction.trim() !== '')
            ? options.systemInstruction
            : DEFAULT_SYSTEM_INSTRUCTION;
        if (params.config) {
            params.config.systemInstruction = finalSystemInstruction;
        }
    }

    // Clean up undefined properties to avoid sending them in the API call
    if (params.config) {
        Object.keys(params.config).forEach(key => {
            const configKey = key as keyof typeof params.config;
            if (params.config[configKey] === undefined) {
                delete params.config[configKey];
            }
        });
        if (params.config.tools && params.config.tools.length === 0) {
            delete params.config.tools;
        }
    }


    const response = await ai.models.generateContentStream(params);

    for await (const chunk of response) {
      onChunk(chunk);
    }
  } catch (error) {
    console.error("Error streaming chat response:", error);
    throw new Error("Failed to get streaming response from Gemini API.");
  }
}