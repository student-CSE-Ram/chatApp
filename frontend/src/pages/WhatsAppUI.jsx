import React, { useState, useEffect, useRef } from "react";
import socket from "../socket";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./whatsapp.css";

export default function WhatsAppUI() {
  const [message, setMessage] = useState("");
  const [chatLog, setChatLog] = useState([]);
  const [currentUserName, setCurrentUserName] = useState("");
  const [role, setRole] = useState("");
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    // Ask for role
    let userRole
    
    while (true) {
      userRole = prompt("Enter your role (agent/customer):")?.trim().toLowerCase();
      if (userRole === "agent" || userRole === "customer")
        break;
      alert("Invalid role. Please refresh and try again.");
    }
    setRole(userRole);

    // Ask for username
    let name 
    while (true) {
      name= prompt("Enter your username:")?.trim();
    if (name)
       break; 
      alert("Username is required. Please refresh and try again.");
    }
    setCurrentUserName(name);

    // Send role & username to backend
    socket.emit("set-role", { role: userRole, username: name });

    // Listen for messages
    socket.on("chat-message", (msg) => {
      setChatLog((prev) => [...prev, msg]);
    });

    return () => {
      socket.off("chat-message");
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatLog]);

  const sendMessage = () => {
    if (!message.trim() || sending) return;

    setSending(true);

    if (role === "customer") {
      socket.emit("customer-message", message);
    } else if (role === "agent") {
      socket.emit("agent-message", message);
    }

    setMessage("");
    setTimeout(() => {
      setSending(false)
    }, 300);
  };


  return (
    <div className="container-fluid whatsapp-container">
      <div className="row h-100">
        {/* Chat Area */}
        <div className="col-12 p-0 d-flex flex-column">
          {/* Chat Header */}
          <div className="p-2 border-bottom bg-light d-flex align-items-center">
            <div className="fw-bold">Chat Room</div>
            <small className="text-muted ms-2">{role}</small>
            <div className="ms-auto text-muted">{currentUserName}</div>
          </div>

          {/* Messages */}
          <div className="flex-grow-1 p-3 overflow-auto chat-bg">
            {chatLog.map((msg, index) => {
              let bubbleClass = "";
              if (msg.sender === "System") {
                bubbleClass = "system-message";
              } else if (msg.sender === currentUserName) {
                bubbleClass = "my-message";
              } else {
                bubbleClass = "other-message";
              }

              return (
                <div key={index} className={`mb-2 message-wrapper ${bubbleClass}`}>
                  {msg.sender !== currentUserName && msg.sender !== "System" && (
                    <div className="small fw-bold text-success" 
                      style={{ display: "flex", justifyContent: "flex-start" }}>{msg.sender}</div>
                  )}
                  <div className="message-bubble">
                    {msg.text}
                    <div className="small mt-1 text-muted message-time">{msg.time}</div>
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef}></div>
          </div>

          {/* Message Input */}
          <div className="p-2 border-top bg-light">
            <div className="input-group">
              <input
                type="text"
                placeholder="Type a message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                className="form-control rounded-start-pill"
              />
              <button
                className="btn btn-success rounded-end-pill"
                onClick={sendMessage}
                disabled={sending}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
