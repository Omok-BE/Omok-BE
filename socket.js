const app = require("./app");
const Users = require('./models/users')
const Rooms = require('./models/rooms')

const httpServer = require("http").createServer(app);
const { Server } = require("socket.io");
const { instrument } = require("@socket.io/admin-ui");

const io = new Server(httpServer, {
  cors : ({
    origin: true,
    credentials: true
  })
});
instrument(io, {
  auth: false,
});


// by hak, 대기실 socketIO
const waitingRoom = io.of('/waiting')
let theRoomNumber;

// by hak, 방 인원 카운트_210304
function waitingRoomCount(roomName){
  return waitingRoom.adapter.rooms.get(roomName)?.size
}

waitingRoom.on("connection", (socket) => {
    console.log("client와 연결됨 ✅");
    socket.onAny((event) => {
      console.log(`Socket Event: ${event}`);
    // by hak, socket nickname 설정_210303
    socket.on("nickname", (nickname) => socket["nickname"] = nickname);
    // by hak, 대기실 플레이어로 입장시 정보 업데이트_210303
    socket.on("enterRoomPlayer", async (roomNum) => {
      const state = "player"
      theRoomNumber = roomNum;
      socket.join(roomNum)
      socket.join(state)
      const playerCnt = waitingRoomCount(state)
      await Rooms.updateOne({ roomNum }, { $set: { playerCnt }})
      const userInfo = await Users.findOne({ id: socket.nickname }, { _id: false, id: true, score: true, point: true, state: true })
      socket.to(roomNum).emit("welcome", socket.nickname, userInfo)
    });
    // by hak, 대기실 옵져버로 입장시 정보 업데이트_210303
    socket.on("enterRoomObserver", async (roomNum) => {
      theRoomNumber = roomNum;
      const state = "observer"
      socket.join(roomNum)
      socket.join(state)
      const observerCnt = waitingRoomCount(state)
      await Rooms.updateOne({ roomNum }, { $set: { observerCnt }})
      const userInfo = await Users.findOne({ id: socket.nickname }, { _id: false, id: true, score: true, point: true, state: true })
      socket.to(roomNum).emit("welcome", socket.nickname, userInfo)
    });
    // by hak, 플레이어로 변경시 정보 업데이트_210304
    socket.on("changeToPlayer", async (player) => {
      const previousTeam = "observer"
      socket.leave(previousTeam)
      socket.join(player)
      const playerCnt = waitingRoomCount(player)
      const observerCnt = waitingRoomCount(previousTeam)
      await Rooms.updateMany({ roomNum: theRoomNumber }, { $set: { playerCnt, observerCnt }})
      socket.to(roomNum).emit("moveToPlayer", socket.nickname)
    })
    // by hak, 옵져버로 변경시 정보 업데이트_210304
    socket.on("changeToObserver", async (observer) => {
      const previousTeam = "player"
      socket.leave(previousTeam)
      socket.join(observer)
      const playerCnt = waitingRoomCount(previousTeam)
      const observerCnt = waitingRoomCount(observer)
      await Rooms.updateMany({ roomNum: theRoomNumber }, { $set: { playerCnt, observerCnt }})
      socket.to(roomNum).emit("moveToObserver", socket.nickname)
    })
    // by hak, 대기실 내 채팅_210303
    socket.on("chat", (chat) => {
        const data = { nickname: socket.nickname, chat } 
        socket.to(theRoomNumber).emit("chat", data);
    });
    // by hak, 퇴장시 방 최신화_210304    
    socket.on("disconnecting", async () => {
      socket.to(theRoomNumber).emit("bye", socket.nickname)
      if(socket.rooms.has("player")){
        const playerCnt = waitingRoomCount("player") -1
        await Rooms.updateOne({ roomNum: theRoomNumber }, { $set: { playerCnt }})
      } else {
        const observerCnt = waitingRoomCount("observer") -1
        await Rooms.updateOne({ roomNum: theRoomNumber }, { $set: { observerCnt }})
      }
    })
  });
});


module.exports = { httpServer };
