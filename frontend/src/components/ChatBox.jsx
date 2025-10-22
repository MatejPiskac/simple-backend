import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

// Connect to the backend WebSocket endpoint
const socket = io('https://simple-backend-352e.onrender.com', { transports: ['websocket'] });

export default function ChatBox() {
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState('');

  useEffect(() => {
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
  }, []);

  const sendMessage = () => {
    if (!content) return;
    const msg = { username: 'You', content };
    socket.emit('chat message', msg);
    setContent('');
  };

  return (
    <div className="max-w-md p-4 mx-auto bg-gray-900 text-white rounded-lg">
      <div className="mb-4 h-60 overflow-y-auto border border-gray-700 p-2">
        {messages.map((m, idx) => (
          <div key={idx}><strong>{m.username || 'Server'}:</strong> {m.content || m}</div>
        ))}
      </div>
      <input
        className="w-full p-2 text-black rounded mb-2"
        placeholder="Type a message..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
      />
      <button className="px-4 py-2 bg-blue-600 rounded" onClick={sendMessage}>
        Send
      </button>
    </div>
  );
}
