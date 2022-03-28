const Rooms = require('../../models/rooms')

//방 내부 유저 최신정보 가져오기_210316
module.exports.findUserInfos= async (roomNum) => {
    const userInfos = await Rooms.aggregate([
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
          blackPlayerInfo: { id: 1, score: 1, point: 1, state: 1, profileImage: 1 },
          whitePlayerInfo: { id: 1, score: 1, point: 1, state: 1, profileImage: 1 },
          blackTeamObserver: 1,
          whiteTeamObserver: 1,
          roomName: 1,
          _id: 0,
        },
      },
    ]);
  return userInfos;
}