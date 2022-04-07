const Users = require('../../models/users');
const Rooms = require('../../models/rooms');
const Games = require('../../models/games');

// 퇴장시 방 인원 정보 최신화
module.exports.participantUpdate = async ({ id, roomNum }) => {
  await Users.updateOne({ id }, { $set: { connect: 'endRoom' } });

  const gameInfo = await Games.findOne({ gameNum: roomNum });

  if (!gameInfo) {
    const userInfo = await Users.findOne({ id }, { _id: 0, state: 1 });
    const roomInfo = await Rooms.findOne(
      { roomNum },
      {
        _id: 0,
        blackTeamPlayer: 1,
        whiteTeamPlayer: 1,
        blackTeamObserver: 1,
        whiteTeamObserver: 1,
      }
    );

    if (userInfo.state.includes('Player')) {
      if (userInfo.state === 'blackPlayer') {
        await Rooms.updateOne({ roomNum }, { $set: { blackTeamPlayer: null } });
      } else {
        await Rooms.updateOne({ roomNum }, { $set: { whiteTeamPlayer: null } });
      }
    }

    if (userInfo.state.includes('Observer')) {
      if (userInfo.state === 'blackObserver') {
        await Rooms.updateOne(
          { roomNum },
          { $pull: { blackTeamObserver: id } }
        );
      } else {
        await Rooms.updateOne(
          { roomNum },
          { $pull: { whiteTeamObserver: id } }
        );
      }
    }
  }
};
