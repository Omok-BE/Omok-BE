const Users = require('../../models/users');
const Rooms = require('../../models/rooms');

// 플레이어로 방 입장시 정보 업데이트
module.exports.enterRoomByPlayer = async ({
  id,
  roomNum,
  playerCnt,
  state,
}) => {
  if (state === 'blackPlayer') {
    await Users.updateOne({ id }, { $set: { connect: 'inRoom' } });
    await Rooms.updateOne(
      { roomNum },
      { $set: { playerCnt, blackTeamPlayer: id } }
    );
  } else {
    await Users.updateOne({ id }, { $set: { connect: 'inRoom' } });
    await Rooms.updateOne(
      { roomNum },
      { $set: { playerCnt, whiteTeamPlayer: id } }
    );
  }
};

// 관전자로 방 입장시 정보 업데이트
module.exports.enterRoomByObserver = async ({
  id,
  roomNum,
  observerCnt,
  state,
}) => {
  await Rooms.updateOne({ roomNum }, { $set: { observerCnt: observerCnt } });

  if (state === 'blackObserver') {
    await Users.updateOne({ id }, { $set: { connect: 'inRoom' } });
    await Rooms.updateOne(
      { roomNum },
      { $addToSet: { blackTeamObserver: id } }
    );
  } else {
    await Users.updateOne({ id }, { $set: { connect: 'inRoom' } });
    await Rooms.updateOne(
      { roomNum },
      { $addToSet: { whiteTeamObserver: id } }
    );
  }
};
