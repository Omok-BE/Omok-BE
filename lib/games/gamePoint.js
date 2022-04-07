const Users = require('../../models/users');

//Observer
//훈수채팅 수
module.exports.calculatePoint = async ({ id, isWin }) => {
  const user = await Users.findOne(
    { id },
    { _id: 0, point: 1, teachingCnt: 1 }
  );
  const userTeachingCnt = user.teachingCnt;

  // 관전자 포인트 계산
  const useTeachingPoint = userTeachingCnt * 10;
  const chatPoint = useTeachingPoint * 1;
  const addPoint = 20;
  let getTeachingPoint = useTeachingPoint + chatPoint + addPoint;

  // 포인트제한, 최대포인트 300
  if (getTeachingPoint >= 300) {
    getTeachingPoint = 300;
  }

  // 승리시 포인트 획득
  if (isWin) {
    const winTotalPoint = user.point + getTeachingPoint;
    await Users.updateOne({ id }, { $set: { point: winTotalPoint } });
  } else {
    const loseTotalPoint = user.point - getTeachingPoint;
    await Users.updateOne({ id }, { $set: { point: loseTotalPoint } });
  }
};
