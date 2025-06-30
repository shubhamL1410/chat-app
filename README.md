# 💬 Real-Time Chat Application

A simple yet powerful real-time chat application built with **Node.js**, **Socket.IO**, and **Vanilla JS**. It supports multi-user chat rooms, file sharing, emoji reactions, voice messages, message editing/deleting/pinning, typing indicators, and much more.

---

## 🚀 Features

- 🔗 Join or create any chat room
- 📩 Real-time messaging
- 📝 Edit & delete your messages
- 📌 Pin important messages
- 📤 File sharing support
- 🎙️ Voice message recording
- 😀 Emoji panel with categories
- 🧠 Typing indicators
- 🔍 Search messages
- 🧹 Clear chat history (local)
- ✅ Seen status indicators
- 📱 Fully responsive UI etc..

---

## 📁 Folder Structure

```
project-root/
├── server.js                # Main backend logic (Socket.IO + Express)
├── public/
│   ├── index.html           # Advanced client interface (local dev)
│   ├── simple.html          # Clean interface for production/demo
│   ├── chat.html            # Used by /simple to join with name + room
│   ├── style.css            # Common styling
│   └── ... (images/icons etc.)
```

---

## ⚙️ Installation & Setup

1. **Clone the repo**

```bash
git clone  https://github.com/NiharBaraiya/chat-app
cd chat-app
```

2. **Install dependencies**

```bash
npm install
```

3. **Run the server**

```bash
node server.js
```

4. **Visit the app**

- **Local development:**  
  Open `http://localhost:3000/index` in browser

- **Simple public version:**  
  Open `http://localhost:3000/simple`  
  → Enter your name and room to join

---

## 🔧 Technologies Used

- **Backend:** Node.js, Express.js, Socket.IO
- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Utilities:** MediaRecorder API, FileReader, `crypto` for message IDs

---




## 📌 Deployment (Optional)

You can deploy this app using:

- **Render**: https://chat-app-dw0g.onrender.com/


---

## ✍️ Author

- 👤 [Nihar Baraiya](https://github.com/NiharBaraiya/chat-app)
- 💻 Developed with ❤️ using Socket.IO and JavaScript

---

## 📃 License

This project is licensed under the MIT License. See `LICENSE` for more details.

---

## 💡 Note

This project is for learning and demonstration purposes. For production, consider:
- Authentication (e.g., JWT)
- Database storage for messages
- Rate limiting & moderation
- Uploads to cloud (e.g., S3)
