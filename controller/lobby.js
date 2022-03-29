const Room = require('../models/rooms');
const User = require('../models/users');
// 로비 들어가서 방리스트 가져오기
const lobby = async (req, res) => {
  try {
    await Room.deleteMany({ playerCnt: 0, observerCnt: 0 });
    // await User.updateOne({ id: req.params.id }, {state: 'online'})
    const allRoom = await Room.find();

    res.send(allRoom);
  } catch (err) {
    console.log(err);
    res.status(401).send({
      errorMessage: 'lobby 요청에러',
    });
  }
};
// 로비에서 offline제외 유저리스트
const userList = async (req, res) => {
  try {
    // 내 상태 최신화
    let id = req.params.id
    await User.updateOne({id}, {$set : { connect: 'online' }})
    const allUser = await User.find({ connect: { $ne: 'offline' }}, {_id:0, pass:0, state:0, teachingCnt:0, connect:0});

    res.send(allUser);
  } catch (err) {
    console.log(err);
    res.status(401).send({
      errorMessage: 'lobby userlist err',
    });
  }
};
// 로비에서 포인트기준 리더리스트
const leaderList = async (req, res) => {
  try {
    const leaderList = await User.find({}).sort({ point: -1 }).limit(5);

    res.send(leaderList);
  } catch (err) {
    console.log(err);
    res.status(401).send({
      errorMessage: 'lobby leaderlist err',
    });
  }
};
// 리더보드
const leaderBoard = async (req, res) => {
  try {
    const leaderList = await User.find({}).sort({ point: -1 }).limit(50);

    res.send(leaderList);
  } catch (err) {
    console.log(err);
    res.status(401).send({
      errorMessage: 'lobby leaderboard err',
    });
  }
};
// 방만들기
const createRoom = async (req, res) => {
  try {
    const { roomName, id, timer } = req.body;

    await User.updateOne({ id: id }, { $set: { state: 'blackPlayer' } });
    const myInfo = await User.findOne({ id: id });
    const userInfo = {
      id: myInfo.id,
      state: myInfo.state,
      score: myInfo.score,
      point: myInfo.point,
    };

    const newRoom = new Room({
      roomName: roomName,
      playerCnt: 1,
      observerCnt: 0,
      state: 'wait',
      blackPlayer: id,
      timer: timer
    });
    await newRoom.save();

    const roomNum = await newRoom.roomNum;
    res.send({ roomNum, userInfo });
  } catch (err) {
    console.log(err);
    res.status(401).send({
      errorMessage: 'lobby create err',
    });
  }
};
// 방 참가: 모달창뜰때
const getJoinRoom = async (req, res) => {
  try {
    const { roomNum } = req.params;
    const room = await Room.findOne({ roomNum: roomNum });
    res.send(room);
  } catch (err) {
    console.log(err);
    res.status(401).send({
      errorMessage: 'lobby joinroom:roomNumber err',
    });
  }
};
// 방 참가: 모달창 입력
const postJoinRoom = async (req, res) => {
  const { roomNum, id, state } = req.body;

  try {
    // res의 body값 확인(비정상적 접근막아주기)
    if( !roomNum || !id || !state ){
      res.status(400).send({
        message: '비정상적인 접근 입니다.'
      })
      return
    }

    // 입력시 플레이어 겹치지 않게 검사
    if(state === 'blackPlayer' || state === 'whitePlayer'){
      let findplayer = await Room.findOne({ roomNum })  // 
      if(findplayer.blackTeamPlayer && state === 'blackPlayer'){
        res.status(400).send({
          message: '앗 블랙플레이어가 이미 있네요. 누군가 자리이동을 했나봐요!'
        })
        return
      }else if(findplayer.whiteTeamPlayer && state === 'whitePlayer'){
        res.status(400).send({
          message: '앗 화이트플레이어가 이미 있네요. 누군가 자리이동을 했나봐요!'
        })
        return
      }
    }

    const roomState = await Room.findOne({ roomNum }, { state: true })
    if(roomState.state === 'ingame'){
      res.status(400).send({
        message: '게임이 시작된 방입니다.',
      })
    }else {
      const user = await User.updateOne({ id: id }, { $set: { state: state } });
      const postuser = await User.findOne({ id: id });
      const userInfo = {
        id: postuser.id,
        state: postuser.state,
        score: postuser.score,
        point: postuser.point,
      };

      res.status(201).send(userInfo);
    }
    
  } catch (err) {
    console.log(err);
    res.status(400).send({
      errorMessage: '/lobby/joinroom POST 에러',
    });
  }
};
// 작업중임
const fastPlayer = async (req, res) => {
  try {
    const { id } = req.params;
    const existRooms = await Room.findOne({ playerCnt: { $ne: 2 } });
    // 플레이어가 1명인 방이 없을시
    if (existRooms.length === 0) {
      res.status(401).send({
        ok: false,
        message: '빈 플레이어 방이 없습니다.',
      });
    }

    if (!existRooms.blackTeamPlayer) {
      await User.updateOne({ id }, { $set: { state: 'blackPlayer' } });
    //   await Room.updateOne(
    //     { roomNum: existRooms.roomNum },
    //     { $set: { playerCnt: 2, blackTeamPlayer: id } }
    //   );
    } else if (!existRooms.whiteTeamPlayer) {
      await User.updateOne({ id }, { $set: { state: 'whitePlayer' } });
    //   await Room.updateOne(
    //     { roomNum: existRooms.roomNum },
    //     { $set: { playerCnt: 2, whiteTeamPlayer: id } }
    //   );
    }

    const userInfo = await User.findOne(
      { id: id },
      { _id: false, id: true, score: true, point: true, state: true }
    );
    const roomNum = existRooms.roomNum;
    res.status(201).send({
      userInfo,
      roomNum: roomNum,
    });
  } catch (err) {
    console.log(err);
    res.status(400).send({
      errorMessage: '빈 플레이어 방이 없습니다.',
    });
  }
};

const fastObserver = async (req, res) => {
  try {
    const { id } = req.params;
    const existRooms = await Room.findOne({ state: 'wait' }); //observerCnt: { $ne: 0 }, 옵저버인원 고려
    
    if (existRooms.length === 0) {
      res.status(400).send({
        ok: false,
        message: '대기중인 방이 없습니다.',
      });
    }

    // 블랙옵저버, 화이트옵저버 수가 블랙이 많은 경우만 화이트로 참가
    if (
      existRooms.blackTeamObserver.length ===
        existRooms.whiteTeamObserver.length ||
      existRooms.blackTeamObserver.length < existRooms.whiteTeamObserver.length
    ) {
      await User.updateOne({ id }, { $set: { state: 'blackObserver' } });
    //   await Room.updateOne(
    //     { roomNum: existRooms.roomNum },
    //     { $addToSet: { blackTeamObserver: id } }
    //   );
    //   await Room.updateOne(
    //     { roomNum: existRooms.roomNum },
    //     { $inc: { observerCnt: 1 } }
    //   );
    } else if (
      existRooms.blackTeamObserver.length > existRooms.whiteTeamObserver.length
    ) {
      await User.updateOne({ id }, { $set: { state: 'whiteObserver' } });
    //   await Room.updateOne(
    //     { roomNum: existRooms.roomNum },
    //     { $addToSet: { whiteTeamObserver: id } }
    //   );
    //   await Room.updateOne(
    //     { roomNum: existRooms.roomNum },
    //     { $inc: { observerCnt: 1 } }
    //   );
    }

    const userInfo = await User.findOne(
      { id: id },
      { _id: false, id: true, score: true, point: true, state: true }
    );
    const roomNum = existRooms.roomNum;
    res.status(201).send({
      userInfo,
      roomNum: roomNum,
    });
  } catch (err) {
    console.log(err);
    res.status(400).send({
      errorMessage: '대기중인 방이 없습니다.',
    });
  }
};

const roomNumJoin = async (req, res) => {
    try{
        const { id, roomNum } = req.body

        const findroom = await Room.findOne({ roomNum });
        //해당 roomNum방 있는지
        if(findroom.length !== 0){
            if(!findroom.whiteTeamPlayer){
                await User.updateOne({ id }, {$set : { state: 'whitePlayer' }})
                // await Room.updateOne({ roomNum }, {$set: { whiteTeamPlayer: id }})
            }else {
                await User.updateOne({ id }, {$set : { state: 'blackObserver' }})
                // await Room.updateOne(
                //     { roomNum },
                //     { $addToSet: { blackTeamObserver: id } }
                //   );
            }
            const userInfo = await User.findOne(
                { id: id },
                { _id: false, id: true, score: true, point: true, state: true }
              );
            res.status(201).send({
                userInfo,
                roomNum
            })
        }
        
    }catch(err){
        console.log(err);
        res.status(400).send({
        errorMessage: '입장할 수 없는 방번호 입니다',
        });
    }
}

const logout = async (req, res) => {
  try{
    const { id } = req.body;

    await User.updateOne({ id }, {connect: 'offline'});
    res.status(201).send({
      ok: 'ok',
    })
  }catch(err){
    console.log(err)
    res.status(401).send({
      ok: 'false',
    })
  }
}

module.exports = {
  lobby,
  userList,
  leaderList,
  leaderBoard,
  createRoom,
  getJoinRoom,
  postJoinRoom,
  fastPlayer,
  fastObserver,
  roomNumJoin,
  logout
};
