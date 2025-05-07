import { dbService } from './dbService';

// RetrievalLog interface
export interface RetrievalLog {
  id?: number;
  session_id: number;
  user_question: string;
  retrieved_section_ids: number[];
  created_at?: Date;
}

// RetrievalLog Repository Class
export class RetrievalLogRepository {
  // Create a new retrieval log
  public async createLog(log: RetrievalLog): Promise<RetrievalLog> {
    const query = `
      INSERT INTO retrieval_logs (session_id, user_question, retrieved_section_ids)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const params = [
      log.session_id,
      log.user_question,
      log.retrieved_section_ids || []
    ];
    const result = await dbService.query(query, params);
    return result[0];
  }

  // Get all logs for a session
  public async getLogsBySessionId(sessionId: number): Promise<RetrievalLog[]> {
    const query = 'SELECT * FROM retrieval_logs WHERE session_id = $1 ORDER BY created_at DESC';
    return await dbService.query(query, [sessionId]);
  }

  // Get log by ID
  public async getLogById(id: number): Promise<RetrievalLog | null> {
    const query = 'SELECT * FROM retrieval_logs WHERE id = $1';
    const result = await dbService.query(query, [id]);
    return result.length > 0 ? result[0] : null;
  }

  // Update a retrieval log
  public async updateLog(id: number, log: Partial<RetrievalLog>): Promise<RetrievalLog | null> {
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (log.user_question !== undefined) {
      updateFields.push(`user_question = $${paramCount}`);
      values.push(log.user_question);
      paramCount++;
    }

    if (log.retrieved_section_ids !== undefined) {
      updateFields.push(`retrieved_section_ids = $${paramCount}`);
      values.push(log.retrieved_section_ids);
      paramCount++;
    }

    if (updateFields.length === 0) {
      return null;
    }

    values.push(id);
    const query = `
      UPDATE retrieval_logs
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await dbService.query(query, values);
    return result.length > 0 ? result[0] : null;
  }

  // Delete a retrieval log
  public async deleteLog(id: number): Promise<boolean> {
    const query = 'DELETE FROM retrieval_logs WHERE id = $1 RETURNING *';
    const result = await dbService.query(query, [id]);
    return result.length > 0;
  }

  // Delete all logs for a session
  public async deleteLogsBySessionId(sessionId: number): Promise<boolean> {
    const query = 'DELETE FROM retrieval_logs WHERE session_id = $1 RETURNING *';
    const result = await dbService.query(query, [sessionId]);
    return result.length > 0;
  }

  // Get statistics about which document sections are most frequently retrieved
  public async getTopRetrievedSections(limit: number = 10): Promise<{ section_id: number; count: number }[]> {
    const query = `
      SELECT section_id, COUNT(*) as count
      FROM (
        SELECT unnest(retrieved_section_ids) as section_id
        FROM retrieval_logs
      ) as expanded_logs
      GROUP BY section_id
      ORDER BY count DESC
      LIMIT $1
    `;
    
    return await dbService.query(query, [limit]);
  }
}

// Export singleton instance
export const retrievalLogRepository = new RetrievalLogRepository(); 