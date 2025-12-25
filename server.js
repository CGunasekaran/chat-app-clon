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
    // Join user-specific room for direct calls
    socket.on("join-user-room", (userId) => {
      socket.join(`user-${userId}`);
    });

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

    socket.on("add-reaction", (data) => {
      io.to(data.groupId).emit("reaction-added", {
        messageId: data.messageId,
        reaction: data.reaction,
        groupId: data.groupId,
      });
    });

    socket.on("remove-reaction", (data) => {
      io.to(data.groupId).emit("reaction-removed", {
        messageId: data.messageId,
        reactionId: data.reactionId,
        emoji: data.emoji,
        userId: data.userId,
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

    socket.on("end-voice-call", (data) => {
      io.to(data.to).emit("voice-call-ended");
    });

    socket.on("cancel-call", (data) => {
      io.to(data.to).emit("call-cancelled");
    });

    // Call initiation and response
    socket.on("initiate-call", (data) => {
      // Send incoming call notification directly to the recipient's room
      io.to(`user-${data.to}`).emit("incoming-call", {
        from: data.from,
        fromName: data.fromName,
        callType: data.callType,
        callId: data.callId,
        groupId: data.groupId,
      });
    });

    socket.on("accept-call", (data) => {
      // Notify all participants that call was accepted
      io.to(data.groupId).emit("call-accepted", {
        by: data.acceptedBy,
        callId: data.callId,
      });
    });

    socket.on("reject-call", (data) => {
      // Notify the caller that call was rejected
      io.to(data.groupId).emit("call-rejected", {
        by: data.rejectedBy,
        callId: data.callId,
      });
    });

    // Video call signaling
    socket.on("call:join", (data) => {
      socket.join(data.callId);
      socket.to(data.callId).emit("call:user-joined", {
        userId: data.userId,
        userName: data.userName,
      });
    });

    socket.on("call:offer", (data) => {
      socket.to(data.callId).emit("call:offer", {
        offer: data.offer,
        from: data.from,
      });
    });

    socket.on("call:answer", (data) => {
      socket.to(data.callId).emit("call:answer", {
        answer: data.answer,
        from: data.from,
      });
    });

    socket.on("call:ice-candidate", (data) => {
      socket.to(data.callId).emit("call:ice-candidate", {
        candidate: data.candidate,
        from: data.from,
      });
    });

    socket.on("call:leave", (data) => {
      socket.to(data.callId).emit("call:user-left", {
        userId: data.userId,
      });
      socket.leave(data.callId);
    });

    socket.on("call:toggle-video", (data) => {
      socket.to(data.callId).emit("call:user-video-toggled", {
        userId: data.userId,
        enabled: data.enabled,
      });
    });

    socket.on("call:toggle-audio", (data) => {
      socket.to(data.callId).emit("call:user-audio-toggled", {
        userId: data.userId,
        enabled: data.enabled,
      });
    });

    socket.on("disconnect", () => {});
  });

  httpServer.listen(port, () => {});
});
