const app = require('../app');
const Users = require('../models/users');
const Rooms = require('../models/rooms');
const Boards = require('../models/boards');
const { httpServer } = require('./socket')

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
  socket.on('changeToPlayer', async (data) => {
    const { roomNum, previousTeam, wantTeam } = data;
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
  } catch(error) {
    console.log(error)
  }
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
        blackPlayerInfo: { id: 1, score: 1, point: 1, state: 1, profileImage: 1 },
        whitePlayerInfo: { id: 1, score: 1, point: 1, state: 1, profileImage: 1 },
        blackTeamObserver: 1,
        whiteTeamObserver: 1,
        _id: 0,
      },
    },
  ]);
  return userInfos;
}