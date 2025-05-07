-- Insert mock user
INSERT INTO users (username, password_hash, email, role)
VALUES ('demo_user', 
        'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3', -- hash for '123'
        'demo@example.com', 
        'user')
ON CONFLICT (username) DO NOTHING;

-- Get the user ID
DO $$
DECLARE
    user_id INTEGER;
    session_id INTEGER;
BEGIN
    -- Get user ID
    SELECT id INTO user_id FROM users WHERE username = 'demo_user';
    
    -- Create a chat session
    INSERT INTO chat_sessions (user_id, session_title, metadata)
    VALUES (user_id, 'Demo Chat', '{"model": "llama-3.2-1b-instruct", "temperature": 1}')
    RETURNING id INTO session_id;
    
    -- Insert the messages from the example conversation
    -- User: "hello"
    INSERT INTO messages (session_id, sender, content, message_type)
    VALUES (session_id, 'user', 'hello', 'text');
    
    -- Assistant: "Hello! How can I help you today?"
    INSERT INTO messages (session_id, sender, content, message_type)
    VALUES (session_id, 'assistant', 'Hello! How can I help you today?', 'text');
    
    -- User: "1 + 1 = ?"
    INSERT INTO messages (session_id, sender, content, message_type)
    VALUES (session_id, 'user', '1 + 1 = ?', 'text');
    
    -- Assistant: "Hello! It's great to chat with you. And... 1 + 1 indeed equals 2! Would you like to discuss anything in particular or just have a friendly conversation?"
    INSERT INTO messages (session_id, sender, content, message_type)
    VALUES (session_id, 'assistant', 'Hello! It''s great to chat with you. And... 1 + 1 indeed equals 2! Would you like to discuss anything in particular or just have a friendly conversation?', 'text');
    
END $$; 