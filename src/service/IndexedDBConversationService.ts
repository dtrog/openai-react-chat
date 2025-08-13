import Dexie from 'dexie';
import {EventEmitter} from "./EventEmitter";
import IndexedDBFileDataService from './IndexedDBFileDataService';
import { ChatMessage } from '../models/ChatCompletion';

export interface Conversation {
  id: number;
  gid: number;
  timestamp: number;
  title: string;
  model: string | null,
  systemPrompt: string,
  messages: string; // stringified ChatMessage[]
  marker?: boolean;
}

export interface ConversationChangeEvent {
  action: 'add' | 'edit' | 'delete',
  id: number,
  conversation?: Conversation, // not set on delete
}

class IndexedDBConversationDB extends Dexie {
  conversations: Dexie.Table<Conversation, number>;

  constructor() {
    super("conversationsDB");
    this.version(1).stores({
      conversations: '&id, gid, timestamp, title, model'
    });
    this.conversations = this.table("conversations");
  }
}

const db = new IndexedDBConversationDB();
const NUM_INITIAL_CONVERSATIONS = 200;

class IndexedDBConversationService {

  static async getConversationById(id: number): Promise<Conversation | undefined> {
    return db.conversations.get(id);
  }

  static async getChatMessages(conversation: Conversation): Promise<ChatMessage[]> {
    const messages: ChatMessage[] = JSON.parse(conversation.messages);

    const messagesWithFileDataPromises = messages.map(async (message) => {
      if (!message.fileDataRef) {
        return message;
      }
      const fileDataRefsPromises = (message.fileDataRef || []).map(async (fileDataRef) => {
        fileDataRef.fileData = await IndexedDBFileDataService.getFileData(fileDataRef.id) || null;
        return fileDataRef;
      });

      message.fileDataRef = await Promise.all(fileDataRefsPromises);
      return message;
    });

    // Wait for all messages to have their fileDataRefs loaded
    return Promise.all(messagesWithFileDataPromises);
  }

  static async searchConversationsByTitle(searchString: string): Promise<Conversation[]> {
    searchString = searchString.toLowerCase();
    return db.conversations
      .filter(conversation => conversation.title.toLowerCase().includes(searchString))
      .toArray();
  }

  static async searchWithinConversations(searchString: string): Promise<Conversation[]> {
    return db.conversations
        .filter(conversation => conversation.messages.includes(searchString))
        .toArray();
  }

  static async addConversation(conversation: Conversation): Promise<void> {
    await db.conversations.add(conversation);
    let event: ConversationChangeEvent = {action: 'add', id: conversation.id, conversation: conversation};
    indexedDBConversationsEmitter.emit('conversationChangeEvent', event);
  }

  static deepCopyChatMessages(messages: ChatMessage[]): ChatMessage[] {
    return messages.map(msg => ({
      ...msg,
      fileDataRef: msg.fileDataRef?.map(fileRef => ({
        ...fileRef,
        fileData: fileRef.fileData ? { ...fileRef.fileData } : null,
      }))
    }));
  }

  static async updateConversation(conversation: Conversation, messages: ChatMessage[]): Promise<void> {
    const messagesCopy = IndexedDBConversationService.deepCopyChatMessages(messages);

    for (let i = 0; i < messagesCopy.length; i++) {
      const fileDataRefs = messagesCopy[i].fileDataRef;
      if (fileDataRefs) {
        for (let j = 0; j < fileDataRefs.length; j++) {
          const fileRef = fileDataRefs[j];
          if (fileRef.id === 0 && fileRef.fileData) {
            const fileId = await IndexedDBFileDataService.addFileData(fileRef.fileData);
            // Update the ID in both messagesCopy and the original messages array
            fileDataRefs[j].id = fileId;
            messages[i].fileDataRef![j].id = fileId;
          }
          // Set the fileData to null after processing
          fileDataRefs[j].fileData = null;
        }
      }
    }

    conversation.messages = JSON.stringify(messagesCopy);
    await db.conversations.put(conversation);
    let event: ConversationChangeEvent = {action: 'edit', id: conversation.id, conversation: conversation};
    indexedDBConversationsEmitter.emit('conversationChangeEvent', event);
  }

  static async updateConversationPartial(conversation: Conversation, changes: any): Promise<number> {
    return db.conversations.update(conversation.id, changes);
  }

  static async deleteConversation(id: number): Promise<void> {
    const conversation = await db.conversations.get(id);
    if (conversation) {
      const messages: ChatMessage[] = JSON.parse(conversation.messages);

      for (let message of messages) {
        if (message.fileDataRef && message.fileDataRef.length > 0) {
          await Promise.all(message.fileDataRef.map(async (fileRef) => {
            if (fileRef.id) {
              await IndexedDBFileDataService.deleteFileData(fileRef.id);
            }
          }));
        }
      }
      await db.conversations.delete(id);

      let event: ConversationChangeEvent = {action: 'delete', id: id};
      indexedDBConversationsEmitter.emit('conversationChangeEvent', event);
    } else {
      console.log(`Conversation with ID ${id} not found.`);
    }
  }

  static async deleteAllConversations(): Promise<void> {
    await db.conversations.clear();
    await IndexedDBFileDataService.deleteAllFileData();
    let event: ConversationChangeEvent = {action: 'delete', id: 0};
    indexedDBConversationsEmitter.emit('conversationChangeEvent', event);
  }

  static async loadRecentConversationsTitleOnly(): Promise<Conversation[]> {
    try {
      const conversations = await db.conversations
        .orderBy('timestamp')
        .reverse()
        .limit(NUM_INITIAL_CONVERSATIONS)
        .toArray(conversations => conversations.map(conversation => {
          const conversationWithEmptyMessages = {...conversation, messages: "[]"};
          return conversationWithEmptyMessages;
        }));
      return conversations;
    } catch (error) {
      console.error("Error loading recent conversations:", error);
      throw error;
    }
  }

  static async countConversationsByGid(id: number): Promise<number> {
    return db.conversations
        .where('gid').equals(id)
        .count();
  }

  static async deleteConversationsByGid(gid: number): Promise<void> {
    const conversationsToDelete = await db.conversations
      .where('gid').equals(gid).toArray();
    for (const conversation of conversationsToDelete) {
      await IndexedDBConversationService.deleteConversation(conversation.id);
    }
    let event: ConversationChangeEvent = {action: 'delete', id: 0};
    indexedDBConversationsEmitter.emit('conversationChangeEvent', event);
  }
}

export const indexedDBConversationsEmitter = new EventEmitter<ConversationChangeEvent>();
export default IndexedDBConversationService;