const Games = require('../models/games');
const Rooms = require('../models/rooms');
const Users = require('../models/users');
const Boards = require('../models/boards');
const Bugreport = require('../models/bugReports');
const Sentry = require("@sentry/node");
const { gameUserInfo } = require('../lib/games/gameUserInfo');
const { calculatePoint } = require('../lib/games/gamePoint');
const { winBlackPointShow } = require('../lib/games/winBlackPointShow');
const { winWhitePointShow } = require('../lib/games/winWhitePointShow');
const { outUserUpdate } = require('../lib/games/outUserUpdate');


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
  } catch (err) {
    Sentry.captureException(err);
    console.error(err);
    res.status(400).json({ ok: false });
  }
};

//게임방 입장해서 정보가져오기
const gameStart = async (req, res) => {
  try {
    const { gameNum } = req.params;
    let gameInfo = await gameUserInfo(gameNum);
    const gameName = await Games.findOne({ gameNum },{ _id: 0, gameNum: 1, gameName: 1 });  
    const findBoardColor = await Rooms.findOne({ roomNum: gameNum }, { _id: 0, boardColor: 1 }); 
    gameInfo.push(findBoardColor)

    res.status(200).json({
      gameInfo,
      gameName,
      ok: true,
      message: '게임방 입장해서 정보가져오기 성공!',
    });
  } catch (err) {
    Sentry.captureException(err);
    console.error(`API_gameStart 에러: ${err}`);
    res.status(400).json({
      ok: false,
      errorMessage: '게임방 입장해서 정보를 가져오지 못했어요',
    });
  }
};

// [버그리폿]
// 유저 인포를 통해 버그 제보한 사람 정보 저정하기
// 버그 내용 인풋으로 간략히 받기
// 게임넘 으로 제보당시의 게임방 정보를 db에서 꺼내와서 저장하기(게임이 끝나서 최신화되거나 삭제되기전 상태용)
// 게임인포를 통해 해당 방에 있는 유저들 가져오기 
// 게임 인포에 있는 유저들의 상태 혹은 정보 확인해보기
const bugReport = async (req, res) => {
  try{
    const { input, gameNum, gameInfo, userInfo } = req.body;

    const gameData = await Games.findOne({ gameNum }, { _id:0 });

    const bug = new Bugreport({
      reportUser: userInfo,
      gameData,
      gameInfo,
      content: input,
    });
    await bug.save();
    
    res.status(201).json({
      ok: true,
      message: '제보완료',
    });
  }catch(err){
    Sentry.captureException(err);
    console.error(err)
    res.status(401).json({
      ok: false,
      errorMessage: '입력받지 못하였습니다'
    })
  } 
};

// 게임 점수 계산
const gameFinish = async (req, res) => {
  try {
    const { userInfo, result } = req.body;
    const id = userInfo.id;
    const point = userInfo.point;
    const state = userInfo.state;
    const resultId = result.win;
    await Users.updateOne({ id }, { $set: { state: "inGame "}});
    
    if (state === 'blackPlayer' || state === 'whitePlayer') {
      if (resultId === id) {
        await Users.updateOne({ id:resultId }, { $inc: { 'score.0.win': 1 } });
        await Users.updateOne({ id:resultId }, { $set: { point: point + 200 } });
      } else if(resultId !== id) {
        await Users.updateOne({ id }, { $inc: { 'score.1.lose': 1 } });
        await Users.updateOne({ id }, { $set: { point: point - 100 } });
      }
    };
    
    if (result.state === 'whitePlayer') {
      if (state === 'whiteObserver') {
        await calculatePoint({ id, isWin: true }); 
      } else if (state === 'blackObserver') {
        await calculatePoint({ id, isWin: false }); 
      }
    }

    if (result.state === 'blackPlayer') {
      if (state === 'blackObserver') {
        await calculatePoint({ id, isWin: true }); 
      } else if (state === 'whiteObserver') {
        await calculatePoint({ id, isWin: false }); 
      }
    }
     res.status(200).json({
      ok: true,
      message: '결과창gameFinish 성공!',
    });
  } catch (err) {
    Sentry.captureException(err);
    console.error(`API_결과창gameFinish 에러: ${err}`);
    res.status(400).json({
      ok: false,
      errorMessage: '결과창gameFinish 실패',
    });
  }
};

// [게임 결과창] 게임 결과 전달
const gameFinishShow = async (req, res) => {
  try { 
    const { id, gameNum, result } = req.body;    
    const gameInfo = await gameUserInfo(gameNum);

    const blackP = gameInfo[0].blackTeamPlayer[0]
    const whiteP = gameInfo[0].whiteTeamPlayer[0]

    let winLose;
    if (result.win === blackP.id) {
      winLose = await winBlackPointShow( gameNum );
    } 
    if (result.win === whiteP.id) {
      winLose = await winWhitePointShow( gameNum );
    } 
    const [ win, lose ] = winLose
  
    await outUserUpdate(id);

    res.status(200).json({
    win,
    lose,
    result,
    ok: true,
    message: 'gameFinishShow 성공!',
    });
  } catch (err) {
    Sentry.captureException(err);
    console.error(`API_결과창gameFinishShow 에러: ${err}`);
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
    const existGame = await Games.findOne({ gameNum });
    if (existGame){
      await Rooms.deleteOne({ roomNum: Number(gameNum) });
      await Games.deleteOne({ gameNum: Number(gameNum) });
    }
    res.status(200).json({
        ok: true,
        message: '대기방, 게임방 삭제 성공!',
    });
  } catch (err) {
    Sentry.captureException(err);
    console.error(`API_결과창gameFinish 에러: ${err}`);
    res.status(400).json({
      ok: false,
      errorMessage: '대기방, 게임방 삭제 실패',
    });
  }
};

module.exports = {
  gameCreate,
  gameStart,
  bugReport,
  gameFinish,
  gameFinishShow,
  gameDelete,
};