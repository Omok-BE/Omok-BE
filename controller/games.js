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
    console.log('API_gameStart의 84번gameInfo:', gameInfo);

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
const gameFinishShow = async (req, res) => {
    try{
        const { id, gameNum, result } = req.body;
        console.log("186,req.body:",req.body)
        console.log("187,id:",id)
        console.log("188,gameNum:",gameNum)
        console.log("189,result:",result)

        //훈수채팅 수
        const existTeachingCnt = await Users.findOne({ id }, { _id:false, teachingCnt:true });
        const findTeachingCnt = existTeachingCnt.teachingCnt;
        console.log("194,existTeachingCnt", existTeachingCnt)
        console.log("195,findTeachingCnt", findTeachingCnt)


        //point
        const usePoint = findTeachingCnt * 10;      //쓴 포인트 
        const getPoint = usePoint * 0.5;     //얻은 포인트
        console.log("201,usePoint",usePoint)
        console.log("202,getPoint",getPoint)


        //score
        let userInfo = [];
        userInfo = await Users.findOne({id}, {_id:false, id:true, score:true});
        const state = await Users.findOne({id}, {_id:false, state:true});
        userInfo.push(usePoint);
        userInfo.push(getPoint);
        userInfo.push(state);
        console.log("API결과창211번 userInfo:", userInfo)
        console.log("212번 state:", state)

        const gameInfo = await Games.findOne({gameNum}, {_id:false, blackTeamPlayer:true, 
                                            blackTeamObserver:true, whiteTeamPlayer:true, whiteTeamObserver:true});
        res.status(200).json({
            userInfo,
            gameInfo,
            result,
            ok:true,
            message: "gameFinishShow 성공!"
        }); 
    } catch(err){
        console.log(`API_gameFinishShow,212번 에러: ${err}`);
        res.status(400).json({
            ok:false,
            errorMessage:"gameFinishShow 실패"
        });
    };
};

//게임방에서 play가 나갈때
const gameDelete = async (req, res) => {
  //순서:먼저 전인원이 겜방에서 대기방으로 이동 후 마지막 플레이어가 겜방 나갈때 방삭제
  try {
    const { gameNum } = req.params;
    const existGamePlayers = await Games.findOne(
      { gameNum: gameNum },
      { _id: false, blackTeamPlayer: true, whiteTeamPlayer: true }
    );
    if (!existGamePlayers.blackTeamPlayer || !existGamePlayers.whiteTeamPlayer)
      await Rooms.deleteOne({ roomNum: gameNum });
    await Games.deleteOne({ gameNum });
    res.status(200).json({
      ok: true,
      message: '게임방에서 나가기 성공!',
    });
  } catch (err) {
    console.log(`API_방에서 나가기 에러,235번: ${err}`);
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
