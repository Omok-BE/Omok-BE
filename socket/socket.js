const app = require('../app');
const Users = require('../models/users');
const Rooms = require('../models/rooms');
const Boards = require('../models/boards');
const Games = require('../models/games');
const { findUserInfos } = require('../lib/roomSocket/findUserInfos')
const { enterRoomByPlayer, enterRoomByObserver } = require('../lib/roomSocket/roomInUpdate')
const { ToPlayerFromPlayer, ToPlayerFromObserver, ToObserverFromPlayer, ToObserverFromObserver } = require('../lib/roomSocket/changeRoleUpdate')
const { peopleInRoomUpdate } = require('../lib/roomSocket/roomOutUpdate')
const SocketEvent = require('../controller/roomSocket')

const httpServer = require('http').createServer(app);
const { Server } = require('socket.io');
const { instrument } = require('@socket.io/admin-ui');
const games = require('../models/games');
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
let lobbyid;

lobby.on('connection', (socket) => {
  console.log('connect lobby socket', socket.id);

  socket.on('nickname', (nickname) => (socket['nickname'] = nickname));

  socket.on('lobby', async (id) => {
    // console.log('check Event lobby', id)
    await Users.updateOne({id}, {$set: { connect: 'online'}})
    lobbyid = id;
  })

  socket.on('disconnect', async () => {
    await Users.updateOne({id: lobbyid}, {$set: { connect: 'offline'}})
  })
});

// 대기실 socketIO
const waitingRoom = io.of('/waiting');

waitingRoom.on('connection', (socket) => {
  console.log('connect client on waitingRoom ✅', socket.id);
  socket.onAny((event) => {
    console.log(`Socket Event: ${event}`);
  });

  //socket nickname 설정
  SocketEvent.nicknameEvent(socket);

  //플레이어로 입장시 정보 업데이트
  socket.on('enterRoomPlayer', async (data) => {
    console.time('enterRoomPlayer')
    const { roomNum, state } = data;
    roomNumber = roomNum;
    const role = `${roomNum}player`;
    socket.join(roomNum);
    socket.join(role);
    const playerCnt = waitingRoomCount(role);
    await enterRoomByPlayer({
      id: socket.nickname.id,
      roomNum,
      playerCnt,
      state
    });
    const userInfos = await findUserInfos(roomNum);
    waitingRoom.to(roomNum).emit('welcome', socket.nickname.id, userInfos);
    console.timeEnd('enterRoomPlayer')
  });

  //관전자로 입장시 정보 업데이트
  socket.on('enterRoomObserver', async (data) => {
    console.time('enterRoomObserver')
    const { roomNum, state } = data;
    roomNumber = roomNum;
    const role = `${roomNum}observer`;
    socket.join(roomNum);
    socket.join(role);
    const observerCnt = waitingRoomCount(role);
    await enterRoomByObserver({
      id: socket.nickname.id,
      roomNum,
      observerCnt,
      state
    });
    const userInfos = await findUserInfos(roomNum);
    waitingRoom.to(roomNum).emit('welcome', socket.nickname.id, userInfos);
    console.timeEnd('enterRoomObserver')
  });

  // 플레이어로 변경시 정보 업데이트
  socket.on('changeToPlayer', async (data) => {
    console.time('changeToPlayer')
    const { roomNum, previousTeam, wantTeam } = data;
    if (previousTeam.includes('Player')) {
      await ToPlayerFromPlayer({
        id: socket.nickname.id,
        roomNum,
        wantTeam
      });
    } else {
      socket.leave(`${roomNum}observer`);
      socket.join(`${roomNum}player`);
      const playerCnt = waitingRoomCount(`${roomNum}player`);
      const observerCnt = waitingRoomCount(`${roomNum}observer`);
      await ToPlayerFromObserver({
        id: socket.nickname.id,
        roomNum,
        playerCnt,
        observerCnt,
        previousTeam,
        wantTeam,
      });
    };
    const userInfos = await findUserInfos(roomNum);
    waitingRoom.to(roomNum).emit('changeComplete', socket.nickname.id, userInfos);
    console.timeEnd('changeToPlayer')
  });

  // 관전자로 변경시 정보 업데이트
  socket.on('changeToObserver', async (data) => {
    console.time('changeToObserver')
    const { roomNum, previousTeam, wantTeam } = data;

    if(previousTeam.includes('Player')){
      socket.leave(`${roomNum}player`);
      socket.join(`${roomNum}observer`);
      const playerCnt = waitingRoomCount(`${roomNum}player`);
      const observerCnt = waitingRoomCount(`${roomNum}observer`);
      await ToObserverFromPlayer({
        id: socket.nickname.id,
        roomNum,
        playerCnt,
        observerCnt,
        previousTeam,
        wantTeam
      })
    } else {
      await ToObserverFromObserver({
        id: socket.nickname.id,
        roomNum,
        previousTeam,
        wantTeam
      })
    };
    const userInfos = await findUserInfos(roomNum);
    waitingRoom.to(roomNum).emit('changeComplete', socket.nickname.id, userInfos);
    console.timeEnd('changeToObserver')
  });

  //대기실 내 채팅
  socket.on('chat', (data) => {
    const { roomNum, chat } = data;
    const chatData = { nickname: socket.nickname.id, chat };
    waitingRoom.to(roomNum).emit('chat', chatData);
  });

  //게임 시작
  socket.on('gameStart', (roomNum) => {
    waitingRoom.to(roomNum).emit('game', roomNum);
  });

  //퇴장시 방 인원 숫자 최신화
  socket.on('disconnecting', async () => {
    console.time('disconnecting')
    const { id, roomNum } = socket.nickname
    try {
      if (socket.rooms.has(`${roomNum}player`)) {
        const playerCnt = waitingRoomCount(`${roomNum}player`) - 1;
        await Rooms.updateOne({ roomNum }, { $set: { playerCnt } });
      }
      if (socket.rooms.has(`${roomNum}observer`)) {
        const observerCnt = waitingRoomCount(`${roomNum}observer`) - 1;
        await Rooms.updateOne({ roomNum }, { $set: { observerCnt } });
      }
      await peopleInRoomUpdate({
        id,
        roomNum
      });
      const userInfos = await findUserInfos(roomNum);
      waitingRoom.to(roomNum).emit('bye', id, userInfos);
    } catch (error) {
      console.error('퇴장 errorMessage', error);
    }
    console.timeEnd('disconnecting')
  });

});

//방 인원 카운트 메소드
function waitingRoomCount(roomNum) {
  return waitingRoom.adapter.rooms.get(roomNum)?.size;
}


//게임방 socket 
//네임스페이스 ('/game') 
const gameRoom = io.of('/game');
let thisGameNum;

// x,y 좌표를 배열의 index값으로 변환
let xyToIndex = (x, y) => {
  return x + y * 19;
};

//오목 33
function check_33(x,  y, board){
	let count3 = 0;
	// 가로체크.
	if ((board[xyToIndex(x - 3 , y)] == -1 && board[xyToIndex(x -2 , y)] ==1 && board[xyToIndex(x - 1 , y)] ==1 && board[xyToIndex(x + 1 , y)] == -1) ||
		(board[xyToIndex(x -2 , y)] == -1 && board[xyToIndex(x - 1 , y)] ==1 && board[xyToIndex(x + 1 , y)] ==1 && board[xyToIndex(x +2 , y)] == -1) ||
		(board[xyToIndex(x - 1 , y)] == -1 && board[xyToIndex(x + 1 , y)] ==1 && board[xyToIndex(x +2 , y)] ==1 && board[xyToIndex(x + 3 , y)] == -1) ||
		(board[xyToIndex(x - 4 , y)] == -1 && board[xyToIndex(x - 3 , y)] ==1 && board[xyToIndex(x -2 , y)] ==1 && board[xyToIndex(x - 1 , y)] == -1 && board[xyToIndex(x + 1 , y)] == -1) ||
		(board[xyToIndex(x + 4 , y)] == -1 && board[xyToIndex(x + 3 , y)] ==1 && board[xyToIndex(x +2 , y)] ==1 && board[xyToIndex(x + 1 , y)] == -1 && board[xyToIndex(x - 1 , y)] == -1) ||
		(board[xyToIndex(x -2 , y)] == -1 && board[xyToIndex(x - 1 , y)] ==1 && board[xyToIndex(x + 1 , y)] == -1 && board[xyToIndex(x +2 , y)] ==1 && board[xyToIndex(x + 3 , y)] == -1) ||
		(board[xyToIndex(x +2 , y)] == -1 && board[xyToIndex(x + 1 , y)] ==1 && board[xyToIndex(x - 1 , y)] == -1 && board[xyToIndex(x -2 , y)] ==1 && board[xyToIndex(x - 3 , y)] == -1))
		count3++;
	// 세로체크. 
	if ((board[xyToIndex(x , y - 3)] == -1 && board[xyToIndex(x , y -2)] ==1 && board[xyToIndex(x , y - 1)] ==1 && board[xyToIndex(x , y + 1)] == -1) ||
		(board[xyToIndex(x , y -2)] == -1 && board[xyToIndex(x , y - 1)] ==1 && board[xyToIndex(x , y + 1)] ==1 && board[xyToIndex(x , y +2)] == -1) ||
		(board[xyToIndex(x , y - 1)] == -1 && board[xyToIndex(x , y + 1)] ==1 && board[xyToIndex(x , y +2)] ==1 && board[xyToIndex(x , y + 3)] == -1) ||
		(board[xyToIndex(x , y - 4)] == -1 && board[xyToIndex(x , y - 3)] ==1 && board[xyToIndex(x , y -2)] ==1 && board[xyToIndex(x , y - 1)] == -1 && board[xyToIndex(x , y + 1)] == -1) ||
		(board[xyToIndex(x , y + 4)] == -1 && board[xyToIndex(x , y + 3)] ==1 && board[xyToIndex(x , y +2)] ==1 && board[xyToIndex(x , y + 1)] == -1 && board[xyToIndex(x , y - 1)] == -1) ||
		(board[xyToIndex(x , y -2)] == -1 && board[xyToIndex(x , y - 1)] ==1 && board[xyToIndex(x , y + 1)] == -1 && board[xyToIndex(x , y +2)] ==1 && board[xyToIndex(x , y + 3)] == -1) ||
		(board[xyToIndex(x , y +2)] == -1 && board[xyToIndex(x , y + 1)] ==1 && board[xyToIndex(x , y - 1)] == -1 && board[xyToIndex(x , y -2)] ==1 && board[xyToIndex(x , y - 3)] == -1))
		count3++;
	// 대각선체크. 
	if ((board[xyToIndex(x - 3 , y - 3)] == -1 && board[xyToIndex(x -2 , y -2)] ==1 && board[xyToIndex(x - 1 , y - 1)] ==1 && board[xyToIndex(x + 1 , y + 1)] == -1) ||
		(board[xyToIndex(x -2 , y -2)] == -1 && board[xyToIndex(x - 1 , y - 1)] ==1 && board[xyToIndex(x + 1 , y + 1)] ==1 && board[xyToIndex(x +2 , y +2)] == -1) ||
		(board[xyToIndex(x - 1 , y - 1)] == -1 && board[xyToIndex(x + 1 , y + 1)] ==1 && board[xyToIndex(x +2 , y +2)] ==1 && board[xyToIndex(x + 3 , y + 3)] == -1) ||
		(board[xyToIndex(x - 3 , y - 3)] == -1 && board[xyToIndex(x -2 , y -2)] ==1 && board[xyToIndex(x - 1 , y - 1)] == -1 && board[xyToIndex(x + 1 , y + 1)] ==1 && board[xyToIndex(x +2 , y +2)] == -1) ||
		(board[xyToIndex(x + 3 , y + 3)] == -1 && board[xyToIndex(x +2 , y +2)] ==1 && board[xyToIndex(x + 1 , y + 1)] == -1 && board[xyToIndex(x - 1 , y - 1)] ==1 && board[xyToIndex(x -2 , y -2)] == -1) ||
		(board[xyToIndex(x - 4 , y - 4)] == -1 && board[xyToIndex(x - 3 , y - 3)] ==1 && board[xyToIndex(x -2 , y -2)] ==1 && board[xyToIndex(x - 1 , y - 1)] == -1 && board[xyToIndex(x + 1 , y + 1)] == -1) ||
		(board[xyToIndex(x + 4 , y + 4)] == -1 && board[xyToIndex(x + 3 , y + 3)] ==1 && board[xyToIndex(x +2 , y +2)] ==1 && board[xyToIndex(x + 1 , y + 1)] == -1 && board[xyToIndex(x - 1 , y - 1)] == -1))
		count3++;
	// 반대 대각선체크. 
	if ((board[xyToIndex(x + 3 , y - 3)] == -1 && board[xyToIndex(x +2 , y -2)] ==1 && board[xyToIndex(x + 1 , y - 1)] ==1 && board[xyToIndex(x - 1 , y + 1)] == -1) ||
		(board[xyToIndex(x +2 , y -2)] == -1 && board[xyToIndex(x + 1 , y - 1)] ==1 && board[xyToIndex(x - 1 , y + 1)] ==1 && board[xyToIndex(x -2 , y +2)] == -1) ||
		(board[xyToIndex(x + 1 , y - 1)] == -1 && board[xyToIndex(x - 1 , y + 1)] ==1 && board[xyToIndex(x -2 , y +2)] ==1 && board[xyToIndex(x - 3 , y + 3)] == -1) ||
		(board[xyToIndex(x + 3 , y - 3)] == -1 && board[xyToIndex(x +2 , y -2)] ==1 && board[xyToIndex(x + 1 , y - 1)] == -1 && board[xyToIndex(x - 1 , y + 1)] ==1 && board[xyToIndex(x -2 , y +2)] == -1) ||
		(board[xyToIndex(x - 3 , y + 3)] == -1 && board[xyToIndex(x -2 , y +2)] ==1 && board[xyToIndex(x - 1 , y + 1)] == -1 && board[xyToIndex(x + 1 , y - 1)] ==1 && board[xyToIndex(x +2 , y -2)] == -1) ||
		(board[xyToIndex(x + 4 , y - 4)] == -1 && board[xyToIndex(x + 3 , y - 3)] ==1 && board[xyToIndex(x +2 , y -2)] ==1 && board[xyToIndex(x + 1 , y - 1)] == -1 && board[xyToIndex(x - 1 , y + 1)] == -1) ||
		(board[xyToIndex(x - 4 , y + 4)] == -1 && board[xyToIndex(x - 3 , y + 3)] ==1 && board[xyToIndex(x -2 , y +2)] ==1 && board[xyToIndex(x - 1 , y + 1)] == -1 && board[xyToIndex(x + 1 , y - 1)] == -1))
		count3++;
	if (count3 > 1) return 1;
	else return 0;
}

//오목 44
function check_44( x,  y,board)
{
	let count4 = 0;
	// 가로체크 
	if ((board[xyToIndex(x - 4 , y)] == -1 && board[xyToIndex(x - 3 , y)] ==1 && board[xyToIndex(x -2 , y)] ==1 && board[xyToIndex(x - 1 , y)] ==1 && board[xyToIndex(x + 1, y)] == -1) ||
		(board[xyToIndex(x + 4 , y)] == -1 && board[xyToIndex(x + 3 , y)] ==1 && board[xyToIndex(x +2 , y)] ==1 && board[xyToIndex(x + 1 , y)] ==1 && board[xyToIndex(x - 1 , y)] == -1) ||
		(board[xyToIndex(x - 5 , y)] == -1 && board[xyToIndex(x - 4 , y)] ==1 && board[xyToIndex(x - 3 , y)] == -1 && board[xyToIndex(x -2 , y)] ==1 && board[xyToIndex(x - 1 , y)] ==1 && board[xyToIndex(x + 1 , y)] == -1) ||
		(board[xyToIndex(x + 5 , y)] == -1 && board[xyToIndex(x + 4 , y)] ==1 && board[xyToIndex(x + 3 , y)] == -1 && board[xyToIndex(x +2 , y)] ==1 && board[xyToIndex(x + 1 , y)] ==1 && board[xyToIndex(x - 1 , y)] == -1) ||
		(board[xyToIndex(x - 5 , y)] == -1 && board[xyToIndex(x - 4 , y)] ==1 && board[xyToIndex(x - 3 , y)] ==1 && board[xyToIndex(x -2 , y)] == -1 && board[xyToIndex(x - 1 , y)] ==1 && board[xyToIndex(x + 1 , y)] == -1) ||
		(board[xyToIndex(x + 5 , y)] == -1 && board[xyToIndex(x + 4 , y)] ==1 && board[xyToIndex(x + 3 , y)] ==1 && board[xyToIndex(x +2 , y)] == -1 && board[xyToIndex(x + 1 , y)] ==1 && board[xyToIndex(x - 1 , y)] == -1) ||
		(board[xyToIndex(x - 5 , y)] == -1 && board[xyToIndex(x - 4 , y)] ==1 && board[xyToIndex(x - 3 , y)] ==1 && board[xyToIndex(x -2 , y)] ==1 && board[xyToIndex(x - 1 , y)] == -1 && board[xyToIndex(x + 1 , y)] == -1) ||
		(board[xyToIndex(x + 5 , y)] == -1 && board[xyToIndex(x + 4 , y)] ==1 && board[xyToIndex(x + 3 , y)] ==1 && board[xyToIndex(x +2 , y)] ==1 && board[xyToIndex(x + 1 , y)] == -1 && board[xyToIndex(x - 1 , y)] == -1) ||
		(board[xyToIndex(x - 3 , y)] == -1 && board[xyToIndex(x -2 , y)] ==1 && board[xyToIndex(x - 1 , y)] ==1 && board[xyToIndex(x + 1 , y)] ==1 && board[xyToIndex(x +2 , y)] == -1) ||
		(board[xyToIndex(x + 3 , y)] == -1 && board[xyToIndex(x +2 , y)] ==1 && board[xyToIndex(x + 1 , y)] ==1 && board[xyToIndex(x - 1 , y)] ==1 && board[xyToIndex(x -2 , y)] == -1) ||
		(board[xyToIndex(x - 4 , y)] == -1 && board[xyToIndex(x - 3 , y)] ==1 && board[xyToIndex(x -2 , y)] ==1 && board[xyToIndex(x - 1 , y)] == -1 && board[xyToIndex(x + 1 , y)] ==1 && board[xyToIndex(x +2 , y)] == -1) ||
		(board[xyToIndex(x + 4 , y)] == -1 && board[xyToIndex(x + 3 , y)] ==1 && board[xyToIndex(x +2 , y)] ==1 && board[xyToIndex(x + 1 , y)] == -1 && board[xyToIndex(x - 1 , y)] ==1 && board[xyToIndex(x -2 , y)] == -1) ||
		(board[xyToIndex(x - 4 , y)] == -1 && board[xyToIndex(x - 3 , y)] ==1 && board[xyToIndex(x -2 , y)] == -1 && board[xyToIndex(x - 1 , y)] ==1 && board[xyToIndex(x + 1 , y)] ==1 && board[xyToIndex(x +2 , y)] == -1) ||
		(board[xyToIndex(x + 4 , y)] == -1 && board[xyToIndex(x + 3 , y)] ==1 && board[xyToIndex(x +2 , y)] == -1 && board[xyToIndex(x + 1 , y)] ==1 && board[xyToIndex(x - 1 , y)] ==1 && board[xyToIndex(x -2 , y)] == -1))
		count4++;
	// 세로체크. 
	if ((board[xyToIndex(x , y - 4)] == -1 && board[xyToIndex(x , y - 3)] ==1 && board[xyToIndex(x , y -2)] ==1 && board[xyToIndex(x , y - 1)] ==1 && board[xyToIndex(x , y + 1)] == -1) ||
		(board[xyToIndex(x , y + 4)] == -1 && board[xyToIndex(x , y + 3)] ==1 && board[xyToIndex(x , y +2)] ==1 && board[xyToIndex(x , y + 1)] ==1 && board[xyToIndex(x , y - 1)] == -1) ||
		(board[xyToIndex(x , y - 5)] == -1 && board[xyToIndex(x , y - 4)] ==1 && board[xyToIndex(x , y -2)] == -1 && board[xyToIndex(x , y -2)] ==1 && board[xyToIndex(x , y - 1)] ==1 && board[xyToIndex(x , y + 1)] == -1) ||
		(board[xyToIndex(x , y + 5)] == -1 && board[xyToIndex(x , y + 4)] ==1 && board[xyToIndex(x , y + 3)] == -1 && board[xyToIndex(x , y +2)] ==1 && board[xyToIndex(x , y + 1)] ==1 && board[xyToIndex(x , y - 1)] == -1) ||
		(board[xyToIndex(x , y - 5)] == -1 && board[xyToIndex(x , y - 4)] ==1 && board[xyToIndex(x , y - 3)] ==1 && board[xyToIndex(x , y -2)] == -1 && board[xyToIndex(x , y - 1)] ==1 && board[xyToIndex(x , y + 1)] == -1) ||
		(board[xyToIndex(x , y + 5)] == -1 && board[xyToIndex(x , y + 4)] ==1 && board[xyToIndex(x , y + 3)] ==1 && board[xyToIndex(x , y +2)] == -1 && board[xyToIndex(x , y + 1)] ==1 && board[xyToIndex(x , y - 1)] == -1) ||
		(board[xyToIndex(x , y - 5)] == -1 && board[xyToIndex(x , y - 4)] ==1 && board[xyToIndex(x , y - 3)] ==1 && board[xyToIndex(x , y -2)] ==1 && board[xyToIndex(x , y - 1)] == -1 && board[xyToIndex(x , y + 1)] == -1) ||
		(board[xyToIndex(x , y + 5)] == -1 && board[xyToIndex(x , y + 4)] ==1 && board[xyToIndex(x , y + 3)] ==1 && board[xyToIndex(x , y +2)] ==1 && board[xyToIndex(x , y + 1)] == -1 && board[xyToIndex(x , y - 1)] == -1) ||
		(board[xyToIndex(x , y - 3)] == -1 && board[xyToIndex(x , y -2)] ==1 && board[xyToIndex(x , y - 1)] ==1 && board[xyToIndex(x , y + 1)] ==1 && board[xyToIndex(x , y +2)] == -1) ||
		(board[xyToIndex(x , y + 3)] == -1 && board[xyToIndex(x , y +2)] ==1 && board[xyToIndex(x , y + 1)] ==1 && board[xyToIndex(x , y - 1)] ==1 && board[xyToIndex(x , y -2)] == -1) ||
		(board[xyToIndex(x , y - 4)] == -1 && board[xyToIndex(x , y - 3)] ==1 && board[xyToIndex(x , y -2)] ==1 && board[xyToIndex(x , y - 1)] == -1 && board[xyToIndex(x , y + 1)] ==1 && board[xyToIndex(x , y +2)] == -1) ||
		(board[xyToIndex(x , y + 4)] == -1 && board[xyToIndex(x , y + 3)] ==1 && board[xyToIndex(x , y +2)] ==1 && board[xyToIndex(x , y + 1)] == -1 && board[xyToIndex(x , y - 1)] ==1 && board[xyToIndex(x , y -2)] == -1) ||
		(board[xyToIndex(x , y - 4)] == -1 && board[xyToIndex(x , y - 3)] ==1 && board[xyToIndex(x , y -2)] == -1 && board[xyToIndex(x , y - 1)] ==1 && board[xyToIndex(x , y + 1)] ==1 && board[xyToIndex(x , y +2)] == -1) ||
		(board[xyToIndex(x , y + 4)] == -1 && board[xyToIndex(x , y + 3)] ==1 && board[xyToIndex(x , y +2)] == -1 && board[xyToIndex(x , y - 1)] ==1 && board[xyToIndex(x , y - 1)] ==1 && board[xyToIndex(x , y -2)] == -1))
		count4++;
	// 대각선체크.  
	if ((board[xyToIndex(x - 4 , y - 4)] == -1 && board[xyToIndex(x - 3 , y - 3)] ==1 && board[xyToIndex(x -2 , y -2)] ==1 && board[xyToIndex(x - 1 , y - 1)] ==1 && board[xyToIndex(x + 1 , y + 1)] == -1) ||
		(board[xyToIndex(x + 4 , y + 4)] == -1 && board[xyToIndex(x + 3 , y + 3)] ==1 && board[xyToIndex(x +2 , y +2)] ==1 && board[xyToIndex(x + 1 , y + 1)] ==1 && board[xyToIndex(x - 1 , y - 1)] == -1) ||
		(board[xyToIndex(x - 5 , y - 5)] == -1 && board[xyToIndex(x - 4 , y - 4)] ==1 && board[xyToIndex(x - 3 , y - 3)] == -1 && board[xyToIndex(x -2 , y -2)] ==1 && board[xyToIndex(x - 1 , y - 1)] ==1 && board[xyToIndex(x + 1 , y + 1)] == -1) ||
		(board[xyToIndex(x + 5 , y + 5)] == -1 && board[xyToIndex(x + 4 , y - 4)] ==1 && board[xyToIndex(x + 3 , y + 3)] == -1 && board[xyToIndex(x +2 , y +2)] ==1 && board[xyToIndex(x + 1 , y + 1)] ==1 && board[xyToIndex(x - 1 , y - 1)] == -1) ||
		(board[xyToIndex(x - 5 , y - 5)] == -1 && board[xyToIndex(x - 4 , y - 4)] ==1 && board[xyToIndex(x - 3 , y - 3)] ==1 && board[xyToIndex(x -2 , y -2)] == -1 && board[xyToIndex(x - 1 , y - 1)] ==1 && board[xyToIndex(x + 1 , y + 1)] == -1) ||
		(board[xyToIndex(x + 5 , y + 5)] == -1 && board[xyToIndex(x + 4 , y + 4)] ==1 && board[xyToIndex(x + 3 , y + 3)] ==1 && board[xyToIndex(x +2 , y +2)] == -1 && board[xyToIndex(x + 1 , y + 1)] ==1 && board[xyToIndex(x - 1 , y - 1)] == -1) ||
		(board[xyToIndex(x - 5 , y - 5)] == -1 && board[xyToIndex(x - 4 , y - 4)] ==1 && board[xyToIndex(x - 3 , y - 3)] ==1 && board[xyToIndex(x -2 , y -2)] ==1 && board[xyToIndex(x - 1 , y - 1)] == -1 && board[xyToIndex(x + 1 , y + 1)] == -1) ||
		(board[xyToIndex(x + 5 , y + 5)] == -1 && board[xyToIndex(x + 4 , y + 4)] ==1 && board[xyToIndex(x + 3 , y + 3)] ==1 && board[xyToIndex(x +2 , y +2)] ==1 && board[xyToIndex(x + 1 , y + 1)] == -1 && board[xyToIndex(x - 1 , y - 1)] == -1) ||
		(board[xyToIndex(x - 3 , y - 3)] == -1 && board[xyToIndex(x -2 , y -2)] ==1 && board[xyToIndex(x - 1 , y - 1)] ==1 && board[xyToIndex(x + 1 , y + 1)] ==1 && board[xyToIndex(x +2 , y +2)] == -1) ||
		(board[xyToIndex(x + 3 , y + 3)] == -1 && board[xyToIndex(x +2 , y +2)] ==1 && board[xyToIndex(x + 1 , y + 1)] ==1 && board[xyToIndex(x - 1 , y - 1)] ==1 && board[xyToIndex(x -2 , y -2)] == -1) ||
		(board[xyToIndex(x - 4 , y - 4)] == -1 && board[xyToIndex(x - 3 , y - 3)] ==1 && board[xyToIndex(x -2 , y -2)] ==1 && board[xyToIndex(x - 1 , y - 1)] == -1 && board[xyToIndex(x + 1 , y + 1)] ==1 && board[xyToIndex(x +2 , y +2)] == -1) ||
		(board[xyToIndex(x + 4 , y + 4)] == -1 && board[xyToIndex(x + 3 , y + 3)] ==1 && board[xyToIndex(x +2 , y +2)] ==1 && board[xyToIndex(x + 1 , y + 1)] == -1 && board[xyToIndex(x - 1 , y - 1)] ==1 && board[xyToIndex(x -2 , y -2)] == -1) ||
		(board[xyToIndex(x - 4 , y - 4)] == -1 && board[xyToIndex(x - 3 , y - 3)] ==1 && board[xyToIndex(x -2 , y -2)] == -1 && board[xyToIndex(x - 1 , y - 1)] ==1 && board[xyToIndex(x + 1 , y + 1)] ==1 && board[xyToIndex(x +2 , y +2)] == -1) ||
		(board[xyToIndex(x + 4 , y + 4)] == -1 && board[xyToIndex(x + 3 , y + 3)] ==1 && board[xyToIndex(x +2 , y +2)] == -1 && board[xyToIndex(x - 1 , y + 1)] ==1 && board[xyToIndex(x - 1 , y - 1)] ==1 && board[xyToIndex(x -2 , y -2)] == -1))
		count4++;
	// 반대 대각선체크.
	if ((board[xyToIndex(x + 4 , y - 4)] == -1 && board[xyToIndex(x + 3 , y - 3)] ==1 && board[xyToIndex(x +2 , y -2)] ==1 && board[xyToIndex(x + 1 , y - 1)] ==1 && board[xyToIndex(x - 1 , y + 1)] == -1) ||
		(board[xyToIndex(x - 4 , y + 4)] == -1 && board[xyToIndex(x - 3 , y + 3)] ==1 && board[xyToIndex(x -2 , y +2)] ==1 && board[xyToIndex(x - 1 , y + 1)] ==1 && board[xyToIndex(x + 1 , y - 1)] == -1) ||
		(board[xyToIndex(x + 5 , y - 5)] == -1 && board[xyToIndex(x + 4 , y - 4)] ==1 && board[xyToIndex(x + 3 , y - 3)] == -1 && board[xyToIndex(x +2 , y -2)] ==1 && board[xyToIndex(x + 1 , y - 1)] ==1 && board[xyToIndex(x - 1 , y + 1)] == -1) ||
		(board[xyToIndex(x - 5 , y + 5)] == -1 && board[xyToIndex(x - 4 , y + 4)] ==1 && board[xyToIndex(x - 3,  y + 3)] == -1 && board[xyToIndex(x -2 , y +2)] ==1 && board[xyToIndex(x - 1 , y + 1)] ==1 && board[xyToIndex(x + 1 , y - 1)] == -1) ||
		(board[xyToIndex(x + 5 , y - 5)] == -1 && board[xyToIndex(x + 4 , y - 4)] ==1 && board[xyToIndex(x + 3 , y - 3)] ==1 && board[xyToIndex(x +2 , y -2)] == -1 && board[xyToIndex(x + 1 , y - 1)] ==1 && board[xyToIndex(x - 1 , y + 1)] == -1) ||
		(board[xyToIndex(x - 5 , y + 5)] == -1 && board[xyToIndex(x - 4 , y + 4)] ==1 && board[xyToIndex(x - 3 , y + 3)] ==1 && board[xyToIndex(x -2 , y +2)] == -1 && board[xyToIndex(x - 1 , y + 1)] ==1 && board[xyToIndex(x + 1 , y - 1)] == -1) ||
		(board[xyToIndex(x - 5 , y - 5)] == -1 && board[xyToIndex(x + 4 , y - 4)] ==1 && board[xyToIndex(x + 3 , y - 3)] ==1 && board[xyToIndex(x +2 , y -2)] ==1 && board[xyToIndex(x + 1 , y - 1)] == -1 && board[xyToIndex(x - 1 , y + 1)] == -1) ||
		(board[xyToIndex(x + 5 , y + 5)] == -1 && board[xyToIndex(x - 4 , y + 4)] ==1 && board[xyToIndex(x - 3 , y + 3)] ==1 && board[xyToIndex(x -2 , y +2)] ==1 && board[xyToIndex(x - 1 , y + 1)] == -1 && board[xyToIndex(x + 1 , y - 1)] == -1) ||
		(board[xyToIndex(x + 3 , y - 3)] == -1 && board[xyToIndex(x +2 , y -2)] ==1 && board[xyToIndex(x + 1 , y - 1)] ==1 && board[xyToIndex(x - 1 , y + 1)] ==1 && board[xyToIndex(x -2 , y +2)] == -1) ||
		(board[xyToIndex(x - 3 , y + 3)] == -1 && board[xyToIndex(x -2 , y +2)] ==1 && board[xyToIndex(x - 1 , y + 1)] ==1 && board[xyToIndex(x + 1 , y - 1)] ==1 && board[xyToIndex(x +2 , y -2)] == -1) ||
		(board[xyToIndex(x + 4 , y - 4)] == -1 && board[xyToIndex(x + 3 , y - 3)] ==1 && board[xyToIndex(x +2 , y -2)] ==1 && board[xyToIndex(x + 1 , y - 1)] == -1 && board[xyToIndex(x - 1 , y + 1)] ==1 && board[xyToIndex(x -2 , y +2)] == -1) ||
		(board[xyToIndex(x - 4 , y + 4)] == -1 && board[xyToIndex(x - 3 , y + 3)] ==1 && board[xyToIndex(x -2 , y +2)] ==1 && board[xyToIndex(x - 1 , y + 1)] == -1 && board[xyToIndex(x + 1 , y - 1)] ==1 && board[xyToIndex(x +2 , y -2)] == -1) ||
		(board[xyToIndex(x + 4 , y - 4)] == -1 && board[xyToIndex(x + 3 , y - 3)] ==1 && board[xyToIndex(x +2 , y -2)] == -1 && board[xyToIndex(x + 1 , y - 1)] ==1 && board[xyToIndex(x - 1 , y + 1)] ==1 && board[xyToIndex(x -2 , y +2)] == -1) ||
		(board[xyToIndex(x - 4 , y + 4)] == -1 && board[xyToIndex(x - 3 , y + 3)] ==1 && board[xyToIndex(x -2 , y +2)] == -1 && board[xyToIndex(x - 1 , y + 1)] ==1 && board[xyToIndex(x + 1 , y - 1)] ==1 && board[xyToIndex(x +2 , y -2)] == -1))
		count4++;
	if (count4 > 1) return 1;
	else return 0;
}


//접속자 수
function gameRoomCount(gameNum) {
  return gameRoom.adapter.rooms.get(gameNum)?.size;
}

//game방 연결--수정중
gameRoom.on('connection', async (socket) => {
  console.log('★★game 소켓 연결됨★★');

  //유저 id를 닉네임 설정
  socket.on('nickname', (nickname) => {
    socket['nickname'] = nickname;
  });
  
  socket.onAny((event) => {
    console.log(`게임방 이벤트: ${event}`);
  });

  //game방 Join
  socket.on('joinGame', async (gameNum, id) => {
    thisGameNum=gameNum
    socket.join(gameNum);
    //게임방 입장시 유저 connect변경
    await Users.updateOne({ id }, { $set: { connect:'ingame'} })

    const observerCnt = gameRoomCount(gameNum) - 2;
    await Rooms.updateOne({ roomNum:gameNum }, { $set: { observerCnt, playerCnt: 2 } });
  });

  //game방 채팅
  socket.on('chat', (chat, gameNum) => {
    const data = { name:socket.nickname, chat };
    gameRoom.to(gameNum).emit('chat', data, chat.state);
  });

  //game방 훈수채팅W
  socket.on('teachingW', async (chat, gameNum) => {
    const data = { name:socket.nickname, chat };

    //teachingCnt 업데이트
    gameRoom.to(gameNum).emit('teachingW', data);
    
    await Users.updateOne({ id:socket.nickname }, { $inc: { teachingCnt: 1 }}, { upsert:true });
  });
  //game방 훈수채팅B
  socket.on('teachingB', async (chat, gameNum) => {
    const data = { name:socket.nickname, chat };

    //teachingCnt 업데이트
    gameRoom.to(gameNum).emit('teachingB', data);
    await Users.updateOne({ id:socket.nickname }, { $inc: { teachingCnt: 1 }}, { upsert:true});
  });
  //game방 훈수채팅- 플라잉
  socket.on('flyingWord', async (chat, gameNum) => {
    const data = { name: socket.nickname, chat };
    
    //teachingCnt 업데이트
    gameRoom.to(gameNum).emit('flyingWord', data);
    await Users.updateOne({ id:socket.nickname }, { $inc: { teachingCnt: 1 }}, { upsert:true });
  });

  //game방 채팅으로 받는부분
  socket.on("Pointer", (chat, gameNum) =>{
    pointer = true;
    const data = {name:socket.nickname, pointer:pointer};
    gameRoom.to(gameNum).emit("Pointer", data,chat);
  }); 
  
  //오목 게임 좌표값을 받아 좌표값에 해당하는 값을
  socket.on('omog', async (data, state, gameNum) => {
    const findBoard = await Boards.findOne({gameNum});
    let bboard = findBoard.board;
    let count = findBoard.count;

    if(count % 2 == 0) {
      if(check_33(data.x,data.y,bboard) || check_44(data.x,data.y,bboard)) {
        let checkSamsam=0 //삼삼확인
        gameRoom.to(gameNum).emit("omog", data,checkSamsam,state);
        return;
      }
    } 

    if (bboard[xyToIndex(data.x, data.y)] != -1 &&
        bboard[xyToIndex(data.x, data.y)] != 3) {
    } else if (
      (state == 'whitePlayer' && count % 2 == 0) ||
      (state == 'blackPlayer' && count % 2 !== 0)
    ) {
    } else {
      count % 2 == 0
        ? (bboard[xyToIndex(data.x, data.y)] = 1)
        : (bboard[xyToIndex(data.x, data.y)] = 2);
      data.board = bboard;
      count++;
      data.count = count;
      await Boards.updateMany({gameNum},{$set: {count, board:bboard}});
      gameRoom.to(gameNum).emit('omog', data);
    }
  });
  //Pointer 훈수 실질적으로 오목두는 부분
  socket.on("pointerOmog", async (data, gameNum) => {
    const findBoard = await Boards.findOne({ gameNum });
    let bboard = findBoard.board;
    let count = findBoard.count;

    if (pointer){
      if (bboard[xyToIndex(data.x, data.y)] != -1) {
        return;
      }
      (bboard[xyToIndex(data.x, data.y)] = 3)
        data.board = bboard;
        // data.order
        let pointer = false;

        gameRoom.to(gameNum).emit("pointerOmog", data, count, pointer);
    }
  });

  // game방 퇴장
  socket.on('disconnecting', async () => {
    gameNum = thisGameNum
    nickname = socket.nickname
    try {
      //게임방 퇴장시 유저 connect변경
      await Users.updateOne({ id:socket.nickname }, { $set: {connect:'offline'} });
      
      const gameId = await Games.findOne({gameNum}, {_id:0, blackTeamObserver:1, whiteTeamObserver:1})
      if(gameId.blackTeamObserver === nickname){
        await Games.updateOne({ gameNum }, {$pull: {blackTeamObserver: nickname}})
      }
      if(gameId.whiteTeamObserver === nickname){
        await Games.updateOne({ gameNum }, {$pull: {whiteTeamObserver: nickname}})
      }  
        
      gameRoom.to(gameNum).emit('bye', socket.id);
      const observerCnt = gameRoomCount(gameNum) - 3; //(-2 플레이어)+(-1 나가는 옵저버)
      // console.log('게임방 소켓 퇴장observerCnt:', observerCnt);
      await Rooms.updateOne({ roomNum:gameNum }, { $set: { observerCnt } });

    } catch (error) {
      console.log(error);
    }
  });

  //게임방 나갈떄
  socket.on('byebye', async (state, gameNum, id ) => {
    try{
      gameRoom.to(gameNum).emit("byebye",state, id);
    } catch(err) {
      console.log("겜방소켓 byebye이벤트 에러:",err);
    }
  });
});
  
  module.exports = { httpServer };