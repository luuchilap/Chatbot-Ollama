import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
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

export default function MessageHistoryPage() {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [refreshInterval, setRefreshInterval] = useState<number>(5000); // 5 seconds
  const [lastRefresh, setLastRefresh] = useState<string>(new Date().toLocaleTimeString());

  const fetchData = async () => {
    try {
      const response = await fetch('/api/demo/chat-history');
      const result = await response.json();
      
      if (result.status === 'success') {
        setSessions(result.data.sessions);
        setError(null);
        setLastRefresh(new Date().toLocaleTimeString());
      } else {
        setError(result.message || 'Failed to fetch message history');
      }
    } catch (err) {
      setError('Error connecting to the server');
      console.error('Error fetching message history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Set up polling for real-time updates
    const intervalId = setInterval(fetchData, refreshInterval);
    
    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, [refreshInterval]);

  return (
    <>
      <Head>
        <title>Message History</title>
        <meta name="description" content="Real-time message history from the database" />
      </Head>

      <div className="container mx-auto py-8 px-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Message History (Auto-Refresh)</h1>
          <div className="space-x-4">
            <span className="text-sm text-gray-500">Last refresh: {lastRefresh}</span>
            <button 
              onClick={fetchData}
              className="bg-blue-500 text-white py-1 px-4 rounded hover:bg-blue-600"
            >
              Refresh Now
            </button>
            <Link href="/" className="text-blue-500 hover:underline">
              Back to Chat
            </Link>
          </div>
        </div>

        <div className="mb-4 p-4 bg-gray-100 rounded-lg border border-gray-200">
          <h2 className="text-lg font-semibold mb-2">How This Works</h2>
          <p>
            When you send a message in the chat, it's immediately saved to the PostgreSQL database <strong>before</strong> it's sent to the AI model.
            This ensures that your messages are preserved even if there's an issue with the AI response.
            The AI's response is also saved once it completes.
          </p>
        </div>
        
        {loading ? (
          <div className="p-4 text-center">Loading message history...</div>
        ) : error ? (
          <div className="p-4 text-center text-red-500">{error}</div>
        ) : sessions.length === 0 ? (
          <div className="p-4 text-center text-gray-500">No message history found. Try sending some messages in the chat!</div>
        ) : (
          <div className="space-y-8">
            {sessions.map(session => (
              <div key={session.id} className="border rounded-lg overflow-hidden">
                <div className="bg-gray-200 p-4 border-b flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-semibold">{session.session_title || 'Untitled Chat'}</h2>
                    <p className="text-sm text-gray-600">
                      Started: {new Date(session.started_at).toLocaleString()}
                      {session.ended_at && ` • Ended: ${new Date(session.ended_at).toLocaleString()}`}
                    </p>
                  </div>
                  <div className="text-sm text-gray-500">
                    Session ID: {session.id}
                  </div>
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
                          <div className="font-medium mb-1 flex justify-between">
                            <span>{message.sender === 'user' ? 'You' : 'Assistant'}</span>
                            <span className="text-xs text-gray-500">(ID: {message.id})</span>
                          </div>
                          <div className="text-left">{message.content}</div>
                          <div className="text-xs text-gray-500 mt-1 flex justify-between">
                            <span>{new Date(message.created_at).toLocaleString()}</span>
                            <span>Type: {message.message_type}</span>
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