import { dbService } from './dbService';

// Feedback interface
export interface Feedback {
  id?: number;
  message_id: number;
  user_id?: number;
  rating: number;
  comment?: string;
  created_at?: Date;
}

// Feedback Repository Class
export class FeedbackRepository {
  // Create a new feedback
  public async createFeedback(feedback: Feedback): Promise<Feedback> {
    const query = `
      INSERT INTO feedbacks (message_id, user_id, rating, comment)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const params = [
      feedback.message_id,
      feedback.user_id || null,
      feedback.rating,
      feedback.comment || null
    ];
    const result = await dbService.query(query, params);
    return result[0];
  }

  // Get feedback by ID
  public async getFeedbackById(id: number): Promise<Feedback | null> {
    const query = 'SELECT * FROM feedbacks WHERE id = $1';
    const result = await dbService.query(query, [id]);
    return result.length > 0 ? result[0] : null;
  }

  // Get all feedback for a message
  public async getFeedbackByMessageId(messageId: number): Promise<Feedback[]> {
    const query = 'SELECT * FROM feedbacks WHERE message_id = $1 ORDER BY created_at DESC';
    return await dbService.query(query, [messageId]);
  }

  // Get all feedback from a user
  public async getFeedbackByUserId(userId: number): Promise<Feedback[]> {
    const query = 'SELECT * FROM feedbacks WHERE user_id = $1 ORDER BY created_at DESC';
    return await dbService.query(query, [userId]);
  }

  // Update a feedback
  public async updateFeedback(id: number, feedback: Partial<Feedback>): Promise<Feedback | null> {
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (feedback.rating !== undefined) {
      updateFields.push(`rating = $${paramCount}`);
      values.push(feedback.rating);
      paramCount++;
    }

    if (feedback.comment !== undefined) {
      updateFields.push(`comment = $${paramCount}`);
      values.push(feedback.comment);
      paramCount++;
    }

    if (updateFields.length === 0) {
      return null;
    }

    values.push(id);
    const query = `
      UPDATE feedbacks
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await dbService.query(query, values);
    return result.length > 0 ? result[0] : null;
  }

  // Delete a feedback
  public async deleteFeedback(id: number): Promise<boolean> {
    const query = 'DELETE FROM feedbacks WHERE id = $1 RETURNING *';
    const result = await dbService.query(query, [id]);
    return result.length > 0;
  }

  // Get average rating for messages
  public async getAverageRatingByMessageId(messageId: number): Promise<number | null> {
    const query = 'SELECT AVG(rating) as avg_rating FROM feedbacks WHERE message_id = $1';
    const result = await dbService.query(query, [messageId]);
    return result[0]?.avg_rating || null;
  }

  // Get overall average rating
  public async getOverallAverageRating(): Promise<number | null> {
    const query = 'SELECT AVG(rating) as avg_rating FROM feedbacks';
    const result = await dbService.query(query);
    return result[0]?.avg_rating || null;
  }

  // Get feedback count by rating
  public async getFeedbackCountByRating(): Promise<{ rating: number; count: number }[]> {
    const query = `
      SELECT rating, COUNT(*) as count
      FROM feedbacks
      GROUP BY rating
      ORDER BY rating
    `;
    
    return await dbService.query(query);
  }
}

// Export singleton instance
export const feedbackRepository = new FeedbackRepository(); 