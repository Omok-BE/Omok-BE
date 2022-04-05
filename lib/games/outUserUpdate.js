const Users = require('../../models/users');

//게임방 결과창 나가기 Observer의 teachingCnt, state, connect변경
module.exports.outUserUpdate = async(id) => {
    const delTeachingCnt = await Users.findOne({ id }, { _id: 0, id: 1, state: 1, teachingCnt: 1 });
    if (delTeachingCnt.state === 'blackObserver' || delTeachingCnt.state === 'whiteObserver')
      await Users.updateOne({ id }, { $set: { teachingCnt: 0, state: 'online', connect: 'endGame' } });
};