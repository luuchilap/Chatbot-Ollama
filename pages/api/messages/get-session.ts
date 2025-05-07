import { NextApiRequest, NextApiResponse } from 'next';
import { chatSessionRepository } from '../../../services/chatSessionRepository';
import { messageRepository } from '../../../services/messageRepository';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      const sessionId = req.query.id;
      
      if (!sessionId || Array.isArray(sessionId)) {
        return res.status(400).json({
          status: 'error',
          message: 'Valid session ID is required'
        });
      }
      
      // Get the session
      const session = await chatSessionRepository.getSessionById(parseInt(sessionId));
      
      if (!session) {
        return res.status(404).json({
          status: 'error',
          message: 'Session not found'
        });
      }
      
      // Get the messages for this session
      const messages = await messageRepository.getMessagesBySessionId(parseInt(sessionId));
      
      return res.status(200).json({
        status: 'success',
        data: {
          session,
          messages
        }
      });
    } catch (error) {
      console.error('Error retrieving session:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve session',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  } else {
    return res.status(405).json({ status: 'error', message: 'Method not allowed' });
  }
} 