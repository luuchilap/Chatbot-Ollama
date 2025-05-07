import { useState, useEffect } from 'react';

interface User {
  id: number;
  username: string;
  email?: string;
  role: string;
  created_at: string;
}

interface UserFormData {
  username: string;
  email: string;
  password: string;
  role: string;
}

const UserList = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<UserFormData>({ 
    username: '', 
    email: '', 
    password: '',
    role: 'user'
  });

  // Fetch users from the API
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/users');
      const result = await response.json();
      
      if (result.status === 'success') {
        setUsers(result.data);
        setError(null);
      } else {
        setError(result.message || 'Failed to fetch users');
      }
    } catch (err) {
      setError('Error connecting to the server');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  // Create a new user
  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.username || !formData.password) {
      setError('Username and password are required');
      return;
    }
    
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      const result = await response.json();
      
      if (result.status === 'success') {
        // Reset form and refresh users
        setFormData({ 
          username: '', 
          email: '', 
          password: '',
          role: 'user'
        });
        fetchUsers();
        setError(null);
      } else {
        setError(result.message || 'Failed to create user');
      }
    } catch (err) {
      setError('Error connecting to the server');
      console.error('Error creating user:', err);
    }
  };

  // Delete a user
  const deleteUser = async (id: number) => {
    try {
      const response = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      
      if (result.status === 'success') {
        // Refresh users after deletion
        fetchUsers();
      } else {
        setError(result.message || 'Failed to delete user');
      }
    } catch (err) {
      setError('Error connecting to the server');
      console.error('Error deleting user:', err);
    }
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Load users on component mount
  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">User Management</h1>
      
      {/* User creation form */}
      <div className="bg-gray-100 p-4 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-4">Add New User</h2>
        
        <form onSubmit={createUser} className="space-y-4">
          <div>
            <label htmlFor="username" className="block mb-1">Username*</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
              placeholder="Enter username"
              required
            />
          </div>
          
          <div>
            <label htmlFor="email" className="block mb-1">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
              placeholder="Enter email (optional)"
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block mb-1">Password*</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
              placeholder="Enter password"
              required
            />
          </div>
          
          <div>
            <label htmlFor="role" className="block mb-1">Role</label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          
          <button 
            type="submit" 
            className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
          >
            Add User
          </button>
        </form>
        
        {error && (
          <div className="mt-4 text-red-500">{error}</div>
        )}
      </div>
      
      {/* User list */}
      <div className="bg-white border rounded-lg">
        <h2 className="text-xl font-semibold p-4 border-b">Users</h2>
        
        {loading ? (
          <div className="p-4 text-center">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="p-4 text-center text-gray-500">No users found</div>
        ) : (
          <ul className="divide-y">
            {users.map(user => (
              <li key={user.id} className="p-4 flex justify-between items-center">
                <div>
                  <div className="font-medium">{user.username}</div>
                  {user.email && (
                    <div className="text-gray-500">{user.email}</div>
                  )}
                  <div className="text-xs text-gray-400 flex space-x-2">
                    <span>Role: <span className="font-medium">{user.role}</span></span>
                    <span>•</span>
                    <span>Created: {new Date(user.created_at).toLocaleString()}</span>
                  </div>
                </div>
                <button
                  onClick={() => deleteUser(user.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default UserList; 