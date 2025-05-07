import { NextApiRequest, NextApiResponse } from 'next';
import { userRepository } from '../../../services/userRepository';
import crypto from 'crypto';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  
  // Validate ID parameter
  if (!id || Array.isArray(id)) {
    return res.status(400).json({ 
      status: 'error', 
      message: 'Invalid user ID' 
    });
  }
  
  const userId = parseInt(id);
  if (isNaN(userId)) {
    return res.status(400).json({ 
      status: 'error', 
      message: 'User ID must be a number' 
    });
  }

  // Handle different HTTP methods
  switch (req.method) {
    case 'GET':
      return handleGetUser(userId, res);
    case 'PUT':
      return handleUpdateUser(userId, req, res);
    case 'DELETE':
      return handleDeleteUser(userId, res);
    default:
      return res.status(405).json({ 
        status: 'error', 
        message: 'Method not allowed' 
      });
  }
}

// Helper function to hash passwords
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Get a user by ID
async function handleGetUser(id: number, res: NextApiResponse) {
  try {
    const user = await userRepository.getUserById(id);
    if (!user) {
      return res.status(404).json({ 
        status: 'error', 
        message: 'User not found' 
      });
    }
    
    // Don't return the password hash
    const { password_hash, ...safeUser } = user;
    
    return res.status(200).json({ 
      status: 'success', 
      data: safeUser 
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch user',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

// Update a user
async function handleUpdateUser(id: number, req: NextApiRequest, res: NextApiResponse) {
  try {
    const { username, email, password, role } = req.body;
    
    // Check if any fields to update were provided
    if (!username && email === undefined && !password && !role) {
      return res.status(400).json({
        status: 'error',
        message: 'No fields to update provided'
      });
    }

    // Check if new username already exists
    if (username) {
      const existingUser = await userRepository.getUserByUsername(username);
      if (existingUser && existingUser.id !== id) {
        return res.status(409).json({
          status: 'error',
          message: 'Username already exists'
        });
      }
    }

    // Check if new email already exists
    if (email) {
      const existingUser = await userRepository.getUserByEmail(email);
      if (existingUser && existingUser.id !== id) {
        return res.status(409).json({
          status: 'error',
          message: 'Email already exists'
        });
      }
    }

    const updateData: {
      username?: string;
      email?: string;
      password_hash?: string;
      role?: string;
    } = {};

    if (username) updateData.username = username;
    if (email !== undefined) updateData.email = email;
    if (password) updateData.password_hash = hashPassword(password);
    if (role) updateData.role = role;

    const user = await userRepository.updateUser(id, updateData);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Don't return the password hash
    const { password_hash, ...safeUser } = user;

    return res.status(200).json({
      status: 'success',
      data: safeUser
    });
  } catch (error) {
    console.error('Error updating user:', error);
    
    // Check for duplicate key error
    if (error instanceof Error && error.message.includes('duplicate key')) {
      return res.status(409).json({
        status: 'error',
        message: 'Username or email already exists'
      });
    }
    
    return res.status(500).json({
      status: 'error',
      message: 'Failed to update user',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

// Delete a user
async function handleDeleteUser(id: number, res: NextApiResponse) {
  try {
    const deleted = await userRepository.deleteUser(id);
    if (!deleted) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    return res.status(200).json({
      status: 'success',
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to delete user',
      error: error instanceof Error ? error.message : String(error)
    });
  }
} 