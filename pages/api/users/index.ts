import { NextApiRequest, NextApiResponse } from 'next';
import { userRepository, User } from '../../../services/userRepository';
import crypto from 'crypto';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Ensure users table exists
  try {
    await userRepository.initTable();
  } catch (error) {
    console.error('Error initializing users table:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to initialize database table'
    });
  }

  // Handle different HTTP methods
  switch (req.method) {
    case 'GET':
      return handleGetUsers(req, res);
    case 'POST':
      return handleCreateUser(req, res);
    default:
      return res.status(405).json({ status: 'error', message: 'Method not allowed' });
  }
}

// Get all users
async function handleGetUsers(req: NextApiRequest, res: NextApiResponse) {
  try {
    const users = await userRepository.getAllUsers();
    // Don't return password hashes
    const sanitizedUsers = users.map(({ password_hash, ...user }) => user);
    return res.status(200).json({ status: 'success', data: sanitizedUsers });
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch users',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

// Helper function to hash passwords
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Create a new user
async function handleCreateUser(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { username, email, password, role } = req.body;
    
    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Username and password are required'
      });
    }

    // Check if username already exists
    const existingUsername = await userRepository.getUserByUsername(username);
    if (existingUsername) {
      return res.status(409).json({
        status: 'error',
        message: 'Username already exists'
      });
    }

    // Check if email already exists (if provided)
    if (email) {
      const existingEmail = await userRepository.getUserByEmail(email);
      if (existingEmail) {
        return res.status(409).json({
          status: 'error',
          message: 'Email already exists'
        });
      }
    }

    // Hash the password
    const password_hash = hashPassword(password);

    // Create the new user
    const newUser: User = {
      username,
      email,
      password_hash,
      role: role || 'user'
    };

    const user = await userRepository.createUser(newUser);
    
    // Don't return the password hash
    const { password_hash: _, ...safeUser } = user;
    
    return res.status(201).json({ status: 'success', data: safeUser });
  } catch (error) {
    console.error('Error creating user:', error);
    
    // Check for duplicate key error
    if (error instanceof Error && error.message.includes('duplicate key')) {
      return res.status(409).json({
        status: 'error',
        message: 'A user with this username or email already exists'
      });
    }
    
    return res.status(500).json({
      status: 'error',
      message: 'Failed to create user',
      error: error instanceof Error ? error.message : String(error)
    });
  }
} 