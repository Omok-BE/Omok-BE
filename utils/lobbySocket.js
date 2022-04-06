const Users = require('../models/users');

// socket evnet 알림
exports.onAny = function(socket){
    socket.onAny((event) => {
        console.log(`lobby Socket Event: ${event}`);
    });
};

// socket nickname 설정
exports.nicknameEvent = function(socket){
    socket.on('nickname', (nickname) => (socket['nickname'] = nickname))
};

// 로비 접속시 online으로 변경
exports.connectUpdate = function(socket){
  socket.on('lobby', async (id) => {
    await Users.updateOne({ id }, { $set: { connect: 'online' }})
  });
};

// 접속 종료시 offline으로 변경
exports.disconnect = function(socket){
  socket.on('disconnect', async () => {
    await Users.updateOne({ id: socket.nickname }, { $set: { connect: 'offline'} })
  });
};