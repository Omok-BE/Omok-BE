const app = require("./app");
// const { users } = require('./models')

const httpServer = require("http").createServer(app);
const { Server } = require("socket.io");
const { instrument } = require("@socket.io/admin-ui");

const io = new Server(httpServer, {
  cors: {
    origin: ["https://admin.socket.io"],
    credentials: true,
  },
});
instrument(io, {
  auth: false,
});

io.on("connection", (socket) => {
    console.log("client와 연결됨 ✅");
    socket.onAny((event) => {
      console.log(`Socket Event: ${event}`);

    socket.on("nickname", (nickname) => socket["nickname"] = nickname); // 닉네임 설정
    socket.on("enter_room", (roomName) => {                             // 방 입장시
        socket.join(roomName)                                           // 방 이름 지정
        socket.to(roomName).emit("welcome", socket.nickname)            // 채팅창에 입장 알림
    });
    socket.on("new_message", (msg, room) => {                           // 메시지 전송시
        socket.to(room).emit("new_message", `${socket.nickname}: ${msg}`); // 방에 있는 모든 사람에게 메시지 전송
    });
    
    socket.on("disconnecting", () => {                                                 // 방 퇴장시
        socket.rooms.forEach((roos) => socket.to(room).emit("bye", socket.nickname));  // 방에 bye 전달 
    })

  });
});

module.exports = { httpServer };
