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
let roomNum;
//방 인원 카운트_210304
function waitingRoomCount(roomName){
  return waitingRoom.adapter.rooms.get(roomName)?.size
};

waitingRoom.on("connection", (socket) => {
    console.log("connect client on waitingRoom ✅");
    console.log("대기실 socket.id", socket.id)
    socket.onAny((event) => {
      console.log(`Socket Event: ${event}`);

    //socket nickname 설정_210303
    socket.on("nickname", (nickname) => socket["nickname"] = nickname);

    //블랙팀 플레이어로 입장시 정보 업데이트_210315
    socket.on("enterRoomBlackPlayer", async (roomNumber) => {
        roomNum = roomNumber;
        const role = "player"
        const team = "blackPlayer"
        socket.join(roomNum)
        socket.join(role)
        socket.join(team)
        const playerCnt = waitingRoomCount(team)
        await Rooms.updateMany({ roomNum }, { $set: { playerCnt, blackTeamPlayer: socket.nickname }})
        const roomInfo = await Rooms.findOne({ roomNum }, { _id: false, blackTeamPlayer: true, blackTeamObserver: true, whiteTeamPlayer: true, whiteTeamObserver: true })
        const userInfos = []
        const blackPlayerInfo = await Users.findOne({ id: roomInfo.blackTeamPlayer }, { _id: false, id: true, score: true, point: true, state: true })
        const whitePlayerInfo = await Users.findOne({ id: roomInfo.whiteTeamPlayer }, { _id: false, id: true, score: true, point: true, state: true })
        userInfos.push(blackPlayerInfo, whitePlayerInfo, roomInfo.blackTeamObserver, roomInfo.whiteTeamObserver)
        waitingRoom.to(roomNum).emit("welcome", socket.nickname, userInfos)
        console.log("대기실 입장시", socket.rooms)
    });

    //화이트팀 플레이어로 입장시 정보 업데이트_210315
    socket.on("enterRoomWhitePlayer", async (roomNumber) => {
      roomNum = roomNumber;
      const role = "player"
      const team = "whitePlayer"
      socket.join(roomNum)
      socket.join(role)
      socket.join(team)
      const playerCnt = waitingRoomCount(team)
      await Rooms.updateMany({ roomNum }, { $set: { playerCnt, whiteTeamPlayer: socket.nickname }})
      const roomInfo = await Rooms.findOne({ roomNum }, { _id: false, blackTeamPlayer: true, blackTeamObserver: true, whiteTeamPlayer: true, whiteTeamObserver: true })
      const userInfos = []
      const blackPlayerInfo = await Users.findOne({ id: roomInfo.blackTeamPlayer }, { _id: false, id: true, score: true, point: true, state: true })
      const whitePlayerInfo = await Users.findOne({ id: roomInfo.whiteTeamPlayer }, { _id: false, id: true, score: true, point: true, state: true })
      userInfos.push(blackPlayerInfo, whitePlayerInfo, roomInfo.blackTeamObserver, roomInfo.whiteTeamObserver)
      waitingRoom.to(roomNum).emit("welcome", socket.nickname, userInfos)
      console.log("대기실 입장시", socket.rooms)
  });

    //블랙팀 관전자로 입장시 정보 업데이트_210315
    socket.on("enterRoomBlackObserver", async (roomNumber) => {
      roomNum = roomNumber;
      const role = "observer"
      const team = "blackObserver"
      socket.join(roomNum)
      socket.join(role)
      socket.join(team)
      const observerCnt = waitingRoomCount(team)
      await Rooms.updateOne({ roomNum }, { $set: { observerCnt }})
      await Rooms.updateOne({ roomNum }, { $addToSet: { blackTeamObserver: socket.nickname }})
      const roomInfo = await Rooms.findOne({ roomNum }, { _id: false, blackTeamPlayer: true, blackTeamObserver: true, whiteTeamPlayer: true, whiteTeamObserver: true })
      const userInfos = []
      const blackPlayerInfo = await Users.findOne({ id: roomInfo.blackTeamPlayer }, { _id: false, id: true, score: true, point: true, state: true })
      const whitePlayerInfo = await Users.findOne({ id: roomInfo.whiteTeamPlayer }, { _id: false, id: true, score: true, point: true, state: true })
      userInfos.push(blackPlayerInfo, whitePlayerInfo, roomInfo.blackTeamObserver, roomInfo.whiteTeamObserver)
      waitingRoom.to(roomNum).emit("welcome", socket.nickname, userInfos)
      console.log("대기실 입장시", socket.rooms)
  });

    //화이트팀 관전자로 입장시 정보 업데이트_210315
    socket.on("enterRoomWhiteObserver", async (roomNumber) => {
      roomNum = roomNumber;
      const role = "observer"
      const team = "whiteObserver"
      socket.join(roomNum)
      socket.join(role)
      socket.join(team)
      const observerCnt = waitingRoomCount(team)
      await Rooms.updateOne({ roomNum }, { $set: { observerCnt }})
      await Rooms.updateOne({ roomNum }, { $addToSet: { whiteTeamObserver: socket.nickname }})
      const roomInfo = await Rooms.findOne({ roomNum }, { _id: false, blackTeamPlayer: true, blackTeamObserver: true, whiteTeamPlayer: true, whiteTeamObserver: true })
      const userInfos = []
      const blackPlayerInfo = await Users.findOne({ id: roomInfo.blackTeamPlayer }, { _id: false, id: true, score: true, point: true, state: true })
      const whitePlayerInfo = await Users.findOne({ id: roomInfo.whiteTeamPlayer }, { _id: false, id: true, score: true, point: true, state: true })
      userInfos.push(blackPlayerInfo, whitePlayerInfo, roomInfo.blackTeamObserver, roomInfo.whiteTeamObserver)
      waitingRoom.to(roomNum).emit("welcome", socket.nickname, userInfos)
      console.log("대기실 입장시", socket.rooms)
  });

    // 블랙팀 플레이어로 변경시 정보 업데이트_210315
    socket.on("changeToBlackPlayer", async (previousTeam) => {
      if (previousTeam.includes("Observer")) { 
        socket.leave("observer") 
        socket.join("player")
        const playerCnt = waitingRoomCount("player")
        const observerCnt = waitingRoomCount("observer")
        await Rooms.updateMany({ roomNum }, { $set: { blackTeamPlayer: socket.nickname, playerCnt, observerCnt }})
        if (previousTeam === "blackObserver") {
          await Rooms.updateOne({ roomNum }, { $pull: { blackTeamObserver: socket.nickname }})
        } else{
          await Rooms.updateOne({ roomNum }, { $pull: { whiteTeamObserver: socket.nickname }})
        }
      } else{
        await Rooms.updateMany({ roomNum }, { $set: { blackTeamPlayer: socket.nickname, whiteTeamPlayer: null }})
      }
      const roomInfo = await Rooms.findOne({ roomNum }, { _id: false, blackTeamPlayer: true, blackTeamObserver: true, whiteTeamPlayer: true, whiteTeamObserver: true })
      const userInfos = []
      const blackPlayerInfo = await Users.findOne({ id: roomInfo.blackTeamPlayer }, { _id: false, id: true, score: true, point: true, state: true })
      const whitePlayerInfo = await Users.findOne({ id: roomInfo.whiteTeamPlayer }, { _id: false, id: true, score: true, point: true, state: true })
      userInfos.push(blackPlayerInfo, whitePlayerInfo, roomInfo.blackTeamObserver, roomInfo.whiteTeamObserver)
      waitingRoom.to(roomNum).emit("changeComplete", socket.nickname, userInfos)
      console.log("팀 변경", socket.rooms)
    });

    // 화이트팀 플레이어로 변경시 정보 업데이트_210315
    socket.on("changeToWhitePlayer", async (previousTeam) => {
      if (previousTeam.includes("Observer")) { 
        socket.leave("observer") 
        socket.join("player")
        const playerCnt = waitingRoomCount("player")
        const observerCnt = waitingRoomCount("observer")
        await Rooms.updateMany({ roomNum }, { $set: { whiteTeamPlayer: socket.nickname, playerCnt, observerCnt }})
        if (previousTeam === "blackObserver") {
          await Rooms.updateOne({ roomNum }, { $pull: { blackTeamObserver: socket.nickname }})
        } else{
          await Rooms.updateOne({ roomNum }, { $pull: { whiteTeamObserver: socket.nickname }})
        }
      } else{
        await Rooms.updateMany({ roomNum }, { $set: { whiteTeamPlayer: socket.nickname, blackTeamPlayer: null }})
      }
      const roomInfo = await Rooms.findOne({ roomNum }, { _id: false, blackTeamPlayer: true, blackTeamObserver: true, whiteTeamPlayer: true, whiteTeamObserver: true })
      const userInfos = []
      const blackPlayerInfo = await Users.findOne({ id: roomInfo.blackTeamPlayer }, { _id: false, id: true, score: true, point: true, state: true })
      const whitePlayerInfo = await Users.findOne({ id: roomInfo.whiteTeamPlayer }, { _id: false, id: true, score: true, point: true, state: true })
      userInfos.push(blackPlayerInfo, whitePlayerInfo, roomInfo.blackTeamObserver, roomInfo.whiteTeamObserver)
      waitingRoom.to(roomNum).emit("changeComplete", socket.nickname, userInfos)
      console.log("팀 변경", socket.rooms)
    });

    // 블랙팀 관전자로 변경시 정보 업데이트_210315
    socket.on("changeToBlackObserver", async (previousTeam) => {
      if (previousTeam.includes("whiteObserver")) { 
          await Rooms.updateOne({ roomNum }, { $pull: { whiteTeamObserver: socket.nickname }})
          await Rooms.updateOne({ roomNum }, { $addToSet: { blackTeamObserver: socket.nickname }})
      } else {
        socket.leave("player") 
        socket.join("observer")
        const playerCnt = waitingRoomCount("player")
        const observerCnt = waitingRoomCount("observer")
        await Rooms.updateOne({ roomNum }, { $addToSet: { blackTeamObserver: socket.nickname }})
          if (previousTeam.includes("blackPlayer")) {
          await Rooms.updateMany({ roomNum }, { $set: { blackTeamPlayer: null, playerCnt, observerCnt }})
        } else {
          await Rooms.updateMany({ roomNum }, { $set: { whiteTeamPlayer: null, playerCnt, observerCnt }})
        }}
      const roomInfo = await Rooms.findOne({ roomNum }, { _id: false, blackTeamPlayer: true, blackTeamObserver: true, whiteTeamPlayer: true, whiteTeamObserver: true })
      const userInfos = []
      const blackPlayerInfo = await Users.findOne({ id: roomInfo.blackTeamPlayer }, { _id: false, id: true, score: true, point: true, state: true })
      const whitePlayerInfo = await Users.findOne({ id: roomInfo.whiteTeamPlayer }, { _id: false, id: true, score: true, point: true, state: true })
      userInfos.push(blackPlayerInfo, whitePlayerInfo, roomInfo.blackTeamObserver, roomInfo.whiteTeamObserver)
      waitingRoom.to(roomNum).emit("changeComplete", socket.nickname, userInfos)
      console.log("팀 변경", socket.rooms)
    });

    // 화이트팀 관전자로 변경시 정보 업데이트_210315
    socket.on("changeToBlackObserver", async (previousTeam) => {
      if (previousTeam.includes("blackObserver")) { 
          await Rooms.updateOne({ roomNum }, { $pull: { blackTeamObserver: socket.nickname }})
          await Rooms.updateOne({ roomNum }, { $addToSet: { whiteTeamObserver: socket.nickname }})
      } else {
        socket.leave("player") 
        socket.join("observer")
        const playerCnt = waitingRoomCount("player")
        const observerCnt = waitingRoomCount("observer")
        await Rooms.updateOne({ roomNum }, { $addToSet: { blackTeamObserver: socket.nickname }})
          if (previousTeam.includes("blackPlayer")) {
          await Rooms.updateMany({ roomNum }, { $set: { blackTeamPlayer: null, playerCnt, observerCnt }})
        } else {
          await Rooms.updateMany({ roomNum }, { $set: { whiteTeamPlayer: null, playerCnt, observerCnt }})
        }}
      const roomInfo = await Rooms.findOne({ roomNum }, { _id: false, blackTeamPlayer: true, blackTeamObserver: true, whiteTeamPlayer: true, whiteTeamObserver: true })
      const userInfos = []
      const blackPlayerInfo = await Users.findOne({ id: roomInfo.blackTeamPlayer }, { _id: false, id: true, score: true, point: true, state: true })
      const whitePlayerInfo = await Users.findOne({ id: roomInfo.whiteTeamPlayer }, { _id: false, id: true, score: true, point: true, state: true })
      userInfos.push(blackPlayerInfo, whitePlayerInfo, roomInfo.blackTeamObserver, roomInfo.whiteTeamObserver)
      waitingRoom.to(roomNum).emit("changeComplete", socket.nickname, userInfos)
      console.log("팀 변경", socket.rooms)
    });
    
    //대기실 내 채팅_210303
    socket.on("chat", (chat) => {
        const data = { nickname: socket.nickname, chat } 
        waitingRoom.to(roomNum).emit("chat", data);
        console.log("대기실 채팅 내용", data)
      });

    //퇴장시 방 최신화_210315   
    socket.on("disconnecting", async () => {
      try {
        await Users.updateOne({ id: socket.nickname }, { $set: { state: "online" }})
        console.log("퇴장시 존재하는 소켓방", socket.rooms)
        console.log("퇴장시 네임스페이스 전체 소켓", waitingRoom.adapter.rooms)
        console.log('퇴장하는 소켓 id', socket.id)

        if(socket.rooms.has("player")){
          const playerCnt = waitingRoomCount("player") -1
          console.log("플레이어 퇴장", playerCnt)
          await Rooms.updateOne({ roomNum }, { $set: { playerCnt }})
        }
        if(socket.rooms.has("observer")){
          const observerCnt = waitingRoomCount("observer") -1
          console.log("관전자 퇴장", observerCnt)
          await Rooms.updateOne({ roomNum }, { $set: { observerCnt }})
        }
        if(socket.rooms.has("blackPlayer")){
          await Rooms.updateOne({ roomNum }, { $set: { blackTeamPlayer: null}})
        }
        if(socket.rooms.has("whitePlayer")){
          await Rooms.updateOne({ roomNum }, { $set: { whiteTeamPlayer: null}})
        }
        if(socket.rooms.has("blackObserver")){
          await Rooms.updateOne({ roomNum }, { $pull: { blackTeamObserver: socket.nickname }})
        }
        if(socket.rooms.has("whiteObserver")){
          await Rooms.updateOne({ roomNum }, { $pull: { whiteTeamObserver: socket.nickname }})
        }
        const roomInfo = await Rooms.findOne({ roomNum }, { _id: false, blackTeamPlayer: true, blackTeamObserver: true, whiteTeamPlayer: true, whiteTeamObserver: true })
        const userInfos = []
        const blackPlayerInfo = await Users.findOne({ id: roomInfo.blackTeamPlayer }, { _id: false, id: true, score: true, point: true, state: true })
        const whitePlayerInfo = await Users.findOne({ id: roomInfo.whiteTeamPlayer }, { _id: false, id: true, score: true, point: true, state: true })
        userInfos.push(blackPlayerInfo, whitePlayerInfo, roomInfo.blackTeamObserver, roomInfo.whiteTeamObserver)
        waitingRoom.to(roomNum).emit("bye", socket.nickname, userInfos)
      } catch(error) {
        console.log("퇴장 errorMessage", error)
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

let bboard 
let count = 0;

//접속자 수
function gameRoomCount(gameNum){
  return gameRoom.adapter.rooms.get(gameNum)?.size
}

//game방 연결  
gameRoom.on("connect", async (socket) =>{
  bboard = new Array(Math.pow(19, 2)).fill(-1);
  
  console.log("★★game 소켓 연결됨★★");
  // console.log("겜방연결후 bboard",bboard);
  // console.log("겜방연결후count",count);
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
      console.log(`조인게임방번호:${gameNum}`);
      socket.join(gameNum);
    });

    //game방 채팅
    socket.on("chat", (chat) => {
      const data = {name:socket.nickname, chat};
      console.log("게임방 채팅data:", data);
      gameRoom.to(thisgameNum).emit("chat", data);
    });
    //game방 훈수채팅 
    socket.on("teaching", async (teachingCnt, chat) => {
      const data = {name:socket.nickname, chat};
      console.log("훈수쳇소켓닉네임:",socket.nickname);
      console.log("훈수쳇 data:", data);

      //teachingCnt 업데이트  
      await Users.updateOne( {id: socket.nickname}, { $set: {teachingCnt}});
      gameRoom.to(thisgameNum).emit("teaching", data);  
    });
    //game방 플라잉채팅
    socket.on("flyingWord", (chat) => {
      const data = {name:socket.nickname, chat};
      console.log("플라잉채팅 닉네임♬♪:",socket.nickname);
      console.log("플라잉채팅 data♬♪:", data);
      gameRoom.to(thisgameNum).emit("flyingWord", data);  
    });

    //오목 게임
    socket.on("omog", (data, state) => {
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
  
    // game방 퇴장
    socket.on("disconnecting", async () => {
      //game방 퇴장 메시지
      try {
      gameRoom.to(thisgameNum).emit("bye", socket.id);
      const observerCnt = gameRoomCount(thisgameNum) -3    //(-2 플레이어)+(-1 나가는 옵저버)            
      console.log("게임방 소켓 퇴장observerCnt:", observerCnt);
      await Rooms.updateOne({ gameNum:thisgameNum }, { $set: { observerCnt }});
      console.log("게임방 퇴장 소켓 disconnecting🖐️🖐️");
      console.log("게임방 퇴장 소켓 room ", socket.rooms)
      console.log("게임방 퇴장 네임스페이스 전체 소켓", gameRoom.adapter.rooms)
      console.log('게임방 퇴장 소켓 id', socket.id)
    } catch(error){
      console.log(error)
    }
    });
    
    //게임결과
    socket.on("result", (winner, loser) => {
      console.log("게임결과_소켓 winner:", winner);
      console.log("게임결과_소켓 loser:", loser);
      gameRoom.to(thisgameNum).emit("result", {winner, loser});
    });
    
  });
});

module.exports = { httpServer };