import apiService from './apiService';

export interface Message {
  message_id: string;
  sender_id: string;
  recipient_id: string;
  sender_name: string;
  recipient_name: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface ConversationSummary {
  user_id: string;
  user_name: string;
  user_role: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
}

export interface UnreadCount {
  total_unread: number;
  unread_by_user: Array<{
    user_id: string;
    user_name: string;
    user_role: string;
    unread_count: number;
  }>;
}

class MessagingService {
  // Send a message
  async sendMessage(recipientId: string, content: string): Promise<Message> {
    return await apiService.post('/api/messages/', {
      recipient_id: recipientId,
      content: content,
    });
  }

  // Get conversation with a specific user
  async getConversation(
    otherUserId: string,
    limit: number = 50
  ): Promise<Message[]> {
    return await apiService.get(
      `/api/messages/conversation/${otherUserId}`,
      {params: {limit}}
    );
  }

  // Mark conversation as read
  async markConversationAsRead(otherUserId: string): Promise<void> {
    await apiService.post(`/api/messages/conversation/${otherUserId}/mark-read`);
  }

  // Get unread message count
  async getUnreadCount(): Promise<UnreadCount> {
    return await apiService.get('/api/messages/unread-count');
  }

  // Get list of conversations
  async getConversations(): Promise<ConversationSummary[]> {
    return await apiService.get('/api/messages/conversations');
  }
}

export default new MessagingService();
