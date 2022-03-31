const app = require('../app');
const Rooms = require('../models/rooms');
const { findUserInfos } = require('../lib/roomSocket/findUserInfos')
const { enterRoomByPlayer, enterRoomByObserver } = require('../lib/roomSocket/roomInUpdate')
const { ToPlayerFromPlayer, ToPlayerFromObserver, ToObserverFromPlayer, ToObserverFromObserver } = require('../lib/roomSocket/changeRoleUpdate')
const { participantUpdate } = require('../lib/roomSocket/roomOutUpdate')

// socket evnet 알림
exports.onAny = function(socket){
    socket.onAny((event) => {
        console.log(`Socket Event: ${event}`);
    });
};

// socket nickname 설정
exports.nicknameEvent = function(socket){
    socket.on('nickname', (nickname) => (socket['nickname'] = nickname))
};

// 플레이어로 입장시 정보 업데이트
exports.enterRoomPlayer = function(socket){
    socket.on('enterRoomPlayer', async (data) => {
        const { id } = socket.nickname
        const { roomNum, state } = data;
        const role = `${roomNum}player`;
        socket.join(roomNum);
        socket.join(role);
        const playerCnt = waitingRoomCount(role);
        await enterRoomByPlayer({
            id,
            roomNum,
            playerCnt,
            state
        });
        const userInfos = await findUserInfos(roomNum);
        app.get("waitingRoom").to(roomNum).emit('welcome', id, userInfos);
    });
};

// 관전자로 입장시 정보 업데이트
exports.enterRoomObserver = function(socket){
    socket.on('enterRoomObserver', async (data) => {
        const { id } = socket.nickname
        const { roomNum, state } = data;
        const role = `${roomNum}observer`;
        socket.join(roomNum);
        socket.join(role);
        const observerCnt = waitingRoomCount(role);
        await enterRoomByObserver({
          id,
          roomNum,
          observerCnt,
          state
        });
        const userInfos = await findUserInfos(roomNum);
        app.get("waitingRoom").to(roomNum).emit('welcome', id, userInfos);
      });
};

// 플레이어로 변경시 정보 업데이트
exports.changeToPlayer = function(socket){
    socket.on('changeToPlayer', async (data) => {
        const { id } = socket.nickname
        const { roomNum, previousTeam, wantTeam } = data;
        if (previousTeam.includes('Player')) {
          await ToPlayerFromPlayer({
            id,
            roomNum,
            wantTeam
          });
        } else {
          socket.leave(`${roomNum}observer`);
          socket.join(`${roomNum}player`);
          const playerCnt = waitingRoomCount(`${roomNum}player`);
          const observerCnt = waitingRoomCount(`${roomNum}observer`);
          await ToPlayerFromObserver({
            id,
            roomNum,
            playerCnt,
            observerCnt,
            previousTeam,
            wantTeam,
          });
        };
        const userInfos = await findUserInfos(roomNum);
        app.get("waitingRoom").to(roomNum).emit('changeComplete', id, userInfos);
      });
};

// 관전자로 변경시 정보 업데이트
exports.changeToObserver = function(socket){
    socket.on('changeToObserver', async (data) => {
        const { id } = socket.nickname
        const { roomNum, previousTeam, wantTeam } = data;
    
        if(previousTeam.includes('Player')){
          socket.leave(`${roomNum}player`);
          socket.join(`${roomNum}observer`);
          const playerCnt = waitingRoomCount(`${roomNum}player`);
          const observerCnt = waitingRoomCount(`${roomNum}observer`);
          await ToObserverFromPlayer({
            id,
            roomNum,
            playerCnt,
            observerCnt,
            previousTeam,
            wantTeam
          })
        } else {
          await ToObserverFromObserver({
            id,
            roomNum,
            previousTeam,
            wantTeam
          })
        };
        const userInfos = await findUserInfos(roomNum);
        app.get("waitingRoom").to(roomNum).emit('changeComplete', id, userInfos);
      });
};

// 대기실 내 채팅
exports.chat = function(socket){
    socket.on('chat', (data) => {
        const { roomNum, chat } = data;
        const chatData = { nickname: socket.nickname.id, chat };
        app.get("waitingRoom").to(roomNum).emit('chat', chatData);
      }
    );
};

// 게임 시작
exports.gameStart = function(socket){
    socket.on('gameStart', (roomNum) => {
        app.get("waitingRoom").to(roomNum).emit('game', roomNum);
    });
};

// 퇴장시 방 인원 숫자 최신화
exports.disconnecting = function(socket){
    socket.on('disconnecting', async () => {
        console.time('disconnecting')
        try {
          const { id, roomNum } = socket.nickname
          if (socket.rooms.has(`${roomNum}player`)) {
            const playerCnt = waitingRoomCount(`${roomNum}player`) - 1;
            await Rooms.updateOne({ roomNum }, { $set: { playerCnt } });
          }
          if (socket.rooms.has(`${roomNum}observer`)) {
            const observerCnt = waitingRoomCount(`${roomNum}observer`) - 1;
            await Rooms.updateOne({ roomNum }, { $set: { observerCnt } });
          }
          await participantUpdate({
            id,
            roomNum
          });
          const userInfos = await findUserInfos(roomNum);
          app.get("waitingRoom").to(roomNum).emit('bye', id, userInfos);
        } catch (error) {
          console.error('퇴장 errorMessage', error);
        }
        console.timeEnd('disconnecting')
    });
};


// 해당 소켓 방 인원 카운트 메소드
function waitingRoomCount(roomNum) {
    return app.get("waitingRoom").adapter.rooms.get(roomNum)?.size;
  };
  