const app = require('../app');
const Users = require('../models/users');
const Rooms = require('../models/rooms');
const Boards = require('../models/boards');
const { findUserInfos } = require('../lib/roomSocket/findUserInfos')

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

// 대기실 socketIO
const waitingRoom = io.of('/waiting');
let roomNumber;
let id;

waitingRoom.on('connection', (socket) => {
  console.log('connect client on waitingRoom ✅', socket.id);
  socket.onAny((event) => {
    console.log(`Socket Event: ${event}`);
  });

  //socket nickname 설정_210303
  socket.on('nickname', (nickname) => (socket['nickname'] = nickname));

  //플레이어로 입장시 정보 업데이트_210315
  socket.on('enterRoomPlayer', async (data) => {
    const { roomNum, state } = data;
    roomNumber = roomNum;
    const role = `${roomNum}player`;
    socket.join(roomNum);
    socket.join(role);
    const playerCnt = waitingRoomCount(role);
    if (state === 'blackPlayer') {
      await Rooms.updateMany(
        { roomNum },
        { $set: { playerCnt, blackTeamPlayer: socket.nickname } }
        );
    } else {
      await Rooms.updateMany(
        { roomNum },
        { $set: { playerCnt, whiteTeamPlayer: socket.nickname } }
      );
    }
    const userInfos = await findUserInfos(roomNum);
    waitingRoom.to(roomNum).emit('welcome', socket.nickname, userInfos);
  });

  //관전자로 입장시 정보 업데이트_210315
  socket.on('enterRoomObserver', async (data) => {
    const { roomNum, state } = data;
    roomNumber = roomNum;
    const role = `${roomNum}observer`;
    socket.join(roomNum);
    socket.join(role);
    const observerCnt = waitingRoomCount(role);
    await Users.updateOne({ id: socket.nickname }, { set: { connect: "Online"}})
    if (state === 'blackObserver') {
      await Rooms.updateOne({ roomNum }, { $set: { observerCnt } });
      await Rooms.updateOne(
        { roomNum },
        { $addToSet: { blackTeamObserver: socket.nickname } }
      );
    } else {
      await Rooms.updateOne({ roomNum }, { $set: { observerCnt } });
      await Rooms.updateOne(
        { roomNum },
        { $addToSet: { whiteTeamObserver: socket.nickname } }
      );
    }
    const userInfos = await findUserInfos(roomNum);
    waitingRoom.to(roomNum).emit('welcome', socket.nickname, userInfos);
  });

  // 플레이어로 변경시 정보 업데이트_210315
  socket.on('changeToPlayer', async (data) => {
    const { roomNum, previousTeam, wantTeam } = data;
    await Users.updateOne({ id: socket.nickname }, { set: { connect: "Online"}})
    if (previousTeam.includes('Player')) {
      if (wantTeam === 'blackPlayer') {
        await Rooms.updateMany(
          { roomNum },
          { $set: { blackTeamPlayer: socket.nickname, whiteTeamPlayer: null } }
        );
        await Users.updateOne(
          { id: socket.nickname},
          { $set: { state: 'blackPlayer' } }
        );
      } else {
        await Rooms.updateMany(
          { roomNum },
          { $set: { blackTeamPlayer: null, whiteTeamPlayer: socket.nickname } }
        );
        await Users.updateOne(
          { id: socket.nickname},
          { $set: { state: 'whitePlayer' } }
        );
      }
    } else {
      socket.leave(`${roomNum}observer`);
      socket.join(`${roomNum}player`);
      const playerCnt = waitingRoomCount(`${roomNum}player`);
      let observerCnt = waitingRoomCount(`${roomNum}observer`);
      if(!observerCnt) { observerCnt = 0}
      if (previousTeam === 'blackObserver') {
        await Rooms.updateOne(
          { roomNum },
          { $pull: { blackTeamObserver: socket.nickname } }
        );
        if (wantTeam === 'blackPlayer') {
          await Rooms.updateMany(
            { roomNum },
            {
              $set: {
                blackTeamPlayer: socket.nickname,
                playerCnt,
                observerCnt,
              },
            }
          );
          await Users.updateOne(
            { id: socket.nickname},
            { $set: { state: 'blackPlayer' } }
          );
        } else {
          await Rooms.updateMany(
            { roomNum },
            {
              $set: {
                whiteTeamPlayer: socket.nickname,
                playerCnt,
                observerCnt,
              },
            }
          );
          await Users.updateOne(
            { id: socket.nickname},
            { $set: { state: 'whitePlayer' } }
          );
        }
      } else {
        await Rooms.updateOne(
          { roomNum },
          { $pull: { whiteTeamObserver: socket.nickname } }
        );
        if (wantTeam === 'blackPlayer') {
          await Rooms.updateMany(
            { roomNum },
            {
              $set: {
                blackTeamPlayer: socket.nickname,
                playerCnt,
                observerCnt,
              },
            }
          );
          await Users.updateOne(
            { id: socket.nickname},
            { $set: { state: 'blackPlayer' } }
          );
        } else {
          await Rooms.updateMany(
            { roomNum },
            {
              $set: {
                whiteTeamPlayer: socket.nickname,
                playerCnt,
                observerCnt,
              },
            }
          );
          await Users.updateOne(
            { id: socket.nickname},
            { $set: { state: 'whitePlayer' } }
          );
        }
      }
    }
    const userInfos = await findUserInfos(roomNum);
    waitingRoom.to(roomNum).emit('changeComplete', socket.nickname, userInfos);
  });

  // 관전자로 변경시 정보 업데이트_210315
  socket.on('changeToObserver', async (data) => {
    const { roomNum, previousTeam, wantTeam } = data;
    if (previousTeam.includes('Observer')) {
      if (wantTeam === 'blackObserver') {
        await Rooms.updateOne(
          { roomNum },
          { $pull: { whiteTeamObserver: socket.nickname } }
        );
        await Rooms.updateOne(
          { roomNum },
          { $addToSet: { blackTeamObserver: socket.nickname } }
        );
        await Users.updateOne(
          { id: socket.nickname},
          { $set: { state: 'blackObserver' } }
        );
      } else {
        await Rooms.updateOne(
          { roomNum },
          { $pull: { blackTeamObserver: socket.nickname } }
        );
        await Rooms.updateOne(
          { roomNum },
          { $addToSet: { whiteTeamObserver: socket.nickname } }
        );
        await Users.updateOne(
          { id: socket.nickname},
          { $set: { state: 'whiteObserver' } }
        );
      }
    } else {
      socket.leave(`${roomNum}player`);
      socket.join(`${roomNum}observer`);
      let playerCnt = waitingRoomCount(`${roomNum}player`);
      if(!playerCnt) { playerCnt = 0}
      const observerCnt = waitingRoomCount(`${roomNum}observer`);
      if (previousTeam === 'blackPlayer') {
        await Rooms.updateMany(
          { roomNum },
          { $set: { blackTeamPlayer: null, playerCnt, observerCnt } }
        );
        if (wantTeam === 'blackObserver') {
          await Rooms.updateOne(
            { roomNum },
            { $addToSet: { blackTeamObserver: socket.nickname } }
          );
          await Users.updateOne(
            { id: socket.nickname},
            { $set: { state: 'blackObserver' } }
          );
        } else {
          await Rooms.updateOne(
            { roomNum },
            { $addToSet: { whiteTeamObserver: socket.nickname } }
          );
          await Users.updateOne(
            { id: socket.nickname},
            { $set: { state: 'whiteObserver' } }
          );
        }
      } else {
        await Rooms.updateMany(
          { roomNum },
          { $set: { whiteTeamPlayer: null, playerCnt, observerCnt } }
        );
        if (wantTeam === 'blackObserver') {
          await Rooms.updateOne(
            { roomNum },
            { $addToSet: { blackTeamObserver: socket.nickname } }
          );
          await Users.updateOne(
            { id: socket.nickname},
            { $set: { state: 'blackObserver' } }
          );
        } else {
          await Rooms.updateOne(
            { roomNum },
            { $addToSet: { whiteTeamObserver: socket.nickname } }
          );
          await Users.updateOne(
            { id: socket.nickname},
            { $set: { state: 'whiteObserver' } }
          );
        }
      }
    }
    const userInfos = await findUserInfos(roomNum);
    waitingRoom.to(roomNum).emit('changeComplete', socket.nickname, userInfos);
  });

  //대기실 내 채팅_210303
  socket.on('chat', (data) => {
    const { roomNum, chat } = data;
    const chatData = { nickname: socket.nickname, chat };
    waitingRoom.to(roomNum).emit('chat', chatData);
  });

  //게임 시작_210315
  socket.on('gameStart', (roomNum) => {
    waitingRoom.to(roomNum).emit('game', roomNum);
  });

  //퇴장시 대기실 숫자 최신화_210315
  socket.on('disconnecting', async () => {
    let roomNum = roomNumber
    id = socket.nickname
    try {
      if (socket.rooms.has(`${roomNum}player`)) {
        const playerCnt = waitingRoomCount(`${roomNum}player`) - 1;
        await Rooms.updateOne({ roomNum }, { $set: { playerCnt } });
      }
      if (socket.rooms.has(`${roomNum}observer`)) {
        const observerCnt = waitingRoomCount(`${roomNum}observer`) - 1;
        await Rooms.updateOne({ roomNum }, { $set: { observerCnt } });
      }
    } catch (error) {
      console.log('퇴장 errorMessage', error);
    }
  });

  //퇴장시 대기실 DB 최신화_210319
  socket.on('disconnect', async () => {
    try{
    let roomNum = roomNumber
    await Users.updateOne({ id }, { set: { connect: "Offline"}})
    const room = await Rooms.findOne({ roomNum }, { _id: 0, blackTeamPlayer:1, whiteTeamPlayer:1, blackTeamObserver:1, whiteTeamObserver:1 });
    if(room.blackTeamPlayer === id){
      await Rooms.updateOne({ roomNum }, { $set: {blackTeamPlayer: null }})
    }
    if(room.whiteTeamPlayer === id){
      await Rooms.updateOne({ roomNum }, { $set: {whiteTeamPlayer: null }})
    }
    if (room.blackTeamObserver.includes(id)) {
      await Rooms.updateOne(
        { roomNum },
        { $pull: { blackTeamObserver: id } }
      );
    }
    if (room.whiteTeamObserver.includes(id)) {
      await Rooms.updateOne(
        { roomNum },
        { $pull: { whiteTeamObserver: id } }
      );
    }
    const userInfos = await findUserInfos(roomNumber);
    waitingRoom.to(roomNumber).emit('bye', id, userInfos);
  } catch(error) {
    console.log(error)
  }
  });

});

//방 인원 카운트_210304
function waitingRoomCount(roomNum) {
  return waitingRoom.adapter.rooms.get(roomNum)?.size;
}

//게임방 socket
const gameRoom = io.of('/game');
let thisGameNum;

// x,y 좌표를 배열의 index값으로 변환
let xyToIndex = (x, y) => {
  return x + y * 19;
};

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

//game방 연결
gameRoom.on('connect', async (socket) => {
  console.log('★★game 소켓 연결됨★★');
    console.log('겜방연결후socket.id', socket.id);

  socket.onAny((event) => {
    console.log(`게임방 이벤트: ${event}`);
  });

  // 유저 id를 닉네임 설정
  socket.on('nickname', (nickname) => {
    socket['nickname'] = nickname;
    console.log('게임방 닉네임은?', nickname);
    console.log('소켓닉네임은???', socket.nickname);
  });

  //game방 Join
  socket.on('joinGame', async (gameNum) => {
    thisGameNum=gameNum
    console.log(`조인게임방번호:${gameNum}`);
    socket.join(gameNum);
    const observerCnt = gameRoomCount(gameNum) - 2;
    console.log('416,game방소켓Join_observerCnt:', observerCnt);
    await Rooms.updateOne({ roomNum:gameNum }, { $set: { observerCnt, playerCnt: 2 } });
  });

  //game방 채팅
  socket.on('chat', (chat, gameNum) => {
    const data = { name: socket.nickname, chat };
    console.log('게임방 채팅data:', data);
    gameRoom.to(gameNum).emit('chat', data);
  });

  //game방 훈수채팅W
  socket.on('teachingW', async (chat, gameNum) => {
    const data = { name: socket.nickname, chat };
    console.log('훈수쳇W소켓닉네임:', socket.nickname);
    console.log('훈수쳇W data:', data);
    
    //teachingCnt 업데이트
    gameRoom.to(gameNum).emit('teachingW', data);
    
    await Users.updateOne({ id: socket.nickname }, { $inc: { teachingCnt: 1 }}, {upsert:true});
  });
  //game방 훈수채팅B
  socket.on('teachingB', async (chat, gameNum) => {
    const data = { name: socket.nickname, chat };
    console.log('훈수쳇B소켓닉네임:', socket.nickname);
    console.log('훈수쳇B data:', data);

    //teachingCnt 업데이트
    gameRoom.to(gameNum).emit('teachingB', data);
    await Users.updateOne({ id: socket.nickname }, { $inc: { teachingCnt: 1 }}, {upsert:true});
  });
  //game방 훈수채팅- 플라잉
  socket.on('flyingWord', async (chat, gameNum) => {
    const data = { name: socket.nickname, chat };
    console.log('플라잉채팅 닉네임♬♪:', socket.nickname);
    console.log('플라잉채팅 data♬♪:', data);
    
    //teachingCnt 업데이트
    gameRoom.to(gameNum).emit('flyingWord', data);
    await Users.updateOne({ id: socket.nickname }, { $inc: { teachingCnt: 1 }}, {upsert:true});
  });

  

  //game방 채팅으로 받는부분
  socket.on("Pointer", (chat, gameNum) =>{
    pointer = true;
    const data = {name:socket.nickname, pointer:pointer};
    console.log("Pointer♬♪:",socket.nickname);
    console.log("Pointer data♬♪:",data);
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
        console.log("걸렸구만",check_33(data.x,data.y,bboard),check_44(data.x,data.y,bboard)) ;
        gameRoom.to(gameNum).emit("omog", data,checkSamsam,state);
        return;
      }
      console.log("삼삼하구만",check_33(data.x,data.y,bboard),check_44(data.x,data.y,bboard)) ;
    } 

    if (bboard[xyToIndex(data.x, data.y)] != -1 &&
        bboard[xyToIndex(data.x, data.y)] != 3) {
      console.log('돌아가', bboard);
    } else if (
      (state == 'whitePlayer' && count % 2 == 0) ||
      (state == 'blackPlayer' && count % 2 !== 0)
    ) {
      console.log('너의 순서가 아니다 돌아가');
    } else {
      count % 2 == 0
        ? (bboard[xyToIndex(data.x, data.y)] = 1)
        : (bboard[xyToIndex(data.x, data.y)] = 2);
      data.board = bboard;
      // data.order
      count++;
      data.count = count;
      await Boards.updateMany({gameNum},{$set: {count, board:bboard}});
      console.log('오목게임', count, state);
      gameRoom.to(gameNum).emit('omog', data);
    }
  });
  //Pointer 훈수 실질적으로 오목두는 부분
  socket.on("pointerOmog", async (data, gameNum) => {
    const findBoard = await Boards.findOne({gameNum});
    let bboard = findBoard.board;
    let count = findBoard.count;

    if (pointer){
      if (bboard[xyToIndex(data.x, data.y)] != -1) {
        console.log("Pointer돌아가");
        return;
      }
      (bboard[xyToIndex(data.x, data.y)] = 3)
        data.board = bboard;
        // data.order
        let pointer = false;
        console.log("Pointer 훈수", pointer);

        gameRoom.to(gameNum).emit("pointerOmog", data, count, pointer);
    }
  });

  // game방 퇴장
  socket.on('disconnecting', async () => {
    gameNum = thisGameNum
    nickname = socket.nickname
    //game방 퇴장 메시지
    try {
      //게임방에서 플레이어가 나갔을 경우
      // const inGameIds = await Games.findOne({ gameNum:thisgameNum },  
      //                                           ({_id:false, blackTeamPlayer:true, whiteTeamPlayer:true }));
      // const outPlayer = await Users.findOne({ id:socket.nickname }, { _id:false, id:true, point:true, state:true });
      // if (outPlayer.id === inGameIds.blackTeamPlayer){
      //   await Users.updateOne({ id:socket.nickname }, { $inc: { 'score.1.lose':1 } });  //패 +1
      //   await Users.updateOne({ id:socket.nickname }, { $set: { point: - 50 } });  //포인트 -50
      // } else if (outPlayer.state === 'whitePlayer'){
      //   await Users.updateOne({ id:socket.nickname }, { $inc: { 'score.0.win':1 } });  //승 +1
      //   await Users.updateOne({ id:socket.nickname }, { $set: { point: + 100 } });  //포인트 +100
      // }
      // if (outPlayer.id === inGameIds.whiteTeamPlayer){
      //   await Users.updateOne({ id:socket.nickname }, {  inc: { 'score.0.win':1 } });  //승 +1
      //   await Users.updateOne({ id:socket.nickname }, { $set: { point: + 100 } });  //포인트 +100
      // } else if (outPlayer.state === 'blackPlayer'){
      //   await Users.updateOne({ id:socket.nickname }, { $inc: { 'score.1.lose':1 } });  //패 +1
      //   await Users.updateOne({ id:socket.nickname }, { $set: { point: - 50 } });  //포인트 -50
      // }
      // console.log("661,겜방소켓,inGameIds:",inGameIds)
      // console.log("662,겜방소켓,outPlayer:",outPlayer)


      gameRoom.to(thisGameNum).emit('bye', socket.id);
      const observerCnt = gameRoomCount(thisGameNum) - 3; //(-2 플레이어)+(-1 나가는 옵저버)
      // console.log('게임방 소켓 퇴장observerCnt:', observerCnt);
      await Rooms.updateOne({ roomNum:thisGameNum }, { $set: { observerCnt } });
      console.log('게임방 퇴장 소켓 disconnecting🖐️🖐️');
      console.log('게임방 퇴장 소켓 id', socket.id);
      console.log('게임방 퇴장 소켓.nickname', socket.nickname);
      console.log('게임방 퇴장 소켓 room ', socket.rooms);
      console.log('게임방 퇴장 네임스페이스 전체 소켓', gameRoom.adapter.rooms);
    } catch (error) {
      console.log(error);
    }
  });

  //게임방 나갈떄
  socket.on('byebye', async (state, gameNum) => {
    try{
      gameRoom.to(gameNum).emit("byebye",state);
      console.log("겜방소켓 byebye이벤트 성공");
    } catch(err) {
      console.log("겜방소켓 byebye이벤트 에러:",err);
    }
  });

    
    // //게임결과 후 게임방, 대기방 삭제
    // const existGame = await Games.findOne({ gameNum:thisgameNum });
    // if (existGame){
    //   console.log("$$$$$$$$$$")
    //   const deleteRoomNum = await Rooms.deleteOne({ roomNum:thisgameNum });
    //   const deleteGameNum = await Games.deleteOne({ gameNum:thisgameNum });
    //   console.log("690,소켓 게임결과창,deleteRoomNum",deleteRoomNum)
    //   console.log("691,소켓 게임결과창,deleteGameNum",deleteGameNum)
    // }
    
    // //게임결과 후 결과창 '나가기'버튼 클릭 유저 state 'online'변경
    // const afterGameUserState = await Users.updateOne({ id:socket.id }, { $set: { state: 'online' }}); 
    // console.log("400,afterGameUserState:", afterGameUserState)
});

module.exports = { httpServer };
