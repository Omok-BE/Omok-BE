const { enterRoomByPlayer, enterRoomByObserver } = require('../lib/roomSocket/roomInUpdate')
// const { waitingRoomCount, emitToRoom } = require('../socket/socket');

//socket nickname 설정
exports.nicknameEvent = function(socket){
    socket.on('nickname', (nickname) => (socket['nickname'] = nickname))
};

//대기실 내 채팅
exports.chatEvent = function(socket){
    socket.on('chat', (data) => {
        const { roomNum, chat } = data;
        const chatData = { nickname: socket.nickname.id, chat };
        emitToRoom('chat', roomNum, chatData);
      }
    );
};