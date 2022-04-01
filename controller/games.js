const Games = require('../models/games');
const Rooms = require('../models/rooms');
const Users = require('../models/users');
const Boards = require('../models/boards');

//대기실 => 게임방 입장시 게임방 생성
const gameCreate = async (req, res) => {
  try {
    const {
      roomNum,
      blackTeamPlayer,
      blackTeamObserver,
      whiteTeamPlayer,
      whiteTeamObserver,
    } = req.body;
    const state = 'ingame';
    await Rooms.updateOne({ roomNum }, { $set: { state } });
    const room = await Rooms.findOne({ roomNum });
    await Games.create({
      gameNum: roomNum,
      gameName: room.roomName,
      blackTeamPlayer,
      blackTeamObserver,
      whiteTeamPlayer,
      whiteTeamObserver,
      timer: room.timer,
    });
    const board = new Array(Math.pow(19, 2)).fill(-1);
    await Boards.create({
      gameNum: roomNum,
      board
    });
    res.status(201).json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(400).json({ ok: false });
  }
};

//게임방 입장해서 정보가져오기
const gameStart = async (req, res) => {
  try {
    const { gameNum } = req.params;
    console.log("45,gameStart,req.params:", req.params)
    //게임방내 유저 state별 정보
    let gameInfo = await gameUserInfo(gameNum);
    const gameName = await Games.findOne({ gameNum },{ _id:0, gameNum:1, gameName:1 });  
    const findBoardColor = await Rooms.findOne({ roomNum:gameNum }, { _id:0, boardColor:1 }); 
    gameInfo.push(findBoardColor)
    res.status(200).json({
      gameInfo,
      gameName,
      ok: true,
      message: '게임방 입장해서 정보가져오기 성공!',
    });
  } catch (err) {
    console.log(`API_게임방 에러: ${err}`);
    res.status(400).json({
      ok: false,
      errorMessage: '게임방 입장해서 정보를 가져오지 못했어요',
    });
  }
};

//[결과창]게임이 끝나면 바로 보내는 내용
const gameFinish = async (req, res) => {
  try {
    const { userInfo, gameNum, result } = req.body;
    console.log("70,gameFinish,req.body:", req.body)
    const id = userInfo.id;
    const point = userInfo.point;
    const state = userInfo.state;

    //승자id
    const resultId = result.win;
    //Player
    if (state === 'blackPlayer' || state === 'whitePlayer') {
      if (resultId === id) {
        //승Player
        await Users.updateOne({ id:resultId }, { $inc: { 'score.0.win': 1 } });  //승 +1
        await Users.updateOne({ id:resultId }, { $set: { point: point + 200 } });  //포인트 +200
        await Users.updateOne({ id:resultId }, { $set: { teachingCnt: 0 }});  // 플레이어는 훈수쳇 계산 안됨.
      } else if(resultId !== id) {
        //패Player
        await Users.updateOne({ id:id }, { $inc: { 'score.1.lose': 1 } });  //패 +1
        await Users.updateOne({ id:id }, { $set: { point: point - 100 } });  //포인트 -100
        await Users.updateOne({ id:id }, { $set: { teachingCnt: 0 }}); 
      }
    }
    
    //Observer
    //훈수채팅 수 
    const observerTeachingCnt = await Users.findOne({ id:id }, { _id: false, teachingCnt: true });
    const thisTeachingCnt = observerTeachingCnt.teachingCnt;  
    //이긴팀 point
    const useTeachingPoint = thisTeachingCnt * 10;  //쓴 포인트
    const chatPoint = useTeachingPoint * 1  //훈수채팅포인트
    const addPoint = 20  //승리팀 추가 포인트
    let winGetTeachingPoint = useTeachingPoint + chatPoint + addPoint;  //얻은 포인트
    // 포인트제한두기- 최대포인트 300
    if(winGetTeachingPoint >= 300){
      winGetTeachingPoint = 300
    }
    const winTotalPoint = point + winGetTeachingPoint;  //게임후 총 포인트(기존 + 얻은)
    console.log("106:", winTotalPoint)
    //진팀 point
    const penalty = 20  //패널티
    let loseGetTeachingPoint = useTeachingPoint + chatPoint + penalty;
    // 포인트제한두기- 최소포인트 300
    if(loseGetTeachingPoint >= 300){
      loseGetTeachingPoint = 300
    } 
    const loseTotalPoint = point - loseGetTeachingPoint;  //게임후 총 포인트(기존 - 얻은)
    console.log("115",loseTotalPoint)
    //whitePlayer 이김
    if (result.state === 'whitePlayer') {
      //whiteObserver 이김
      if (state === 'whiteObserver') {
          await Users.updateOne({ id }, { $set: { point: winTotalPoint } });
      //blackObserver 짐
      } else if (state === 'blackObserver') {
          await Users.updateOne({ id }, { $set: { point: loseTotalPoint } });
      }
    }
    
    //blackPlayer 이김
    if (result.state === 'blackPlayer') {
      //blackObserver 이김
      if (state === 'blackObserver') {
          await Users.updateOne({ id }, { $set: { point: winTotalPoint } });
      //whiteObserver 짐
      } else if (state === 'whiteObserver') {
          await Users.updateOne({ id }, { $set: { point: loseTotalPoint } });
      }
    }
    const myId = await Users.findOne({id})
    console.log("138,myId:",myId)

    res.status(200).json({
      ok: true,
      message: '결과창gameFinish 성공!',
    });
  } catch (err) {
    console.log(`API_결과창gameFinish 에러: ${err}`);
    res.status(400).json({
      ok: false,
      errorMessage: '결과창gameFinish 실패',
    });
  }
};


//[결과창]페이지로 들어가자마자
const gameFinishShow = async (req, res) => {
  try { 
    const { id, gameNum, result } = req.body;
    console.log('158,결과창show,req.body:', req.body);

    //게임방내 유저 state별 정보
    const gameInfo = await gameUserInfo(gameNum);
    // console.log(",show,게임디비서찾은,gameInfo[0]:",gameInfo[0]); 

    const blackP = gameInfo[0].blackTeamPlayer[0]
    const blackO = gameInfo[0].blackTeamObserver
    const whiteP = gameInfo[0].whiteTeamPlayer[0]
    const whiteO = gameInfo[0].whiteTeamObserver

    //게임승리 player- black
    let winPlayerArray = [];
    let losePlayerArray = [];
    let winObserverArray1 = [];
    let loseObserverArray1 = [];
    if (result.win === blackP.id) {
      //블랙플레이어 승 계산
      const getBPoint = 200  //우승포인트 
      const existBPoint = blackP.point - getBPoint  //게임전 포인트(게임후 변경된 포인트 가져옴)
      const totalBPoint = existBPoint + getBPoint  // 게임후 총 포인트
      const winInfo = {id:blackP.id, usePoint:0, getPoint:getBPoint, existPoint:existBPoint,
                                          totalPoint:totalBPoint, state:blackP.state };
      winPlayerArray.push(winInfo);    

      //화이트플레이어 패 계산
      const getWPoint = 100  //패배 패널티포인트
      const existWPoint = whiteP.point + getWPoint //게임전 포인트(게임후 변경된 포인트 가져옴)
      const totalWPoint = existWPoint - getWPoint // 게임후 총 포인트
      const loseInfo = {id:whiteP.id, usePoint:0, getPoint: - getWPoint, existPoint:existWPoint,
                                        totalPoint:totalWPoint, state:whiteP.state };
      losePlayerArray.push(loseInfo);
      
      //블랙옵저버 승 계산
      for(let i=0; i<blackO.length; i++){
        //이긴팀 포인트 업데이트
        const usePoint = blackO[i].teachingCnt * 10;  //쓴포인트 
        const chatPoint = usePoint * 1  //채팅포인트
        const addPoint = 20; //추가포인트
        let getPoint = usePoint + chatPoint + addPoint; //얻은포인트
        if (getPoint >= 300){
          getPoint = 300
        }

        const existPoint = blackO[i].point - getPoint //기존포인트
        const totalPoint = blackO[i].point;  //총포인트
        const winObserver = { id:blackO[i].id, usePoint:usePoint, getPoint:getPoint, 
                              existPoint:existPoint, totalPoint:totalPoint, state:blackO[i].state };
        winObserverArray1.push(winObserver);
    }
      
      //화이트옵저버 패 계산
      for(let i=0; i<whiteO.length; i++){
        //진팀 포인트 업데이트
        const usePoint = whiteO[i].teachingCnt * 10;  //쓴포인트
        const chatPoint = usePoint * 1  //채팅포인트
        const penalty = 20; //진팀 패널티
        let getPoint = usePoint + chatPoint + penalty; //얻은포인트
        if (getPoint >= 300){
          getPoint = 300
        }

        const existPoint = whiteO[i].point + getPoint //기존포인트
        const totalPoint = whiteO[i].point;  //총포인트
        const loseObserver = { id:whiteO[i].id, usePoint:usePoint, getPoint: - getPoint, 
                                existPoint:existPoint, totalPoint:totalPoint, state:whiteO[i].state };
        loseObserverArray1.push(loseObserver);
      } 
    } 

    //게임승리 player- white 
    let winObserverArray2 = [];
    let loseObserverArray2 = [];
    if (result.win === whiteP.id) {
      //화이트플레이어 승 계산
      const getWPoint = 200  //우승포인트 
      const existWPoint = whiteP.point - getWPoint //게임전 포인트(게임후 변경된 포인트 가져옴)
      const totalWPoint = existWPoint + getWPoint  // 게임후 총 포인트
      const winInfo = {id:whiteP.id, usePoint:0, getPoint:getWPoint, existPoint:existWPoint,
                                          totalPoint:totalWPoint, state:whiteP.state };
      winPlayerArray.push(winInfo);    

      //블랙플레이어 패 계산
      const getBPoint = 100  //패배 패널티포인트
      const existBPoint = blackP.point + getBPoint //게임전 포인트
      const totalBPoint = existBPoint - getBPoint // 게임후 총 포인트
      const loseInfo = {id:blackP.id, usePoint:0, getPoint: - getBPoint, existPoint:existBPoint,
                                        totalPoint:totalBPoint, state:blackP.state };
      losePlayerArray.push(loseInfo);
      
      //화이트옵저버 승 계산
      for(let i=0; i<whiteO.length; i++){
        //이긴팀 포인트 업데이트
        const usePoint = whiteO[i].teachingCnt  * 10;  //쓴포인트
        const chatPoint = usePoint * 1  //채팅포인트
        const addPoint = 20; //추가포인트
        let getPoint = usePoint + chatPoint + addPoint; //얻은포인트
          if (getPoint >= 300){
            getPoint = 300
          }

        const existPoint = whiteO[i].point - getPoint //기존포인트
        const totalPoint = whiteO[i].point;  //총포인트
        const winObserver = { id:whiteO[i].id, usePoint:usePoint, getPoint:getPoint,
                                existPoint:existPoint, totalPoint:totalPoint, state:whiteO[i].state };
        winObserverArray2.push(winObserver);
      }  

      //블랙옵저버 패 계산
      for(let i=0; i<blackO.length; i++){
        //진팀 포인트 업데이트
        const usePoint = blackO[i].teachingCnt * 10;  //쓴포인트
        const chatPoint = usePoint * 1  //채팅포인트
        const penalty = 20; //진팀 패널티
        let getPoint = usePoint + chatPoint + penalty;  //얻은포인트
        if (getPoint >= 300){
          getPoint = 300
        }

        const existPoint = blackO[i].point + getPoint //기존포인트
        const totalPoint = blackO[i].point;  //총포인트
        const loseObserver = { id:blackO[i].id, usePoint:usePoint, getPoint: - getPoint, 
                                  existPoint:existPoint, totalPoint:totalPoint, state:blackO[i].state };
        loseObserverArray2.push(loseObserver);
      } 
    }  

    const win = [...winPlayerArray, ...winObserverArray1, ...winObserverArray2];
    const lose = [...losePlayerArray, ...loseObserverArray1, ...loseObserverArray2];
    console.log("287,show,win배열 총정보:",win);
    console.log("288,show,lose배열 총정보:",lose);

    //게임방 결과창 나가기 Observer의 teachingCnt, state, connect변경
    const delTeachingCnt = await Users.findOne({ id },{ _id:false, id:true, state:true, teachingCnt:true });
    console.log("292,티칭카운트:", delTeachingCnt)
    if(delTeachingCnt.state === 'blackObserver' || delTeachingCnt.state === 'whiteObserver')
      await Users.updateOne({ id }, { $set: { teachingCnt: 0, state: 'online', connect: 'endGame' }});

    //게임방 결과창 나가기 player의 state, connect변경
    if(id === blackP.id || id === whiteP.id)
      await Users.updateMany({ id }, { $set: { state: 'online', connect: 'endGame' }});
    res.status(200).json({
      win,
      lose,
      result,
      ok: true,
      message: 'gameFinishShow 성공!',
    });
  } catch (err) {
    console.log(`API_결과창gameFinishShow 에러: ${err}`);
    res.status(400).json({
      ok: false,
      errorMessage: 'gameFinishShow 실패',
    });
  }
};

//결과창에서 나가기버튼 클릭시 게임방 삭제
const gameDelete = async (req, res) => {
  try {
    const { gameNum } = req.params;

    const existGame = await Games.findOne({ gameNum:gameNum });
    if (existGame){
      await Rooms.deleteOne({ roomNum: Number(gameNum) });
      await Games.deleteOne({ gameNum: Number(gameNum) });
    }
    res.status(200).json({
        ok: true,
        message: '대기방, 게임방 삭제 성공!',
    });
  } catch (err) {
    console.log(`API_결과창gameFinish 에러: ${err}`);
    res.status(400).json({
      ok: false,
      errorMessage: '대기방, 게임방 삭제 실패',
    });
  }
};

//게임방내 유저 state별 정보
async function gameUserInfo(gameNum) {
  return await Games.aggregate([
   {
     $match: { gameNum: Number(gameNum) },
   },
   {
     $lookup: {
       from: 'users',
       localField: 'blackTeamPlayer',
       foreignField: 'id',
       as: 'blackTeamPlayer',
     },
   },
   {
     $lookup: {
       from: 'users',
       localField: 'blackTeamObserver',
       foreignField: 'id',
       as: 'blackTeamObserver',
     },
   },
   {
     $lookup: {
       from: 'users',
       localField: 'whiteTeamPlayer',
       foreignField: 'id',
       as: 'whiteTeamPlayer',
     },
   },
   {
     $lookup: {
       from: 'users',
       localField: 'whiteTeamObserver',
       foreignField: 'id',
       as: 'whiteTeamObserver',
     },
   },
   {
     $project: {
       _id: 0,
       blackTeamPlayer: { id: 1, score: 1, point: 1, state: 1, profileImage:1 },
       blackTeamObserver: { id: 1, score: 1, point: 1, state: 1, teachingCnt:1, profileImage:1 },
       whiteTeamPlayer: { id: 1, score: 1, point: 1, state: 1, profileImage:1 },
       whiteTeamObserver: { id: 1, score: 1, point: 1, state: 1, teachingCnt:1, profileImage:1 },
       timer: 1
     },
   },
 ]);
}


module.exports = {
  gameCreate,
  gameStart,
  gameFinish,
  gameFinishShow,
  gameDelete,
};
