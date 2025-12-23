/* eslint-disable @typescript-eslint/no-require-imports */
const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;

const app = next({ dev, hostname, port, turbo: false });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    const parsedUrl = parse(req.url, true);
    await handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    socket.on("join-group", (groupId) => {
      socket.join(groupId);
    });

    socket.on("send-message", (data) => {
      io.to(data.groupId).emit("receive-message", data);
    });

    socket.on("typing-start", (data) => {
      socket.to(data.groupId).emit("user-typing", {
        userId: data.userId,
        userName: data.userName,
        groupId: data.groupId,
      });
    });

    socket.on("typing-stop", (data) => {
      socket.to(data.groupId).emit("user-stopped-typing", {
        userId: data.userId,
        groupId: data.groupId,
      });
    });

    socket.on("mark-messages-read", (data) => {
      io.to(data.groupId).emit("messages-read", {
        userId: data.userId,
        messageIds: data.messageIds,
        groupId: data.groupId,
      });
    });

    socket.on("start-voice-call", (data) => {
      socket.to(data.groupId).emit("incoming-voice-call", data);
    });

    socket.on("voice-signal", (data) => {
      io.to(data.to).emit("voice-signal", {
        signal: data.signal,
        from: socket.id,
      });
    });

    socket.on("disconnect", () => {});
  });

  httpServer.listen(port, () => {});
});
