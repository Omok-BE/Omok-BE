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
    console.log("43,gameStart의 gameNum", gameNum);

    //게임방내 유저 state별 정보
    const gameInfo = await gameUserInfo(gameNum);

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
    console.log("105,게임피니쉬req.body:", req.body)
    const id = userInfo.id;
    const score = userInfo.score;
    const point = userInfo.point;
    const state = userInfo.state;

    //승자id
    const resultId = result.win;
    const winPlayer = await Users.findOne({ id: resultId },
                                            { _id:false, id:true, score:true, point:true, state:true });
    console.log("115,winPlayer", winPlayer) 
                                            
    //Player
    if (state === 'blackPlayer' || state === 'whitePlayer') {
      if (resultId === id) {
        //승Player
        const winPScore = await Users.updateOne({ id: resultId }, { $inc: { 'score.0.win': 1 } });  //승 +1
        const winPPoint = await Users.updateOne({ id: resultId }, { $set: { point: point + 200 } });  //포인트 +200
        const winPTeachingCnt = await Users.updateOne({ id: resultId }, { $set: { teachingCnt: 0 }});  // 플레이어는 훈수쳇을 해도 포인트 계산이 안됨.
        // console.log("128,winPScorer계산후:",winPScore)
        // console.log("129,winPPoint계산후:",winPPoint)
        console.log(`API_우승자 score에 1승, point에 +200이 추가되었습니다.`);
      } else if(resultId !== id) {
        //패Player
        const losePScore = await Users.updateOne({ id: id }, { $inc: { 'score.1.lose': 1 } });  //패 +1
        const losePPoint = await Users.updateOne({ id: id }, { $set: { point: point - 100 } });  //포인트 -100
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
    const useTeachingPoint = thisTeachingCnt * 10; //쓴 포인트
    const chatPoint = useTeachingPoint * 1 //훈수채팅포인트
    const addPoint = 20  //승리팀 추가 포인트
    const winGetTeachingPoint = useTeachingPoint + chatPoint + addPoint; //얻은 포인트
    const winTotalPoint = point + winGetTeachingPoint; //게임후 총 포인트(기존 + 얻은)
    //진팀 point
    const penalty = 20  //패널티
    const loseGetTeachingPoint = useTeachingPoint + chatPoint + penalty; //얻은 포인트
    const loseTotalPoint = point - loseGetTeachingPoint; //게임후 총 포인트
    //whitePlayer 이김
    if (winPlayer.state === 'whitePlayer') {
      console.log("옵저버포인트계산- whitePlayer 이김")
      // console.log("158,thisTeachingCnt:", thisTeachingCnt)
      if (state === 'whiteObserver') {
        console.log("154, 화이트옵 이긴포인트계산 whitePlayer이겼을때")
        //포인트 업데이트
        // console.log("162,화이트옵 이긴thisTeachingCnt업뎃전:", thisTeachingCnt)
        // console.log("163,화이트옵 이긴포인트 업뎃전:", winTotalPoint)
        await Users.updateOne({ id: id }, { $set: { point: winTotalPoint } });
        console.log("159,화이트옵 이긴thisTeachingCnt업뎃후리셋전:", thisTeachingCnt)
        // console.log("166,화이트옵 이긴포인트 업뎃후후:", winTotalPoint)
        console.log("161,화이트옵 이긴thisTeachingCnt리셋000:", thisTeachingCnt)
      } else if (state === 'blackObserver') {
        console.log("163,블랙옵 진포인트계산 whitePlayer이겼을때")
        // console.log("171,블랙옵 진thisTeachingCnt업뎃전:", thisTeachingCnt)
        // console.log("172,블랙옵 진포인트 업뎃전:",loseTotalPoint)
        await Users.updateOne({ id: id }, { $set: { point: loseTotalPoint } });
        console.log("167,블랙옵 진thisTeachingCnt업뎃후리셋전:", thisTeachingCnt)
        // console.log("175,블랙옵 진포인트 업뎃후후:", loseTotalPoint)
        console.log("169,블랙옵 진thisTeachingCnt리셋000:", thisTeachingCnt)
      }
    }
    
    //blackPlayer 이김
    if (winPlayer.state === 'blackPlayer') {
      console.log("옵저버포인트계산-blackPlayer 이김")
      // console.log("184,thisTeachingCnt:", thisTeachingCnt)
      //blackObserver 이김
      if (state === 'blackObserver') {
        console.log("179,블랙옵 이긴포인트계산 blackPlayer이겼을때")
        // console.log("188,블랙옵 이긴thisTeachingCnt업뎃전:", thisTeachingCnt)
        // console.log("189,블랙옵 이긴포인트 업뎃전:", winTotalPoint)
        //포인트 업데이트
        await Users.updateOne({ id: id }, { $set: { point: winTotalPoint } });
        console.log("184,블랙옵 이긴thisTeachingCnt업뎃후리셋전:", thisTeachingCnt)
        // console.log("193,블랙옵 이긴포인트 업뎃후후:", winTotalPoint)
        console.log("186,블랙옵 이긴thisTeachingCnt리셋000:", thisTeachingCnt)
      //whiteObserver 짐
      } else if (state === 'whiteObserver') {
        console.log("189,화이트옵 진포인트계산 blackPlayer이겼을때")
        // console.log("199,화이트옵 진thisTeachingCnt업뎃전:", thisTeachingCnt)
        // console.log("200,화이트옵 진포인트 업뎃전:",loseTotalPoint)
        //포인트 업데이트
        await Users.updateOne({ id: id }, { $set: { point: loseTotalPoint } });
        console.log("194,화이트옵 진thisTeachingCnt업뎃후리셋전:", thisTeachingCnt)
        // console.log("204,화이트옵 진포인트 업뎃후후:", loseTotalPoint)
        console.log("196,화이트옵 진thisTeachingCnt리셋000:", thisTeachingCnt)
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
    console.log('187,결과창show진입:');
    console.log('188,결과창show,req.body:', req.body);

    //게임방내 유저 state별 정보
    const gameInfo = await gameUserInfo(gameNum);
    console.log("192,show,gameInfo[0]:",gameInfo[0]); 
    const findGameName = await Games.findOne({gameNum}); 
    // console.log("280,show,gameInfo[0].bo:",gameInfo[0].blackTeamObserver); // [{}]
    // console.log("281,show,gameInfo[0].bo[0]:",gameInfo[0].blackTeamObserver[0]);  //{ id:"1",score:[{win:1},{lose:1}], point:0 ...}
    // console.log("282,show,gameInfo[0].wo[0]:",gameInfo[0].whiteTeamObserver[0]);  //{ id:"1",score:[{win:1},{lose:1}], point:0 ...}
    // console.log("283,show,gameInfo[0].bp:",gameInfo[0].blackTeamPlayer); // [{a:"a", b:[ [], [] ], c:1, ...}]

    const blackP = gameInfo[0].blackTeamPlayer[0]
    const blackO = gameInfo[0].blackTeamObserver
    const whiteP = gameInfo[0].whiteTeamPlayer[0]
    const whiteO = gameInfo[0].whiteTeamObserver
    // gameInfo[0].bo[0]: 
    //   {
    //     id: 'test4',
    //     score: [ { win: 13 }, { lose: 6 } ],
    //     point: 2100,
    //     state: 'blackObserver',
    //     teachingCnt: 2
    //   }

    //게임중간에 나간 기권패,부전승 player
    let outPlayerArray = [];
    let leftPlayerArray = [];
    let outObserverArray1 = [];
    let leftObserverArray1 = [];
    let outObserverArray2 = [];
    let leftObserverArray2 = [];
    //기권패 블랙플레이어
    if(result.win !== blackP.id && id === blackP.id) {  
      console.log(",show,기권패 블랙플레이어id:", id )
      await Users.updateOne({ id:blackP.id }, { $inc: { 'score.1.lose': 1 } }); //  패 +1
      await Users.updateOne({ id:blackP.id }, { $set: { point: point - 200 } });  //포인트 -200
      console.log(`API_기권패,블랙플레이어"${blackP.id}"에게 1패, -200포인트가 추가되었습니다.`);
      const getOutPlayerPoint = "-200(기권패 포인트)"
      const existBPoint = blackP.point + 200 //기존포인트
      const outPlayer = {id:blackP.id, usePoint:0, getPoint:getOutPlayerPoint, 
                            existPoint:existBPoint, totalPoint:blackP.point, state:blackP.state };
      outPlayerArray.push(outPlayer);    
      console.log(`225,기권패,블랙플레이어"${blackP.id}",outPlayerArray:`,outPlayerArray);
      
      //부전승 화이트플레이어
      await Users.updateOne({ id:whiteP.id }, { $inc: { 'score.0.win': 1 } }); //  승 +1
      await Users.updateOne({ id:whiteP.id }, { $set: { point: point + 200 } });  //포인트 +200
      console.log(`API_부전승,화이트플레이어"${whiteP.id}"에게 1승, +200포인트가 추가되었습니다.`);
      const getLeftPlayerPoint = "200(부전승 포인트)"
      const existWPoint = whiteP.point - 200 //기존포인트
      const leftPlayer = {id:whiteP.id, usePoint:0, getPoint:getLeftPlayerPoint, 
                            existPoint:existWPoint, totalPoint:whiteP.point, state:whiteP.state };
      leftPlayerArray.push(leftPlayer);
      console.log(`225,부전승,화이트플레이어"${whiteP.id}",leftPlayerArray:`,leftPlayerArray);


      //기권패 블랙팀 Observer
      for(let i=0; i<blackO.length; i++){
        if (blackO[i].state === 'blackObserver') {
          //기권패 블랙팀 Observer 포인트
          const usePoint = blackO[i].teachingCnt * 10;  //쓴포인트 
          const getPoint = -usePoint; //얻은포인트
          const cancelPoint = "기권패 쓴포인트 취소"  //기권패 쓴포인트 취소
          const existPoint = blackO[i].point  //기존포인트
          const totalPoint = blackO[i].point;  //총포인트
          const outObserver = { id:blackO[i].id, usePoint:usePoint, getPoint:getPoint+cancelPoint, 
                                  existPoint:existPoint, totalPoint:totalPoint, state:blackO[i].state };
          outObserverArray1.push(outObserver);
          await Users.updateOne({ id:blackO.id }, { $set: { teachingCnt: 0 }});
          console.log(`225,기권패,블랙팀 옵저버,outObserverArray1:`,outObserverArray1);
        }
      }
      //부전승 화이트팀 Observer
      for(let i=0; i<whiteO.length; i++){
      if (whiteO[i].state === 'whiteObserver') {
        //부전승 화이트팀 Observer 포인트
        const usePoint = whiteO[i].teachingCnt * 10;  //쓴포인트 
        const getPoint = -usePoint; //얻은포인트
        const cancelPoint = "부전승 쓴포인트 취소"  //부전승 쓴포인트 취소
        const existPoint = whiteO[i].point  //기존포인트
        const totalPoint = whiteO[i].point;  //총포인트
        const leftObserverArray1 = { id:whiteO[i].id, usePoint:usePoint, getPoint:getPoint+cancelPoint, 
                                existPoint:existPoint, totalPoint:totalPoint, state:whiteO[i].state };
        leftObserverArray1.push(leftObserver);
        await Users.updateOne({ id:whiteO.id }, { $set: { teachingCnt: 0 }});
        console.log(`225,부전승,화이트팀 옵저버,leftObserverArray1:`,leftObserverArray1); 
        }
      }
    }
    
    //기권패 화이트플레이어
    if(result.win !== whiteP.id && id === whiteP.id) { 
      console.log(",show,기권패,화이트플레이어id:", id )
      await Users.updateOne({ id:whiteP.id }, { $inc: { 'score.1.lose': 1 } }); //  패 +1
      await Users.updateOne({ id:whiteP.id }, { $set: { point: point - 200 } });  //포인트 -200
      console.log(`API_기권패,화이트플레이어 "${whiteP.id}"에게 1패, -200포인트가 추가되었습니다.`);
      const getOutPlayerPoint = "-200(기권패 포인트)"
      const existBPoint = blackP.point + 200 //기존 포인트
      const outPlayer = {id:whiteP.id, usePoint:0, getPoint:getOutPlayerPoint, 
                            existPoint:existBPoint, totalPoint:whiteP.point, state:whiteP.state };
      outPlayerArray.push(outPlayer);    
      console.log(`225,기권패,화이트플레이어"${whiteP.id}",outPlayerArray:`,outPlayerArray);
      
      //부전승 블랙플레이어
      await Users.updateOne({ id:blackP.id }, { $inc: { 'score.0.win': 1 } }); //  승 +1
      await Users.updateOne({ id:blackP.id }, { $set: { point: point + 200 } });  //포인트 +200
      console.log(`API_부전승,블랙플레이어"${blackP.id}"에게 1승, +200포인트가 추가되었습니다.`);
      const getLeftPlayerPoint = "200(부전승 포인트)"
      const existWPoint = blackP.point - 200 //기존 포인트
      const leftPlayer = {id:blackP.id, usePoint:0, getPoint:getLeftPlayerPoint, 
                            existPoint:existWPoint, totalPoint:blackP.point, state:blackP.state };
      leftPlayerArray.push(leftPlayer);
      console.log(`225,부전승,블랙플레이어"${blackP.id}",leftPlayerArray:`,leftPlayerArray);


      //기권패 화이트팀 Observer
      for(let i=0; i<whiteO.length; i++){
        if (whiteO[i].state === 'whiteObserver') {
          //기권패 화이트팀 Observer 포인트
          const usePoint = whiteO[i].teachingCnt * 10;  //쓴포인트 
          const getPoint = -usePoint; //얻은포인트
          const cancelPoint = "기권패 쓴포인트 취소"  //기권패 쓴포인트 취소
          const existPoint = whiteO[i].point  //기존포인트
          const totalPoint = whiteO[i].point;  //총포인트
          const outObserver = { id:whiteO[i].id, usePoint:usePoint, getPoint:getPoint+cancelPoint, 
                                  existPoint:existPoint, totalPoint:totalPoint, state:whiteO[i].state };
          outObserverArray2.push(outObserver);
          await Users.updateOne({ id:whiteO.id }, { $set: { teachingCnt: 0 }});
          console.log(`225,기권패,화이트팀 옵저버,outObserverArray2:`,outObserverArray2);
        }
      }
      //부전승 블랙팀 Observer
      for(let i=0; i<blackO.length; i++){
      if (blackO[i].state === 'blackObserver') {
        //부전승 블랙팀 Observer 포인트
        const usePoint = blackO[i].teachingCnt * 10;  //쓴포인트 
        const getPoint = -usePoint; //얻은포인트
        const cancelPoint = "부전승 쓴포인트 취소"  //부전승 쓴포인트 취소
        const existPoint = blackO[i].point  //기존포인트
        const totalPoint = blackO[i].point;  //총포인트
        const leftObserver = { id:blackO[i].id, usePoint:usePoint, getPoint:getPoint+cancelPoint, 
                                existPoint:existPoint, totalPoint:totalPoint, state:blackO[i].state };
        leftObserverArray2.push(leftObserver);
        await Users.updateOne({ id:blackO.id }, { $set: { teachingCnt: 0 }});
        console.log(`225,부전승,블랙팀 옵저버,leftObserverArray2:`,leftObserverArray2); 
        }
      }
    }



    //게임승리 player- black
    let winPlayerArray = [];
    let losePlayerArray = [];
    let winObserverArray1 = [];
    let loseObserverArray1 = [];
    if (result.win === blackP.id) {
      console.log("219,Show,이긴블랙 플레이어는:", result.win)
      //블랙플레이어 승 계산
      const getBPoint = 200  //우승포인트 
      const existBPoint = blackP.point - getBPoint  //게임전 포인트(게임후 변경된 포인트 가져옴)
      const totalBPoint = existBPoint + getBPoint  // 게임후 총 포인트
      const winInfo = {id:blackP.id, usePoint:0, getPoint:getBPoint, existPoint:existBPoint,
                                          totalPoint:totalBPoint, state:blackP.state };
      winPlayerArray.push(winInfo);    
      console.log("225,gameFinishShow --> 이겼다~~!!winPlayerArray:",winPlayerArray);

      //화이트플레이어 패 계산
      const getWPoint = 100  //패배 패널티포인트
      const existWPoint = whiteP.point + getWPoint //게임전 포인트(게임후 변경된 포인트 가져옴)
      const totalWPoint = existWPoint - getWPoint // 게임후 총 포인트
      const loseInfo = {id:whiteP.id, usePoint:0, getPoint: - getWPoint, existPoint:existWPoint,
                                        totalPoint:totalWPoint, state:whiteP.state };
      losePlayerArray.push(loseInfo);
      console.log("232,gameFinishShow --> 졌어요.....losePlayerArray:",losePlayerArray);
      
      //블랙옵저버 승 계산
      for(let i=0; i<blackO.length; i++){
          if (blackO[i].state === 'blackObserver') {
          //이긴팀 포인트 업데이트
          const usePoint = blackO[i].teachingCnt * 10;  //쓴포인트 
          const chatPoint = usePoint * 1  //채팅포인트
          const addPoint = 20; //추가포인트
          const getPoint = usePoint + chatPoint + addPoint; //얻은포인트
          const existPoint = blackO[i].point - getPoint //기존포인트
          const totalPoint = blackO[i].point;  //총포인트
          const winObserver = { id:blackO[i].id, usePoint:usePoint, getPoint:getPoint, 
                                existPoint:existPoint, totalPoint:totalPoint, state:blackO[i].state };
          winObserverArray1.push(winObserver);
          console.log("246,show,win,blackO[i]",blackO[i])  
        }
      }
      console.log("251,show, 이긴블랙옵 winObserverArray1는?", winObserverArray1);
      
      //화이트옵저버 패 계산
      for(let i=0; i<whiteO.length; i++){
        if (whiteO[i].state === 'whiteObserver') {
          //진팀 포인트 업데이트
          const usePoint = whiteO[i].teachingCnt * 10;  //쓴포인트
          const chatPoint = usePoint * 1  //채팅포인트
          const penalty = 20; //진팀 패널티
          const getPoint = usePoint + chatPoint + penalty; //얻은포인트
          const existPoint = whiteO[i].point + getPoint //기존포인트
          const totalPoint = whiteO[i].point;  //총포인트
          const loseObserver = { id:whiteO[i].id, usePoint:usePoint, getPoint: - getPoint, 
                                 existPoint:existPoint, totalPoint:totalPoint, state:whiteO[i].state };
          loseObserverArray1.push(loseObserver);
          console.log("265,show,lose,whiteO[i]",whiteO[i])  
        }
      } 
      console.log("268,show, 진화이트옵 loseObserverArray1는?", loseObserverArray1);
    } 

    //게임승리 player- white 
    let winObserverArray2 = [];
    let loseObserverArray2 = [];
    if (result.win === whiteP.id) {
      console.log("275,Show,이긴화이트 플레이어는:", result.win)
      //화이트플레이어 승 계산
      const getBPoint = 200  //우승포인트 
      const existBPoint = whiteP.point - getBPoint //게임전 포인트
      const totalBPoint = existBPoint + getBPoint  // 게임후 총 포인트
      const winInfo = {id:whiteP.id, usePoint:0, getPoint:getBPoint, existPoint:existBPoint,
                                          totalPoint:totalBPoint, state:whiteP.state };
      winPlayerArray.push(winInfo);    
      console.log("279,gameFinishShow --> 이겼다~~!!winPlayerArray:",winPlayerArray);

      //블랙플레이어 패 계산
      const getWPoint = 100  //패배 패널티포인트
      const existWPoint = blackP.point + getWPoint //게임전 포인트
      const totalWPoint = existWPoint - getWPoint // 게임후 총 포인트
      const loseInfo = {id:blackP.id, usePoint:0, getPoint: - getWPoint, existPoint:existWPoint,
                                        totalPoint:totalWPoint, state:blackP.state };
      losePlayerArray.push(loseInfo);
      console.log("285,gameFinishShow --> 졌어요.....losePlayerArray:",losePlayerArray);
      
      //화이트옵저버 승 계산
      for(let i=0; i<whiteO.length; i++){
        if (whiteO[i].state === 'whiteObserver') {
        //이긴팀 포인트 업데이트
        const usePoint = whiteO[i].teachingCnt  * 10;  //쓴포인트
        const chatPoint = usePoint * 1  //채팅포인트
        const addPoint = 20; //추가포인트
        const getPoint = usePoint + chatPoint + addPoint; //얻은포인트
        const existPoint = whiteO[i].point - getPoint //기존포인트
        const totalPoint = whiteO[i].point;  //총포인트
        const winObserver = { id:whiteO[i].id, usePoint:usePoint, getPoint:getPoint,
                                existPoint:existPoint, totalPoint:totalPoint, state:whiteO[i].state };
        winObserverArray2.push(winObserver);
        console.log("299,show,win,whiteO[i]",whiteO[i])
        }
      }  
      console.log("302,show, 이긴블랙옵 winObserverArray2는?", winObserverArray2);

      //블랙옵저버 패 계산
      for(let i=0; i<blackO.length; i++){
        if (blackO[i].state === 'blackObserver') {
          //진팀 포인트 업데이트
          const usePoint = blackO[i].teachingCnt * 10;  //쓴포인트
          const chatPoint = usePoint * 1  //채팅포인트
          const penalty = 20; //진팀 패널티
          const getPoint = usePoint + chatPoint + penalty;  //얻은포인트
          const existPoint = blackO[i].point + getPoint //기존포인트
          const totalPoint = blackO[i].point;  //총포인트
          const loseObserver = { id:blackO[i].id, usePoint:usePoint, getPoint: - getPoint, 
                                   existPoint:existPoint, totalPoint:totalPoint, state:blackO[i].state };
          loseObserverArray2.push(loseObserver);
          console.log("316,show,lose,blackO[i]",blackO[i])
        }
      } 
      console.log("319,show, 진화이트옵 loseObserverArray2는?", loseObserverArray2);
    }  

    const win = [...winPlayerArray, ...winObserverArray1, ...winObserverArray2, 
                      ...leftPlayerArray, ...leftObserverArray1, leftObserverArray2];
    const lose = [...losePlayerArray, ...loseObserverArray1, ...loseObserverArray2, 
                      ...outPlayerArray, outObserverArray1, outObserverArray2];
    console.log("324,show,win배열 총정보:",win)
    console.log("325,show,lose배열 총정보:",lose)
    console.log("326,result",result)

    //Observer의 teachingCnt 0으로 리셋
    const delTeachingCnt = await Users.findOne({id},{_id:false, id:true, state:true});
    if(delTeachingCnt.state === 'blackObserver' || delTeachingCnt.state === 'whiteObserver')
    await Users.updateOne({ id:id }, { $set: { teachingCnt: 0 }});
    //게임결과 후 유저 state 'online'변경
    await Users.updateOne({ id:id }, { $set: { state: 'online' }}); 

    res.status(200).json({
      gameName:findGameName.gameName,
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


//결과창에서 나가기버튼 클릭시 게임방 삭제 --작업중
const gameDelete = async (req, res) => {
  
  try {
    const { gameNum } = req.params;
    console.log("API,gameDelete,req.params:",req.params)

    const existGame = await Games.findOne({ gameNum:gameNum });
    console.log("388,delete,existGame:",existGame)
    if (existGame){
      const deleteRoomNum = await Rooms.deleteOne({ roomNum: Number(gameNum) });
      const deleteGameNum = await Games.deleteOne({ gameNum: Number(gameNum) });
      console.log("390,deleteRoomNum",deleteRoomNum)
      console.log("391,deleteGameNum",deleteGameNum)
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
