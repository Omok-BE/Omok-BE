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
    console.log('88번gameInfo:', gameInfo);
    console.log('89번gameInfo[0].blackPlayer.id:', gameInfo[0].blackTeamPlayer.id);
    console.log('90번gameInfo[0].blackObserver.id:', gameInfo[0].blackTeamObserver.id);
    console.log('91번gameInfo[0].whitePlayer.id:', gameInfo[0].whiteTeamPlayer.id);
    console.log('92번gameInfo[0].whiteObserver.id:', gameInfo[0].whiteTeamObserver.id);
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
  return gameStart;
};

//결과창 post
const gameFinish = async (req, res) => {
  try {
    const { userInfo, gameNum, result } = req.body;
    const id = userInfo.id;
    const state = userInfo.state;
    const score = userInfo.score;
    const point = userInfo.point;

    //승자id
    const resultId = result.win;
    const winPlayer = await Users.findOne({ id: resultId },
                                            { score: score, point: point, state: state });
    //Player
    if (state === 'blackPlayer' || state === 'whitePlayer') {
      // const losePlayerId = 
      if (resultId === id) {
        //승Player
        await Users.updateOne({ id: resultId }, { $inc: { 'score.0.win': 1 } }); //승 +1
        await Users.updateOne({ id: resultId }, { $set: { point: point + 150 } }); //포인트 +150
        console.log(`API_우승자 score에 1승, point에 +150이 추가되었습니다.`);
      } else if(resultId !== id) {
        //패Player
        await Users.updateOne({ id: resultId }, { $inc: { 'score.0.lose': 1 } }); //패 +1
        await Users.updateOne({ id: resultId }, { $set: { point: point - 50 } }); //포인트 -50
        console.log(`API_패자 score에 1패, point에 -50이 추가되었습니다.`);
      }
    }

    //Observer
    //훈수채팅 수
    const observerTeachingCnt = await Users.findOne({ id: id },
                                                        { _id: false, teachingCnt: true });

    //이긴팀 point
    const winUseTeachingPoint = observerTeachingCnt * 10; //쓴 포인트
    const winGetTeachingPoint = winUseTeachingPoint * 0.5; //얻은 포인트
    const winTotalPoint = winGetTeachingPoint + winUseTeachingPoint + point; //총 포인트

    //이긴 Player가 white팀 일때
    if (winPlayer.state === 'whitePlayer') {
      if (state === 'whiteObserver' && observerTeachingCnt !== 0) {
        //포인트 업데이트
        await Users.updateOne({ id: id }, { $set: { point: winTotalPoint } });
      } else if (state === 'blackObserver' && observerTeachingCnt !== 0) {
        const findLoseTeamCnt = observerTeachingCnt.teachingCnt;

        //point
        const loseUseTeachingPoint = findLoseTeamCnt * 10; //쓴 포인트
        const loseTotalPoint = point - loseUseTeachingPoint; //게임후 총 포인트
        await Users.updateOne({ id: id }, { $set: { point: loseTotalPoint } });
      }
    }

    //이긴 Player가 black팀 일때
    if (winPlayer.state === 'blackPlayer') {
      if (state === 'blackObserver' && observerTeachingCnt !== 0) {
        //point updateOne
        await Users.updateOne({ id: id }, { $set: { point: winTotalPoint } });
      } else if (state === 'whiteObserver' && observerTeachingCnt !== 0) {
        const findLoseTeamCnt = observerTeachingCnt.teachingCnt;

        //point
        const loseUseTeachingPoint = findLoseTeamCnt * 10; //쓴 포인트
        const loseTotalPoint = point - loseUseTeachingPoint; //게임후 총 포인트
        await Users.updateOne({ id: id }, { $set: { point: loseTotalPoint } });
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
  try { //내id,  내게임방번호, 내게임승자id
    const { id, gameNum, result } = req.body;
    console.log('189,결과창show,req.body:', req.body);
    console.log('190,결과창show,id:', id);
    console.log('191,결과창show,gameNum:', gameNum);
    console.log('192,결과창show,result:', result);
    
    let user = await Users.find({ id: id });
    console.log("199,user", user);
    //훈수채팅 수
    const findTeachingCnt = user.teachingCnt;
    console.log('198결과창show,findTeachingCnt', findTeachingCnt);

    //point
    const usePoint = findTeachingCnt * 10; //쓴 포인트
    const getPoint = usePoint * 0.5; //얻은 포인트
    const totalPoint = user.point  //총 포인트 (gameFinish에서 총포인트 업뎃됨)
    console.log('205결과창show,usePoint', usePoint);
    console.log('206결과창show,getPoint', getPoint);
    console.log('207결과창show,totalPoint', totalPoint);

    //player- 이긴팀, 진팀 
    let win = [];
    let lose = [];
    if (user.state === 'blackPlayer' || user.state === 'whitePlayer') {
        if(result.win === user.id  ) { //이긴팀
            const winInfo = { id:user.id, usePoint:usePoint, getPoint:getPoint, 
                                    totalPoint:totalPoint, state:user.state };
            win.push(winInfo);
            console.log('215결과창show win:', win);
            console.log('216결과창show win[0].id:', win[0].id);
            console.log('217결과창show win[0].state:', win[0].state);
            console.log('218결과창show winInfo:', winInfo);
            console.log("gameFinishShow --> 이겼다~~!!");
        } else if(result.win !== user.id) {  //진 팀
            const loseInfo = { id:user.id, usePoint:usePoint, getPoint:getPoint, 
                                     totalPoint:totalPoint, state:user.state };
            lose.push(loseInfo);
            console.log('224결과창show lose:', lose);
            console.log('225결과창show lose[0].id:', lose[0].id);
            console.log('226결과창show lose[0].state:', lose[0].state);
            console.log('227결과창show loseInfo:', loseInfo);
            console.log("gameFinishShow --> 졌어.....");
        }
    }

    // gameNum으로 모든 observer 찾기
    const games = await Games.find({gameNum})
    // const blackObservers = games.blackTeamObserver
    // const whiteObservers = games.whiteTeamObserver

    console.log("237,win",win)
    console.log("238,lose",lose)
    //observer- whitePlayer가 이겼을때 whiteObserver
    if (result.id === games.whiteTeamPlayer) {
      if (user.state === 'whiteObserver' && findTeachingCnt !== 0) {
        //이긴팀 포인트 업데이트
        const winObserver = { id:user.id, usePoint:usePoint, getPoint:getPoint, 
                  totalPoint:totalPoint, state:user.state };
        win.push(winObserver);
        console.log("246,API_show_이긴옵저버는?", winObserver);
      } else if (user.state === 'blackObserver' && findTeachingCnt !== 0) {
        //진팀 포인트 업데이트
        const loseObserver = { id:user.id, usePoint:usePoint, getPoint:getPoint, 
          totalPoint:loseTotalPoint, state:user.state };
          lose.push(loseObserver);
          console.log("252,API_show_진옵저버는?", loseObserver);
        }
      }
      //blackPlayer 이겼을때
      if (result.id === games.blackTeamPlayer) {
        if (user.state === 'blackObserver' && findTeachingCnt !== 0) {
          //이긴팀 포인트 업데이트
          const winObserver = { id:user.id, usePoint:usePoint, getPoint:getPoint, 
            totalPoint:totalPoint, state:user.state };
            win.push(winObserver);
            console.log("262,API_show_이긴옵저버는?", winObserver);
          } else if (user.state === 'whiteObserver' && findTeachingCnt !== 0) {
            //진팀 포인트 업데이트
            const loseObserver = { id:user.id, usePoint:usePoint, getPoint:getPoint, 
              totalPoint:loseTotalPoint, state:user.state };
              lose.push(loseObserver);
              console.log("270,API_show_진옵저버는?", loseObserver);
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


//게임방에서 play가 나갈때
const gameDelete = async (req, res) => {
  //순서:먼저 전인원이 겜방에서 대기방으로 이동 후 마지막 플레이어가 겜방 나갈때 방삭제
  try {
    const { gameNum } = req.params;
    const existGamePlayers = await Games.findOne({ gameNum: gameNum },
                                                    { _id: false, blackTeamPlayer: true, whiteTeamPlayer: true });
    if (!existGamePlayers.blackTeamPlayer || !existGamePlayers.whiteTeamPlayer)
      await Rooms.deleteOne({ roomNum: gameNum });
      await Games.deleteOne({ gameNum });
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
