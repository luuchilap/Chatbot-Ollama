import { NextApiRequest, NextApiResponse } from 'next';
import { chatSessionRepository } from '../../../services/chatSessionRepository';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    try {
      const { sessionId, sessionTitle } = req.body;
      
      // Validate required fields
      if (!sessionId) {
        return res.status(400).json({
          status: 'error',
          message: 'Session ID is required'
        });
      }
      
      // Update the session title
      const updatedSession = await chatSessionRepository.updateSession(sessionId, {
        session_title: sessionTitle || 'Untitled Chat'
      });
      
      if (!updatedSession) {
        return res.status(404).json({
          status: 'error',
          message: 'Session not found or could not be updated'
        });
      }
      
      return res.status(200).json({
        status: 'success',
        data: updatedSession
      });
    } catch (error) {
      console.error('Error updating session:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Failed to update session',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  } else {
    return res.status(405).json({ status: 'error', message: 'Method not allowed' });
  }
} 