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
    console.log("43,gameStart의 gameNum", gameNum);
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
        const winPPoint =await Users.updateOne({ id: resultId }, { $set: { point: point + 200 } });  //포인트 +150
        const winPTeachingCnt =await Users.updateOne({ id: resultId }, { $set: { teachingCnt: 0 }});  // 플레이어는 훈수쳇을 해도 포인트 계산이 안됨.
        // console.log("128,winPScorer계산후:",winPScore)
        // console.log("129,winPPoint계산후:",winPPoint)
        console.log(`API_우승자 score에 1승, point에 +200이 추가되었습니다.`);
      } else if(resultId !== id) {
        //패Player
        const losePScore = await Users.updateOne({ id: id }, { $inc: { 'score.1.lose': 1 } });  //패 +1
        const losePPoint = await Users.updateOne({ id: id }, { $set: { point: point - 100 } });  //포인트 -50
        const losePTeachingCnt = await Users.updateOne({ id: id }, { $set: { teachingCnt: 0 }}); 
        // console.log("137,losePScore계산후:",losePScore)
        // console.log("138,losePPoint계산후:",losePPoint)
        console.log(`API_패자 score에 1패, point에 -100이 추가되었습니다.`);
      }
    }
    //Observer
    //훈수채팅 수    
    const observerTeachingCnt = await Users.findOne({ id: id }, { _id: false, teachingCnt: true });
    const thisTeachingCnt = observerTeachingCnt.teachingCnt;  
    //이긴팀 point
    const useTeachingPoint = thisTeachingCnt * 20; //쓴 포인트
    const winGetTeachingPoint = useTeachingPoint * 1; //얻은 포인트
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
        console.log("168,화이트옵 이긴thisTeachingCnt리셋000:", thisTeachingCnt)
      } else if (state === 'blackObserver') {
        console.log("170,블랙옵 진포인트계산 whitePlayer이겼을때")
        // console.log("171,블랙옵 진thisTeachingCnt업뎃전:", thisTeachingCnt)
        // console.log("172,블랙옵 진포인트 업뎃전:",loseTotalPoint)
        await Users.updateOne({ id: id }, { $set: { point: loseTotalPoint } });
        console.log("174,블랙옵 진thisTeachingCnt업뎃후리셋전:", thisTeachingCnt)
        // console.log("175,블랙옵 진포인트 업뎃후후:", loseTotalPoint)
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



//결과창 post
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
    const blackO = gameUsers[0].blackTeamObserver
    const whiteP = gameUsers[0].whiteTeamPlayer[0]
    const whiteO = gameUsers[0].whiteTeamObserver
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
    let winObserverArray1 = [];
    let loseObserverArray1 = [];
    if (result.win === blackP.id) {
      console.log("306,Show,이긴블랙 플레이어는:", result.win)
      //블랙플레이어 승 계산
      const winInfo = {id:blackP.id, usePoint:0, getPoint:200, 
                                      totalPoint:blackP.point, state:blackP.state };
      winPlayerArray.push(winInfo);    
      console.log("311,gameFinishShow --> 이겼다~~!!winPlayerArray:",winPlayerArray);

      //화이트플레이어 패 계산
      const loseInfo = {id:whiteP.id, usePoint:0, getPoint:-100, 
                                        totalPoint:whiteP.point, state:whiteP.state };
      losePlayerArray.push(loseInfo);
      console.log("317,gameFinishShow --> 졌어요.....losePlayerArray:",losePlayerArray);
      
      //블랙옵저버 승 계산
      for(let i=0; i<blackO.length; i++){
          if (blackO[i].state === 'blackObserver') {
          //이긴팀 포인트 업데이트
          const usePoint = blackO[i].teachingCnt * 20;  //쓴포인트 
          const addPoint = 20; //추가포인트
          const getPoint = usePoint * 1 + addPoint; //얻은포인트
          const totalPoint = blackO[i].point + usePoint + getPoint;  //총포인트
          const winObserver = { id:blackO[i].id, usePoint:usePoint, getPoint:getPoint, 
                                                   totalPoint:totalPoint, state:blackO[i].state };
          winObserverArray1.push(winObserver);
        }
      }
      console.log("331,show, 이긴블랙옵 winObserverArray1는?", winObserverArray1);
      
      //화이트옵저버 패 계산
      for(let i=0; i<whiteO.length; i++){
        if (whiteO[i].state === 'whiteObserver') {
          //진팀 포인트 업데이트
          const usePoint = whiteO[i].teachingCnt * 20;  //쓴포인트
          const penalty = 20; //진팀 패널티
          const getPoint = usePoint * 1 - penalty; //얻은포인트
          const totalPoint = whiteO[i].point - usePoint - getPoint;  //총포인트
          const loseObserver = { id:whiteO[i].id, usePoint:usePoint, getPoint:getPoint, 
                                                   totalPoint:totalPoint, state:whiteO[i].state };
          loseObserverArray1.push(loseObserver);
        }
      } 
      console.log("343,show, 진화이트옵 loseObserverArray1는?", loseObserverArray1);
    } 

    //player- white 승
    let winObserverArray2 = [];
    let loseObserverArray2 = [];
    if (result.win === whiteP.id) {
      console.log("351,Show,이긴화이트 플레이어는:", result.win)
      //화이트플레이어 승 계산
      const winInfo = {id:whiteP.id, usePoint:0, getPoint:200, 
                                      totalPoint:whiteP.point, state:whiteP.state };
      winPlayerArray.push(winInfo);    
      console.log("356,gameFinishShow --> 이겼다~~!!winPlayerArray:",winPlayerArray);

      //블랙플레이어 패 계산
      const loseInfo = {id:blackP.id, usePoint:0, getPoint:-100, 
                                        totalPoint:blackP.point, state:blackP.state };
      losePlayerArray.push(loseInfo);
      console.log("362,gameFinishShow --> 졌어요.....losePlayerArray:",losePlayerArray);
      
      //화이트옵저버 승 계산
      for(let i=0; i<whiteO.length; i++){
        if (whiteO[i].state === 'whiteObserver') {
        //이긴팀 포인트 업데이트
        const usePoint = whiteO[i].teachingCnt  * 20;  //쓴포인트
        const addPoint = 20; //추가포인트
        const getPoint = usePoint * 1 + addPoint; //얻은포인트
        const totalPoint = whiteO[i].point + usePoint + getPoint;  //총포인트
        const winObserver = { id:whiteO[i].id, usePoint:usePoint, getPoint:getPoint, 
                                                  totalPoint:totalPoint, state:whiteO[i].state };
        winObserverArray2.push(winObserver);
        }
      }  
      console.log("376,show, 이긴블랙옵 winObserverArray2는?", winObserverArray2);

      //블랙옵저버 패 계산
      for(let i=0; i<blackO.length; i++){
        if (blackO.state === 'blackObserver') {
          //진팀 포인트 업데이트
          const usePoint = blackO[i].teachingCnt * 20;  //쓴포인트
          const penalty = 20; //진팀 패널티
          const getPoint = usePoint * 1 - penalty;  //얻은포인트
          const totalPoint = blackO[i].point - usePoint - getPoint;  //총포인트
          const loseObserver = { id:blackO[i].id, usePoint:usePoint, getPoint:getPoint, 
                                                  totalPoint:totalPoint, state:blackO[i].state };
          loseObserverArray2.push(loseObserver);
        }
      } 
      console.log("388,show, 진화이트옵 loseObserverArray2는?", loseObserverArray2);
    }  

    const win = [...winPlayerArray, ...winObserverArray1, ...winObserverArray2];
    const lose = [...losePlayerArray, ...loseObserverArray1, ...loseObserverArray2];
    console.log("393,show,win배열 총정보:",win)
    console.log("394,show,lose배열 총정보:",lose)
    console.log("395,result",result)

    //teachingCnt 0으로 리셋
    const delTeachingCnt = await Users.findOne({id},{_id:false, id:true, state:true});
    if(delTeachingCnt.state === 'blackObserver' || delTeachingCnt.state === 'whiteObserver')
    await Users.updateOne({ id:id }, { $set: { teachingCnt: 0 }});

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


//게임방에서 play가 나갈때 게임방삭제 --작업중
const gameDelete = async (req, res) => {
  //순서:먼저 전인원이 겜방에서 대기방으로 이동 후 마지막 플레이어가 겜방 나갈때 방삭제
  try {
    const { gameNum } = req.params;
    console.log("API,gameDelete,req.params:",req.params)
    console.log("API,gameDelete,gameNum:",gameNum)
    console.log("API,gameDelete,gameNum타입:",typeof(gameNum))
    const existGame = await Games.findOne({ gameNum });
    if (existGame){
      await Rooms.deleteOne({ roomNum: Number(gameNum) });
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
