import { useState, useEffect } from 'react';
import Head from 'next/head';
import { GetServerSideProps } from 'next';

interface Message {
  id: number;
  session_id: number;
  sender: 'user' | 'assistant';
  content: string;
  created_at: string;
  message_type: string;
}

interface ChatSession {
  id: number;
  user_id: number;
  session_title: string;
  started_at: string;
  ended_at: string | null;
  messages: Message[];
}

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
}

interface ChatHistoryData {
  user: User;
  sessions: ChatSession[];
}

export default function DemoChatPage() {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ChatHistoryData | null>(null);

  useEffect(() => {
    const fetchChatHistory = async () => {
      try {
        const response = await fetch('/api/demo/chat-history');
        const result = await response.json();
        
        if (result.status === 'success') {
          setData(result.data);
          setError(null);
        } else {
          setError(result.message || 'Failed to fetch chat history');
        }
      } catch (err) {
        setError('Error connecting to the server');
        console.error('Error fetching chat history:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchChatHistory();
  }, []);

  return (
    <>
      <Head>
        <title>Demo Chat History</title>
        <meta name="description" content="Demo chat history with PostgreSQL" />
      </Head>

      <div className="container mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold mb-6">Demo Chat History</h1>
        
        {loading ? (
          <div className="p-4 text-center">Loading chat history...</div>
        ) : error ? (
          <div className="p-4 text-center text-red-500">{error}</div>
        ) : !data ? (
          <div className="p-4 text-center text-gray-500">No chat history found</div>
        ) : (
          <div>
            <div className="mb-6 p-4 bg-gray-100 rounded-lg">
              <h2 className="text-xl font-semibold mb-2">User Information</h2>
              <p><strong>Username:</strong> {data.user.username}</p>
              <p><strong>Email:</strong> {data.user.email}</p>
              <p><strong>Role:</strong> {data.user.role}</p>
            </div>
            
            {data.sessions.map(session => (
              <div key={session.id} className="mb-6 border rounded-lg overflow-hidden">
                <div className="bg-gray-200 p-4 border-b">
                  <h2 className="text-xl font-semibold">{session.session_title}</h2>
                  <p className="text-sm text-gray-600">
                    Started: {new Date(session.started_at).toLocaleString()}
                    {session.ended_at && ` • Ended: ${new Date(session.ended_at).toLocaleString()}`}
                  </p>
                </div>
                
                <div className="p-4">
                  <h3 className="text-lg font-semibold mb-2">Messages</h3>
                  {session.messages.length === 0 ? (
                    <div className="text-gray-500">No messages in this session</div>
                  ) : (
                    <div className="space-y-4">
                      {session.messages.map(message => (
                        <div 
                          key={message.id} 
                          className={`p-3 rounded-lg max-w-3xl ${
                            message.sender === 'user' 
                              ? 'bg-blue-100 ml-auto text-right' 
                              : 'bg-gray-100'
                          }`}
                        >
                          <div className="font-medium mb-1">
                            {message.sender === 'user' ? 'You' : 'Assistant'}
                          </div>
                          <div>{message.content}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {new Date(message.created_at).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    props: {},
  };
}; 