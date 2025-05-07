import { dbService } from './dbService';

// User interface
export interface User {
  id?: number;
  username: string;
  email?: string;
  password_hash: string;
  role?: string;
  created_at?: Date;
}

// User Repository Class
export class UserRepository {
  // Create users table if it doesn't exist (should no longer be needed as we've created it via SQL)
  public async initTable(): Promise<void> {
    // We'll keep this method for backward compatibility,
    // but it's now a no-op since the table was created through SQL
    return;
  }

  // Create a new user
  public async createUser(user: User): Promise<User> {
    const query = `
      INSERT INTO users (username, email, password_hash, role)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const params = [
      user.username, 
      user.email || null,
      user.password_hash,
      user.role || 'user'
    ];
    const result = await dbService.query(query, params);
    return result[0];
  }

  // Get all users
  public async getAllUsers(): Promise<User[]> {
    const query = 'SELECT * FROM users ORDER BY created_at DESC';
    return await dbService.query(query);
  }

  // Get user by ID
  public async getUserById(id: number): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await dbService.query(query, [id]);
    return result.length > 0 ? result[0] : null;
  }

  // Get user by username
  public async getUserByUsername(username: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE username = $1';
    const result = await dbService.query(query, [username]);
    return result.length > 0 ? result[0] : null;
  }

  // Get user by email
  public async getUserByEmail(email: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await dbService.query(query, [email]);
    return result.length > 0 ? result[0] : null;
  }

  // Update user
  public async updateUser(id: number, user: Partial<User>): Promise<User | null> {
    // Build the query dynamically based on provided fields
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (user.username) {
      updateFields.push(`username = $${paramCount}`);
      values.push(user.username);
      paramCount++;
    }

    if (user.email !== undefined) {
      updateFields.push(`email = $${paramCount}`);
      values.push(user.email);
      paramCount++;
    }

    if (user.password_hash) {
      updateFields.push(`password_hash = $${paramCount}`);
      values.push(user.password_hash);
      paramCount++;
    }

    if (user.role) {
      updateFields.push(`role = $${paramCount}`);
      values.push(user.role);
      paramCount++;
    }

    if (updateFields.length === 0) {
      return null;
    }

    values.push(id);
    const query = `
      UPDATE users
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await dbService.query(query, values);
    return result.length > 0 ? result[0] : null;
  }

  // Delete user
  public async deleteUser(id: number): Promise<boolean> {
    const query = 'DELETE FROM users WHERE id = $1 RETURNING *';
    const result = await dbService.query(query, [id]);
    return result.length > 0;
  }
}

// Export singleton instance
export const userRepository = new UserRepository(); 