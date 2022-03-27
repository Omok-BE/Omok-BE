const Rooms = require('../../models/rooms');
const Users = require('../../models/users')


// 방 입장시 DB 업데이트
module.exports.enterRoomUpdate = async(options = {
    id: null,
    roomNum: null,
    playerCnt: null,
    observerCnt: null,
    role: null
}) => {

    if(role.includes('player')){
        if(blackTeamPlayer){
            await Rooms.updateMany(
                { roomNum },
                { $set: { playerCnt, blackTeamPlayer: id }}
            );
        } else {
            await Rooms.updateMany(
                { roomNum },
                { $set: { playerCnt, whiteTeamPlayer: id }}
            );
        };
    };
    if(role.includes('observer')){
        await Rooms.updateOne(
            { roomNum },
            { $set: { observerCnt }}
        );
        if(blackTeamObserver){
            await Rooms.updateOne(
                { roomNum },
                { $addToSet: { blackTeamObserver: id }}
            );
        } else {
            await Rooms.updateOne(
                { roomNum },
                { $addToset: { whiteTeamObserver: id }}
            );
        };
    };
};

// 플레이어로 변경할 때 DB 업데이트
module.exports.changeToPlayerUpdate = async(options = {
    id: null,
    roomNum: null,
    playerCnt: null,
    observerCnt: null,
    previousTeam: null,
    wantTeam: null
}) => {

    if(previousTeam.includes('Player')){
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

    if(!observerCnt){ observerCnt = 0 }

    if(previousTeam === 'blackObserver'){
        await Rooms.updateOne(
            { roomNum },
            { $pull: { blackTeamObserver: id }}
        );
        await changeFromObserver();
    };

    if(previousTeam === 'whiteObserver'){
        await Rooms.updateOne(
            { roomNum },
            { $pull: { whiteTeamObserver: id }}
        );
        await changeFromObserver();
    };
};

// 관전자에서 플레이어로 변경할 떄 DB 업데이트
async function changeFromObserver() {
    if (wantTeam === 'blackPlayer') {
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
        await Users.updateOne(
            { id },
            { $set: { state: 'blackPlayer' } }
        );
    } else {
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
        await Users.updateOne(
            { id },
            { $set: { state: 'whitePlayer' } }
        );
    }
}

