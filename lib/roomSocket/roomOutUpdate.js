const Users = require('../../models/users')
const Rooms = require('../../models/rooms');

// 퇴장시 방 인원 정보 최신화
module.exports.peopleInRoomUpdate = async({
    id,
    roomNum,
}) => {

    await Users.updateOne(
        { id },
        { set: { connect: "offline" }}
    );

    const roomInfo = await Rooms.findOne(
        { roomNum },
        { 
        _id: 0,
        blackTeamPlayer:1,
        whiteTeamPlayer:1,
        blackTeamObserver:1,
        whiteTeamObserver:1 
        }
    );

    if(roomInfo.blackTeamPlayer === id){
        await Rooms.updateOne(
            { roomNum },
            { $set: {blackTeamPlayer: null }}
        );
    };
    
    if(roomInfo.whiteTeamPlayer === id){
        await Rooms.updateOne(
            { roomNum },
            { $set: {whiteTeamPlayer: null }}
        );
    };
    
    if (roomInfo.blackTeamObserver.includes(id)){
        await Rooms.updateOne(
            { roomNum },
            { $pull: { blackTeamObserver: id }}
        );
    };

    if (roomInfo.whiteTeamObserver.includes(id)){
        await Rooms.updateOne(
            { roomNum },
            { $pull: { whiteTeamObserver: id }}
        );
    };

};