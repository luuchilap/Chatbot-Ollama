import { NextApiRequest, NextApiResponse } from 'next';
import { dbService } from '../../services/dbService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      // Test database connection and check tables
      const results = {
        connection: null,
        tables: {}
      };
      
      // Test database connection
      const connectionResult = await dbService.query('SELECT NOW() as current_time');
      results.connection = connectionResult[0];
      
      // Check users table
      try {
        const usersCount = await dbService.query('SELECT COUNT(*) as count FROM users');
        results.tables['users'] = { count: parseInt(usersCount[0].count) };
      } catch (error) {
        results.tables['users'] = { error: 'Error accessing users table' };
      }
      
      // Check chat_sessions table
      try {
        const sessionsCount = await dbService.query('SELECT COUNT(*) as count FROM chat_sessions');
        results.tables['chat_sessions'] = { count: parseInt(sessionsCount[0].count) };
      } catch (error) {
        results.tables['chat_sessions'] = { error: 'Error accessing chat_sessions table' };
      }
      
      // Check messages table
      try {
        const messagesCount = await dbService.query('SELECT COUNT(*) as count FROM messages');
        results.tables['messages'] = { count: parseInt(messagesCount[0].count) };
      } catch (error) {
        results.tables['messages'] = { error: 'Error accessing messages table' };
      }
      
      // Check feedbacks table
      try {
        const feedbacksCount = await dbService.query('SELECT COUNT(*) as count FROM feedbacks');
        results.tables['feedbacks'] = { count: parseInt(feedbacksCount[0].count) };
      } catch (error) {
        results.tables['feedbacks'] = { error: 'Error accessing feedbacks table' };
      }
      
      // Check business_documents table
      try {
        const documentsCount = await dbService.query('SELECT COUNT(*) as count FROM business_documents');
        results.tables['business_documents'] = { count: parseInt(documentsCount[0].count) };
      } catch (error) {
        results.tables['business_documents'] = { error: 'Error accessing business_documents table' };
      }
      
      // Check document_sections table
      try {
        const sectionsCount = await dbService.query('SELECT COUNT(*) as count FROM document_sections');
        results.tables['document_sections'] = { count: parseInt(sectionsCount[0].count) };
      } catch (error) {
        results.tables['document_sections'] = { error: 'Error accessing document_sections table' };
      }
      
      // Check retrieval_logs table
      try {
        const logsCount = await dbService.query('SELECT COUNT(*) as count FROM retrieval_logs');
        results.tables['retrieval_logs'] = { count: parseInt(logsCount[0].count) };
      } catch (error) {
        results.tables['retrieval_logs'] = { error: 'Error accessing retrieval_logs table' };
      }
      
      return res.status(200).json({ 
        status: 'success', 
        message: 'Database connection successful', 
        data: results 
      });
    } catch (error) {
      console.error('Database connection error:', error);
      return res.status(500).json({ 
        status: 'error', 
        message: 'Failed to connect to the database',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  } else {
    return res.status(405).json({ status: 'error', message: 'Method not allowed' });
  }
} 