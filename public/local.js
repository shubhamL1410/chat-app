const socket = io();
let name = "";

const nameForm = document.getElementById("name-form");
const chatForm = document.getElementById("chatForm");
const input = document.getElementById("msg");
const messages = document.getElementById("messages");
const typing = document.getElementById("typing");

nameForm.addEventListener("submit", (e) => {
  e.preventDefault();
  name = document.getElementById("name").value.trim();
  if (name) {
    nameForm.style.display = "none";
    chatForm.style.display = "flex";
    messages.style.display = "block";
    socket.emit("joinLocal", name);
  }
});

chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const msg = input.value.trim();
  if (msg) {
    socket.emit("localMessage", msg);
    input.value = "";
    input.focus();
  }
});

socket.on("localMessage", (msg) => {
  const html = `<li><strong>${msg.user}</strong>: ${msg.text}</li>`;
  messages.innerHTML += html;
  messages.scrollTop = messages.scrollHeight;
});

input.addEventListener("input", () => {
  socket.emit("typing", true);
  clearTimeout(window.typingTimeout);
  window.typingTimeout = setTimeout(() => {
    socket.emit("typing", false);
  }, 1000);
});

socket.on("typing", (text) => {
  typing.innerText = text || "";
});
