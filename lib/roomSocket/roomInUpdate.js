const Users = require('../../models/users')
const Rooms = require('../../models/rooms');

// 플레이어로 방 입장시 정보 업데이트
module.exports.enterRoomPlayer = async(options = {
    id: null,
    roomNum: null,
    playerCnt: null,
    state: null
}) => {

    if(options.state === 'blackPlayer'){
        await Users.updateMany(
            { id: options.id },
            { set: { state: 'blackPlayer', connect: "inRoom" }}
        );
        await Rooms.updateMany(
            { roomNum: options.roomNum },
            { $set: { playerCnt: options.playerCnt, blackTeamPlayer: options.id }}
        );
    } else {
        await Users.updateMany(
            { id: options.id },
            { set: { state: 'whitePlayer', connect: "inRoom" }}
        );
        await Rooms.updateMany(
            { roomNum: options.roomNum },
            { $set: { playerCnt: options.playerCnt, whiteTeamPlayer: options.id }}
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
        { roomNum: options.roomNum },
        { $set: { observerCnt: options.observerCnt }}
    );

    if(options.state === 'blackObserver'){
        await Users.updateMany(
            { id: options.id },
            { set: { state: 'blackObserver', connect: "inRoom" }}
        );
        await Rooms.updateOne(
            { roomNum: options.roomNum },
            { $addToSet: { blackTeamObserver: options.id }}
        );
    } else {
        await Users.updateMany(
            { id: options.id },
            { set: { state: 'whiteObserver', connect: "inRoom" }}
        );    
        await Rooms.updateOne(
            { roomNum: options.roomNum },
            { $addToset: { whiteTeamObserver: options.id }}
        );
    };
};