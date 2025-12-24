// server.js
const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static("public"));

const users = new Map();

function nowISO() {
  return new Date().toISOString();
}

function broadcastUserList() {
  const list = Array.from(users.entries()).map(([id, name]) => ({ id, name }));
  io.emit("user list", list);
}

io.on("connection", (socket) => {
  console.log("A user connected", socket.id);

  users.set(socket.id, "Anonymous");
  broadcastUserList();

  socket.on("set username", (name) => {
    const safeName = String(name).trim() || "Anonymous";
    users.set(socket.id, safeName);
    io.emit("system message", { text: `${safeName} joined the chat`, ts: nowISO() });
    broadcastUserList();
  });

  socket.on("chat message", (msg) => {
    const username = users.get(socket.id) || "Anonymous";
    const payload = { fromId: socket.id, fromName: username, text: String(msg), ts: nowISO() };
    io.emit("chat message", payload);
  });

  socket.on("private message", ({ toId, text }) => {
    const fromName = users.get(socket.id) || "Anonymous";
    const payload = { fromId: socket.id, fromName, text: String(text), ts: nowISO() };

    if (io.sockets.sockets.get(toId)) {
      io.to(toId).emit("private message", payload);
      socket.emit("private message", { ...payload, toId });
    } else {
      socket.emit("system message", { text: "User is no longer online", ts: nowISO() });
    }
  });

  socket.on("disconnect", () => {
    const name = users.get(socket.id) || "Anonymous";
    users.delete(socket.id);
    io.emit("system message", { text: `${name} left the chat`, ts: nowISO() });
    broadcastUserList();
    console.log("A user disconnected", socket.id);
  });
});

http.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
