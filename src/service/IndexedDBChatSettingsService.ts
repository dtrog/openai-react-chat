import Dexie from 'dexie';
import {ChatSettings} from '../models/ChatSettings';
import initialData from './chatSettingsData.json';
import {EventEmitter} from "./EventEmitter";

export interface ChatSettingsChangeEvent {
  action: 'edit' | 'delete',
  gid: number
}

export const indexedDBChatSettingsEmitter = new EventEmitter<ChatSettingsChangeEvent>();

class IndexedDBChatSettingsDB extends Dexie {
  chatSettings: Dexie.Table<ChatSettings, number>;

  constructor() {
    super("chatSettingsDB");
    this.version(1).stores({
      chatSettings: '&id, name, description, instructions, model, seed, temperature, top_p, icon'
    });
    this.version(2).stores({
      chatSettings: '&id, name, description, instructions, model, seed, temperature, top_p, icon, showInSidebar'
    }).upgrade(tx => {
      return tx.table('chatSettings').toCollection().modify(chatSetting => {
        chatSetting.showInSidebar = false;
      });
    });
    this.version(3).stores({
      chatSettings: '&id, name, description, instructions, model, seed, temperature, top_p, icon, showInSidebar'
    }).upgrade(tx => {
      return tx.table('chatSettings').toCollection().modify(chatSetting => {
        chatSetting.showInSidebar = chatSetting.showInSidebar ? 1 : 0;
      });
    });
    this.version(4).stores({
      chatSettings: '&id, name, description, model, showInSidebar'
    })
    this.version(5).stores({
      chatSettings: '&id, name, description, instructions, model, seed, temperature, top_p, icon, showInSidebar'
    })
    this.chatSettings = this.table("chatSettings");

    this.on('populate', () => {
      this.chatSettings.bulkAdd(initialData);
    });
  }
}

export async function getIndexedDBChatSettingsById(id: number): Promise<ChatSettings | undefined> {
  const db: IndexedDBChatSettingsDB = new IndexedDBChatSettingsDB();
  return db.chatSettings.get(id);
}

export async function updateIndexedDBShowInSidebar(id: number, showInSidebar: number) {
  try {
    await indexedDBChatSettingsDB.chatSettings.update(id, {showInSidebar});
    let event: ChatSettingsChangeEvent = {action: 'edit', gid: id};
    indexedDBChatSettingsEmitter.emit('chatSettingsChanged', event);
  } catch (error) {
    console.error('Failed to update:', error);
  }
}

export async function deleteIndexedDBChatSetting(id: number) {
  try {
    await indexedDBChatSettingsDB.chatSettings.delete(id);
    let event: ChatSettingsChangeEvent = {action: 'delete', gid: id};
    indexedDBChatSettingsEmitter.emit('chatSettingsChanged', event);
  } catch (error) {
    console.error('Failed to update:', error);
  }
}

const indexedDBChatSettingsDB = new IndexedDBChatSettingsDB();

export default indexedDBChatSettingsDB;