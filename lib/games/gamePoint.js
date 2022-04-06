const Users = require('../../controller/users');

//Observer
//훈수채팅 수
module.exports.calculatePoint = async({
    id,
    isWin
}) => {
    const observerTeachingCnt = await Users.findOne({ id }, { _id: 0, teachingCnt: 1 });
    const thisTeachingCnt = observerTeachingCnt.teachingCnt;
    //이긴팀 point
    const useTeachingPoint = thisTeachingCnt * 10;  //쓴 포인트
    const chatPoint = useTeachingPoint * 1;  //훈수채팅포인트
    const addPoint = 20;  //승리팀:추가 포인트, 진팀: 패널티

    let getTeachingPoint = useTeachingPoint + chatPoint + addPoint;  //얻은 포인트
    // 포인트제한 승,패 최대포인트 300
    if(getTeachingPoint >= 300){
        getTeachingPoint = 300
    }

    if( isWin ){
        const winTotalPoint = point + getTeachingPoint;  //이긴 옵저버 게임후 총 포인트(기존 + 얻은)
        console.log("gamePoint.js,winTotalPoint:", winTotalPoint);
        await Users.updateOne({ id }, { $set: { point: winTotalPoint } });

    }else if ( !isWin ){
        const loseTotalPoint = point - getTeachingPoint;  //이긴 옵저버 게임후 총 포인트(기존 - 얻은)
        console.log("gamePoint.js,loseTotalPoint:",loseTotalPoint);
        await Users.updateOne({ id }, { $set: { point: loseTotalPoint } });
    }
};
