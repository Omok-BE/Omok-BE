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

// 대기실 socketIO
const waitingRoom = io.of('/waiting')
let theRoomNumber;

//방 인원 카운트_210304
function waitingRoomCount(roomName){
  return sockets.adapter.rooms.get(roomName)?.size
}

io.on("connection", (socket) => {
    console.log("client와 연결됨 ✅");
    socket.onAny((event) => {
      console.log(`Socket Event: ${event}`);
    //socket nickname 설정_210303
    socket.on("nickname", (nickname) => socket["nickname"] = nickname);
    //대기실 플레이어로 입장시 정보 업데이트_210303
    socket.on("enterRoomPlayer", async (roomNum) => {
      const state = "player"
      theRoomNumber = roomNum;
      socket.join(roomNum)
      socket.join(state)
      const playerCnt = waitingRoomCount(state)
      await Rooms.updateOne({ roomNum }, { $set: { playerCnt }})
      const userInfo = await Users.findOne({ id: socket.nickname }, { _id: false, id: true, score: true, point: true, state: true })
      socket.to(roomNum).emit("welcome", socket.nickname, userInfo)
      // socket.to(roomNum).emit("welcome", socket.nickname, userInfo)
      // socket.emit("welcome", socket.nickname, userInfo)
      console.log(socket.rooms)
    });
    //대기실 옵져버로 입장시 정보 업데이트_210303
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
    //플레이어로 변경시 정보 업데이트_210304
    socket.on("changeToPlayer", async (player) => {
      const previousTeam = "observer"
      socket.leave(previousTeam)
      socket.join(player)
      const playerCnt = waitingRoomCount(player)
      const observerCnt = waitingRoomCount(previousTeam)
      await Rooms.updateMany({ roomNum: theRoomNumber }, { $set: { playerCnt, observerCnt }})
      socket.to(roomNum).emit("moveToPlayer", socket.nickname)
    })
    //옵져버로 변경시 정보 업데이트_210304
    socket.on("changeToObserver", async (observer) => {
      const previousTeam = "player"
      socket.leave(previousTeam)
      socket.join(observer)
      const playerCnt = waitingRoomCount(previousTeam)
      const observerCnt = waitingRoomCount(observer)
      await Rooms.updateMany({ roomNum: theRoomNumber }, { $set: { playerCnt, observerCnt }})
      socket.to(roomNum).emit("moveToObserver", socket.nickname)
    })
    //대기실 내 채팅_210303
    socket.on("chat", (chat) => {
        const data = { nickname: socket.nickname, chat } 
        socket.to(theRoomNumber).emit("chat", data);
    });
    //퇴장시 방 최신화_210304    
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




//게임방 socket 시작
const gameRoom = io.of('/game');

//접속자 수
function gameRoomCount(gameNum){
  return gameRoom.adapter.rooms.get(gameNum)?.size
}

//game방 연결  
gameRoom.on("connect", async (socket) =>{
  console.log("game 소켓 연결됨");
  
  // 유저 id를 닉네임 설정
  socket.on("nickname", (nickname) => socket["nickname"] = nickname); 

  //socket.join(방 아이디)
  socket.on("joinGame", (gameNum) => {
      //"일번방"이름의 방에 조인
      socket.join(gameNum);
  });

  //game방 채팅
  socket.on("chat", (chat) => {
      const data = {name:socket.nickname, chat};
      console.log(`게임쳇 data:${data}`);
      socket.to(gameNum).emit("chat", data);
  });

  //game방 훈수채팅(귓속말)
  socket.on("teaching", (chat) => {
      const data = {name:socket.nickname, chat};
      console.log(`훈수쳇 data:${data}`);
      socket.to(gameNum).emit("teaching", data);  //소켓 아이디에 전달
  });

  // game방 퇴장
  //플레이어 퇴장시 방폭
  //게임끝나고 유저들이 대기방가면 state(A팀, B팀)표시
  //소켓에서 대기방 연결하기.
  socket.on("disconnecting", async () => {
      //game방 퇴장 메시지
      socket.to(gameNum).emit("bye", socket.id);
      if(socket.rooms.has("player")){                         // 나가는 사람이 플레이어라면
          await Rooms.destroy({ where: { gameNum }})          //소켓게임방 자동 삭제후 유저들이 대기방으로가면
                                                              //waiting룸 on.             
        } else {                                                         
          const observerCnt = gameRoomCount("observer") -1    // 나가는 사람이 관전자면 -1            
          await Rooms.updateOne({ gameNum }, { $set: { observerCnt }})
        }

    console.log("게임 disconnecting");

  });

  //게임결과
  // socket.on("result", (winner, loser) => {

  //     const score = await users.findOne({id}, {_id:false, socre:true});
  //     socket.to(gameNum).emit("result", {winner : , loser: b})
  // });

  //오목 게임
  //흑돌-짝, 백돌-홀 순서로 디비저장
  //teachingCnt 저장 + teachingCnt 




});

module.exports = { httpServer };