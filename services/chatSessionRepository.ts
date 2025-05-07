import { dbService } from './dbService';

// ChatSession interface
export interface ChatSession {
  id?: number;
  user_id: number;
  session_title?: string;
  started_at?: Date;
  ended_at?: Date | null;
  metadata?: any;
}

// ChatSession Repository Class
export class ChatSessionRepository {
  // Create a new chat session
  public async createSession(session: ChatSession): Promise<ChatSession> {
    const query = `
      INSERT INTO chat_sessions (user_id, session_title, metadata)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const params = [
      session.user_id,
      session.session_title || 'New Chat',
      session.metadata ? JSON.stringify(session.metadata) : '{}'
    ];
    const result = await dbService.query(query, params);
    return result[0];
  }

  // Get chat session by ID
  public async getSessionById(id: number): Promise<ChatSession | null> {
    const query = 'SELECT * FROM chat_sessions WHERE id = $1';
    const result = await dbService.query(query, [id]);
    return result.length > 0 ? result[0] : null;
  }

  // Get all chat sessions for a user
  public async getSessionsByUserId(userId: number): Promise<ChatSession[]> {
    const query = 'SELECT * FROM chat_sessions WHERE user_id = $1 ORDER BY started_at DESC';
    return await dbService.query(query, [userId]);
  }

  // Update a chat session
  public async updateSession(id: number, session: Partial<ChatSession>): Promise<ChatSession | null> {
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (session.session_title !== undefined) {
      updateFields.push(`session_title = $${paramCount}`);
      values.push(session.session_title);
      paramCount++;
    }

    if (session.ended_at !== undefined) {
      updateFields.push(`ended_at = $${paramCount}`);
      values.push(session.ended_at);
      paramCount++;
    }

    if (session.metadata !== undefined) {
      updateFields.push(`metadata = $${paramCount}`);
      values.push(JSON.stringify(session.metadata));
      paramCount++;
    }

    if (updateFields.length === 0) {
      return null;
    }

    values.push(id);
    const query = `
      UPDATE chat_sessions
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await dbService.query(query, values);
    return result.length > 0 ? result[0] : null;
  }

  // Delete a chat session
  public async deleteSession(id: number): Promise<boolean> {
    const query = 'DELETE FROM chat_sessions WHERE id = $1 RETURNING *';
    const result = await dbService.query(query, [id]);
    return result.length > 0;
  }

  // Close a chat session (set ended_at to current time)
  public async closeSession(id: number): Promise<ChatSession | null> {
    const query = `
      UPDATE chat_sessions
      SET ended_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const result = await dbService.query(query, [id]);
    return result.length > 0 ? result[0] : null;
  }

  // Get all active chat sessions for a user (not ended)
  public async getActiveSessionsByUserId(userId: number): Promise<ChatSession[]> {
    const query = `
      SELECT * FROM chat_sessions 
      WHERE user_id = $1 AND ended_at IS NULL 
      ORDER BY started_at DESC
    `;
    return await dbService.query(query, [userId]);
  }
}

// Export singleton instance
export const chatSessionRepository = new ChatSessionRepository(); 