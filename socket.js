const app = require('./app');
const Users = require('./models/users');
const Rooms = require('./models/rooms');

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
  console.log('connect client on waitingRoom ✅');
  console.log('대기실 socket.id', socket.id);
  socket.onAny((event) => {
    console.log(`Socket Event: ${event}`);
  });

  //socket nickname 설정_210303
  socket.on('nickname', (nickname) => (socket['nickname'] = nickname));

  //플레이어로 입장시 정보 업데이트_210315
  socket.on('enterRoomPlayer', async (roomNum, state) => {
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
  socket.on('enterRoomObserver', async (roomNum, state) => {
    console.log("관전자 입장 state",roomNum, state)
    const role = `${roomNum}observer`;
    socket.join(roomNum);
    socket.join(role);
    const observerCnt = waitingRoomCount(role);
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
  socket.on('changeToPlayer', async (roomNum, previousTeam, wantTeam) => {
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
    console.log('플레이어로 변경', '이전팀: ', previousTeam, '옮길 팀: ', wantTeam);
  });

  // 관전자로 변경시 정보 업데이트_210315
  socket.on('changeToObserver', async (roomNum, previousTeam, wantTeam) => {
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
  socket.on('chat', (roomNum, chat) => {
    const data = { nickname: socket.nickname, chat };
    waitingRoom.to(roomNum).emit('chat', data);
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
    let roomNum = roomNumber
    const room = await Rooms.findOne({ roomNum }, { _id: 0, blackTeamPlayer:1, whiteTeamPlayer:1, blackTeamObserver:1, whiteTeamObserver:1 })
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
  });

});

//방 인원 카운트_210304
function waitingRoomCount(roomNum) {
  return waitingRoom.adapter.rooms.get(roomNum)?.size;
}

//방 내부 유저 최신정보 가져오기_210316
async function findUserInfos(roomNum) {
  const userInfos = await Rooms.aggregate([
    {
      $match: { roomNum: Number(roomNum) },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'blackTeamPlayer',
        foreignField: 'id',
        as: 'blackPlayerInfo',
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'whiteTeamPlayer',
        foreignField: 'id',
        as: 'whitePlayerInfo',
      },
    },
    {
      $project: {
        blackPlayerInfo: { id: 1, score: 1, point: 1, state: 1 },
        whitePlayerInfo: { id: 1, score: 1, point: 1, state: 1 },
        blackTeamObserver: 1,
        whiteTeamObserver: 1,
        _id: 0,
      },
    },
  ]);
  return userInfos;
}

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



//게임방 socket
const gameRoom = io.of('/game');
let thisgameNum;

// x,y 좌표를 배열의 index값으로 변환
let xyToIndex = (x, y) => {
  return x + y * 19;
};

let bboard;
let count;
let pointer;

//접속자 수
function gameRoomCount(gameNum) {
  return gameRoom.adapter.rooms.get(gameNum)?.size;
}

//game방 연결
gameRoom.on('connect', async (socket) => {
  bboard = new Array(Math.pow(19, 2)).fill(-1);
  count = 0;
  pointer = false;
  console.log('★★game 소켓 연결됨★★');
  
  // console.log("겜방연결후 bboard",bboard);
  // console.log("겜방연결후count",count);
  // console.log('겜방연결후socket', socket);
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
    thisgameNum = gameNum;
    console.log(`조인게임방번호:${gameNum}`);
    socket.join(gameNum);
    const observerCnt = gameRoomCount(gameNum) - 2;
    console.log('416,game방소켓Join_observerCnt:', observerCnt);
    await Rooms.updateOne({ roomNum:gameNum }, { $set: { observerCnt, playerCnt: 2 } });
  });

  //game방 채팅
  socket.on('chat', (chat) => {
    const data = { name: socket.nickname, chat };
    console.log('게임방 채팅data:', data);
    gameRoom.to(thisgameNum).emit('chat', data);
  });

  //game방 훈수채팅W
  socket.on('teachingW', async (chat) => {
    const data = { name: socket.nickname, chat };
    console.log('훈수쳇W소켓닉네임:', socket.nickname);
    console.log('훈수쳇W data:', data);
    
    //teachingCnt 업데이트
    gameRoom.to(thisgameNum).emit('teachingW', data);
    
    await Users.updateOne({ id: socket.nickname }, { $inc: { teachingCnt: 1 }}, {upsert:true});
  });
  //game방 훈수채팅B
  socket.on('teachingB', async (chat) => {
    const data = { name: socket.nickname, chat };
    console.log('훈수쳇B소켓닉네임:', socket.nickname);
    console.log('훈수쳇B data:', data);

    //teachingCnt 업데이트
    gameRoom.to(thisgameNum).emit('teachingB', data);
    await Users.updateOne({ id: socket.nickname }, { $inc: { teachingCnt: 1 }}, {upsert:true});
  });
  //game방 훈수채팅- 플라잉
  socket.on('flyingWord', async (chat) => {
    const data = { name: socket.nickname, chat };
    console.log('플라잉채팅 닉네임♬♪:', socket.nickname);
    console.log('플라잉채팅 data♬♪:', data);
    
    //teachingCnt 업데이트
    gameRoom.to(thisgameNum).emit('flyingWord', data);
    await Users.updateOne({ id: socket.nickname }, { $inc: { teachingCnt: 1 }}, {upsert:true});
  });

  

  //game방 채팅으로 받는부분
  socket.on("Pointer", (chat) =>{
    pointer = true;
    const data = {name:socket.nickname, pointer:pointer};
    console.log("Pointer♬♪:",socket.nickname);
    console.log("Pointer data♬♪:",data);
    gameRoom.to(thisgameNum).emit("Pointer", data,chat);
  }); 
  
  //오목 게임
  socket.on('omog', (data, state) => {
    if(count % 2 == 0) {
      if(check_33(data.x,data.y,bboard) || check_44(data.x,data.y,bboard)) {
        let bye=0
        console.log("걸렸구만",check_33(data.x,data.y,bboard),check_44(data.x,data.y,bboard)) ;
        gameRoom.to(thisgameNum).emit("omog", data,bye,state);
        return;
      }
      console.log("삼삼하구만",check_33(data.x,data.y,bboard),check_44(data.x,data.y,bboard)) ;
    } 

    if (bboard[xyToIndex(data.x, data.y)] != -1 &&
        bboard[xyToIndex(data.x, data.y)] != 3) {
      console.log('돌아가', bboard);
    } else if (
      (state == 'playerW' && count % 2 == 0) ||
      (state == 'playerB' && count % 2 !== 0)
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
      console.log('오목게임', count, state);
      gameRoom.to(thisgameNum).emit('omog', data);
    }
  });
  //Pointer 훈수 실질적으로 오목두는 부분
  socket.on("pointerOmog", (data) => {
    if (pointer){
      if (bboard[xyToIndex(data.x, data.y)] != -1) {
        console.log("Pointer돌아가");
        return;
      }
      (bboard[xyToIndex(data.x, data.y)] = 3)
        data.board = bboard;
        // data.order
        pointer = false;
        console.log("Pointer 훈수", pointer);

        gameRoom.to(thisgameNum).emit("pointerOmog", data, count, pointer);
    }
  });

  // game방 퇴장
  socket.on('disconnecting', async () => {
    //game방 퇴장 메시지
    try {
      gameRoom.to(thisgameNum).emit('bye', socket.id);
      const observerCnt = gameRoomCount(thisgameNum) - 3; //(-2 플레이어)+(-1 나가는 옵저버)
      await Users.updateOne({ id: socket.nickname }, { $set: { state: 'online' }}); 
      // console.log('게임방 소켓 퇴장observerCnt:', observerCnt);
      await Rooms.updateOne({ roomNum: thisgameNum }, { $set: { observerCnt } });
      console.log('게임방 퇴장 소켓 disconnecting🖐️🖐️');
      console.log('게임방 퇴장 소켓 room ', socket.rooms);
      console.log('게임방 퇴장 네임스페이스 전체 소켓', gameRoom.adapter.rooms);
      console.log('게임방 퇴장 소켓 id', socket.id);
      console.log('게임방 퇴장 소켓.nickname', socket.nickname);

      const outPlayer = await Users.findOne({ id:socket.nickname }, { _id:false, point:true, state:true });
      if (outPlayer.state === 'blackPlayer'){
        await Users.updateOne({ id:socket.nickname }, { $set: { $inc: { 'score.0.win':1 } }});  //승 +1
        await Users.updateOne({ id:socket.nickname }, { $set: { point: outPlayer.point + 100 } });  //포인트 +100
      } else {
        await Users.updateOne({ id:socket.nickname }, { $set: { $inc: { 'score.1.lose':1 } }});  //패 +1
        await Users.updateOne({ id:socket.nickname }, { $set: { point: outPlayer.point - 50 } });  //포인트 -50
      }
      if (outPlayer.state === 'whitePlayer'){
        await Users.updateOne({ id:socket.nickname }, { $set: { $inc: { 'score.0.win':1 } }});  //승 +1
        await Users.updateOne({ id:socket.nickname }, { $set: { point: outPlayer.point + 100 } });  //포인트 +100
      } else {
        await Users.updateOne({ id:socket.nickname }, { $set: { $inc: { 'score.1.lose':1 } }});  //패 +1
        await Users.updateOne({ id:socket.nickname }, { $set: { point: outPlayer.point - 50 } });  //포인트 -50
      }

      const state = outPlayer.state
      console.log("671,겜방소켓state:",state)
      console.log("672,겜방소켓outPlayer:",outPlayer)
      gameRoom.to(thisgameNum).emit("byebye",state)
    } catch (error) {
      console.log(error);
    }
  });

  //게임결과
  socket.on('result', (winner, loser) => {
    console.log('게임결과_소켓 winner:', winner);
    console.log('게임결과_소켓 loser:', loser);
    gameRoom.to(thisgameNum).emit('result', { winner, loser });
  });
});

module.exports = { httpServer };
