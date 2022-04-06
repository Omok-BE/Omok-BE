const { gameUserInfo } = require('../games/gameUserInfo');

//게임승리 white플레이어 승 계산
module.exports.winWhitePointShow = async( gameNum ) => {

  const gameInfo = await gameUserInfo(gameNum);
    const blackP = gameInfo[0].blackTeamPlayer[0];
    const blackO = gameInfo[0].blackTeamObserver;
    const whiteP = gameInfo[0].whiteTeamPlayer[0];
    const whiteO = gameInfo[0].whiteTeamObserver;

    let winPlayerArray = [];
    let losePlayerArray = [];
    let winObserverArray = [];
    let loseObserverArray = [];

    //화이트플레이어 승 계산
    const getWPoint = 200; 
    const existWPoint = whiteP.point - getWPoint;
    const winInfo = {id:whiteP.id, usePoint:0, getPoint:getWPoint, existPoint:existWPoint,
                                        totalPoint:whiteP.point, state:whiteP.state };
    winPlayerArray.push(winInfo);    

    //블랙플레이어 패 계산
    const getBPoint = 100
    const existBPoint = blackP.point + getBPoint;
    const loseInfo = {id:blackP.id, usePoint:0, getPoint: - getBPoint, existPoint:existBPoint,
                                      totalPoint:blackP.point, state:blackP.state };
    losePlayerArray.push(loseInfo);
    
    //화이트옵저버 승 계산
    for(let i=0; i<whiteO.length; i++){
      if(whiteO[i].state !== 'online'){
        const usePoint = whiteO[i].teachingCnt  * 10;
        const chatPoint = usePoint * 1
        const addPoint = 20;
        let getPoint = usePoint + chatPoint + addPoint;
          if (getPoint >= 300){
            getPoint = 300
          }
        const existPoint = whiteO[i].point - getPoint
        const totalPoint = whiteO[i].point;
        const winObserver = { id:whiteO[i].id, usePoint, getPoint,
                                existPoint, totalPoint, state:whiteO[i].state };
        winObserverArray.push(winObserver);
      }  
    };
    //블랙옵저버 패 계산
    for(let i=0; i<blackO.length; i++){
      if(whiteO[i].state !== 'online'){
        const usePoint = blackO[i].teachingCnt * 10;
        const chatPoint = usePoint * 1;
        const penalty = 20;
        let losePoint = usePoint + chatPoint + penalty;
        if (losePoint >= 300){
          losePoint = 300
        }
        const existPoint = blackO[i].point + losePoint;
        const totalPoint = blackO[i].point;
        const loseObserver = { id:blackO[i].id, usePoint, getPoint: - losePoint, 
                                  existPoint, totalPoint, state:blackO[i].state };
        loseObserverArray.push(loseObserver);
      }           
    };
    const win = [...winPlayerArray, ...winObserverArray];
    const lose = [...losePlayerArray, ...loseObserverArray];

    return [ win, lose ];
};