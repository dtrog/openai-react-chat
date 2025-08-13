// This file now serves as a compatibility layer that chooses between SQLite and IndexedDB
// Import all exports from the database factory
export {
  chatSettingsEmitter,
  ChatSettingsService,
  getChatSettingsById,
  updateShowInSidebar,
  deleteChatSetting,
  chatSettingsDB as default
} from './DatabaseFactory';
export type { ChatSettingsChangeEvent } from './DatabaseFactory';

