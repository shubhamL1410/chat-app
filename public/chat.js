// ✅ Fully Updated Chat.js with search, emoji, edit, delete, pin, seen, text + emoji mix support

const socket = io();

//Get user name and room name from the URL
const urlParams = new URLSearchParams(window.location.search);
const name = urlParams.get("name");
const room = urlParams.get("room");

//  Get all required DOM elements
const form = document.getElementById("chatForm");
const input = document.getElementById("msg");
const messages = document.getElementById("messages");
const typing = document.getElementById("typing");
const roomNameElem = document.getElementById("room-name");
const userList = document.getElementById("user-list");
const clearButton = document.getElementById("clearChat");
const fileInput = document.getElementById("fileInput");
const uploadProgress = document.getElementById("uploadProgress");
const pinnedContainer = document.getElementById("pinned-messages");
const searchInput = document.getElementById("searchInput");
const searchButton = document.getElementById("searchButton");
const recordAudioBtn = document.getElementById("record-audio");
const emojiBtn = document.getElementById("emoji-btn");
const emojiPanel = document.getElementById("emoji-panel");
const emojiBtnSearch = document.getElementById("emoji-btn-search");

let mediaRecorder;
let audioChunks = [];
let editingMessageId = null;
// Join the chat room
if (name && room) {
  socket.emit("joinRoom", { name, room });
  roomNameElem.innerText = `${room} Room`;
}
//Context menu with edit, delete, and pin options
function handleContextMenu(li, messageId, currentText, fileType) {
  const menu = document.createElement("div");
  menu.className = "context-menu";
  menu.innerHTML = `
    <button class="edit-btn">✏ Edit</button>
    <button class="delete-btn">🗑 Delete</button>
    <button class="pin-btn">📌 Pin</button>
  `;
  document.body.appendChild(menu);
  menu.style.top = `${event.pageY}px`;
  menu.style.left = `${event.pageX}px`;

  const removeMenu = () => menu.remove();
  document.addEventListener("click", removeMenu, { once: true });

  menu.querySelector(".edit-btn").onclick = () => {
  if (fileType) {
    alert("Editing not supported for media messages");
  } else {
    input.value = currentText;
    editingMessageId = messageId;
    input.focus();
  }
};


  menu.querySelector(".delete-btn").onclick = () => {
    if (confirm("Are you sure you want to delete this message?")) {
      socket.emit("deleteMessage", messageId);
    }
  };

  menu.querySelector(".pin-btn").onclick = () => {
    socket.emit("pinMessage", messageId);
  };
}
//Send or edit message on form submit
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const msgText = input.value.trim();
  if (!msgText) return;

  if (editingMessageId) {
    socket.emit("editMessage", { messageId: editingMessageId, newText: msgText });
    editingMessageId = null;
  } else {
    const messageId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    socket.emit("chatMessage", { text: msgText, id: messageId });
  }

  input.value = "";
  input.focus();
});

// Show context menu on right click of a message
messages.addEventListener("contextmenu", (e) => {
  e.preventDefault();
  const li = e.target.closest("li.chat-message.sender");
  if (!li) return;
  const messageId = li.dataset.id;
  const currentText = li.dataset.text;
  const fileType = li.dataset.fileType;
  if (!messageId) return;
  handleContextMenu(li, messageId, currentText, fileType);
});
//Observer to detect when message is seen
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      const msgElem = entry.target;
      const msgId = msgElem.dataset.id;
      const isReceiver = msgElem.classList.contains("receiver");
      if (isReceiver && msgId) {
        socket.emit("seenMessage", msgId);
        observer.unobserve(msgElem);
      }
    }
  });
}, { threshold: 1.0 });
// render message type 
function renderMessage(msg, fromHistory = false) {
  const li = document.createElement("li");
  li.classList.add("chat-message");
  li.dataset.id = msg.id;
  li.dataset.text = msg.text || "";
  li.dataset.fileType = msg.fileType || "";
  li.id = msg.id;

  const isYou = msg.user === name;
  const isSystem = msg.user === "System";

  if (isSystem) {
    li.classList.add("system-msg");
    li.innerText = msg.text;
  } else if (msg.fileType) {
    li.classList.add(isYou ? "sender" : "receiver");
    const fileExt = msg.fileName?.split('.').pop()?.toLowerCase();
    const blob = new Blob([Uint8Array.from(atob(msg.fileData.split(',')[1]), c => c.charCodeAt(0))], { type: msg.fileType });
    const downloadUrl = URL.createObjectURL(blob);

    if (msg.fileType.startsWith("image/")) {
      li.innerHTML = `<strong>${isYou ? "You" : msg.user}:</strong>
        <a href="${downloadUrl}" download><img src="${downloadUrl}" class="shared-img" /></a>` +
        (isYou ? ` <span class="seen-check" id="seen-${msg.id}" data-status="sent">✔</span>` : "");
    } else if (msg.fileType.startsWith("audio/")) {
      const audio = document.createElement("audio");
      audio.controls = true;
      audio.src = msg.fileData;
      li.innerHTML = `<strong>${isYou ? "You" : msg.user}:</strong> `;
      li.appendChild(audio);
      if (isYou) {
        const span = document.createElement("span");
        span.className = "seen-check";
        span.id = `seen-${msg.id}`;
        span.setAttribute("data-status", "sent");
        span.textContent = "✔";
        li.appendChild(span);
      }
    } else {
      const icon = {
        pdf: "📄", doc: "📝", docx: "📝", txt: "📃",
        jpg: "🖼", jpeg: "🖼", png: "🖼", gif: "🖼",
        zip: "🗜", mp4: "🎥", mp3: "🎵", default: "📁"
      }[fileExt] || "📁";
      li.innerHTML = `<strong>${isYou ? "You" : msg.user}:</strong> <a href="${downloadUrl}" download class="file-link">${icon} ${msg.fileName}</a>`;
    }
  } else {
    li.classList.add(isYou ? "sender" : "receiver");
    li.innerHTML = isYou
      ? `<strong>You:</strong> ${msg.text} <span class="seen-check" id="seen-${msg.id}" data-status="sent">✔</span>`
      : `<strong>${msg.user}:</strong> ${msg.text}`;
  }

  messages.appendChild(li);
  if (!isYou && !isSystem) observer.observe(li);
  if (!fromHistory) messages.scrollTop = messages.scrollHeight;
}

// message History 
socket.on("message", (msg) => renderMessage(msg));
socket.on("messageHistory", (history) => {
  history.forEach((msg) => renderMessage(msg, true));
  messages.scrollTop = messages.scrollHeight;
});

//messageSeen 
socket.on("messageSeen", (messageId) => {
  const span = document.getElementById(`seen-${messageId}`);
  if (span) {
    span.textContent = "✔✔";
    span.setAttribute("data-status", "seen");
    span.style.color = "blue";
    span.title = "Seen";
  }
});
//messageEdited
socket.on("messageEdited", ({ messageId, newText }) => {
  const msgElem = document.getElementById(messageId);
  if (!msgElem) return;

  const isYou = msgElem.classList.contains("sender");
  msgElem.innerHTML = isYou
    ? `<strong>You:</strong> ${newText} <span class="seen-check" id="seen-${messageId}" data-status="sent">✔</span> <em>(edited)</em>`
    : `<strong>${msgElem.querySelector("strong")?.innerText?.replace(':', '')}:</strong> ${newText} <em>(edited)</em>`;

  msgElem.dataset.text = newText.toLowerCase();
});
//messageDeleted
socket.on("messageDeleted", (messageId) => {
  const msgElem = document.getElementById(messageId);
  if (msgElem) msgElem.remove();
});
//messagePinned
socket.on("messagePinned", (msg) => {
  const originalMsg = document.getElementById(msg.id);
  if (originalMsg && !originalMsg.classList.contains("pinned-highlight")) {
    const pinIcon = document.createElement("span");
    pinIcon.className = "pin-icon";
    pinIcon.textContent = " 📌";
    originalMsg.appendChild(pinIcon);
    originalMsg.classList.add("pinned-highlight");
  }
});
// user typing.....
let typingTimeout;
input.addEventListener("input", () => {
  socket.emit("typing", true);
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit("typing", false);
  }, 1000);
});

socket.on("typing", (text) => {
  typing.innerText = text || "";
});

clearButton.addEventListener("click", () => messages.innerHTML = "");

socket.on("roomUsers", ({ users }) => {
  userList.innerHTML = "";
  users.forEach((user) => {
    const li = document.createElement("li");
    li.textContent = user.name;
    userList.appendChild(li);
  });
});
// for upload file 
fileInput?.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) return alert("❌ File too large. Max 5MB allowed.");

  const reader = new FileReader();
  reader.onloadstart = () => uploadProgress.style.display = "block";
  reader.onprogress = (e) => uploadProgress.value = (e.loaded / e.total) * 100;
  reader.onload = () => {
    socket.emit("fileUpload", {
      fileName: file.name,
      fileData: reader.result,
      fileType: file.type,
    });
    uploadProgress.style.display = "none";
    fileInput.value = "";
  };
  reader.readAsDataURL(file);
});

socket.on("fileShared", (msg) => renderMessage(msg));
socket.on("audioMessage", (msg) => renderMessage(msg));

searchButton.addEventListener("click", () => {
  const keyword = searchInput.value.trim().toLowerCase();
  if (!keyword) return;

  const allMessages = document.querySelectorAll("#messages .chat-message");
  let found = false;

  allMessages.forEach(msg => {
    msg.classList.remove("search-highlight");

    const rawText = (msg.dataset.text || msg.textContent).toLowerCase();

    // ✅ Match emoji or text
    if (!found && rawText.includes(keyword)) {
      msg.scrollIntoView({ behavior: "smooth", block: "center" });
      msg.classList.add("search-highlight");
      found = true;
      setTimeout(() => msg.classList.remove("search-highlight"), 5000);
    }
  });

  if (!found) alert(`❌ No message found containing: "${keyword}"`);
});

// for audio
recordAudioBtn.addEventListener("click", async () => {
  if (!navigator.mediaDevices) return alert("Audio not supported.");
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  mediaRecorder = new MediaRecorder(stream);
  mediaRecorder.start();
  recordAudioBtn.textContent = "⏹";
  mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
  mediaRecorder.onstop = () => {
    const blob = new Blob(audioChunks, { type: "audio/webm" });
    const reader = new FileReader();
    reader.onloadend = () => {
      socket.emit("audioMessage", {
        fileData: reader.result,
        fileName: `voice_${Date.now()}.webm`,
        fileType: "audio/webm",
      });
    };
    reader.readAsDataURL(blob);
    audioChunks = [];
    recordAudioBtn.textContent = "🎤";
  };
  setTimeout(() => {
    if (mediaRecorder.state === "recording") mediaRecorder.stop();
  }, 10000);
});

// ✅ EMOJI PANEL LOGIC
const emojiList = [
  // 🔝 1. Top Most Used
  "😂", "🤣", "❤️", "😍", "😊", "👍", "🙏", "🔥", "🥰", "😭",
  "😅", "😘", "😎", "😉", "👏", "🥳", "🙌", "💯", "😢", "😡",
  "💖", "💜", "🫶", "🤝", "👋", "👌", "💔", "🎉", "🎂", "🎁",
  "✨", "🌟", "💡", "🎶", "🎵", "🎮", "📱", "💻", "🍕", "🍔",
  "😇", "😋", "🥹", "🤩", "🤗", "😤", "💬", "📸", "🚩",

  // 😀 2. Smileys & Emotions
  "😀", "😃", "😄", "😁", "😆", "🙂", "🙃", "😛", "😜", "🤪",
  "😝", "🤭", "🤫", "🤔", "😏", "🤨", "😐", "😑", "😶", "😒",
  "🙄", "😬", "😔", "😪", "😴", "🥱", "😥", "😓", "😞", "😣",
  "😖", "😫", "😩", "😠", "🤬", "☹️", "😷", "🤒", "🤕", "🤢",
  "🤮", "🤧", "🥵", "🥶", "🥴", "🤯", "😵", "😰", "😨", "😧",
  "😦", "😱", "😳", "😲", "😯", "😮", "😟", "🙁", "😕", "😌",
  "🤤", "🤑",

  // 😈 3. Mischievous / Faces
  "😈", "👿", "🤥", "🤓", "🧐", "🤠", "🤐", "😺", "😸", "😹",
  "😻", "😽", "😼", "🙀", "😿", "🫣", "🫠", "🫥", "🫡",

  // 💡 4. UI / Reactions / Symbols
  "💪", "✌️", "💤", "💎", "⚡", "📌", "🛎️", "🔔", "🔕", "⏰",
  "📣", "🔊", "🔇", "📚", "📖", "✏️", "📝", "📦", "🧭", "🆗",
  "✅", "❌", "❓", "❗", "✔️", "♻️", "⚠️", "🔁", "🔂", "🔄",
  "🔃", "⛔", "🚫", "🔞", "➕", "➖", "➗", "✖️", "〽️", "💢",
  "📍", "🛑", "🆘", "🈲",

  // 🐾 5. Animals & Nature
  "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯",
  "🦁", "🐮", "🐷", "🐸", "🐵", "🦄", "🐔", "🐧", "🦋", "🌞",
  "🌝", "🌚", "🌈", "🌧️", "🌪️", "❄️", "💧", "☀️", "🌕",

  // 🍽 6. Food & Drink
  "🍟", "🌭", "🍿", "🥓", "🍗", "🍖", "🥪", "🍝", "🥗", "🍤",
  "🍩", "🍪", "🍰", "🧁", "🍫", "🍭", "🍬", "🍎", "🍊", "🍌",
  "🍉", "🍓", "🍇", "🍍", "🥥", "🥭", "🥝", "🧃",

  // ☕ 7. Drinks & Party
  "🥤", "🧋", "🍺", "🍻", "🍷", "🥂", "🍹", "🍾", "🍵", "☕",
  "🥃", "🧉", "🍶", "🍸", "🍽️",

  // 🗺️ 8. Activity, Travel & Places
  "🎧", "🎤", "🎬", "🎨", "🎯", "🎳", "🏀", "⚽", "🏈", "🏓",
  "🏸", "🎲", "🚗", "🚕", "🚌", "🚎", "🚓", "✈️", "🚀", "🛫",
  "🛬", "🚢", "🏝️", "🏖️", "⛺", "🗺️", "🗽",

  // 📦 9. Objects
  "📷", "📞", "🔋", "🔌", "🔦", "🔑", "🗝️", "🪙", "🧱", "🪵",
  "🪑", "🛏️", "🪞", "🧴", "🧯", "🧼", "🪒", "💳", "🧾", "🪪",
  "🔐"
];
// render emoji 
function renderEmojiPanel(targetInput) {
  emojiPanel.innerHTML = "";
  emojiList.forEach((emoji) => {
    const btn = document.createElement("button");
    btn.textContent = emoji;
    btn.className = "emoji-btn";
    btn.type = "button";
    btn.addEventListener("click", () => {
      targetInput.value += emoji;
      targetInput.focus();
      emojiPanel.style.display = "none";
    });
    emojiPanel.appendChild(btn);
  });
}
emojiBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  renderEmojiPanel(input);
  emojiPanel.style.display = emojiPanel.style.display === "block" ? "none" : "block";
});
if (emojiBtnSearch) {
  emojiBtnSearch.addEventListener("click", (e) => {
    e.stopPropagation();
    renderEmojiPanel(searchInput); // ✅ target is search input
    emojiPanel.style.display = emojiPanel.style.display === "block" ? "none" : "block";
  });
}
document.addEventListener("click", (e) => {
  if (!emojiPanel.contains(e.target) && e.target !== emojiBtn && e.target !== emojiBtnSearch) {
    emojiPanel.style.display = "none";
  }
});

function showEditPrompt(messageId, currentText) {
  const editContainer = document.createElement("div");
  editContainer.className = "edit-container";
  editContainer.innerHTML = `
    <input type="text" id="editInput" value="${currentText}" />
    <button id="saveEdit">Save</button>
    <button id="cancelEdit">Cancel</button>
    <div id="emoji-panel-edit" class="emoji-panel"></div>
    <button id="emoji-btn-edit">😊</button>
  `;
  document.body.appendChild(editContainer);

  const editInput = editContainer.querySelector("#editInput");
  const saveBtn = editContainer.querySelector("#saveEdit");
  const cancelBtn = editContainer.querySelector("#cancelEdit");
  const emojiBtnEdit = editContainer.querySelector("#emoji-btn-edit");
  const emojiPanelEdit = editContainer.querySelector("#emoji-panel-edit");

  function renderEmojiEditPanel() {
    emojiPanelEdit.innerHTML = "";
    emojiList.forEach((emoji) => {
      const btn = document.createElement("button");
      btn.textContent = emoji;
      btn.className = "emoji-btn";
      btn.addEventListener("click", () => {
        editInput.value += emoji;
        editInput.focus();
        emojiPanelEdit.style.display = "none";
      });
      emojiPanelEdit.appendChild(btn);
    });
  }

  emojiBtnEdit.addEventListener("click", (e) => {
    e.stopPropagation();
    renderEmojiEditPanel();
    emojiPanelEdit.style.display = emojiPanelEdit.style.display === "block" ? "none" : "block";
  });

  document.addEventListener("click", (e) => {
    if (!emojiPanelEdit.contains(e.target) && e.target !== emojiBtnEdit) {
      emojiPanelEdit.style.display = "none";
    }
  });

  saveBtn.onclick = () => {
    const newText = editInput.value.trim();
    if (newText && newText !== currentText) {
      socket.emit("editMessage", { messageId, newText });
    }
    editContainer.remove();
  };

  cancelBtn.onclick = () => editContainer.remove();
}
