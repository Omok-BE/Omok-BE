const Users = require('../../models/users');

//게임방 결과창 나가기 Observer의 teachingCnt, state, connect변경
module.exports.outUserUpdate = async (id) => {
  const userInfo = await Users.findOne({ id }, { _id: 0, id: 1, state: 1 });

  if (userInfo.state === 'blackPlayer' || userInfo.state === 'whitePlayer') {
    await Users.updateOne(
      { id },
      { $set: { state: 'online', connect: 'endGame' } }
    );
  } else {
    await Users.updateOne(
      { id },
      { $set: { state: 'online', connect: 'endGame' } }
    );
  }
};
