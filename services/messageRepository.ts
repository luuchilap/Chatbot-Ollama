import { dbService } from './dbService';

// Message interface
export interface Message {
  id?: number;
  session_id: number;
  sender: 'user' | 'assistant';
  content: string;
  created_at?: Date;
  message_type?: string;
  sources?: any;
}

// Message Repository Class
export class MessageRepository {
  // Create a new message
  public async createMessage(message: Message): Promise<Message> {
    const query = `
      INSERT INTO messages (session_id, sender, content, message_type, sources)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const params = [
      message.session_id,
      message.sender,
      message.content,
      message.message_type || 'text',
      message.sources ? JSON.stringify(message.sources) : null
    ];
    const result = await dbService.query(query, params);
    return result[0];
  }

  // Get message by ID
  public async getMessageById(id: number): Promise<Message | null> {
    const query = 'SELECT * FROM messages WHERE id = $1';
    const result = await dbService.query(query, [id]);
    return result.length > 0 ? result[0] : null;
  }

  // Get all messages for a session
  public async getMessagesBySessionId(sessionId: number): Promise<Message[]> {
    const query = 'SELECT * FROM messages WHERE session_id = $1 ORDER BY created_at ASC';
    return await dbService.query(query, [sessionId]);
  }

  // Get last message for a session
  public async getLastMessageBySessionId(sessionId: number): Promise<Message | null> {
    const query = `
      SELECT * FROM messages 
      WHERE session_id = $1 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    const result = await dbService.query(query, [sessionId]);
    return result.length > 0 ? result[0] : null;
  }

  // Update a message
  public async updateMessage(id: number, message: Partial<Message>): Promise<Message | null> {
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (message.content !== undefined) {
      updateFields.push(`content = $${paramCount}`);
      values.push(message.content);
      paramCount++;
    }

    if (message.message_type !== undefined) {
      updateFields.push(`message_type = $${paramCount}`);
      values.push(message.message_type);
      paramCount++;
    }

    if (message.sources !== undefined) {
      updateFields.push(`sources = $${paramCount}`);
      values.push(JSON.stringify(message.sources));
      paramCount++;
    }

    if (updateFields.length === 0) {
      return null;
    }

    values.push(id);
    const query = `
      UPDATE messages
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await dbService.query(query, values);
    return result.length > 0 ? result[0] : null;
  }

  // Delete a message
  public async deleteMessage(id: number): Promise<boolean> {
    const query = 'DELETE FROM messages WHERE id = $1 RETURNING *';
    const result = await dbService.query(query, [id]);
    return result.length > 0;
  }

  // Delete all messages for a session
  public async deleteMessagesBySessionId(sessionId: number): Promise<boolean> {
    const query = 'DELETE FROM messages WHERE session_id = $1 RETURNING *';
    const result = await dbService.query(query, [sessionId]);
    return result.length > 0;
  }

  // Get message count for a session
  public async getMessageCountBySessionId(sessionId: number): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM messages WHERE session_id = $1';
    const result = await dbService.query(query, [sessionId]);
    return parseInt(result[0].count);
  }
}

// Export singleton instance
export const messageRepository = new MessageRepository(); 