const app = require("./app");
const Users = require('./models/users')
const Rooms = require('./models/rooms')

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

// 방 참가 인원 카운트 함수
function countRoom(roomName){
  return io.sockets.adapter.rooms.get(roomName)?.size
}

io.on("connection", (socket) => {
    console.log("client와 연결됨 ✅");
    socket.onAny((event) => {
      console.log(`Socket Event: ${event}`); // 발생하는 이벤트 console에 출력

    socket.on("nickname", (nickname) => socket["nickname"] = nickname); // 닉네임 설정

    socket.on("enterRoomPlayer", async (roomName) => {                            // 플레이어로 방 입장시
      const status = "player"
      socket.join(roomName)                                                       // 방 이름 지정
      socket.join(status)                                                         // status 지정
      const playerCnt = countRoom(status)                                         // 플레이어 Cnt
      await Users.updateOne({ id: socket.nickname }, { $set: { status }})         // user status 업데이트
      await Rooms.updateOne({ roomName }, { $set: { playerCnt }})                 // 방 playerCnt 업데이트
      const userInfo = await Users.findOne({ id: socket.nickname }, { _id: false, id: true, score: true, point: true, status: true })  // 유저 정보 조회
      socket.to(roomName).emit("welcome", socket.nickname, userInfo)              // 채팅창에 입장 알림
    });
  
    socket.on("enterRoomObserver", async (roomName) => {                            // 관전자로 방 입장시
      const status = "observer"
      socket.join(roomName)                                                       // 방 이름 지정
      socket.join(status)                                                         // status 지정
      const observerCnt = countRoom(status)                                         // 플레이어 Cnt
      await Users.updateOne({ id: socket.nickname }, { $set: { status }})         // user status 업데이트
      await Rooms.updateOne({ roomName }, { $set: { observerCnt }})                 // 방 playerCnt 업데이트
      const userInfo = await Users.findOne({ id: socket.nickname }, { _id: false, id: true, score: true, point: true, status: true })  // 유저 정보 조회
      socket.to(roomName).emit("welcome", socket.nickname, userInfo)              // 채팅창에 입장 알림
    });

    socket.on("chat", (roomName, chat) => {                // 메시지 전송시    
        const data = { nickname: socket.nickname, chat } 
        socket.to(roomName).emit("chat", data); // 방에 있는 모든 사람에게 메시지 전송
    });
    
    socket.on("disconnecting", () => {                                                 // 방 퇴장시
        socket.rooms.forEach((room) => socket.to(room).emit("bye", socket.nickname));  // 방에 bye 전달 
    })

  });
});

module.exports = { httpServer };
