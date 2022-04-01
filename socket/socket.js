const app = require('../app');
const Users = require('../models/users');
const RoomSocketEvent = require('../controller/roomSocket')
const GameSocketEvent = require('../controller/gameSocket')

const httpServer = require('http').createServer(app);
const { Server } = require('socket.io');
const { instrument } = require('@socket.io/admin-ui');
const io = new Server(httpServer, {
  cors: {
    origin: true,
    credentials: true,
  },
});

instrument(io, {
  auth: false,
});

// 로비
const lobby = io.of('/lobby');

lobby.on('connection', (socket) => {
  console.log('connect lobby socket', socket.id);
  
  socket.on('nickname', (nickname) => (socket['nickname'] = nickname));

  socket.on('lobby', async (id) => {
    // console.log('check Event lobby', id)
    await Users.updateOne({id}, {$set: { connect: 'online'}})
  })

  socket.on('disconnect', async () => {
    await Users.updateOne({id: socket.nickname}, {$set: { connect: 'offline'}})
  })
});

// 대기실 socketIO
const waitingRoom = io.of('/waiting');
app.set('waitingRoom', waitingRoom);

waitingRoom.on('connection', (socket) => {
  console.log('connect client on waitingRoom ✅', socket.id);

// socket evnet 알림
  RoomSocketEvent.onAny(socket);

  // socket nickname 설정
  RoomSocketEvent.nicknameEvent(socket);

  // 플레이어로 입장시 정보 업데이트
  RoomSocketEvent.enterRoomPlayer(socket);

  // 관전자로 입장시 정보 업데이트
  RoomSocketEvent.enterRoomObserver(socket);

  // 플레이어로 변경시 정보 업데이트
  RoomSocketEvent.changeToPlayer(socket);

  // 관전자로 변경시 정보 업데이트
  RoomSocketEvent.changeToObserver(socket);

  // 대기실 내 채팅
  RoomSocketEvent.chat(socket);

  // 게임 시작
  RoomSocketEvent.gameStart(socket);

  //퇴장시 방 인원 숫자 최신화
  RoomSocketEvent.disconnecting(socket);

});


//게임방 socketIO 
const gameRoom = io.of('/game');
app.set('gameRoom', gameRoom);

gameRoom.on('connection', (socket) => {
  console.log('★★★connect client on gameRoom ★★★', socket.id);

  //game socket event 메시지
  GameSocketEvent.onAny(socket);

  //game socket nickname 설정
  GameSocketEvent.nicknameEvent(socket);
  
  //game socket Join
  GameSocketEvent.joinGame(socket);

  //game방 채팅
  GameSocketEvent.chat(socket);

  //game방 훈수채팅W
  GameSocketEvent.teachingW(socket);
  
  //game방 훈수채팅B
  GameSocketEvent.teachingB(socket);
  
  //game방 훈수채팅- 플라잉
  GameSocketEvent.flyingWord(socket);
  
  //game방 신의한수- 마우스 포인트
  GameSocketEvent.Pointer(socket);
  
  //오목 게임 좌표값을 받아 좌표값에 해당하는 값
  GameSocketEvent.omog(socket);
  
  //Pointer 훈수 실질적으로 오목두는 부분
  GameSocketEvent.pointerOmog(socket);
  
  //game방 퇴장
  GameSocketEvent.disconnecting(socket);
  
  //게임방 나갈떄
  GameSocketEvent.byebye(socket);

  
});

module.exports = { httpServer };