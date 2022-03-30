const app = require('../app');
const { findUserInfos } = require('../lib/roomSocket/findUserInfos')
const { enterRoomByPlayer, enterRoomByObserver } = require('../lib/roomSocket/roomInUpdate')
const { ToPlayerFromPlayer, ToPlayerFromObserver, ToObserverFromPlayer, ToObserverFromObserver } = require('../lib/roomSocket/changeRoleUpdate')
const { peopleInRoomUpdate } = require('../lib/roomSocket/roomOutUpdate')


// socket evnet 메시지
exports.onAny = function(socket){
    socket.onAny((event) => {
        console.log(`Socket Event: ${event}`);
    });
};

// socket nickname 설정
exports.nicknameEvent = function(socket){
    socket.on('nickname', (nickname) => (socket['nickname'] = nickname))
};

// 대기실 내 채팅
exports.chatEvent = function(socket){
    socket.on('chat', (data) => {
        const { roomNum, chat } = data;
        const chatData = { nickname: socket.nickname.id, chat };
        app.get("waitingRoom").to(roomNum).emit('chat', chatData);
      }
    );
};

// 플레이어로 입장시 정보 업데이트
exports.enterRoomPlayer = function(socket){
    socket.on('enterRoomPlayer', async (data) => {
        console.time('enterRoomPlayer')
        const { roomNum, state } = data;
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
        app.get("waitingRoom").to(roomNum).emit('welcome', socket.nickname.id, userInfos);
        console.timeEnd('enterRoomPlayer')
      });
};

// 해당 소켓 방 인원 카운트 메소드
function waitingRoomCount(roomNum) {
    return app.get("waitingRoom").adapter.rooms.get(roomNum)?.size;
  };
  