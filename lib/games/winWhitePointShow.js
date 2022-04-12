const { gameUserInfo } = require('../games/gameUserInfo');

//게임승리 white플레이어 승 계산
module.exports.winWhitePointShow = async (gameNum) => {
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
  const getWPoint = process.env.WinPoint;
  const existWPoint = whiteP.point - getWPoint;
  const winInfo = {
    id: whiteP.id,
    usePoint: 0,
    getPoint: getWPoint,
    existPoint: existWPoint,
    totalPoint: whiteP.point,
    state: whiteP.state,
  };
  winPlayerArray.push(winInfo);

  //블랙플레이어 패 계산
  const getBPoint = process.env.LosePoint;
  const existBPoint = blackP.point + getBPoint;
  const loseInfo = {
    id: blackP.id,
    usePoint: 0,
    getPoint: -getBPoint,
    existPoint: existBPoint,
    totalPoint: blackP.point,
    state: blackP.state,
  };
  losePlayerArray.push(loseInfo);

  //화이트옵저버 승 계산
  for (let i = 0; i < whiteO.length; i++) {
    if (whiteO[i].connect !== 'online') {
      const usePoint = whiteO[i].teachingCnt * process.env.TeachingPoint;
      const chatPoint = usePoint * process.env.ChatPoint;
      const addPoint = process.env.AddPoint;
      let getPoint = usePoint + chatPoint + addPoint;
      if (getPoint >= process.env.MaxPoint) {
        getPoint = process.env.MaxPoint;
      }
      const existPoint = whiteO[i].point - getPoint;
      const totalPoint = whiteO[i].point;
      const winObserver = {
        id: whiteO[i].id,
        usePoint,
        getPoint,
        existPoint,
        totalPoint,
        state: whiteO[i].state,
      };
      winObserverArray.push(winObserver);
    }
  }
  //블랙옵저버 패 계산
  for (let i = 0; i < blackO.length; i++) {
    if (whiteO[i].connect !== 'online') {
      const usePoint = blackO[i].teachingCnt * process.env.TeachingPoint;
      const chatPoint = usePoint * process.env.ChatPoint;
      const penalty = process.env.AddPoint;
      let losePoint = usePoint + chatPoint + penalty;
      if (losePoint >= process.env.MaxPoint) {
        losePoint = process.env.MaxPoint;
      }
      const existPoint = blackO[i].point + losePoint;
      const totalPoint = blackO[i].point;
      const loseObserver = {
        id: blackO[i].id,
        usePoint,
        getPoint: -losePoint,
        existPoint,
        totalPoint,
        state: blackO[i].state,
      };
      loseObserverArray.push(loseObserver);
    }
  }
  const win = [...winPlayerArray, ...winObserverArray];
  const lose = [...losePlayerArray, ...loseObserverArray];

  return [win, lose];
};
