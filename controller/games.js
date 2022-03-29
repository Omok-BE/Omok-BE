const _ = require('mongoose-sequence');
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
    console.log(error);
    res.status(400).json({ ok: false });
  }
};

//게임방 입장해서 정보가져오기
const gameStart = async (req, res) => {
  try {
    console.log("~~~~~~API- gameStart 진입~~~~")
    const { gameNum } = req.params;
    console.log("46,gameStart의 gameNum:", gameNum);

    //게임방내 유저 state별 정보
    const gameInfo = await gameUserInfo(gameNum);
    console.log("~~~~~~API- gameStart 나가기나가기");
    const gameName = await Games.findOne({ gameNum },{ _id:0, gameNum:1, gameName:1 });  
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
    console.log("71,gameFinish,req.body:", req.body)
    const id = userInfo.id;
    const point = userInfo.point;
    const state = userInfo.state;

    //승자id
    const resultId = result.win;
    const winPlayer = await Users.findOne({ id:resultId },
                                            { _id:false, id:true, score:true, point:true, state:true });
    console.log("80,winPlayer", winPlayer) 
                                            
    //Player
    if (state === 'blackPlayer' || state === 'whitePlayer') {
      if (resultId === id) {
        //승Player
        await Users.updateOne({ id:resultId }, { $inc: { 'score.0.win': 1 } });  //승 +1
        await Users.updateOne({ id:resultId }, { $set: { point: point + 200 } });  //포인트 +200
        await Users.updateOne({ id:resultId }, { $set: { teachingCnt: 0 }});  // 플레이어는 훈수쳇을 해도 포인트 계산이 안됨.
        console.log(`API_우승자${resultId} score에 1승, point에 +200이 추가되었습니다.`);
      } else if(resultId !== id) {
        //패Player
        await Users.updateOne({ id:id }, { $inc: { 'score.1.lose': 1 } });  //패 +1
        await Users.updateOne({ id:id }, { $set: { point: point - 100 } });  //포인트 -100
        await Users.updateOne({ id:id }, { $set: { teachingCnt: 0 }}); 
        console.log(`API_패자 score에 1패, point에 -100이 추가되었습니다.`);
      }
    }
    //Observer
    //게임방내 유저 state별 정보
    const gameInfo = await Games.findOne({gameNum});
    const blackO = gameInfo[0].blackTeamObserver
    const whiteO = gameInfo[0].whiteTeamObserver
    let blackObserverState;
    for(let i=0; i<blackO.length; i++){
      blackObserverState = blackO[i].state 
    }
    let whiteObserverState;
    for(let i=0; i<whiteO.length; i++){
      whiteObserverState = whiteO[i].state 
    }

    //훈수채팅 수 
    const observerTeachingCnt = await Users.findOne({ id:id }, { _id: false, teachingCnt: true });
    const thisTeachingCnt = observerTeachingCnt.teachingCnt;  
    //이긴팀 point
    const useTeachingPoint = thisTeachingCnt * 10;  //쓴 포인트
    const chatPoint = useTeachingPoint * 1  //훈수채팅포인트
    const addPoint = 20  //승리팀 추가 포인트
    let winGetTeachingPoint = useTeachingPoint + chatPoint + addPoint;  //얻은 포인트
    console.log("120,gameFinish,이긴옵저버 최대포인트:",winGetTeachingPoint)
    // 포인트제한두기- 최대포인트 300
    if(winGetTeachingPoint >= 300){
      winGetTeachingPoint = 300
      console.log("124,gameFinish,이긴옵저버 최대포인트:",winGetTeachingPoint)
    }
    const winTotalPoint = point + winGetTeachingPoint;  //게임후 총 포인트(기존 + 얻은)
    console.log("127,gameFinish,이긴옵저버 winTotalPoint:",winTotalPoint)

    //진팀 point
    const penalty = 20  //패널티
    let loseGetTeachingPoint = useTeachingPoint + chatPoint + penalty;
    console.log("132,gameFinish,진옵저버 최소포인트:",loseGetTeachingPoint) //얻은 포인트
    // 포인트제한두기- 최소포인트 300
    if(loseGetTeachingPoint >= 300){
      loseGetTeachingPoint = 300
      console.log("136,gameFinish,진옵저버 최소포인트:",loseGetTeachingPoint)
    } 
    const loseTotalPoint = point - loseGetTeachingPoint;  //게임후 총 포인트(기존 - 얻은)
    console.log("139,gameFinish,진옵저버 loseTotalPoint:",loseTotalPoint)

    //whitePlayer 이김
    if (winPlayer.state === 'whitePlayer') {
      console.log("화이트옵 이긴포인트계산- whitePlayer 이김")
      if (whiteObserverState === 'whiteObserver') {
        console.log("145, 화이트옵 이긴포인트계산 whitePlayer이겼을때")
        //포인트 업데이트
        await Users.updateOne({ id: id }, { $set: { point: winTotalPoint } });
        console.log("148,화이트옵 이긴thisTeachingCnt업뎃후리셋전:", thisTeachingCnt)
        console.log("149,화이트옵 이긴thisTeachingCnt리셋000:", thisTeachingCnt)
      } else if (blackObserverState === 'blackObserver') {
        console.log("151,블랙옵 진포인트계산 whitePlayer이겼을때")
        await Users.updateOne({ id: id }, { $set: { point: loseTotalPoint } });
        console.log("153,블랙옵 진thisTeachingCnt업뎃후리셋전:", thisTeachingCnt)
        console.log("154,블랙옵 진thisTeachingCnt리셋000:", thisTeachingCnt)
      }
    }
    
    //blackPlayer 이김
    if (winPlayer.state === 'blackPlayer') {
      console.log("블랙옵 이긴포인트계산-blackPlayer 이김")
      //blackObserver 이김
      if (blackObserverState === 'blackObserver') {
        console.log("163,블랙옵 이긴포인트계산 blackPlayer이겼을때")
        //포인트 업데이트
        await Users.updateOne({ id: id }, { $set: { point: winTotalPoint } });
        console.log("166,블랙옵 이긴thisTeachingCnt업뎃후리셋전:", thisTeachingCnt)
        console.log("167,블랙옵 이긴thisTeachingCnt리셋000:", thisTeachingCnt)
      //whiteObserver 짐
      } else if (whiteObserverState === 'whiteObserver') {
        console.log("170,화이트옵 진포인트계산 blackPlayer이겼을때")
        //포인트 업데이트
        await Users.updateOne({ id: id }, { $set: { point: loseTotalPoint } });
        console.log("173,화이트옵 진thisTeachingCnt업뎃후리셋전:", thisTeachingCnt)
        console.log("1,화이트옵 진thisTeachingCnt리셋000:", thisTeachingCnt)
      }
    }
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
    console.log('202,결과창show진입:');
    console.log('203,결과창show,req.body:', req.body);

    //게임방내 유저 state별 정보
    const gameInfo = await gameUserInfo(gameNum);
    console.log("207,show,gameInfo[0]:",gameInfo[0]); 

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
      console.log("221,Show,이긴블랙 플레이어는:", result.win)
      //블랙플레이어 승 계산
      const getBPoint = 200  //우승포인트 
      const existBPoint = blackP.point - getBPoint  //게임전 포인트(게임후 변경된 포인트 가져옴)
      const totalBPoint = existBPoint + getBPoint  // 게임후 총 포인트
      const winInfo = {id:blackP.id, usePoint:0, getPoint:getBPoint, existPoint:existBPoint,
                                          totalPoint:totalBPoint, state:blackP.state };
      winPlayerArray.push(winInfo);    
      console.log("229,gameFinishShow --> 이겼다~~!!winPlayerArray:",winPlayerArray);

      //화이트플레이어 패 계산
      const getWPoint = 100  //패배 패널티포인트
      const existWPoint = whiteP.point + getWPoint //게임전 포인트(게임후 변경된 포인트 가져옴)
      const totalWPoint = existWPoint - getWPoint // 게임후 총 포인트
      const loseInfo = {id:whiteP.id, usePoint:0, getPoint: - getWPoint, existPoint:existWPoint,
                                        totalPoint:totalWPoint, state:whiteP.state };
      losePlayerArray.push(loseInfo);
      console.log("238,gameFinishShow --> 졌어요.....losePlayerArray:",losePlayerArray);
      
      //블랙옵저버 승 계산
      for(let i=0; i<blackO.length; i++){
          if (blackO[i].state === 'blackObserver') {
          //이긴팀 포인트 업데이트
          const usePoint = blackO[i].teachingCnt * 10;  //쓴포인트 
          const chatPoint = usePoint * 1  //채팅포인트
          const addPoint = 20; //추가포인트
          let getPoint = usePoint + chatPoint + addPoint; //얻은포인트
          console.log("248,show,getPoint:", getPoint)
          if (getPoint >= 300){
            getPoint = 300
            console.log("251,show,getPoint:", getPoint)
          }

          const existPoint = blackO[i].point - getPoint //기존포인트
          const totalPoint = blackO[i].point;  //총포인트
          const winObserver = { id:blackO[i].id, usePoint:usePoint, getPoint:getPoint, 
                                existPoint:existPoint, totalPoint:totalPoint, state:blackO[i].state };
          winObserverArray1.push(winObserver);
          console.log("259,show,win,blackO[i]",blackO[i])  
        }
      }
      console.log("262,show, 이긴블랙옵 winObserverArray1는?", winObserverArray1);
      
      //화이트옵저버 패 계산
      for(let i=0; i<whiteO.length; i++){
        if (whiteO[i].state === 'whiteObserver') {
          //진팀 포인트 업데이트
          const usePoint = whiteO[i].teachingCnt * 10;  //쓴포인트
          const chatPoint = usePoint * 1  //채팅포인트
          const penalty = 20; //진팀 패널티
          let getPoint = usePoint + chatPoint + penalty; //얻은포인트
          console.log("272,show,getPoint:", getPoint)
          if (getPoint >= 300){
            getPoint = 300
            console.log("275,show,getPoint:", getPoint)
          }

          const existPoint = whiteO[i].point + getPoint //기존포인트
          const totalPoint = whiteO[i].point;  //총포인트
          const loseObserver = { id:whiteO[i].id, usePoint:usePoint, getPoint: - getPoint, 
                                 existPoint:existPoint, totalPoint:totalPoint, state:whiteO[i].state };
          loseObserverArray1.push(loseObserver);
          console.log("283,show,lose,whiteO[i]",whiteO[i])  
        }
      } 
      console.log("286,show, 진화이트옵 loseObserverArray1는?", loseObserverArray1);
    } 

    //게임승리 player- white 
    let winObserverArray2 = [];
    let loseObserverArray2 = [];
    if (result.win === whiteP.id) {
      console.log("293,Show,이긴화이트 플레이어는:", result.win)
      //화이트플레이어 승 계산
      const getWPoint = 200  //우승포인트 
      const existWPoint = whiteP.point - getWPoint //게임전 포인트(게임후 변경된 포인트 가져옴)
      const totalWPoint = existWPoint + getWPoint  // 게임후 총 포인트
      const winInfo = {id:whiteP.id, usePoint:0, getPoint:getWPoint, existPoint:existWPoint,
                                          totalPoint:totalWPoint, state:whiteP.state };
      winPlayerArray.push(winInfo);    
      console.log("301,gameFinishShow --> 이겼다~~!!winPlayerArray:",winPlayerArray);

      //블랙플레이어 패 계산
      const getBPoint = 100  //패배 패널티포인트
      const existBPoint = blackP.point + getBPoint //게임전 포인트
      const totalBPoint = existBPoint - getBPoint // 게임후 총 포인트
      const loseInfo = {id:blackP.id, usePoint:0, getPoint: - getBPoint, existPoint:existBPoint,
                                        totalPoint:totalBPoint, state:blackP.state };
      losePlayerArray.push(loseInfo);
      console.log("310,gameFinishShow --> 졌어요.....losePlayerArray:",losePlayerArray);
      
      //화이트옵저버 승 계산
      for(let i=0; i<whiteO.length; i++){
        if (whiteO[i].state === 'whiteObserver') {
        //이긴팀 포인트 업데이트
        const usePoint = whiteO[i].teachingCnt  * 10;  //쓴포인트
        const chatPoint = usePoint * 1  //채팅포인트
        const addPoint = 20; //추가포인트
        let getPoint = usePoint + chatPoint + addPoint; //얻은포인트
        console.log("320,show,getPoint:", getPoint)
          if (getPoint >= 300){
            getPoint = 300
            console.log("323,show,getPoint:", getPoint)
          }

        const existPoint = whiteO[i].point - getPoint //기존포인트
        const totalPoint = whiteO[i].point;  //총포인트
        const winObserver = { id:whiteO[i].id, usePoint:usePoint, getPoint:getPoint,
                                existPoint:existPoint, totalPoint:totalPoint, state:whiteO[i].state };
        winObserverArray2.push(winObserver);
        console.log("331,show,win,whiteO[i]",whiteO[i])
        }
      }  
      console.log("334,show, 이긴화이트옵 winObserverArray2는?", winObserverArray2);

      //블랙옵저버 패 계산
      for(let i=0; i<blackO.length; i++){
        if (blackO[i].state === 'blackObserver') {
          //진팀 포인트 업데이트
          const usePoint = blackO[i].teachingCnt * 10;  //쓴포인트
          const chatPoint = usePoint * 1  //채팅포인트
          const penalty = 20; //진팀 패널티
          let getPoint = usePoint + chatPoint + penalty;  //얻은포인트
          console.log("344,show,getPoint:", getPoint)
          if (getPoint >= 300){
            getPoint = 300
            console.log("347,show,getPoint:", getPoint)
          }

          const existPoint = blackO[i].point + getPoint //기존포인트
          const totalPoint = blackO[i].point;  //총포인트
          const loseObserver = { id:blackO[i].id, usePoint:usePoint, getPoint: - getPoint, 
                                   existPoint:existPoint, totalPoint:totalPoint, state:blackO[i].state };
          loseObserverArray2.push(loseObserver);
          console.log("355,show,lose,blackO[i]:",blackO[i])
        }
      } 
      console.log("358,show, 진블랙옵 loseObserverArray2는?", loseObserverArray2);
    }  

    const win = [...winPlayerArray, ...winObserverArray1, ...winObserverArray2];
    const lose = [...losePlayerArray, ...loseObserverArray1, ...loseObserverArray2];
    console.log("363,show,win배열 총정보:",win)
    console.log("364,show,lose배열 총정보:",lose)
    console.log("365,result",result)

    //Observer의 teachingCnt 0으로 리셋
    const delTeachingCnt = await Users.findOne({id},{_id:false, id:true, state:true, teachingCnt:true});
    console.log("369,show,delTeachingCnt.id:",delTeachingCnt.id)
    console.log("370,show,delTeachingCnt.teachingCnt:",delTeachingCnt.teachingCnt)
    if(delTeachingCnt.state === 'blackObserver' || delTeachingCnt.state === 'whiteObserver')
    await Users.updateOne({ id:id }, { $set: { teachingCnt: 0 }});
    //게임결과 후 유저 state 'online'변경
    await Users.updateOne({ id:id }, { $set: { state: 'online' }}); 

    res.status(200).json({
      win,
      lose,
      result,
      ok: true,
      message: 'gameFinishShow 성공!',
    });
  } catch (err) {
    console.log(`API_결과창gameFinish 에러: ${err}`);
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
    console.log("API,gameDelete,req.params:",req.params)

    const existGame = await Games.findOne({ gameNum:gameNum });
    console.log("399,delete,existGame:",existGame)
    if (existGame){
      const deleteRoomNum = await Rooms.deleteOne({ roomNum: Number(gameNum) });
      const deleteGameNum = await Games.deleteOne({ gameNum: Number(gameNum) });
      console.log("403,deleteRoomNum",deleteRoomNum)
      console.log("404,deleteGameNum",deleteGameNum)
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
