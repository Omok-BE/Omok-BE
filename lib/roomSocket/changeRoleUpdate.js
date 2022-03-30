const Users = require('../../models/users')
const Rooms = require('../../models/rooms');

// 플레이어로 방 입장시 정보 업데이트
module.exports.enterRoomPlayer = async({
    id,
    roomNum,
    playerCnt,
    state
}) => {

    if(state === 'blackPlayer'){
        await Users.updateMany(
            { id },
            { $set: { state: 'blackPlayer', connect: "inRoom" }}
        );
        await Rooms.updateMany(
            { roomNum },
            { $set: { playerCnt, blackTeamPlayer: id }}
        );
    } else {
        await Users.updateMany(
            { id },
            { $set: { state: 'whitePlayer', connect: "inRoom" }}
        );
        await Rooms.updateMany(
            { roomNum },
            { $set: { playerCnt, whiteTeamPlayer: id }}
        );
    };
};

// 관전자로 방 입장시 정보 업데이트
module.exports.enterRoomObserver = async({
    id,
    roomNum,
    observerCnt,
    state
}) => {

    await Rooms.updateOne(
        { roomNum },
        { $set: { observerCnt }}
    );

    if(state === 'blackObserver'){
        await Users.updateMany(
            { id },
            { $set: { state: 'blackObserver', connect: "inRoom" }}
        );
        await Rooms.updateOne(
            { roomNum },
            { $addToSet: { blackTeamObserver: id }}
        );
    } else {
        await Users.updateMany(
            { id },
            { $set: { state: 'whiteObserver', connect: "inRoom" }}
        );    
        await Rooms.updateOne(
            { roomNum },
            { $addToset: { whiteTeamObserver: id }}
        );
    };
};

// 플레이어에서 플레이어로 변경시 정보 업데이트
module.exports.ToPlayerFromPlayer = async({
    id,
    roomNum,
    wantTeam
}) => {

    if(wantTeam === 'blackPlayer'){
        await Users.updateOne(
            { id },
            { $set: { state: 'blackPlayer' }}
        );
        await Rooms.updateMany(
            { roomNum },
            { $set: { blackTeamPlayer: id, whiteTeamPlayer: null }}
        );    
    } else {
        await Users.updateOne(
            { id },
            { $set: { state: 'whitePlayer' }}
        );
        await Rooms.updateMany(
            { roomNum },
            { $set: { blackTeamPlayer: null, whiteTeamPlayer: id }}
        );    
    }
};

// 관전자에서 플레이어로 변경시 정보 업데이트
module.exports.ToPlayerFromObserver = async({
    id,
    roomNum,
    playerCnt,
    observerCnt,
    previousTeam,
    wantTeam
}) => {
    
    if(!observerCnt) observerCnt = 0;

    if(previousTeam === 'blackObserver'){
        await Rooms.updateOne(
            { roomNum },
            { $pull: { blackTeamObserver: id }}
        );
        await update({
            id,
            roomNum,
            playerCnt,
            observerCnt,
            wantTeam
        });
    };

    if(previousTeam === 'whiteObserver'){
        await Rooms.updateOne(
            { roomNum },
            { $pull: { whiteTeamObserver: id }}
        );
        await update({
            id,
            roomNum,
            playerCnt,
            observerCnt,
            wantTeam
        });
    };
};

// 관전자에서 플레이어로 변경시 업데이트
async function update({
    id,
    roomNum,
    playerCnt,
    observerCnt,
    wantTeam
}) {
    if(wantTeam === 'blackPlayer') {
        await Users.updateOne(
            { id },
            { $set: { state: 'blackPlayer' }}
        );
        await Rooms.updateMany(
            { roomNum },
            {
                $set: {
                    blackTeamPlayer: id,
                    playerCnt,
                    observerCnt
                }
            }
        );
    } else {
        await Users.updateOne(
            { id },
            { $set: { state: 'whitePlayer' }}
        );
        await Rooms.updateMany(
            { roomNum },
            {
                $set: {
                    whiteTeamPlayer: id,
                    playerCnt,
                    observerCnt
                }
            }
        );
    };
};

// 플레이어에서 관전자로 변경시 정보 업데이트
module.exports.ToObserverFromPlayer = async({
    id,
    roomNum,
    playerCnt,
    observerCnt,
    previousTeam,
    wantTeam,
}) => {

    if(!playerCnt) playerCnt = 0;

    if(previousTeam === 'blackPlayer'){
        await Rooms.updateMany(
            { roomNum },
            { $set: { blackTeamPlayer: null, playerCnt, observerCnt }}
        );
        if(wantTeam === 'blackObserver'){
            await Users.updateOne(
                { id },
                { $set: { state: 'blackObserver'}}
            );
            await Rooms.updateOne(
                { roomNum },
                { $addToSet: { blackTeamObserver: id }}
            );
        } else {
            await Users.updateOne(
                { id },
                { $set: { state: 'whiteObserver'}}
            );
            await Rooms.updateOne(
                { roomNum },
                { $addToSet: { whiteTeamObserver: id }}
            );
        }
    };

    if(previousTeam === 'whitePlayer'){
        await Rooms.updateMany(
            { roomNum },
            { $set: { whiteTeamPlayer: null, playerCnt, observerCnt }}
        );
        if(wantTeam === 'blackObserver'){
            await Users.updateOne(
                { id },
                { $set: { state: 'blackObserver'}}
            );
            await Rooms.updateOne(
                { roomNum },
                { $addToSet: { blackTeamObserver: id }}
            );
        } else {
            await Users.updateOne(
                { id },
                { $set: { state: 'whiteObserver' } }
            );
            await Rooms.updateOne(
                { roomNum },
                { $addToSet: { whiteTeamObserver: id } }
              );
        }
    };
};

// 관전자에서 관전자로 변경시 정보 업데이트
module.exports.ToObserverFromObserver = async({
    id,
    roomNum,
    previousTeam,
    wantTeam,
}) => {

    if(previousTeam.includes('Observer')){
        if(wantTeam === 'blackObserver'){
            await Rooms.updateOne(
                { roomNum },
                { $pull: { whiteTeamObserver: id }}
            );
            await Rooms.updateOne(
                { roomNum },
                { $addToSet: {blackTeamObserver: id }}
            );
            await Users.updateOne(
                { id },
                { $set: { state: 'blackObserver' }}
            );
        } else {
            await Rooms.updateOne(
                { roomNum },
                { $pull: { blackTeamObserver: id }}
            );
            await Rooms.updateOne(
                { roomNum },
                { $addToSet: { whiteTeamObserver: id}}
            );
            await Users.updateOne(
                { id },
                { $set: { state: 'whiteObserver' }}
            );
        }
    };
};