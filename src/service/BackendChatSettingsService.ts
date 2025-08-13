import { ChatSettings } from '../models/ChatSettings';
import { BackendAPI } from './BackendAPI';
import { EventEmitter } from './EventEmitter';

export interface ChatSettingsChangeEvent {
  action: 'edit' | 'delete',
  gid: number
}

export const chatSettingsEmitter = new EventEmitter<ChatSettingsChangeEvent>();

export class BackendChatSettingsService {
  
  static async getChatSettingsById(id: number): Promise<ChatSettings | undefined> {
    try {
      return await BackendAPI.get<ChatSettings>(`/chat-settings/${id}`);
    } catch (error: any) {
      if (error.status === 404) {
        return undefined;
      }
      throw error;
    }
  }

  static async getAllChatSettings(): Promise<ChatSettings[]> {
    return await BackendAPI.get<ChatSettings[]>('/chat-settings');
  }

  static async addChatSetting(chatSetting: ChatSettings): Promise<void> {
    await BackendAPI.post('/chat-settings', chatSetting);
    // Note: The backend will handle ID generation if not provided
  }

  static async updateChatSetting(id: number, chatSetting: ChatSettings): Promise<void> {
    await BackendAPI.put(`/chat-settings/${id}`, chatSetting);
    let event: ChatSettingsChangeEvent = { action: 'edit', gid: id };
    chatSettingsEmitter.emit('chatSettingsChanged', event);
  }

  static async updateShowInSidebar(id: number, showInSidebar: number): Promise<void> {
    try {
      await BackendAPI.patch(`/chat-settings/${id}/sidebar`, { showInSidebar });
      let event: ChatSettingsChangeEvent = { action: 'edit', gid: id };
      chatSettingsEmitter.emit('chatSettingsChanged', event);
    } catch (error) {
      console.error('Failed to update:', error);
      throw error;
    }
  }

  static async deleteChatSetting(id: number): Promise<void> {
    try {
      await BackendAPI.delete(`/chat-settings/${id}`);
      let event: ChatSettingsChangeEvent = { action: 'delete', gid: id };
      chatSettingsEmitter.emit('chatSettingsChanged', event);
    } catch (error) {
      console.error('Failed to delete:', error);
      throw error;
    }
  }
}

// For backward compatibility, export the same interface as the original
export async function getChatSettingsById(id: number): Promise<ChatSettings | undefined> {
  return BackendChatSettingsService.getChatSettingsById(id);
}

export async function updateShowInSidebar(id: number, showInSidebar: number) {
  return BackendChatSettingsService.updateShowInSidebar(id, showInSidebar);
}

export async function deleteChatSetting(id: number) {
  return BackendChatSettingsService.deleteChatSetting(id);
}

// Create a chatSettingsDB-like interface for compatibility
export const chatSettingsDB = {
  chatSettings: {
    add: (chatSetting: ChatSettings) => BackendChatSettingsService.addChatSetting(chatSetting),
    update: (id: number, changes: Partial<ChatSettings>) => {
      // For partial updates, we need to first get the existing setting
      return BackendChatSettingsService.getChatSettingsById(id).then(existing => {
        if (!existing) throw new Error('Chat setting not found');
        const updated = { ...existing, ...changes };
        return BackendChatSettingsService.updateChatSetting(id, updated);
      });
    },
    get: (id: number) => BackendChatSettingsService.getChatSettingsById(id),
    delete: (id: number) => BackendChatSettingsService.deleteChatSetting(id),
    toArray: () => BackendChatSettingsService.getAllChatSettings(),
    
    // Dexie-compatible methods
    where: (field: string) => ({
      equals: (value: any) => ({
        and: (predicate: (item: ChatSettings) => boolean) => ({
          toArray: async () => {
            const allSettings = await BackendChatSettingsService.getAllChatSettings();
            return allSettings.filter(setting => 
              (setting as any)[field] === value && predicate(setting)
            );
          }
        }),
        sortBy: async (sortField: string) => {
          const allSettings = await BackendChatSettingsService.getAllChatSettings();
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
          const allSettings = await BackendChatSettingsService.getAllChatSettings();
          return allSettings.filter(setting => (setting as any)[field] === value);
        }
      })
    }),
    
    orderBy: (field: string) => ({
      reverse: () => ({
        filter: (predicate: (item: ChatSettings) => boolean) => ({
          toArray: async () => {
            const allSettings = await BackendChatSettingsService.getAllChatSettings();
            const filtered = allSettings.filter(predicate);
            return filtered.sort((a, b) => {
              const aVal = (a as any)[field];
              const bVal = (b as any)[field];
              return bVal > aVal ? 1 : bVal < aVal ? -1 : 0;
            });
          }
        }),
        toArray: async () => {
          const allSettings = await BackendChatSettingsService.getAllChatSettings();
          return allSettings.sort((a, b) => {
            const aVal = (a as any)[field];
            const bVal = (b as any)[field];
            return bVal > aVal ? 1 : bVal < aVal ? -1 : 0;
          });
        }
      }),
      toArray: async () => {
        const allSettings = await BackendChatSettingsService.getAllChatSettings();
        return allSettings.sort((a, b) => {
          const aVal = (a as any)[field];
          const bVal = (b as any)[field];
          return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        });
      }
    })
  }
};

export default chatSettingsDB;