import { NextApiRequest, NextApiResponse } from 'next';
import { messageRepository } from '../../../services/messageRepository';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      const sessionId = req.query.sessionId as string;
      
      // Validate required fields
      if (!sessionId) {
        return res.status(400).json({
          status: 'error',
          message: 'Session ID is required'
        });
      }
      
      // Get all messages for the session
      const messages = await messageRepository.getMessagesBySessionId(parseInt(sessionId));
      
      return res.status(200).json({
        status: 'success',
        data: messages
      });
    } catch (error) {
      console.error('Error retrieving session messages:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve session messages',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  } else {
    return res.status(405).json({ status: 'error', message: 'Method not allowed' });
  }
} 