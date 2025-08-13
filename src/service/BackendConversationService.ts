import { ChatMessage } from '../models/ChatCompletion';
import { BackendAPI } from './BackendAPI';
import { EventEmitter } from './EventEmitter';
import BackendFileDataService from './BackendFileDataService';

export interface Conversation {
  id: number;
  gid: number;
  timestamp: number;
  title: string;
  model: string | null;
  systemPrompt: string;
  messages: string; // stringified ChatMessage[]
  marker?: boolean;
}

export interface ConversationChangeEvent {
  action: 'add' | 'edit' | 'delete';
  id: number;
  conversation?: Conversation; // not set on delete
}

export const conversationsEmitter = new EventEmitter<ConversationChangeEvent>();

export class BackendConversationService {

  static async getConversationById(id: number): Promise<Conversation | undefined> {
    try {
      const conversation = await BackendAPI.get<any>(`/conversations/${id}`);
      // Convert back to the expected format
      return {
        ...conversation,
        messages: JSON.stringify(conversation.messages)
      };
    } catch (error: any) {
      if (error.status === 404) {
        return undefined;
      }
      throw error;
    }
  }

  static async getChatMessages(conversation: Conversation): Promise<ChatMessage[]> {
    const messages: ChatMessage[] = JSON.parse(conversation.messages);

    const messagesWithFileDataPromises = messages.map(async (message) => {
      if (!message.fileDataRef) {
        return message;
      }
      
      const fileDataRefsPromises = (message.fileDataRef || []).map(async (fileDataRef) => {
        fileDataRef.fileData = await BackendFileDataService.getFileData(fileDataRef.id) || null;
        return fileDataRef;
      });

      message.fileDataRef = await Promise.all(fileDataRefsPromises);
      return message;
    });

    // Wait for all messages to have their fileDataRefs loaded
    return Promise.all(messagesWithFileDataPromises);
  }

  static async searchConversationsByTitle(searchString: string): Promise<Conversation[]> {
    const conversations = await BackendAPI.get<any[]>(`/conversations/search/title?q=${encodeURIComponent(searchString)}`);
    // Convert back to the expected format
    return conversations.map(conv => ({
      ...conv,
      messages: JSON.stringify(conv.messages)
    }));
  }

  static async searchWithinConversations(searchString: string): Promise<Conversation[]> {
    const conversations = await BackendAPI.get<any[]>(`/conversations/search/messages?q=${encodeURIComponent(searchString)}`);
    // Convert back to the expected format
    return conversations.map(conv => ({
      ...conv,
      messages: JSON.stringify(conv.messages)
    }));
  }

  static async addConversation(conversation: Conversation): Promise<void> {
    const conversationToSend = {
      ...conversation,
      messages: JSON.parse(conversation.messages)
    };
    
    await BackendAPI.post('/conversations', conversationToSend);
    let event: ConversationChangeEvent = { action: 'add', id: conversation.id, conversation: conversation };
    conversationsEmitter.emit('conversationChangeEvent', event);
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
    const messagesCopy = BackendConversationService.deepCopyChatMessages(messages);

    for (let i = 0; i < messagesCopy.length; i++) {
      const fileDataRefs = messagesCopy[i].fileDataRef;
      if (fileDataRefs) {
        for (let j = 0; j < fileDataRefs.length; j++) {
          const fileRef = fileDataRefs[j];
          if (fileRef.id === 0 && fileRef.fileData) {
            const fileId = await BackendFileDataService.addFileData(fileRef.fileData);
            // Update the ID in both messagesCopy and the original messages array
            fileDataRefs[j].id = fileId;
            messages[i].fileDataRef![j].id = fileId;
          }
          // Set the fileData to null after processing
          fileDataRefs[j].fileData = null;
        }
      }
    }

    const updatedConversation = {
      ...conversation,
      messages: messagesCopy
    };

    await BackendAPI.put(`/conversations/${conversation.id}`, updatedConversation);
    let event: ConversationChangeEvent = { action: 'edit', id: conversation.id, conversation: conversation };
    conversationsEmitter.emit('conversationChangeEvent', event);
  }

  static async updateConversationPartial(conversation: Conversation, changes: any): Promise<number> {
    const response = await BackendAPI.patch(`/conversations/${conversation.id}`, changes);
    // Return number of changes (1 if successful)
    return 1;
  }

  static async deleteConversation(id: number): Promise<void> {
    await BackendAPI.delete(`/conversations/${id}`);
    let event: ConversationChangeEvent = { action: 'delete', id: id };
    conversationsEmitter.emit('conversationChangeEvent', event);
  }

  static async deleteAllConversations(): Promise<void> {
    await BackendAPI.delete('/conversations');
    let event: ConversationChangeEvent = { action: 'delete', id: 0 };
    conversationsEmitter.emit('conversationChangeEvent', event);
  }

  static async loadRecentConversationsTitleOnly(): Promise<Conversation[]> {
    try {
      const conversations = await BackendAPI.get<any[]>('/conversations/recent/200');
      // Convert to expected format
      return conversations.map(conv => ({
        ...conv,
        messages: "[]" // Backend already returns empty messages
      }));
    } catch (error) {
      console.error("Error loading recent conversations:", error);
      throw error;
    }
  }

  static async countConversationsByGid(id: number): Promise<number> {
    const result = await BackendAPI.get<{ count: number }>(`/conversations/count/${id}`);
    return result.count;
  }

  static async deleteConversationsByGid(gid: number): Promise<void> {
    await BackendAPI.delete(`/conversations/gid/${gid}`);
    let event: ConversationChangeEvent = { action: 'delete', id: 0 };
    conversationsEmitter.emit('conversationChangeEvent', event);
  }
}

export default BackendConversationService;