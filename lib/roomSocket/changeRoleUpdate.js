const Users = require('../../models/users')
const Rooms = require('../../models/rooms');

// 플레이어에서 플레이어로 변경시 정보 업데이트
module.exports.ToPlayerFromPlayer = async(options = {
    id: null,
    roomNum: null,
    previousTeam: null,
    wantTeam: null
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
            { $set: { stae: 'whitePlayer' }}
        );
        await Rooms.updateMany(
            { roomNum },
            { $set: { blackTeamPlayer: null, whiteTeamPlayer: id }}
        );    
    }
};

// 관전자에서 플레이어로 변경시 정보 업데이트
module.exports.ToPlayerFromObserver = async(options = {
    id: null,
    roomNum: null,
    playerCnt: null,
    observerCnt: null,
    previousTeam: null,
    wantTeam: null
}) => {
    
    if(!observerCnt) observerCnt = 0;

    if(previousTeam === 'blackObserver'){
        await Rooms.updateOne(
            { roomNum },
            { $pull: { blackTeamObserver: id }}
        );
        await update();
    };

    if(previousTeam === 'whiteObserver'){
        await Rooms.updateOne(
            { roomNum },
            { $pull: { whiteTeamObserver: id }}
        );
        await update();
    };
};

// 관전자에서 플레이어로 변경시 업데이트
async function update() {
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
module.exports.ToObserverFromPlayer = async(options = {
    id: null,
    roomNum: null,
    playerCnt: null,
    observerCnt: null,
    previousTeam: null,
    wantTeam: null
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
                { id: socket.nickname},
                { $set: { state: 'whiteObserver' } }
            );
            await Rooms.updateOne(
                { roomNum },
                { $addToSet: { whiteTeamObserver: socket.nickname } }
              );
        }
    };
};

// 관전자에서 관전자로 변경시 정보 업데이트
module.exports.ToObserverFromObserver = async(options = {
    id: null,
    roomNum: null,
    previousTeam: null,
    wantTeam: null
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