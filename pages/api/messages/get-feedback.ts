import { NextApiRequest, NextApiResponse } from 'next';
import { feedbackRepository } from '../../../services/feedbackRepository';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      const messageId = req.query.messageId as string;
      
      // Validate required fields
      if (!messageId) {
        return res.status(400).json({
          status: 'error',
          message: 'Message ID is required'
        });
      }
      
      // Get all feedback for the message
      const feedback = await feedbackRepository.getFeedbackByMessageId(parseInt(messageId));
      
      // Calculate average rating
      const avgRating = feedback.length > 0 
        ? feedback.reduce((sum, item) => sum + item.rating, 0) / feedback.length 
        : 0;
      
      return res.status(200).json({
        status: 'success',
        data: {
          feedback,
          averageRating: avgRating,
          count: feedback.length
        }
      });
    } catch (error) {
      console.error('Error retrieving feedback:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve feedback',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  } else {
    return res.status(405).json({ status: 'error', message: 'Method not allowed' });
  }
} 