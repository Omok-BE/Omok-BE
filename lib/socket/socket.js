// 플레이어로 방 입장시 정보 업데이트
exports.nicknameEvent = function(socket){
    socket.on('nickname', (nickname) => (socket['nickname'] = nickname))
    console.log(nickname)
};