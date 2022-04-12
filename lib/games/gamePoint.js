const Users = require('../../models/users');

//Observer 훈수채팅 수
module.exports.calculatePoint = async ({ id, isWin }) => {
  const user = await Users.findOne(
    { id },
    { _id: 0, point: 1, teachingCnt: 1 }
  );
  const userTeachingCnt = user.teachingCnt;

  const useTeachingPoint = userTeachingCnt * process.env.TeachingPoint;
  const chatPoint = useTeachingPoint * process.env.ChatPoint;
  const addPoint = process.env.AddPoint;
  let getTeachingPoint = useTeachingPoint + chatPoint + addPoint;

  if (getTeachingPoint >= process.env.MaxPoint) {
    getTeachingPoint = process.env.MaxPoint;
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
