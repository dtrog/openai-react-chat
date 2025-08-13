// This file now serves as a compatibility layer that chooses between SQLite and IndexedDB
// Import types and re-export them for compatibility
export type {
  Conversation,
  ConversationChangeEvent
} from './DatabaseFactory';

export {
  conversationsEmitter,
  ConversationService as default
} from './DatabaseFactory';
