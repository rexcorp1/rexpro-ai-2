

export enum Model {
  GEMINI_2_5_PRO = 'gemini-2.5-pro',
  GEMINI_2_5_FLASH = 'gemini-2.5-flash',
  GEMINI_2_5_FLASH_LITE = 'gemini-2.5-flash-lite',
  GEMINI_2_0_FLASH = 'gemini-2.0-flash',
  GEMINI_2_0_FLASH_PREVIEW_IMAGE_GENERATION = 'gemini-2.0-flash-preview-image-generation',
  GEMINI_2_0_FLASH_LITE = 'gemini-2.0-flash-lite',
  GEMMA_3N_E2B = 'gemma-3n-e2b-it',
  GEMMA_3N_E4B = 'gemma-3n-e4b-it',
  GEMMA_3_1B = 'gemma-3-1b-it',
  GEMMA_3_4B = 'gemma-3-4b-it',
  GEMMA_3_12B = 'gemma-3-12b-it',
  GEMMA_3_27B = 'gemma-3-27b-it',
}

export enum Role {
  USER = 'user',
  MODEL = 'model',
}

export interface Attachment {
  name: string;
  mimeType: string;
  dataUrl: string;
}

export interface ChatMessage {
  role: Role;
  content: string;
  attachments?: Attachment[];
  reasoning?: string;
  isThinking?: boolean;
  isParsingReasoning?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
}

export enum MediaResolution {
    DEFAULT = 'default',
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
}

export enum TuningStatus {
  TRAINING = 'TRAINING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface TrainingFile {
  name: string;
  mimeType: string;
  dataUrl: string;
}

export interface TunedModel {
  id: string;
  displayName: string;
  baseModel: Model;
  systemInstruction: string;
  trainingFiles: TrainingFile[];
  sourceUrls?: string[];
  status: TuningStatus;
}
