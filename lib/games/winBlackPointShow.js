const { gameUserInfo } = require('../games/gameUserInfo');

//게임승리 black플레이어 승 계산
module.exports.winBlackPointShow = async( gameNum ) => {

  const gameInfo = await gameUserInfo(gameNum);
  const blackP = gameInfo[0].blackTeamPlayer[0];
  const blackO = gameInfo[0].blackTeamObserver;
  const whiteP = gameInfo[0].whiteTeamPlayer[0];
  const whiteO = gameInfo[0].whiteTeamObserver;
  
    let winPlayerArray = [];
    let losePlayerArray = [];
    let winObserverArray = [];
    let loseObserverArray = [];

    //블랙플레이어 승 계산
    const getBPoint = 200;
    const existBPoint = blackP.point - getBPoint;
    const winInfo = {id:blackP.id, usePoint:0, getPoint:getBPoint, existPoint:existBPoint,
                                        totalPoint:blackP.point, state:blackP.state };
    winPlayerArray.push(winInfo);

    //화이트플레이어 패 계산
    const getWPoint = 100
    const existWPoint = whiteP.point + getWPoint
    const loseInfo = {id:whiteP.id, usePoint:0, getPoint: - getWPoint, existPoint:existWPoint,
                                      totalPoint:whiteP.point, state:whiteP.state };
    losePlayerArray.push(loseInfo);

    //블랙옵저버 승 계산
    for(let i=0; i<blackO.length; i++){
        if(blackO[i].state !== 'online'){
          const usePoint = blackO[i].teachingCnt * 10;
          const chatPoint = usePoint * 1;
          const addPoint = 20;
          let getPoint = usePoint + chatPoint + addPoint;
          if (getPoint >= 300){
            getPoint = 300
          }
          const existPoint = blackO[i].point - getPoint;
          const totalPoint = blackO[i].point;
          const winObserver = { id:blackO[i].id, usePoint, getPoint, 
                                existPoint, totalPoint, state:blackO[i].state };
          winObserverArray.push(winObserver);
        }
    };

    //화이트옵저버 패 계산
    for(let i=0; i<whiteO.length; i++){
      if(whiteO[i].state !== 'online'){
        const usePoint = whiteO[i].teachingCnt * 10;
        const chatPoint = usePoint * 1;
        const penalty = 20;
        let losePoint = usePoint + chatPoint + penalty;
        if (losePoint >= 300){
          losePoint = 300
        }
        const existPoint = whiteO[i].point + losePoint;
        const totalPoint = whiteO[i].point;
        const loseObserver = { id:whiteO[i].id, usePoint, getPoint: - losePoint, 
                                existPoint, totalPoint, state:whiteO[i].state };
        loseObserverArray.push(loseObserver);
    };
  };
    const win = [...winPlayerArray, ...winObserverArray];
    const lose = [...losePlayerArray, ...loseObserverArray];
    
    return [ win, lose ];
};