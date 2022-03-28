const Users = require('../../models/users')
const Rooms = require('../../models/rooms');

// 플레이어로 방 입장시 정보 업데이트
module.exports.enterRoomPlayer = async({
    id,
    roomNum,
    playerCnt,
    state,
}) => {

    if(state === 'blackPlayer'){
        await Users.updateMany(
            { id: id },
            { set: { state: 'blackPlayer', connect: "inRoom" }}
        );
        await Rooms.updateMany(
            { roomNum: roomNum },
            { $set: { playerCnt: playerCnt, blackTeamPlayer: id }}
        );
    } else {
        await Users.updateMany(
            { id: id },
            { set: { state: 'whitePlayer', connect: "inRoom" }}
        );
        await Rooms.updateMany(
            { roomNum: roomNum },
            { $set: { playerCnt: playerCnt, whiteTeamPlayer: id }}
        );
    };
};

// 관전자로 방 입장시 정보 업데이트
module.exports.enterRoomObserver = async({
    id,
    roomNum,
    observerCnt,
    state,
}) => {

    await Rooms.updateOne(
        { roomNum: roomNum },
        { $set: { observerCnt: observerCnt }}
    );

    if(state === 'blackObserver'){
        await Users.updateMany(
            { id: id },
            { set: { state: 'blackObserver', connect: "inRoom" }}
        );
        await Rooms.updateOne(
            { roomNum: roomNum },
            { $addToSet: { blackTeamObserver: id }}
        );
    } else {
        await Users.updateMany(
            { id: id },
            { set: { state: 'whiteObserver', connect: "inRoom" }}
        );    
        await Rooms.updateOne(
            { roomNum: roomNum },
            { $addToset: { whiteTeamObserver: id }}
        );
    };
};