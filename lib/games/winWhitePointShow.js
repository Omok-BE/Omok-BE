const { gameUserInfo } = require('../games/gameUserInfo');

//게임승리 white플레이어 승 계산
module.exports.winPlayerPointShow = async( gameNum ) => {
    const gameInfo = await gameUserInfo(gameNum)[0]
    const blackP = gameInfo.blackTeamPlayer[0]
    const blackO = gameInfo.blackTeamObserver
    const whiteP = gameInfo.whiteTeamPlayer[0]
    const whiteO = gameInfo.whiteTeamObserver

    let winPlayerArray = [];
    let losePlayerArray = [];
    let winObserverArray2 = [];
    let loseObserverArray2 = [];

    //화이트플레이어 승 계산
    const getWPoint = 200  //우승포인트 
    const existWPoint = whiteP.point - getWPoint  //게임전 포인트(게임후 변경된 포인트 가져옴)
    const winInfo = {id:whiteP.id, usePoint:0, getPoint:getWPoint, existPoint:existWPoint,
                                        totalPoint:whiteP.point, state:whiteP.state };
    winPlayerArray.push(winInfo);    

    //블랙플레이어 패 계산
    const getBPoint = 100  //패배 패널티포인트
    const existBPoint = blackP.point + getBPoint //게임전 포인트(게임후 변경된 포인트 가져옴)
    const loseInfo = {id:blackP.id, usePoint:0, getPoint: - getBPoint, existPoint:existBPoint,
                                      totalPoint:blackP.point, state:blackP.state };
    losePlayerArray.push(loseInfo);
    
    //화이트옵저버 승 계산
    for(let i=0; i<whiteO.length; i++){
      //이긴팀 포인트 업데이트
      const usePoint = whiteO[i].teachingCnt  * 10;  //쓴포인트
      const chatPoint = usePoint * 1  //채팅포인트
      const addPoint = 20;  //추가포인트
      let getPoint = usePoint + chatPoint + addPoint;  //얻은포인트
        if (getPoint >= 300){
          getPoint = 300
        }

      const existPoint = whiteO[i].point - getPoint  //기존포인트
      const totalPoint = whiteO[i].point;  //총포인트
      const winObserver = { id:whiteO[i].id, usePoint, getPoint,
                              existPoint, totalPoint, state:whiteO[i].state };
      winObserverArray2.push(winObserver);
    }  

    //블랙옵저버 패 계산
    for(let i=0; i<blackO.length; i++){
      //진팀 포인트 업데이트
      const usePoint = blackO[i].teachingCnt * 10;  //쓴포인트
      const chatPoint = usePoint * 1  //채팅포인트
      const penalty = 20;  //진팀 패널티
      let getPoint = usePoint + chatPoint + penalty;  //얻은포인트
      if (getPoint >= 300){
        getPoint = 300
      }

      const existPoint = blackO[i].point + getPoint  //기존포인트
      const totalPoint = blackO[i].point;  //총포인트
      const loseObserver = { id:blackO[i].id, usePoint, getPoint: - getPoint, 
                                existPoint, totalPoint, state:blackO[i].state };
      loseObserverArray2.push(loseObserver);
    }           

    const win = [...winPlayerArray, ...winObserverArray2];
    const lose = [...losePlayerArray, ...loseObserverArray2];
    console.log("winBlackPointShow,show,win배열 총정보:",win);
    console.log("winBlackPointShow,show,lose배열 총정보:",lose);

    return [ win, lose ];
}
