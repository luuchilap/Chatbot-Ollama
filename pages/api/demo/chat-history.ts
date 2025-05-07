import { NextApiRequest, NextApiResponse } from 'next';
import { userRepository } from '../../../services/userRepository';
import { chatSessionRepository } from '../../../services/chatSessionRepository';
import { messageRepository } from '../../../services/messageRepository';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      // Get the demo user
      const demoUser = await userRepository.getUserByUsername('demo_user');
      
      if (!demoUser) {
        return res.status(404).json({ 
          status: 'error', 
          message: 'Demo user not found' 
        });
      }
      
      // Get all chat sessions for the demo user
      const chatSessions = await chatSessionRepository.getSessionsByUserId(demoUser.id);
      
      // Get messages for each chat session
      const sessionsWithMessages = await Promise.all(
        chatSessions.map(async (session) => {
          const messages = await messageRepository.getMessagesBySessionId(session.id);
          return {
            ...session,
            messages
          };
        })
      );
      
      return res.status(200).json({ 
        status: 'success', 
        data: {
          user: { ...demoUser, password_hash: undefined }, // Don't return the password hash
          sessions: sessionsWithMessages
        }
      });
    } catch (error) {
      console.error('Error retrieving chat history:', error);
      return res.status(500).json({ 
        status: 'error', 
        message: 'Failed to retrieve chat history',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  } else {
    return res.status(405).json({ status: 'error', message: 'Method not allowed' });
  }
} 