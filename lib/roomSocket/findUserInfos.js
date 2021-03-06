const Rooms = require('../../models/rooms');

//대기실 내부 유저 최신정보 가져오기
module.exports.findUserInfos = async (roomNum) => {
  return await Rooms.aggregate([
    {
      $match: { roomNum: Number(roomNum) },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'blackTeamPlayer',
        foreignField: 'id',
        as: 'blackPlayerInfo',
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'whiteTeamPlayer',
        foreignField: 'id',
        as: 'whitePlayerInfo',
      },
    },
    {
      $project: {
        blackPlayerInfo: {
          id: 1,
          score: 1,
          point: 1,
          state: 1,
          profileImage: 1,
        },
        whitePlayerInfo: {
          id: 1,
          score: 1,
          point: 1,
          state: 1,
          profileImage: 1,
        },
        blackTeamObserver: 1,
        whiteTeamObserver: 1,
        roomName: 1,
        _id: 0,
      },
    },
  ]);
};
