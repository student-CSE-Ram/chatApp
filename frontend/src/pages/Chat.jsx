import React, { useState, useEffect, useRef } from 'react';
import socket from '../socket';
import './chat.css'; 

export default function Chat() {
  const [message, setMessage] = useState('');
  const [chatLog, setChatLog] = useState([]);
  const [currentUserName, setCurrentUserName] = useState('');
  const chatEndRef = useRef(null);

  useEffect(() => {
    const name = prompt('Enter your name:');
    if (!name) {
      alert('Name is required');
      window.location.reload();
      return;
    }
    setCurrentUserName(name);  
    socket.emit('set-username', name);

    socket.on('chat-message', (msg) => {
      setChatLog((prev) => [...prev, msg]);
    });

    return () => {
      socket.off('chat-message');
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLog]);

  const sendMessage = () => {
    if (!message.trim()) return;
    socket.emit('chat-message', { text: message });
    setMessage('');
  };

  return (
    <div className="chat-container">
      
      {/* Header */}
      <div className="chat-header">
        Chat Room
      </div>

      {/* Messages */}
      <div className="chat-body">
        {chatLog.map((msg, index) => (
          <div
            key={index}
            className={`d-flex ${msg.sender === currentUserName ? 'justify-content-end' : 'justify-content-start'}`}
          >
            <div className={`chat-bubble ${msg.sender === currentUserName ? 'outgoing' : 'incoming'}`}>
              <div className="sender-name">
                {msg.sender === currentUserName ? 'You' : msg.sender}
              </div>
              <div>{msg.text}</div>
              <div className="message-time">{msg.time}</div>
            </div>
          </div>
        ))}
        <div ref={chatEndRef}></div>
      </div>

      {/* Input */}
      <div className="chat-input">
        <input
          type="text"
          className="form-control"
          placeholder="Type a message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
        />
        <button className="btn btn-success" onClick={sendMessage}>
          Send
        </button>
      </div>

    </div>
  );
}
