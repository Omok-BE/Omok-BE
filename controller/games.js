const Games = require('../models/games');
const Rooms = require('../models/rooms');
const Users = require('../models/users');
const Boards = require('../models/boards');
const Bugreport = require('../models/bugReports');
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
  } catch (error) {
    console.error(error);
    res.status(400).json({ ok: false });
  }
};

//게임방 입장해서 정보가져오기
const gameStart = async (req, res) => {
  try {
    const { gameNum } = req.params;
    console.log("50,gameStart,req.params:", req.params)
    //게임방내 유저 state별 정보
    let gameInfo = await gameUserInfo(gameNum);
    const gameName = await Games.findOne({ gameNum },{ _id:0, gameNum:1, gameName:1 });  
    const findBoardColor = await Rooms.findOne({ roomNum:gameNum }, { _id:0, boardColor:1 }); 
    console.log("55,gameStart,gameInfo:",gameInfo, "findBoardColor>>", findBoardColor);
    gameInfo.push(findBoardColor)
    res.status(200).json({
      gameInfo,
      gameName,
      ok: true,
      message: '게임방 입장해서 정보가져오기 성공!',
    });
  } catch (err) {
    console.log(`API_gameStart 에러: ${err}`);
    res.status(400).json({
      ok: false,
      errorMessage: '게임방 입장해서 정보를 가져오지 못했어요',
    });
  }
};

// [버그리폿] 
const bugReport = async (req, res) => {
  // 유저 인포를 통해 버그 제보한 사람 정보 저정하기
  // 버그 내용 인풋으로 간략히 받기
  // 게임넘 으로 제보당시의 게임방 정보를 db에서 꺼내와서 저장하기(게임이 끝나서 최신화되거나 삭제되기전 상태용)
  // 게임인포를 통해 해당 방에 있는 유저들 가져오기 
  // 게임 인포에 있는 유저들의 상태 혹은 정보 확인해보기
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
    
    res.status(201).send({
      ok: true,
      message: '제보완료',
    });
  }catch(err){
    console.log(err)
    res.status(401).send({
      ok: false,
      errorMessage: '입력받지 못하였습니다'
    })
  }
  

   

}

//[결과창]게임이 끝나면 바로 보내는 내용
const gameFinish = async (req, res) => {
  try {
    const { userInfo, gameNum, result } = req.body;
    console.log("113,gameFinish,req.body:", req.body)
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
      } else if(resultId !== id) {
        //패Player
        await Users.updateOne({ id }, { $inc: { 'score.1.lose': 1 } });  //패 +1
        await Users.updateOne({ id }, { $set: { point: point - 100 } });  //포인트 -100
      }
    }
    
    //whitePlayer 승
    if (result.state === 'whitePlayer') {
      //whiteObserver 승
      if (state === 'whiteObserver') {
        await calculatePoint({ id, isWin }); 
        
        //blackObserver 패
      } else if (state === 'blackObserver') {
        await calculatePoint({ id, isWin }); 
      }
    }
    //blackPlayer 승
    if (result.state === 'blackPlayer') {
      //blackObserver 승
      if (state === 'blackObserver') {
        await calculatePoint({ id, isWin }); 

        //whiteObserver 패
      } else if (state === 'whiteObserver') {
        await calculatePoint({ id, isWin }); 
      }
    }
    const myId = await Users.findOne({ id })
    console.log("156,gameFinish,myId:",myId)

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
    console.log('175,결과창show,req.body:', req.body);
    
    const myId = await Users.findOne({ id })
    console.log("178,show,gameFinishShow,myId:",myId)

    //게임방내 유저 state별 정보
    const gameInfo = await gameUserInfo(gameNum);
    // console.log(",show,게임디비서찾은,gameInfo[0]:",gameInfo[0]); 

    const blackP = gameInfo[0].blackTeamPlayer[0]
    const whiteP = gameInfo[0].whiteTeamPlayer[0]


    //게임승리 player- black
    if (result.win === blackP.id) {
      const [ win, lose ] = await winBlackPointShow({ gameNum });
    } 
    
    //게임승리 player- white 
    if (result.win === whiteP.id) {
      const [ win, lose ] = await winWhitePointShow({ gameNum });
    } 

    //게임방 결과창 나가기 Observer의 teachingCnt, state, connect변경
    await outUserUpdate(id);

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
    console.log(",gameDelete:",gameDelete)
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
    console.log(`API_결과창gameFinish 에러: ${err}`);
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