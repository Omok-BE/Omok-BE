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


// 대기실 socket 시작
const waitingRoom = io.of('/waiting')
let theRoomNumber; // 접속한 방 번호
// 방 참가 인원 카운트 함수
function waitingRoomCount(roomName){
  return waitingRoom.adapter.rooms.get(roomName)?.size
}

waitingRoom.on("connection", (socket) => {
    console.log("client와 연결됨 ✅");
    socket.onAny((event) => {
      console.log(`Socket Event: ${event}`); // 발생하는 이벤트 console에 출력

    socket.on("nickname", (nickname) => socket["nickname"] = nickname); // 닉네임 설정

    socket.on("enterRoomPlayer", async (roomNum) => {                            // 플레이어로 방 입장시
      const state = "player"
      theRoomNumber = roomNum;
      socket.join(roomNum)                                                       // 방 이름 지정
      socket.join(state)                                                         // status 지정
      const playerCnt = waitingRoomCount(state)                                         // 플레이어 Cnt
      await Rooms.updateOne({ roomNum }, { $set: { playerCnt }})                 // 방 playerCnt 업데이트
      const userInfo = await Users.findOne({ id: socket.nickname }, { _id: false, id: true, score: true, point: true, state: true })  // 유저 정보 조회
      socket.to(roomNum).emit("welcome", socket.nickname, userInfo)              // 채팅창에 입장 알림
    });
  
    socket.on("enterRoomObserver", async (roomNum) => {                            // 관전자로 방 입장시
      theRoomNumber = roomNum;
      const state = "observer"
      socket.join(roomNum)                                                       // 방 이름 지정
      socket.join(state)                                                         // status 지정
      const observerCnt = waitingRoomCount(state)                                         // 플레이어 Cnt
      await Rooms.updateOne({ roomNum }, { $set: { observerCnt }})                 // 방 playerCnt 업데이트
      const userInfo = await Users.findOne({ id: socket.nickname }, { _id: false, id: true, score: true, point: true, state: true })  // 유저 정보 조회
      socket.to(roomNum).emit("welcome", socket.nickname, userInfo)              // 채팅창에 입장 알림
    });

    socket.on("changeToPlayer", async (player) => {        // 관전자에서 플레이어로 변경
      const previousTeam = "observer"
      socket.leave(previousTeam)                           // 관전자 팀에서 나옴
      socket.join(player)                                  // 플레이어 팀으로 들어감
      const playerCnt = waitingRoomCount(player)           // 대기실 내의 플레이어 카운트
      const observerCnt = waitingRoomCount(previousTeam)   // 대기실 내의 관전자 카운트
      await Rooms.updateMany({ roomNum: theRoomNumber }, { $set: { playerCnt, observerCnt }})  // 대기실 내의 플레이어, 관전자 숫자 최신화
      socket.to(roomNum).emit("moveToPlayer", socket.nickname)
    })

    socket.on("changeToObserver", async (observer) => {        // 관전자에서 플레이어로 변경
      const previousTeam = "player"
      socket.leave(previousTeam)                               // 플레이어 팀에서 나옴
      socket.join(observer)                                    // 관전자 팀으로 들어감
      const playerCnt = waitingRoomCount(previousTeam)         // 대기실 내의 플레이어 카운트
      const observerCnt = waitingRoomCount(observer)           // 대기실 내의 관전자 카운트
      await Rooms.updateMany({ roomNum: theRoomNumber }, { $set: { playerCnt, observerCnt }})  // 대기실 내의 플레이어, 관전자 숫자 최신화
      socket.to(roomNum).emit("moveToObserver", socket.nickname)
    })

    socket.on("chat", (chat) => {                // 메시지 전송시 // 나중에 theRoom으로 교체하자
        const data = { nickname: socket.nickname, chat } 
        socket.to(theRoomNumber).emit("chat", data); // 방에 있는 모든 사람에게 메시지 전송
    });
    
    socket.on("disconnecting", async () => {                                         // 방 퇴장시
      socket.to(theRoomNumber).emit("bye", socket.nickname)                          // 방에 bye 전달
      if(socket.rooms.has("player")){                                          // 나가는 사람이 플레이어라면
        const playerCnt = waitingRoomCount("player") -1                               // 플레이어 한명 나가면 -1
        await Rooms.updateOne({ roomNum: theRoomNumber }, { $set: { playerCnt }})            // 실시간 업데이트
      } else {                                                                 // 나가는 사람이 관전자면
        const observerCnt = waitingRoomCount("observer") -1
        await Rooms.updateOne({ roomNum: theRoomNumber }, { $set: { observerCnt }})
      }
    })
  });
});


module.exports = { httpServer };
