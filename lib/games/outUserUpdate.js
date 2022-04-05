const Users = require('../../models/users');

//게임방 결과창 나가기 Observer의 teachingCnt, state, connect변경
module.exports.outUserUpdate = async(id) => {
  console.log("outUserUpdate함수들어옴")
  const delTeachingCnt = await Users.findOne({ id }, { _id: 0, id: 1, state: 1, teachingCnt: 1 });
  if (delTeachingCnt.state === 'blackObserver' || delTeachingCnt.state === 'whiteObserver'){
    console.log("outUserUpdate함수,유저정보계산전")
    await Users.updateOne({ id }, { $set: { teachingCnt: 0, state: 'online', connect: 'endGame' } });
  }
  console.log("outUserUpdate함수,유저정보계산  후후후")
};