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
  return waitingRoom.adapter.rooms.get(roomName)?.size
}

waitingRoom.on("connection", (socket) => {
    console.log("client와 연결됨 ✅");
    socket.onAny((event) => {
      console.log(`Socket Event: ${event}`);
    //socket nickname 설정_210303
    socket.on("nickname", (nickname) => socket["nickname"] = nickname);
    //대기실 플레이어로 입장시 정보 업데이트_210303
    socket.on("enterRoomPlayer", async (roomNum) => {
      theRoomNumber = roomNum;
      const state = "player"
      socket.join(roomNum)
      socket.join(state)
      const playerCnt = waitingRoomCount(state)
      await Rooms.updateOne({ roomNum }, { $set: { playerCnt }})
      const userInfo = await Users.findOne({ id: socket.nickname }, { _id: false, id: true, score: true, point: true, state: true })
      waitingRoom.to(roomNum).emit("welcome", socket.nickname, userInfo)
      console.log("대기실 입장", socket.rooms)
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
      waitingRoom.to(roomNum).emit("welcome", socket.nickname, userInfo)
    });
    //플레이어로 변경시 정보 업데이트_210304
    socket.on("changeToPlayer", async (player) => {
      const previousTeam = "observer"
      socket.leave(previousTeam)
      socket.join(player)
      const playerCnt = waitingRoomCount(player)
      const observerCnt = waitingRoomCount(previousTeam)
      await Rooms.updateMany({ roomNum: theRoomNumber }, { $set: { playerCnt, observerCnt }})
      waitingRoom.to(roomNum).emit("moveToPlayer", socket.nickname)
    })
    //옵져버로 변경시 정보 업데이트_210304
    socket.on("changeToObserver", async (observer) => {
      const previousTeam = "player"
      socket.leave(previousTeam)
      socket.join(observer)
      const playerCnt = waitingRoomCount(previousTeam)
      const observerCnt = waitingRoomCount(observer)
      await Rooms.updateMany({ roomNum: theRoomNumber }, { $set: { playerCnt, observerCnt }})
      waitingRoom.to(roomNum).emit("moveToObserver", socket.nickname)
    })
    //대기실 내 채팅_210303
    socket.on("chat", (chat) => {
        const data = { nickname: socket.nickname, chat } 
        waitingRoom.to(theRoomNumber).emit("chat", data);
        console.log("채팅", data)
    });
    //퇴장시 방 최신화_210304    
    socket.on("disconnecting", async () => {
      waitingRoom.to(theRoomNumber).emit("bye", socket.nickname)
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



//게임방 socket
const gameRoom = io.of('/game');
let thisgameNum 

// x,y 좌표를 배열의 index값으로 변환
let xyToIndex = (x, y) => {
  return x + y * 19;
};
// let bboard = new Array(Math.pow(19, 2)).fill(-1);
let bboard 
let count = 0;

//접속자 수
function gameRoomCount(gameNum){
  return gameRoom.adapter.rooms.get(gameNum)?.size
}

//game방 연결  
gameRoom.on("connect", async (socket) =>{
  bboard = new Array(Math.pow(19, 2)).fill(-1);
  
  console.log("game 소켓 연결됨★★");
  console.log("겜방연결후 bboard",bboard);
  console.log("겜방연결후count",count);
  console.log("겜방연결후socket.id",socket.id);

  socket.onAny((event) => {
  console.log(`게임방 이벤트: ${event}`);

  // 유저 id를 닉네임 설정
  socket.on("nickname", (nickname) => {
    socket["nickname"] = nickname
    console.log("게임방 닉네임은?",nickname);
    console.log("소켓닉네임은???",socket.nickname);

  });

  //개별 game방 Join 
  socket.on("joinGame", (gameNum) => {
      thisgameNum = gameNum;

      //"일번방"이름의 방에 조인
      console.log(`조인게임방번호:${gameNum}`);
      socket.join(gameNum);
  });

  //game방 채팅
  socket.on("chat", (chat) => {
    const data = {name:socket.nickname, chat};
    gameRoom.to(thisgameNum).emit("chat", data);
   });
  //game방 훈수채팅
  socket.on("teaching", (chat) => {
    const data = {name:socket.nickname, chat};
    console.log("훈수쳇소켓닉네임:",socket.nickname);
    console.log("훈수쳇 data:", data);
    gameRoom.to(thisgameNum).emit("teaching", data);  
  });
  //game방 플라잉채팅
  socket.on("flyingWord", (chat) => {
    const data = {name:socket.nickname, chat};
    console.log("플라잉채팅소켓 닉네임♬♪:",socket.nickname);
    console.log("플라잉채팅소켓 data♬♪:", data);
    gameRoom.to(thisgameNum).emit("flyingWord", data);  
  });

  //오목 게임
  socket.on("omog", (data, state) => {
    console.log("오목게임data@@",data);
    console.log("오목게임state@@",state);
    console.log("오목게임bboard@@",bboard);
    console.log("오목게임count@@",count);
    
    if (bboard[xyToIndex(data.x, data.y)] != -1) {
      console.log("돌아가");
    } else if (
      (state == "playerW" && count % 2 == 0) ||
      (state == "playerB" && count % 2 !== 0)
    ) {
      console.log("너의 순서가 아니다 돌아가");
    } else {
      count % 2 == 0
        ? (bboard[xyToIndex(data.x, data.y)] = 1)
        : (bboard[xyToIndex(data.x, data.y)] = 2);
      data.board = bboard;
      // data.order
      count++;
      data.count = count;
      console.log("오목게임",count, state);
      gameRoom.to(thisgameNum).emit("omog", data);
    };
  });
  //흑돌-짝, 백돌-홀 순서로 디비저장
  //teachingCnt 저장 + teachingCnt
  
  
  
  


  // game방 퇴장
  //플레이어 퇴장시 방폭
  //게임끝나고 유저들이 대기방가면 state(A팀, B팀)표시
  //소켓에서 대기방 연결하기.
  socket.on("disconnecting", async () => {
    //game방 퇴장 메시지
    gameRoom.to(thisgameNum).emit("bye", socket.id);
    // if(socket.rooms.has("player")){                         // 나가는 사람이 플레이어라면
    //     await Rooms.destroy({ where: { gameNum:thisgameNum }})          //소켓게임방 자동 삭제후 유저들이 대기방으로가면
    //                                                         //waiting룸 on.             
    //   } else {                                                         
    //     const observerCnt = gameRoomCount("observer") -1    // 나가는 사람이 관전자면 -1            
    //     await Rooms.updateOne({ gameNum:thisgameNum }, { $set: { observerCnt }})
    //   }

    console.log("게임 disconnecting");
  });
  
  
  //게임결과
  //해야하는일: 승, 패 정보를 users디비에 저장.
  // socket.on("result", (winner, loser) => {
    
    //     const score = await users.findOne({id:winner.id}, {_id:false, id:true});
    //     gameRoom.to(thisgameNum).emit("result", {winner : , loser: b})
    // });
    
  });
});

module.exports = { httpServer };