const Users = require('../../models/users')
const Rooms = require('../../models/rooms');

// 플레이어로 방 입장시 정보 업데이트
module.exports.enterRoomPlayer = async(options = {
    id: null,
    roomNum: null,
    playerCnt: null,
    state: null
}) => {

    if(state === 'blackPlayer'){
        await Users.updateMany(
            { id },
            { set: { state: 'blackPlayer', connect: "inRoom" }}
        );
        await Rooms.updateMany(
            { roomNum },
            { $set: { playerCnt, blackTeamPlayer: id }}
        );
    } else {
        await Users.updateMany(
            { id },
            { set: { state: 'whitePlayer', connect: "inRoom" }}
        );
        await Rooms.updateMany(
            { roomNum },
            { $set: { playerCnt, whiteTeamPlayer: id }}
        );
    };
};

// 관전자로 방 입장시 정보 업데이트
module.exports.enterRoomObserver = async(options = {
    id: null,
    roomNum: null,
    observerCnt: null,
    state: null
}) => {

    await Rooms.updateOne(
        { roomNum },
        { $set: { observerCnt }}
    );

    if(state === 'blackObserver'){
        await Users.updateMany(
            { id },
            { set: { state: 'blackObserver', connect: "inRoom" }}
        );
        await Rooms.updateOne(
            { roomNum },
            { $addToSet: { blackTeamObserver: id }}
        );
    } else {
        await Users.updateMany(
            { id },
            { set: { state: 'whiteObserver', connect: "inRoom" }}
        );    
        await Rooms.updateOne(
            { roomNum },
            { $addToset: { whiteTeamObserver: id }}
        );
    };
};