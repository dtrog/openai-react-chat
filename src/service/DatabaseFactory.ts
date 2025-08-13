// Database factory that chooses between SQLite (backend) and IndexedDB (browser) based on environment configuration

import { ChatSettings } from '../models/ChatSettings';
import { FileData } from '../models/FileData';

// Import both implementations
import { BackendChatSettingsService, chatSettingsEmitter as backendChatSettingsEmitter } from './BackendChatSettingsService';
import BackendConversationService, { conversationsEmitter as backendConversationsEmitter, Conversation, ConversationChangeEvent } from './BackendConversationService';
import BackendFileDataService from './BackendFileDataService';

import indexedDBChatSettingsDB, { indexedDBChatSettingsEmitter, getIndexedDBChatSettingsById, updateIndexedDBShowInSidebar, deleteIndexedDBChatSetting } from './IndexedDBChatSettingsService';
import IndexedDBConversationService, { indexedDBConversationsEmitter } from './IndexedDBConversationService';
import IndexedDBFileDataService from './IndexedDBFileDataService';

// Configuration
const DB_MODE = import.meta.env.VITE_DB_MODE || 'sqlite';

// Determine which implementation to use
const useBackend = DB_MODE.toLowerCase() === 'sqlite';

console.log(`Database mode: ${useBackend ? 'SQLite (Backend)' : 'IndexedDB (Browser)'}`);

// Chat Settings Service
export interface ChatSettingsChangeEvent {
  action: 'edit' | 'delete';
  gid: number;
}

class ChatSettingsService {
  static async getChatSettingsById(id: number): Promise<ChatSettings | undefined> {
    if (useBackend) {
      return BackendChatSettingsService.getChatSettingsById(id);
    } else {
      return getIndexedDBChatSettingsById(id);
    }
  }

  static async getAllChatSettings(): Promise<ChatSettings[]> {
    if (useBackend) {
      return BackendChatSettingsService.getAllChatSettings();
    } else {
      return indexedDBChatSettingsDB.chatSettings.toArray();
    }
  }

  static async addChatSetting(chatSetting: ChatSettings): Promise<void> {
    if (useBackend) {
      return BackendChatSettingsService.addChatSetting(chatSetting);
    } else {
      await indexedDBChatSettingsDB.chatSettings.add(chatSetting);
    }
  }

  static async updateChatSetting(id: number, chatSetting: ChatSettings): Promise<void> {
    if (useBackend) {
      return BackendChatSettingsService.updateChatSetting(id, chatSetting);
    } else {
      await indexedDBChatSettingsDB.chatSettings.update(id, chatSetting);
    }
  }

  static async updateShowInSidebar(id: number, showInSidebar: number): Promise<void> {
    if (useBackend) {
      return BackendChatSettingsService.updateShowInSidebar(id, showInSidebar);
    } else {
      return updateIndexedDBShowInSidebar(id, showInSidebar);
    }
  }

  static async deleteChatSetting(id: number): Promise<void> {
    if (useBackend) {
      return BackendChatSettingsService.deleteChatSetting(id);
    } else {
      return deleteIndexedDBChatSetting(id);
    }
  }
}

// Create unified emitter
class UnifiedEventEmitter<T> {
  private backendEmitter: any;
  private indexedDBEmitter: any;

  constructor(backendEmitter: any, indexedDBEmitter: any) {
    this.backendEmitter = backendEmitter;
    this.indexedDBEmitter = indexedDBEmitter;
  }

  emit(event: string, data: T) {
    if (useBackend) {
      this.backendEmitter.emit(event, data);
    } else {
      this.indexedDBEmitter.emit(event, data);
    }
  }

  on(event: string, callback: (data: T) => void) {
    if (useBackend) {
      this.backendEmitter.on(event, callback);
    } else {
      this.indexedDBEmitter.on(event, callback);
    }
  }

  off(event: string, callback: (data: T) => void) {
    if (useBackend) {
      this.backendEmitter.off(event, callback);
    } else {
      this.indexedDBEmitter.off(event, callback);
    }
  }
}

// Chat Settings compatibility layer
const chatSettingsDB = {
  chatSettings: {
    add: (chatSetting: ChatSettings) => ChatSettingsService.addChatSetting(chatSetting),
    update: (id: number, changes: Partial<ChatSettings>) => {
      return ChatSettingsService.getChatSettingsById(id).then(existing => {
        if (!existing) throw new Error('Chat setting not found');
        const updated = { ...existing, ...changes };
        return ChatSettingsService.updateChatSetting(id, updated);
      });
    },
    get: (id: number) => ChatSettingsService.getChatSettingsById(id),
    delete: (id: number) => ChatSettingsService.deleteChatSetting(id),
    toArray: () => ChatSettingsService.getAllChatSettings(),
    
    // Dexie-compatible methods
    where: (field: string) => ({
      equals: (value: any) => ({
        and: (predicate: (item: ChatSettings) => boolean) => ({
          toArray: async () => {
            const allSettings = await ChatSettingsService.getAllChatSettings();
            return allSettings.filter(setting => 
              (setting as any)[field] === value && predicate(setting)
            );
          }
        }),
        sortBy: async (sortField: string) => {
          const allSettings = await ChatSettingsService.getAllChatSettings();
          const filtered = allSettings.filter(setting => (setting as any)[field] === value);
          return filtered.sort((a, b) => {
            const aVal = (a as any)[sortField];
            const bVal = (b as any)[sortField];
            if (typeof aVal === 'string' && typeof bVal === 'string') {
              return aVal.localeCompare(bVal);
            }
            return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
          });
        },
        toArray: async () => {
          const allSettings = await ChatSettingsService.getAllChatSettings();
          return allSettings.filter(setting => (setting as any)[field] === value);
        }
      })
    }),
    
    orderBy: (field: string) => ({
      reverse: () => ({
        filter: (predicate: (item: ChatSettings) => boolean) => ({
          toArray: async () => {
            const allSettings = await ChatSettingsService.getAllChatSettings();
            const filtered = allSettings.filter(predicate);
            return filtered.sort((a, b) => {
              const aVal = (a as any)[field];
              const bVal = (b as any)[field];
              return bVal > aVal ? 1 : bVal < aVal ? -1 : 0;
            });
          }
        }),
        toArray: async () => {
          const allSettings = await ChatSettingsService.getAllChatSettings();
          return allSettings.sort((a, b) => {
            const aVal = (a as any)[field];
            const bVal = (b as any)[field];
            return bVal > aVal ? 1 : bVal < aVal ? -1 : 0;
          });
        }
      }),
      toArray: async () => {
        const allSettings = await ChatSettingsService.getAllChatSettings();
        return allSettings.sort((a, b) => {
          const aVal = (a as any)[field];
          const bVal = (b as any)[field];
          return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        });
      }
    })
  }
};

// Conversation Service
class ConversationService {
  static async getConversationById(id: number): Promise<Conversation | undefined> {
    if (useBackend) {
      return BackendConversationService.getConversationById(id);
    } else {
      return IndexedDBConversationService.getConversationById(id);
    }
  }

  static async getChatMessages(conversation: Conversation): Promise<any[]> {
    if (useBackend) {
      return BackendConversationService.getChatMessages(conversation);
    } else {
      return IndexedDBConversationService.getChatMessages(conversation);
    }
  }

  static async searchConversationsByTitle(searchString: string): Promise<Conversation[]> {
    if (useBackend) {
      return BackendConversationService.searchConversationsByTitle(searchString);
    } else {
      return IndexedDBConversationService.searchConversationsByTitle(searchString);
    }
  }

  static async searchWithinConversations(searchString: string): Promise<Conversation[]> {
    if (useBackend) {
      return BackendConversationService.searchWithinConversations(searchString);
    } else {
      return IndexedDBConversationService.searchWithinConversations(searchString);
    }
  }

  static async addConversation(conversation: Conversation): Promise<void> {
    if (useBackend) {
      return BackendConversationService.addConversation(conversation);
    } else {
      return IndexedDBConversationService.addConversation(conversation);
    }
  }

  static deepCopyChatMessages(messages: any[]): any[] {
    if (useBackend) {
      return BackendConversationService.deepCopyChatMessages(messages);
    } else {
      return IndexedDBConversationService.deepCopyChatMessages(messages);
    }
  }

  static async updateConversation(conversation: Conversation, messages: any[]): Promise<void> {
    if (useBackend) {
      return BackendConversationService.updateConversation(conversation, messages);
    } else {
      return IndexedDBConversationService.updateConversation(conversation, messages);
    }
  }

  static async updateConversationPartial(conversation: Conversation, changes: any): Promise<number> {
    if (useBackend) {
      return BackendConversationService.updateConversationPartial(conversation, changes);
    } else {
      return IndexedDBConversationService.updateConversationPartial(conversation, changes);
    }
  }

  static async deleteConversation(id: number): Promise<void> {
    if (useBackend) {
      return BackendConversationService.deleteConversation(id);
    } else {
      return IndexedDBConversationService.deleteConversation(id);
    }
  }

  static async deleteAllConversations(): Promise<void> {
    if (useBackend) {
      return BackendConversationService.deleteAllConversations();
    } else {
      return IndexedDBConversationService.deleteAllConversations();
    }
  }

  static async loadRecentConversationsTitleOnly(): Promise<Conversation[]> {
    if (useBackend) {
      return BackendConversationService.loadRecentConversationsTitleOnly();
    } else {
      return IndexedDBConversationService.loadRecentConversationsTitleOnly();
    }
  }

  static async countConversationsByGid(id: number): Promise<number> {
    if (useBackend) {
      return BackendConversationService.countConversationsByGid(id);
    } else {
      return IndexedDBConversationService.countConversationsByGid(id);
    }
  }

  static async deleteConversationsByGid(gid: number): Promise<void> {
    if (useBackend) {
      return BackendConversationService.deleteConversationsByGid(gid);
    } else {
      return IndexedDBConversationService.deleteConversationsByGid(gid);
    }
  }
}

// File Data Service
class FileDataService {
  static async getFileData(id: number): Promise<FileData | undefined> {
    if (useBackend) {
      return BackendFileDataService.getFileData(id);
    } else {
      return IndexedDBFileDataService.getFileData(id);
    }
  }

  static async addFileData(fileData: FileData): Promise<number> {
    if (useBackend) {
      return BackendFileDataService.addFileData(fileData);
    } else {
      return IndexedDBFileDataService.addFileData(fileData);
    }
  }

  static async updateFileData(id: number, changes: Partial<FileData>): Promise<number> {
    if (useBackend) {
      return BackendFileDataService.updateFileData(id, changes);
    } else {
      return IndexedDBFileDataService.updateFileData(id, changes);
    }
  }

  static async deleteFileData(id: number): Promise<void> {
    if (useBackend) {
      return BackendFileDataService.deleteFileData(id);
    } else {
      return IndexedDBFileDataService.deleteFileData(id);
    }
  }

  static async deleteAllFileData(): Promise<void> {
    if (useBackend) {
      return BackendFileDataService.deleteAllFileData();
    } else {
      return IndexedDBFileDataService.deleteAllFileData();
    }
  }
}

// Create unified emitters
export const chatSettingsEmitter = new UnifiedEventEmitter<ChatSettingsChangeEvent>(
  backendChatSettingsEmitter, 
  indexedDBChatSettingsEmitter
);

export const conversationsEmitter = new UnifiedEventEmitter<ConversationChangeEvent>(
  backendConversationsEmitter, 
  indexedDBConversationsEmitter
);

// Export services and compatibility functions
export { ChatSettingsService, ConversationService, FileDataService };
export { chatSettingsDB };
export type { Conversation, ConversationChangeEvent };

// Backward compatibility functions
export async function getChatSettingsById(id: number): Promise<ChatSettings | undefined> {
  return ChatSettingsService.getChatSettingsById(id);
}

export async function updateShowInSidebar(id: number, showInSidebar: number) {
  return ChatSettingsService.updateShowInSidebar(id, showInSidebar);
}

export async function deleteChatSetting(id: number) {
  return ChatSettingsService.deleteChatSetting(id);
}

// Export the chat settings db as default for compatibility
export default chatSettingsDB;