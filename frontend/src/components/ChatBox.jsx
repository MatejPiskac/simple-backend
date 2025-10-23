import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext.jsx';
import { io } from 'socket.io-client';

// Socket connects with credentials via cookie; bearer optional
const socket = io('/', { transports: ['websocket'], auth: (cb) => cb({}) });

export default function ChatBox() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState('');

  useEffect(() => {
    if (!user) return;
    socket.on('chat message', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });
    socket.on('welcome', (data) => {
      setMessages((prev) => [...prev, data.message]);
    });
    return () => {
      socket.off('chat message');
      socket.off('welcome');
    };
  }, [user]);

  const sendMessage = () => {
    if (!content) return;
    const msg = { username: 'You', content };
    socket.emit('chat message', msg);
    setContent('');
  };

  return (
    <div className="max-w-md p-4 mx-auto bg-gray-900 text-white rounded-lg">
      {!user ? (
        <div className="text-sm text-gray-300">Login to join the chat.</div>
      ) : null}
      {user && (
      <div className="mb-4 h-60 overflow-y-auto border border-gray-700 p-2">
        {messages.map((m, idx) => (
          <div key={idx}><strong>{m.username || 'Server'}:</strong> {m.content || m}</div>
        ))}
      </div>
      )}
      <input
        className="w-full p-2 text-black rounded mb-2"
        placeholder="Type a message..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && user && sendMessage()}
        disabled={!user}
      />
      <button className="px-4 py-2 bg-blue-600 rounded disabled:opacity-60" onClick={sendMessage} disabled={!user}>
        Send
      </button>
    </div>
  );
}
