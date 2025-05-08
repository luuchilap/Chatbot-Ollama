import { NextApiRequest, NextApiResponse } from 'next';
import { feedbackRepository } from '../../../services/feedbackRepository';
import { messageRepository } from '../../../services/messageRepository';
import { chatSessionRepository } from '../../../services/chatSessionRepository';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    try {
      const { messageId, messageIndex, sessionId, rating, comment } = req.body;
      
      // Validate required fields
      if ((!messageId && !messageIndex) || !rating || rating < 1 || rating > 5) {
        return res.status(400).json({
          status: 'error',
          message: 'Message ID/index and valid rating (1-5) are required'
        });
      }
      
      let actualMessageId = messageId;
      
      // If we have a message index but no message ID, try to get the message from the session
      if (!actualMessageId && messageIndex !== undefined && sessionId) {
        // Get all messages for the session
        const messages = await messageRepository.getMessagesBySessionId(sessionId);
        
        // Find the assistant message at the given index
        const assistantMessages = messages.filter(m => m.sender === 'assistant');
        if (messageIndex < assistantMessages.length) {
          actualMessageId = assistantMessages[messageIndex].id;
        }
      }
      
      // If we still don't have a message ID, return an error
      if (!actualMessageId) {
        return res.status(400).json({
          status: 'error',
          message: 'Could not determine message ID'
        });
      }
      
      // Verify that the message exists
      const message = await messageRepository.getMessageById(actualMessageId);
      if (!message) {
        return res.status(404).json({
          status: 'error',
          message: 'Message not found'
        });
      }
      
      // Save the feedback
      const feedback = await feedbackRepository.createFeedback({
        message_id: actualMessageId,
        rating,
        comment: comment || null
      });
      
      return res.status(201).json({
        status: 'success',
        data: feedback
      });
    } catch (error) {
      console.error('Error saving feedback:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Failed to save feedback',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  } else {
    return res.status(405).json({ status: 'error', message: 'Method not allowed' });
  }
} 