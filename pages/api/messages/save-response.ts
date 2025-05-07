import { NextApiRequest, NextApiResponse } from 'next';
import { messageRepository } from '../../../services/messageRepository';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    try {
      const { content, sessionId } = req.body;
      
      // Validate required fields
      if (!content || !sessionId) {
        return res.status(400).json({
          status: 'error',
          message: 'Content and sessionId are required'
        });
      }
      
      // Save the assistant's response
      const message = await messageRepository.createMessage({
        session_id: sessionId,
        sender: 'assistant',
        content: content,
        message_type: 'text'
      });
      
      return res.status(201).json({
        status: 'success',
        data: message
      });
    } catch (error) {
      console.error('Error saving assistant response:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Failed to save assistant response',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  } else {
    return res.status(405).json({ status: 'error', message: 'Method not allowed' });
  }
} 