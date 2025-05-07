import { NextApiRequest, NextApiResponse } from 'next';
import { messageRepository } from '../../../services/messageRepository';
import { chatSessionRepository } from '../../../services/chatSessionRepository';
import { userRepository } from '../../../services/userRepository';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    try {
      const { content, sender, userId, sessionId, sessionTitle, metadata } = req.body;
      
      // Validate required fields
      if (!content || !sender) {
        return res.status(400).json({
          status: 'error',
          message: 'Content and sender are required'
        });
      }
      
      let activeSessionId = sessionId;
      
      // If no session ID provided, create a new session
      if (!activeSessionId) {
        // Get the user (use demo_user if no userId provided)
        const user = userId 
          ? await userRepository.getUserById(userId)
          : await userRepository.getUserByUsername('demo_user');
        
        if (!user) {
          return res.status(404).json({
            status: 'error',
            message: 'User not found'
          });
        }
        
        // Create a new chat session
        const newSession = await chatSessionRepository.createSession({
          user_id: user.id,
          session_title: sessionTitle || 'New Chat',
          metadata: metadata || {}
        });
        
        activeSessionId = newSession.id;
      }
      
      // Save the message
      const message = await messageRepository.createMessage({
        session_id: activeSessionId,
        sender: sender,
        content: content,
        message_type: 'text'
      });
      
      return res.status(201).json({
        status: 'success',
        data: message,
        sessionId: activeSessionId
      });
    } catch (error) {
      console.error('Error saving message:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Failed to save message',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  } else {
    return res.status(405).json({ status: 'error', message: 'Method not allowed' });
  }
} 