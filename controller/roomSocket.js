const { enterRoomByPlayer, enterRoomByObserver } = require('../lib/roomSocket/roomInUpdate')

//socket nickname 설정
exports.nicknameEvent = function(socket){
    socket.on('nickname', (nickname) => (socket['nickname'] = nickname))
};

// //플레이어로 입장시 정보 업데이트
// exports.enterRoomPlayer = function(socket){
//   socket.on('enterRoomPlayer', async (data) => {
//     const { roomNum, state } = data;
//     roomNumber = roomNum;
//     const role = `${roomNum}player`;
//     socket.join(roomNum);
//     socket.join(role);
//     const playerCnt = waitingRoomCount(role);
//     console.log("state", state)
//     await enterRoomByPlayer({
//       id: socket.nickname,
//       roomNum,
//       playerCnt,
//       state
//     });
//     const userInfos = await findUserInfos(roomNum);
//     waitingRoom.to(roomNum).emit('welcome', socket.nickname, userInfos);
//   });
// };