const { assignAgent, releaseAgent } = require("./src/utils/matchmaking");

const agents = [];
const customers = {};

module.exports = function registerSocketHandlers(io) {
  io.on("connection", (socket) => {
    console.log("🔌 User connected:", socket.id);

    // --- ROLE SETUP ---
    socket.on("set-role", ({ role, username }) => {
      socket.username = username;
      socket.role = role;

      if (role === "agent") {
        agents.push({ socketId: socket.id, username, status: "free" });
        console.log(`🟢 Agent joined: ${username}`);
      } else {
        console.log(`👤 Customer joined: ${username}`);
      }
    });

    // --- CUSTOMER MESSAGE ---
    socket.on("customer-message", (msg) => {
      if (customers[socket.id]) {
        const agentId = customers[socket.id];
        sendMessage(io, socket, agentId, msg);
        return;
      }

      const agent = assignAgent(agents);
      if (agent) {
        customers[socket.id] = agent.socketId;
        sendMessage(io, socket, agent.socketId, msg);

        socket.emit("chat-message", {
          sender: "System",
          text: `Agent connected: ${agent.username}`,
          time: now(),
        });
      } else {
        socket.emit("chat-message", {
          sender: "System",
          text: "No agents free. Please wait...",
          time: now(),
        });
      }
    });

    // --- AGENT MESSAGE ---
    socket.on("agent-message", (msg) => {
      const customerId = Object.keys(customers).find(
        (id) => customers[id] === socket.id
      );
      if (customerId) sendMessage(io, socket, customerId, msg);
    });

   // And update the file message handler:
socket.on("sendMessage", (data) => {
  if (socket.role === "customer") {
    const agentId = customers[socket.id];
    if (agentId) sendFile(io, socket, agentId, data.file);
  } else if (socket.role === "agent") {
    const customerId = Object.keys(customers).find(
      (id) => customers[id] === socket.id
    );
    if (customerId) sendFile(io, socket, customerId, data.file);
  }
});

    // --- END CHAT ---
    socket.on("end-message", () => {
      if (customers[socket.id]) {
        const agentId = customers[socket.id];
        releaseAgent(agents, agentId);

        io.to(agentId).emit("chat-message", {
          sender: "System",
          text: "Customer ended the chat.",
          time: now(),
        });
        delete customers[socket.id];
      } else {
        const customerId = Object.keys(customers).find(
          (id) => customers[id] === socket.id
        );
        if (customerId) {
          io.to(customerId).emit("chat-message", {
            sender: "System",
            text: "Agent ended the chat.",
            time: now(),
          });
          delete customers[customerId];
        }
        releaseAgent(agents, socket.id);
      }
    });

    // --- DISCONNECT ---
    socket.on("disconnect", () => {
      console.log(`❌ Disconnected: ${socket.username || socket.id}`);

      const agentIndex = agents.findIndex((a) => a.socketId === socket.id);
      if (agentIndex !== -1) {
        const agent = agents[agentIndex];
        agents.splice(agentIndex, 1);

        const customerId = Object.keys(customers).find(
          (id) => customers[id] === socket.id
        );
        if (customerId) {
          io.to(customerId).emit("chat-message", {
            sender: "System",
            text: "Agent disconnected. Please wait for another.",
            time: now(),
          });
          delete customers[customerId];
        }
      } else if (customers[socket.id]) {
        const agentId = customers[socket.id];
        releaseAgent(agents, agentId);

        io.to(agentId).emit("chat-message", {
          sender: "System",
          text: "Customer disconnected.",
          time: now(),
        });
        delete customers[socket.id];
      }
    });
  });
};

// --- Helpers ---
function sendMessage(io, socket, targetId, text) {
  const payload = { sender: socket.username, text, time: now() };
  io.to(targetId).emit("chat-message", payload);
  socket.emit("chat-message", payload);
}

// In your socketHandler.js, update the sendFile function:
function sendFile(io, socket, targetId, fileData) {
  const payload = { 
    sender: socket.username, 
    fileUrl: fileData.fileUrl, 
    originalName: fileData.originalName,
    mimeType: fileData.mimeType, // ← Include MIME type
    time: now() 
  };
  io.to(targetId).emit("chat-message", payload);
  socket.emit("chat-message", payload);
}

function now() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
