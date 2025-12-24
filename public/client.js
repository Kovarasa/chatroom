// public/client.js
const socket = io();

const usernameForm = document.getElementById("username-form");
const usernameInput = document.getElementById("username");
const form = document.getElementById("form");
const input = document.getElementById("input");
const messages = document.getElementById("messages");
const usersList = document.getElementById("users");
const dmIndicator = document.getElementById("dm-indicator");

let myId = null;
let currentTarget = null;

function shortTimeFromISO(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return "";
  }
}

function addMessage(text, cls = "", ts = null) {
  const item = document.createElement("li");
  const timeSpan = document.createElement("span");
  timeSpan.className = "ts";
  timeSpan.textContent = ts ? shortTimeFromISO(ts) : "";
  const textSpan = document.createElement("span");
  textSpan.className = "msg-text";
  textSpan.textContent = text;

  item.appendChild(textSpan);
  if (timeSpan.textContent) item.appendChild(timeSpan);
  if (cls) item.className = cls;
  messages.appendChild(item);
  messages.scrollTop = messages.scrollHeight;
}

function renderUsers(list) {
  usersList.innerHTML = "";
  list.forEach(({ id, name }) => {
    const li = document.createElement("li");
    li.textContent = name;
    li.dataset.id = id;
    li.className = id === myId ? "me" : "";
    li.title = id === myId ? "That's you" : `Click to DM ${name}`;
    li.addEventListener("click", () => {
      if (id === myId) {
        currentTarget = null;
        dmIndicator.textContent = "Public chat";
      } else {
        currentTarget = { id, name };
        dmIndicator.textContent = `DM to ${name}`;
      }
      input.focus();
    });
    usersList.appendChild(li);
  });
}

socket.on("connect", () => {
  myId = socket.id;
});

usernameForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = usernameInput.value.trim();
  if (!name) return;
  socket.emit("set username", name);
  usernameForm.style.display = "none";
  form.style.display = "flex";
  input.focus();
});

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;

  if (currentTarget) {
    socket.emit("private message", { toId: currentTarget.id, text });
    addMessage(`To ${currentTarget.name}: ${text}`, "outgoing-dm", new Date().toISOString());
  } else {
    socket.emit("chat message", text);
  }

  input.value = "";
});

socket.on("chat message", (payload) => {
  addMessage(`${payload.fromName}: ${payload.text}`, "", payload.ts);
});

socket.on("system message", (payload) => {
  addMessage(payload.text, "system", payload.ts);
});

socket.on("private message", (payload) => {
  // ignore sender echo that was already displayed locally
  if (payload.fromId === myId && payload.toId) return;
  if (payload.fromId === myId) return;

  addMessage(`DM from ${payload.fromName}: ${payload.text}`, "incoming-dm", payload.ts);
});

socket.on("user list", (list) => {
  renderUsers(list);
});
