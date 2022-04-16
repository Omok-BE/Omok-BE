const Users = require('../../models/users');
const Rooms = require('../../models/rooms');
const Games = require('../../models/games');

// 퇴장시 방 인원 정보 최신화
module.exports.participantUpdate = async ({ id, roomNum }) => {
  await Users.updateOne({ id }, { $set: { connect: 'endRoom' } });

  const gameInfo = await Games.findOne({ gameNum: roomNum });

  if (!gameInfo) {
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

    const isBlackPlayer = Rooms.updateOne(
      { roomNum },
      { $set: { blackTeamPlayer: null } }
    );

    Rooms.aggregate([
      {
        $match: {
          roomNum,
          blackTeamPlayer: id
        }
      }
    ]).exec()
    .then((isBlackPlayer) => {
      console.log(isBlackPlayer)
    })
    .catch((err) => {
      console.log(err)
    })

    const isWhitePlayer = Rooms.updateOne(
      { roomNum },
      { $set: { whiteTeamPlayer: null }}
    );

    Rooms.aggregate([
      {
        $match: {
          roomNum,
          whiteTeamPlayer: id
        }
      }
    ]).exec()
    .then((isWhitePlayer) => {
      console.log(isWhitePlayer)
    })
    .catch((err) => {
      console.log(err)
    })
      const isBlackObserver = Rooms.updateOne(
        { roomNum },
        { $pull: { blackTeamObserver: id } }
      );
      const isWhiteObserver = Rooms.updateOne(
        { roomNum },
        { $pull: { whiteTeamObserver: id } }
      );
    await Promise.allSettled([
      isBlackPlayer,
      isWhitePlayer,
      isBlackObserver,
      isWhiteObserver,
    ]).then((results) => {
      results.forEach((result) => {
        console.log(result);
      });
    });
  }
};
