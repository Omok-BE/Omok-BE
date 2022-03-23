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
        await Users.updateOne({ id: resultId }, { $inc: { 'score.0.win': 1 } }); //승 +1
        await Users.updateOne({ id: resultId }, { $set: { point: point + 150 } }); //포인트 +150
        console.log(`API_우승자 score에 1승, point에 +150이 추가되었습니다.`);
      } else if(resultId !== id) {
        //패Player
        await Users.updateOne({ id: id }, { $inc: { 'score.1.lose': 1 } }); //패 +1
        await Users.updateOne({ id: id }, { $set: { point: point - 50 } }); //포인트 -50
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
    const winTotalPoint = winGetTeachingPoint + useTeachingPoint + point; //게임후 총 포인트
    //진팀 point
    const loseTotalPoint = point - useTeachingPoint; //게임후 총 포인트
    //whitePlayer 이김
    if (winPlayer.state === 'whitePlayer') {
      console.log("옵저버포인트계산- whitePlayer 이김")
      // console.log("149,thisTeachingCnt:", thisTeachingCnt)
      if (state === 'whiteObserver' && thisTeachingCnt !== 0) {
        console.log("151, 화이트옵 이긴포인트계산 whitePlayer이겼을때")
        //포인트 업데이트
        // console.log("153,화이트옵 이긴thisTeachingCnt업뎃전:", thisTeachingCnt)
        // console.log("154,화이트옵 이긴포인트 업뎃전:", winTotalPoint)
        await Users.updateOne({ id: id }, { $set: { point: winTotalPoint } });
        // console.log("156,화이트옵 이긴thisTeachingCnt업뎃후리셋전:", thisTeachingCnt)
        // console.log("157,화이트옵 이긴포인트 업뎃후후:", winTotalPoint)
        await Users.updateOne({ id: id }, { $set: { teachingCnt: 0 }}); 
        // console.log("159,화이트옵 이긴thisTeachingCnt리셋000:", thisTeachingCnt)
      } else if (state === 'blackObserver' && thisTeachingCnt !== 0) {
        console.log("161,블랙옵 진포인트계산 whitePlayer이겼을때")
        // console.log("162,블랙옵 진thisTeachingCnt업뎃전:", thisTeachingCnt)
        // console.log("163,블랙옵 진포인트 업뎃전:",loseTotalPoint)
        await Users.updateOne({ id: id }, { $set: { point: loseTotalPoint } });
        // console.log("165,블랙옵 진thisTeachingCnt업뎃후리셋전:", thisTeachingCnt)
        // console.log("166,블랙옵 진포인트 업뎃후후:", loseTotalPoint)
        await Users.updateOne({ id: id }, { $set: { teachingCnt: 0 }}); 
        // console.log("168,블랙옵 진thisTeachingCnt리셋000:", thisTeachingCnt)
      }
    }
    
    //blackPlayer 이김
    if (winPlayer.state === 'blackPlayer') {
      console.log("옵저버포인트계산-blackPlayer 이김")
      // console.log("175,thisTeachingCnt:", thisTeachingCnt)
      if (state === 'blackObserver' && thisTeachingCnt !== 0) {
        console.log("177,블랙옵 이긴포인트계산 blackPlayer이겼을때")
        //포인트 업데이트
        // console.log("179,블랙옵 이긴thisTeachingCnt업뎃전:", thisTeachingCnt)
        // console.log("180,블랙옵 이긴포인트 업뎃전:", winTotalPoint)
        await Users.updateOne({ id: id }, { $set: { point: winTotalPoint } });
        // console.log("182,블랙옵 이긴thisTeachingCnt업뎃후리셋전:", thisTeachingCnt)
        // console.log("183,블랙옵 이긴포인트 업뎃후후:", winTotalPoint)
        await Users.updateOne({ id: id }, { $set: { teachingCnt: 0 }}); 
        // console.log("185,블랙옵 이긴thisTeachingCnt리셋000:", thisTeachingCnt)
      } else if (state === 'whiteObserver' && thisTeachingCnt !== 0) {
        console.log("187,화이트옵 진포인트계산 blackPlayer이겼을때")
        // console.log("188,화이트옵 진thisTeachingCnt업뎃전:", thisTeachingCnt)
        // console.log("189,화이트옵 진포인트 업뎃전:",loseTotalPoint)
        await Users.updateOne({ id: id }, { $set: { point: loseTotalPoint } });
        // console.log("191,화이트옵 진thisTeachingCnt업뎃후리셋전:", thisTeachingCnt)
        // console.log("192,화이트옵 진포인트 업뎃후후:", loseTotalPoint)
        await Users.updateOne({ id: id }, { $set: { teachingCnt: 0 }}); 
        // console.log("194,화이트옵 진thisTeachingCnt리셋000:", thisTeachingCnt)
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
//win:[{id, usePoint, getPoint, totalPoint, state},{}]
// win 각각의 아이디별 정보 배열로 보내기
// 1.aggregate로 전체 정보를 조인해서 찾는다. (aggregate에서 point, teachingCnt가 계산전 값인지, 후 값인지 확인할것)
// 2. find로 user디비에서 필요한 전체 유저 정보를 찾고 game디비에서 
//     gameNum별 팀을 찾아서 아이디가 같으면 win, lose로 묶기
const gameFinishShow = async (req, res) => {
  try { //내id,  내게임방번호, 내게임승자id
    const { id, gameNum, result } = req.body;
    console.log('220,결과창show진입:');
    console.log('221,결과창show,req.body:', req.body);

    //내id로 내정보만 찾기. 한명 한명 찾음.
    let user = await Users.findOne({id:id}, {_id:false, id:true, point:true, state:true, teachingCnt:true});
    // console.log("225,show,user:",user) // user: {id:"user1", state:"player", teachingCnt:2}
    // console.log("226,show,user.id", user.id)   // 'ad'
    // console.log("227,show,result.win", result.win)   //
    // console.log("228,show,user.point", user.point)   // 1000
    // console.log("229,show,user.state", user.state)   // 'whitePlayer'
    // console.log("230,show,user.teachingCnt", user.teachingCnt)   //2
    
    //모든 유저 정보 한번에 찾기
    let allUser = await Users.find({}, {_id:false, id:true, point:true, state:true, teachingCnt:true});
    // console.log("234,show,allUser:", allUser) // allUser: [{id:"user1", state:"player"},{}...]
    
    
    //훈수채팅 수
    const findTeachingCnt = user.teachingCnt;  // 2
    //이긴팀 point
    const usePoint = findTeachingCnt * 10; //쓴 포인트
    const getPoint = usePoint * 0.5; //얻은 포인트
    const totalPoint = user.point   //총 포인트 (gameFinish에서 총포인트 업뎃됨)
    const winTotalPoint = totalPoint + usePoint + getPoint;
    //진팀 point
    const loseTotalPoint = totalPoint - usePoint;
    // console.log("246,show,이긴팀총포인트:",winTotalPoint)
    // console.log("247,show,진팀총포인트:",loseTotalPoint)

    // gameNum으로 모든 유저찾기
    const gameUserIds = await Games.findOne({gameNum:gameNum},
                                    { _id:false, blackTeamPlayer:true, blackTeamObserver:true, 
                                                 whiteTeamPlayer:true, whiteTeamObserver:true });
    console.log("253,내 게임방 모든 gameUserIds:",gameUserIds)                                
    
    //player 
    let win = [];
    let lose = [];
    if (user.state === 'blackPlayer' || user.state === 'whitePlayer') {
      console.log("Show,이긴플레이어 if안 진입")
      // console.log("260,show,이긴플레이어 user.state:",user.state)
      
      if(result.win === user.id  ) { //이긴팀
        const winInfo = { id:user.id, usePoint:usePoint, getPoint:getPoint, 
                                        totalPoint:winTotalPoint, state:user.state };
          win.push(winInfo);
          console.log("gameFinishShow --> 이겼다~~!!win:",win);
      } else if(result.win !== user.id) {  //진 팀
        console.log("268,Show,진플레이어 if안 진입")
        // console.log("269,show,진플레이어:",user.state)
        const loseInfo = { id:user.id, usePoint:usePoint, getPoint:getPoint, 
                                         totalPoint:loseTotalPoint, state:user.state };
          lose.push(loseInfo);
          console.log("gameFinishShow --> 졌어요.....lose:",lose);
      }
    }
    console.log("276,show,winPlayer:",win)
    console.log("277,show,losePlayer:",lose)


    //find로 전체 유저id와 정보 찾고 gameNum으로 observerId찾은 후에 이긴팀 진팀 구별해서 포인트 계산후 보여준다. 
    //observer- 이긴팀, 진팀
    // const findObservers= gameUserIds.find((item, index, arr) => {
    //   return gameUserIds.id === 'whiteTeamObserver'
    // });
    // console.log("285,gameUserIds:", gameUserIds)
    
    //이긴 player가 white팀 일때 whiteTeamObserver
    // if (result.win === games.whiteTeamPlayer ) {
    //   if (gameUserIds.whiteTeamObserver){
    //   }
    // }

    
    
    console.log("295,show,games:",gameUserIds)
    
    
    // observer- whitePlayer가 이겼을때
    if (result.win === gameUserIds.whiteTeamPlayer) {
      console.log("300,show, 이긴화이트옵저버 계산")
      // console.log("301,show, 이긴화이트옵저버 아이디:",result.win)
      // console.log("302,show, 이긴 gameUserIds.whiteTeamPlayer는:",gameUserIds.whiteTeamPlayer)
      if (user.state === 'whiteObserver') { // 훈수챗 안했을때도 계산됨
      // if (user.state === 'whiteObserver' && findTeachingCnt !== 0) {  훈수챗 했을때만 계산됨.
        console.log("305,show, 이긴화이트옵 계산")
        //이긴팀 포인트 업데이트
        const winObserver = { id:user.id, usePoint:usePoint, getPoint:getPoint, 
                                            totalPoint:winTotalPoint, state:user.state };
        win.push(winObserver);
        console.log("310,show, 이긴화이트옵 정보는?", winObserver);
        // console.log("311,show, win배열에 이긴화이트옵추가:", win);
      } else if (user.state === 'blackObserver') {
        console.log("313,show,  진블랙옵 계산")
        //진팀 포인트 업데이트
        const loseObserver = { id:user.id, usePoint:usePoint, getPoint:getPoint, 
                                             totalPoint:loseTotalPoint, state:user.state };
        lose.push(loseObserver);
        // console.log("318,show, 진블랙옵 정보는?", loseObserver);
        console.log("319,show, lose배열에 진블랙옵추가:",lose)
      }
    }
    // observer- blackPlayer 이겼을때
    if (result.win === gameUserIds.blackTeamPlayer) {
      console.log("324,show, 이긴블랙옵저버 계산")
      // console.log("325,show, 이긴블랙플레이어 아이디:",result.win)
      // console.log("326,show, 이긴블랙 gameUserIds.blackTeamPlayer는:",gameUserIds.blackTeamPlayer)
      if (user.state === 'blackObserver') {
        console.log("328,show, 이긴블랙옵 계산")
        //이긴팀 포인트 업데이트
        const winObserver = { id:user.id, usePoint:usePoint, getPoint:getPoint, 
                                            totalPoint:winTotalPoint, state:user.state };
        win.push(winObserver);
        // console.log("333,show, 이긴블랙옵 정보는?", winObserver);
        console.log("334,show, win배열에 이긴블랙옵추가:", win);
      } else if (user.state === 'whiteObserver') {
        console.log("336,show, 진화이트옵 계산")
        //진팀 포인트 업데이트
        const loseObserver = { id:user.id, usePoint:usePoint, getPoint:getPoint, 
                                            totalPoint:loseTotalPoint, state:user.state };
        lose.push(loseObserver);
        // console.log("341,show, 진화이트옵정보는?", loseObserver);
        console.log("342,show, lose배열에 진화이트옵추가:", lose);
      }
    } 

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
    console.log(`API_방에서 나가기 에러: ${err}`);
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
