const Games = require('../models/games');
const Rooms = require('../models/rooms');
const Users = require('../models/users');

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
    console.log(roomNum);
    console.log(blackTeamPlayer);
    console.log(blackTeamObserver);
    console.log(whiteTeamPlayer);
    console.log(whiteTeamObserver);
    const room = await Rooms.findOne({ roomNum });
    await Games.create({
      gameNum: roomNum,
      gameName: room.roomName,
      blackTeamPlayer,
      blackTeamObserver,
      whiteTeamPlayer,
      whiteTeamObserver,
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
    const gameInfo = await Games.aggregate([
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
          blackTeamPlayer: { id: 1, score: 1, point: 1, state: 1 },
          blackTeamObserver: { id: 1, score: 1, point: 1, state: 1 },
          whiteTeamPlayer: { id: 1, score: 1, point: 1, state: 1 },
          whiteTeamObserver: { id: 1, score: 1, point: 1, state: 1 },
        },
      },
    ]);
    console.log('89번gameInfo[0]:', gameInfo[0]);
    console.log("~~~~~~API- gameStart 나가기나가기");
    res.status(200).json({
      gameInfo,
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

//결과창 post
const gameFinish = async (req, res) => {
  try {
    const { userInfo, gameNum, result } = req.body;
    console.log("109,게임피니쉬req.body:", req.body)
    const id = userInfo.id;
    const score = userInfo.score;
    const point = userInfo.point;
    const state = userInfo.state;

    //승자id
    const resultId = result.win;
    const winPlayer = await Users.findOne({ id: resultId },
                                            { _id:false, id:true, score:true, point:true, state:true });
    console.log("119,winPlayer", winPlayer) 
                                            
    //Player
    if (state === 'blackPlayer' || state === 'whitePlayer') {
      if (resultId === id) {
        //승Player
        const winPScore = await Users.updateOne({ id: resultId }, { $inc: { 'score.0.win': 1 } });  //승 +1
        const winPPoint =await Users.updateOne({ id: resultId }, { $set: { point: point + 150 } });  //포인트 +150
        const winPTeachingCnt =await Users.updateOne({ id: resultId }, { $set: { teachingCnt: 0 }});  // 플레이어는 훈수쳇을 해도 포인트 계산이 안됨.
        // console.log("128,winPScorer계산후:",winPScore)
        // console.log("129,winPPoint계산후:",winPPoint)
        console.log("130,winPTeachingCnt계산후:",winPTeachingCnt)
        console.log(`API_우승자 score에 1승, point에 +150이 추가되었습니다.`);
      } else if(resultId !== id) {
        //패Player
        const losePScore = await Users.updateOne({ id: id }, { $inc: { 'score.1.lose': 1 } });  //패 +1
        const losePPoint = await Users.updateOne({ id: id }, { $set: { point: point - 50 } });  //포인트 -50
        const losePTeachingCnt = await Users.updateOne({ id: id }, { $set: { teachingCnt: 0 }}); 
        // console.log("137,losePScore계산후:",losePScore)
        // console.log("138,losePPoint계산후:",losePPoint)
        console.log("139,losePTeachingCnt계산후:",losePTeachingCnt)
        console.log(`API_패자 score에 1패, point에 -50이 추가되었습니다.`);
      }
    }
    //Observer
    //훈수채팅 수    
    const observerTeachingCnt = await Users.findOne({ id: id }, { _id: false, teachingCnt: true });
    const thisTeachingCnt = observerTeachingCnt.teachingCnt;  
    //이긴팀 point
    const useTeachingPoint = thisTeachingCnt * 10; //쓴 포인트
    const winGetTeachingPoint = useTeachingPoint * 0.5; //얻은 포인트
    const addPoint = 20  //승리팀 추가 포인트
    const winTotalPoint = point + winGetTeachingPoint + useTeachingPoint + addPoint; //게임후 총 포인트
    //진팀 point
    const penalty = 20  //패널티
    const loseTotalPoint = point - useTeachingPoint - penalty; //게임후 총 포인트
    //whitePlayer 이김
    if (winPlayer.state === 'whitePlayer') {
      console.log("옵저버포인트계산- whitePlayer 이김")
      // console.log("158,thisTeachingCnt:", thisTeachingCnt)
      if (state === 'whiteObserver') {
        console.log("160, 화이트옵 이긴포인트계산 whitePlayer이겼을때")
        //포인트 업데이트
        // console.log("162,화이트옵 이긴thisTeachingCnt업뎃전:", thisTeachingCnt)
        // console.log("163,화이트옵 이긴포인트 업뎃전:", winTotalPoint)
        await Users.updateOne({ id: id }, { $set: { point: winTotalPoint } });
        console.log("165,화이트옵 이긴thisTeachingCnt업뎃후리셋전:", thisTeachingCnt)
        // console.log("166,화이트옵 이긴포인트 업뎃후후:", winTotalPoint)
        await Users.updateOne({ id: id }, { $set: { teachingCnt: 0 }}); 
        console.log("168,화이트옵 이긴thisTeachingCnt리셋000:", thisTeachingCnt)
      } else if (state === 'blackObserver') {
        console.log("170,블랙옵 진포인트계산 whitePlayer이겼을때")
        // console.log("171,블랙옵 진thisTeachingCnt업뎃전:", thisTeachingCnt)
        // console.log("172,블랙옵 진포인트 업뎃전:",loseTotalPoint)
        await Users.updateOne({ id: id }, { $set: { point: loseTotalPoint } });
        console.log("174,블랙옵 진thisTeachingCnt업뎃후리셋전:", thisTeachingCnt)
        // console.log("175,블랙옵 진포인트 업뎃후후:", loseTotalPoint)
        await Users.updateOne({ id: id }, { $set: { teachingCnt: 0 }}); 
        console.log("177,블랙옵 진thisTeachingCnt리셋000:", thisTeachingCnt)
      }
    }
    
    //blackPlayer 이김
    if (winPlayer.state === 'blackPlayer') {
      console.log("옵저버포인트계산-blackPlayer 이김")
      // console.log("184,thisTeachingCnt:", thisTeachingCnt)
      //blackObserver 이김
      if (state === 'blackObserver') {
        console.log("187,블랙옵 이긴포인트계산 blackPlayer이겼을때")
        // console.log("188,블랙옵 이긴thisTeachingCnt업뎃전:", thisTeachingCnt)
        // console.log("189,블랙옵 이긴포인트 업뎃전:", winTotalPoint)
        //포인트 업데이트
        await Users.updateOne({ id: id }, { $set: { point: winTotalPoint } });
        console.log("192,블랙옵 이긴thisTeachingCnt업뎃후리셋전:", thisTeachingCnt)
        // console.log("193,블랙옵 이긴포인트 업뎃후후:", winTotalPoint)
        await Users.updateOne({ id: id }, { $set: { teachingCnt: 0 }}); 
        console.log("195,블랙옵 이긴thisTeachingCnt리셋000:", thisTeachingCnt)
      //whiteObserver 짐
      } else if (state === 'whiteObserver') {
        console.log("198,화이트옵 진포인트계산 blackPlayer이겼을때")
        // console.log("199,화이트옵 진thisTeachingCnt업뎃전:", thisTeachingCnt)
        // console.log("200,화이트옵 진포인트 업뎃전:",loseTotalPoint)
        //포인트 업데이트
        await Users.updateOne({ id: id }, { $set: { point: loseTotalPoint } });
        console.log("203,화이트옵 진thisTeachingCnt업뎃후리셋전:", thisTeachingCnt)
        // console.log("204,화이트옵 진포인트 업뎃후후:", loseTotalPoint)
        await Users.updateOne({ id: id }, { $set: { teachingCnt: 0 }}); 
        console.log("206,화이트옵 진thisTeachingCnt리셋000:", thisTeachingCnt)
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



//결과창 post--작업중
const gameFinishShow = async (req, res) => {
  try { 
    const { id, gameNum, result } = req.body;
    console.log('228,결과창show진입:');
    console.log('229,결과창show,req.body:', req.body);

    // 내겜방 유저들의 정보 찾기 id, score, point, state 
    const gameUsers = await Games.aggregate([
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
          blackTeamPlayer: { id: 1, score: 1, point: 1, state: 1, teachingCnt: 1 },
          blackTeamObserver: { id: 1, score: 1, point: 1, state: 1, teachingCnt: 1 },
          whiteTeamPlayer: { id: 1, score: 1, point: 1, state: 1, teachingCnt: 1 },
          whiteTeamObserver: { id: 1, score: 1, point: 1, state: 1, teachingCnt: 1 },
        }
      }
    ]);
     
    console.log("279,show,gameUsers[0]:",gameUsers[0]); 
    // console.log("280,show,gameUsers[0].bo:",gameUsers[0].blackTeamObserver); // [{}]
    // console.log("281,show,gameUsers[0].bo[0]:",gameUsers[0].blackTeamObserver[0]);  //{ id:"1",score:[{win:1},{lose:1}], point:0 ...}
    // console.log("282,show,gameUsers[0].wo[0]:",gameUsers[0].whiteTeamObserver[0]);  //{ id:"1",score:[{win:1},{lose:1}], point:0 ...}
    // console.log("283,show,gameUsers[0].bp:",gameUsers[0].blackTeamPlayer); // [{a:"a", b:[ [], [] ], c:1, ...}]
    // console.log("284,show,gameUsers[0].bp[0]:",gameUsers[0].blackTeamPlayer[0]);  //{ id:"1",score:[{win:1},{lose:1}], point:0 ...}

    const blackP = gameUsers[0].blackTeamPlayer[0]
    const blackO = gameUsers[0].blackTeamObserver[0]
    const whiteP = gameUsers[0].whiteTeamPlayer[0]
    const whiteO = gameUsers[0].whiteTeamObserver[0]
    // gameUsers[0].bo[0]: 
    //   {
    //     id: 'test4',
    //     score: [ { win: 13 }, { lose: 6 } ],
    //     point: 2100,
    //     state: 'blackObserver',
    //     teachingCnt: 2
    //   }


    //player- black 승
    let winPlayerArray = [];
    let losePlayerArray = [];
    if (result.win === blackP.id || result.win === whiteP.id) {
      console.log("304,Show,이긴블랙플레이어 계산")
      //블랙플레이어가 이겼을때
      if(result.win === blackP.id){ 
        const winInfo = {id:blackP.id, usePoint:0, getPoint:150, 
                                        totalPoint:blackP.point, state:blackP.state };
        winPlayerArray.push(winInfo);    
        console.log("310,gameFinishShow --> 이겼다~~!!winPlayerArray:",winPlayerArray);
       //화이트플레이어가 졌을때
      }else if(result.win !== whiteP.id){  
        console.log("313,Show진화이트플레이어 계산")
        const loseInfo = {id:whiteP.id, usePoint:0, getPoint:-50, 
                                          totalPoint:totalPoint, state:whiteP.state };
        losePlayerArray.push(loseInfo);
        console.log("317,gameFinishShow --> 졌어요.....losePlayerArray:",losePlayerArray);
      }
    } 

    //player- white 승
    if (result.win === whiteP.id || result.win === blackP.id) {
      console.log("323,Show,이긴화이트플레이어 계산")
      //화이트플레이어가 이겼을때
      if(result.win === id){
        const winInfo = {id:whiteP.id, usePoint:0, getPoint:150, 
                                         totalPoint:whiteP.point, state:whiteP.state };
        winPlayerArray.push(winInfo);
        console.log("329,gameFinishShow --> 이겼다~~!!winPlayerArray:",winPlayerArray);
       //블랙플레이어가 졌을때
      } else if (result.win !== id){  
        console.log("332,Show진블랙플레이어 계산")
        const loseInfo = {id:blackP.id, usePoint:0, getPoint:-50, 
                                          totalPoint:totalPoint, state:blackP.state };
        losePlayerArray.push(loseInfo);
        console.log("336,gameFinishShow --> 졌어요.....losePlayerArray:",losePlayerArray);
      }
    }
    console.log("339,show,winPlayerArray:",winPlayerArray)
    console.log("340,show,losePlayerArray:",losePlayerArray)
   
    //Observer- whitePlayer 이겼을때 
    let winObserverArray1 = [];
    let loseObserverArray1 = [];
    if (result.win === whiteP.id && whiteO.state === 'whiteObserver'){
    // if (result.win === whiteP.id){ if(whiteO.state === 'whiteObserver'){  } }  
      console.log("346,show, 이긴화이트팀 화이트옵 계산")
      console.log("347,show, 이긴화이트플레이어 아이디:",result.win)
      //이긴팀 포인트 업데이트
      const usePoint = whiteO.teachingCnt  * 10  //쓴포인트
      const getPoint = usePoint * 0.5  //얻은포인트
      const addPoint = 20 //추가포인트
      const totalPoint = whiteO.point + usePoint + getPoint + addPoint;  //총포인트
      const winObserver = { id:whiteO.id, usePoint:usePoint, getPoint:getPoint, 
                                            totalPoint:totalPoint, state:whiteO.state };
      winObserverArray1.push(winObserver);
      console.log("356,show, 이긴화이트옵 winObserverArray1은?", winObserverArray1);
    //blackObserver 짐
    } else if (result.win === whiteP.id && blackO.state === 'blackObserver') {
      console.log("359,show, 진블랙옵 계산")
      //진팀 포인트 업데이트
      const usePoint = blackO.teachingCnt  * 10;  //쓴포인트
      const getPoint = usePoint * 0.5;  //얻은포인트
      const penalty = 20; //진팀패널티
      const totalPoint = blackO.point - usePoint - getPoint - penalty;  //총포인트
      const loseObserver = { id:blackO.id, usePoint:usePoint, getPoint:getPoint, 
                                            totalPoint:totalPoint, state:blackO.state };
      loseObserverArray1.push(loseObserver);
      console.log("368,show, 진블랙옵 loseObserverArray1은?", loseObserverArray1)
    }
      
    //Observer- blackPlayer 이겼을때
    let winObserverArray2 = [];
    let loseObserverArray2 = [];
    if (result.win === blackP.id && blackO.state === 'blackObserver') {
      console.log("375,show, 이긴블랙팀 블랙옵 계산")
      console.log("376,show, 이긴블랙플레이어 아이디:", result.win)
      //이긴팀 포인트 업데이트
      const usePoint = blackO.teachingCnt  * 10  //쓴포인트
      const getPoint = usePoint * 0.5  //얻은포인트
      const addPoint = 20 //추가포인트
      const totalPoint = blackO.point + usePoint + getPoint + addPoint;  //총포인트
      const winObserver = { id:blackO.id, usePoint:usePoint, getPoint:getPoint, 
                                            totalPoint:totalPoint, state:blackO.state };
      winObserverArray2.push(winObserver);
      console.log("385,show, 이긴블랙옵 winObserverArray2는?", winObserverArray2);
    //whiteObserver 짐
    } else if (result.win === blackP.id && whiteO.state === 'whiteObserver') {
      console.log("388,show, 진화이트옵 계산")
      //진팀 포인트 업데이트
      const usePoint = whiteO.teachingCnt  * 10  //쓴포인트
      const getPoint = usePoint * 0.5  //얻은포인트
      const penalty = 20 //진팀 패널티
      const totalPoint = whiteO.point - usePoint - getPoint - penalty;  //총포인트
      const loseObserver = { id:whiteO.id, usePoint:usePoint, getPoint:getPoint, 
                                            totalPoint:totalPoint, state:whiteO.state };
      loseObserverArray2.push(loseObserver);
      console.log("397,show, 진화이트옵 loseObserverArray2는?", loseObserverArray2);
    } 
    const win = [...winPlayerArray, ...winObserverArray1, ...winObserverArray2];
    const lose = [...losePlayerArray, ...loseObserverArray1, ...loseObserverArray2];
    console.log("401,show,win배열 총정보:",win)
    console.log("402,show,lose배열 총정보:",lose)
    console.log("403,result",result)

    res.status(200).json({
      win,
      lose,
      result,
      ok: true,
      message: 'gameFinishShow 성공!',
    });
  } catch (err) {
    console.log(`API_gameFinishShow 에러: ${err}`);
    res.status(400).json({
      ok: false,
      errorMessage: 'gameFinishShow 실패',
    });
  }
};


//게임방에서 play가 나갈때 게임방삭제
const gameDelete = async (req, res) => {
  //순서:먼저 전인원이 겜방에서 대기방으로 이동 후 마지막 플레이어가 겜방 나갈때 방삭제
  try {
    const { gameNum } = req.params;
    console.log("API,gameDelete,req.params:",req.params)
    console.log("API,gameDelete,gameNum:",gameNum)
    console.log("API,gameDelete,gameNum타입:",typeof(gameNum))
    const existGamePlayers = await Games.findOne({ gameNum: gameNum },
                                       { _id: false, blackTeamPlayer: true, whiteTeamPlayer: true });
    if (!existGamePlayers.blackTeamPlayer || !existGamePlayers.whiteTeamPlayer){
      await Rooms.deleteOne({ roomNum: gameNum });
      await Games.deleteOne({ gameNum: Number(gameNum) });
    }

    res.status(200).json({
        ok: true,
        message: '게임방에서 나가기 성공!',
    });
  } catch (err) {
    // console.log(`API_방에서 나가기 에러: ${err}`);
    console.err("API_방에서 나가기 에러:",err)
    res.status(400).json({
      ok: false,
      errorMessage: '게임방에서 나가기 실패',
    });
  }
};

module.exports = {
  gameCreate,
  gameStart,
  gameFinish,
  gameFinishShow,
  gameDelete,
};
