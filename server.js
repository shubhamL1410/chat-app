// Import required modules
const express = require("express");
const path = require("path");
const app = express();
const http = require("http").createServer(app);
const { Server } = require("socket.io");
const io = new Server(http);
const crypto = require("crypto"); // For generating unique IDs
const PORT = process.env.PORT || 3000;

// Serve static files from 'public' folder
app.use(express.static(path.join(__dirname, "public"), { index: false }));

// Handle root request depending on host
app.get("/", (req, res) => {
  const host = req.headers.host;
  if (host.includes("localhost")) {
    res.sendFile(path.join(__dirname, "public", "index.html"));
  } else {
    res.sendFile(path.join(__dirname, "public", "simple.html"));
  }
});

// Direct routes for specific HTML pages
app.get("/simple", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "simple.html"));
});

app.get("/index", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// In-memory data stores
const users = {};            // socket.id => user info
const roomUsers = {};        // room => Set of usernames
const messages = {};         // message.id => message object
const roomMessages = {};     // room => list of messages

// WebSocket connection handler
io.on("connection", (socket) => {
  // When user joins a room
  socket.on("joinRoom", ({ name, room }) => {
    const currentUser = { name, room };
    users[socket.id] = currentUser;
    socket.join(room);

    // Track users in the room
    if (!roomUsers[room]) roomUsers[room] = new Set();
    const existing = [...roomUsers[room]];
    if (existing.length > 0) {
      socket.emit("message", formatMessage("System", `${existing.join(", ")} already joined this chat.`));
    }

    roomUsers[room].add(name);

    // Send welcome message and notify others
    socket.emit("message", formatMessage("System", `Welcome ${name}!`));
    socket.broadcast.to(room).emit("message", formatMessage("System", `${name} joined the chat.`));

    // Send previous messages to new user
    const history = roomMessages[room] || [];
    socket.emit("messageHistory", history);

    // Send updated user list to room
    io.to(room).emit("roomUsers", {
      room,
      users: [...roomUsers[room]].map(name => ({ name })),
    });
  });

  // When user sends a message
  socket.on("chatMessage", ({ text, id }) => {
    const user = users[socket.id];
    if (user) {
      const message = {
        id: id || crypto.randomUUID(),
        user: user.name,
        text,
        time: getCurrentTime()
      };

      messages[message.id] = message;

      if (!roomMessages[user.room]) roomMessages[user.room] = [];
      roomMessages[user.room].push(message);

      io.to(user.room).emit("message", message);
    }
  });

  // Message seen event
  socket.on("seenMessage", (messageId) => {
    const user = users[socket.id];
    const msg = messages[messageId];
    if (user && msg) {
      const senderSocketId = Object.keys(users).find(
        id => users[id].name === msg.user && users[id].room === user.room
      );
      if (senderSocketId) {
        io.to(senderSocketId).emit("messageSeen", messageId);
      }
    }
  });

  // Typing indicator
  socket.on("typing", (status) => {
    const user = users[socket.id];
    if (user) {
      const typingText = status ? `${user.name} is typing...` : "";
      socket.to(user.room).emit("typing", typingText);
    }
  });

  // File upload handler
  socket.on("fileUpload", ({ fileName, fileData, fileType }) => {
    const user = users[socket.id];
    if (user) {
      const time = getCurrentTime();
      const fileMsg = {
        id: crypto.randomUUID(),
        user: user.name,
        fileName,
        fileData,
        fileType,
        time,
      };

      messages[fileMsg.id] = fileMsg;
      if (!roomMessages[user.room]) roomMessages[user.room] = [];
      roomMessages[user.room].push(fileMsg);

      io.to(user.room).emit("fileShared", fileMsg);
    }
  });

  // Audio message handler
  socket.on("audioMessage", (audio) => {
    const user = users[socket.id];
    if (!user) return;

    const audioMsg = {
      id: crypto.randomUUID(),
      user: user.name,
      fileName: audio.fileName,
      fileData: audio.fileData,
      fileType: audio.fileType,
      time: getCurrentTime(),
    };

    messages[audioMsg.id] = audioMsg;
    if (!roomMessages[user.room]) roomMessages[user.room] = [];
    roomMessages[user.room].push(audioMsg);

    io.to(user.room).emit("fileShared", audioMsg);
  });

  // Reactions (emojis)
  socket.on("addReaction", ({ messageId, emoji }) => {
    const user = users[socket.id];
    if (user) {
      io.to(user.room).emit("reactionAdded", { messageId, emoji });
    }
  });

  // Edit existing message
  socket.on("editMessage", ({ messageId, newText }) => {
    const user = users[socket.id];
    const msg = messages[messageId];
    if (!msg || !user) return;

    if (msg.user === user.name) {
      msg.text = newText;

      // Update in roomMessages
      const room = user.room;
      if (roomMessages[room]) {
        const index = roomMessages[room].findIndex(m => m.id === messageId);
        if (index !== -1) roomMessages[room][index].text = newText;
      }

      io.to(user.room).emit("messageEdited", { messageId, newText });
    }
  });

  // Delete a message
  socket.on("deleteMessage", (messageId) => {
    const user = users[socket.id];
    const msg = messages[messageId];
    if (!msg || !user) return;

    if (msg.user === user.name) {
      delete messages[messageId];

      const room = user.room;
      if (roomMessages[room]) {
        roomMessages[room] = roomMessages[room].filter(m => m.id !== messageId);
      }

      io.to(user.room).emit("messageDeleted", messageId);
    }
  });

  // Pin a message
  socket.on("pinMessage", (messageId) => {
    const user = users[socket.id];
    const msg = messages[messageId];
    if (!msg || !user) return;

    io.to(user.room).emit("messagePinned", msg);
  });

  // Handle user disconnect
  socket.on("disconnect", () => {
    const user = users[socket.id];
    if (user) {
      socket.to(user.room).emit("message", formatMessage("System", `${user.name} left the chat.`));
      socket.to(user.room).emit("typing", "");

      if (roomUsers[user.room]) {
        roomUsers[user.room].delete(user.name);
        if (roomUsers[user.room].size > 0) {
          io.to(user.room).emit("roomUsers", {
            room: user.room,
            users: [...roomUsers[user.room]].map(name => ({ name })),
          });
        } else {
          delete roomUsers[user.room];
        }
      }

      delete users[socket.id];
    }
  });
});

// Utility: Format a message object with timestamp
function formatMessage(user, text) {
  const message = {
    id: crypto.randomUUID(),
    user,
    text: typeof text === "string" ? text : JSON.stringify(text),
    time: getCurrentTime()
  };
  messages[message.id] = message;
  return message;
}

// Utility: Get current time in HH:MM format (IST)
function getCurrentTime() {
  return new Date().toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

// Start the server
http.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
