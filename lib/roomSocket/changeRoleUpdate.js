const Users = require('../../models/users');
const Rooms = require('../../models/rooms');

// 플레이어에서 플레이어로 변경시 정보 업데이트
module.exports.toPlayerFromPlayer = async ({ id, roomNum, wantTeam }) => {
  if (wantTeam === 'blackPlayer') {
    await Users.updateOne({ id }, { $set: { state: 'blackPlayer' } });
    await Rooms.updateOne(
      { roomNum },
      { $set: { blackTeamPlayer: id, whiteTeamPlayer: null } }
    );
  } else {
    await Users.updateOne({ id }, { $set: { state: 'whitePlayer' } });
    await Rooms.updateOne(
      { roomNum },
      { $set: { blackTeamPlayer: null, whiteTeamPlayer: id } }
    );
  }
};

// 관전자에서 플레이어로 변경시 정보 업데이트
module.exports.toPlayerFromObserver = async ({
  id,
  roomNum,
  playerCnt,
  observerCnt,
  previousTeam,
  wantTeam,
}) => {
  if (!observerCnt) observerCnt = 0;

  if (previousTeam === 'blackObserver') {
    await Rooms.updateOne({ roomNum }, { $pull: { blackTeamObserver: id } });
    await toPlayerUpdate({
      id,
      roomNum,
      playerCnt,
      observerCnt,
      wantTeam,
    });
  }

  if (previousTeam === 'whiteObserver') {
    await Rooms.updateOne({ roomNum }, { $pull: { whiteTeamObserver: id } });
    await toPlayerUpdate({
      id,
      roomNum,
      playerCnt,
      observerCnt,
      wantTeam,
    });
  }
};

// 관전자에서 플레이어로 변경시 업데이트
async function toPlayerUpdate({
  id,
  roomNum,
  playerCnt,
  observerCnt,
  wantTeam,
}) {
  if (wantTeam === 'blackPlayer') {
    await Users.updateOne({ id }, { $set: { state: 'blackPlayer' } });
    await Rooms.updateOne(
      { roomNum },
      {
        $set: {
          blackTeamPlayer: id,
          playerCnt,
          observerCnt,
        },
      }
    );
  } else {
    await Users.updateOne({ id }, { $set: { state: 'whitePlayer' } });
    await Rooms.updateOne(
      { roomNum },
      {
        $set: {
          whiteTeamPlayer: id,
          playerCnt,
          observerCnt,
        },
      }
    );
  }
}

// 플레이어에서 관전자로 변경시 정보 업데이트
module.exports.toObserverFromPlayer = async ({
  id,
  roomNum,
  playerCnt,
  observerCnt,
  previousTeam,
  wantTeam,
}) => {
  if (!playerCnt) playerCnt = 0;

  if (previousTeam === 'blackPlayer') {
    await Rooms.updateOne(
      { roomNum },
      { $set: { blackTeamPlayer: null, playerCnt, observerCnt } }
    );
    if (wantTeam === 'blackObserver') {
      await Users.updateOne({ id }, { $set: { state: 'blackObserver' } });
      await Rooms.updateOne(
        { roomNum },
        { $addToSet: { blackTeamObserver: id } }
      );
    } else {
      await Users.updateOne({ id }, { $set: { state: 'whiteObserver' } });
      await Rooms.updateOne(
        { roomNum },
        { $addToSet: { whiteTeamObserver: id } }
      );
    }
  }

  if (previousTeam === 'whitePlayer') {
    await Rooms.updateOne(
      { roomNum },
      { $set: { whiteTeamPlayer: null, playerCnt, observerCnt } }
    );
    if (wantTeam === 'blackObserver') {
      await Users.updateOne({ id }, { $set: { state: 'blackObserver' } });
      await Rooms.updateOne(
        { roomNum },
        { $addToSet: { blackTeamObserver: id } }
      );
    } else {
      await Users.updateOne({ id }, { $set: { state: 'whiteObserver' } });
      await Rooms.updateOne(
        { roomNum },
        { $addToSet: { whiteTeamObserver: id } }
      );
    }
  }
};

// 관전자에서 관전자로 변경시 정보 업데이트
module.exports.toObserverFromObserver = async ({
  id,
  roomNum,
  previousTeam,
  wantTeam,
}) => {
  if (previousTeam.includes('Observer')) {
    if (wantTeam === 'blackObserver') {
      await Rooms.updateOne({ roomNum }, { $pull: { whiteTeamObserver: id } });
      await Rooms.updateOne(
        { roomNum },
        { $addToSet: { blackTeamObserver: id } }
      );
      await Users.updateOne({ id }, { $set: { state: 'blackObserver' } });
    } else {
      await Rooms.updateOne({ roomNum }, { $pull: { blackTeamObserver: id } });
      await Rooms.updateOne(
        { roomNum },
        { $addToSet: { whiteTeamObserver: id } }
      );
      await Users.updateOne({ id }, { $set: { state: 'whiteObserver' } });
    }
  }
};
