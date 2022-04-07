const Room = require('../models/rooms');
const User = require('../models/users');
const Sentry = require('@sentry/node');

// 로비 들어가서 방리스트 가져오기
const lobby = async (req, res) => {
  try {
    await Room.deleteMany({ playerCnt: 0, observerCnt: 0 });
    const allRoom = await Room.find();
    res.status(200).send(allRoom);
  } catch (err) {
    Sentry.captureException(err);
    console.error(err);
    res.status(401).json({
      errorMessage: 'lobby 요청에러',
    });
  }
};

// 로비에서 offline제외 유저리스트
const userList = async (req, res) => {
  try {
    let id = req.params.id;
    await User.updateOne({ id }, { $set: { connect: 'online' } });
    const allUser = await User.find(
      {
        $and: [
          { connect: { $ne: 'offline' } },
          { connect: { $ne: 'endRoom' } },
          { connect: { $ne: 'endGame' } },
        ],
      },
      { _id: 0, pass: 0, state: 0, teachingCnt: 0, connect: 0 }
    );

    res.status(200).send(allUser);
  } catch (err) {
    Sentry.captureException(err);
    console.error(err);
    res.status(401).json({
      errorMessage: 'lobby userlist err',
    });
  }
};

// 로비에서 포인트기준 리더리스트
const leaderList = async (req, res) => {
  try {
    const leaderList = await User.find(
      {},
      { _id: 0, pass: 0, state: 0, teachingCnt: 0, connect: 0 }
    )
      .sort({ point: -1 })
      .limit(5);

    res.status(200).send(leaderList);
  } catch (err) {
    Sentry.captureException(err);
    console.error(err);
    res.status(401).json({
      errorMessage: 'lobby leaderlist err',
    });
  }
};

// 리더보드
const leaderBoard = async (req, res) => {
  try {
    const leaderList = await User.find(
      {},
      { _id: 0, pass: 0, state: 0, teachingCnt: 0, connect: 0 }
    )
      .sort({ point: -1 })
      .limit(50);

    res.status(200).send(leaderList);
  } catch (err) {
    Sentry.captureException(err);
    console.error(err);
    res.status(401).json({
      errorMessage: 'lobby leaderboard err',
    });
  }
};

// 방만들기
const createRoom = async (req, res) => {
  try {
    const { roomName, id, timer, boardColor } = req.body;

    await User.updateOne({ id }, { $set: { state: 'blackPlayer' } });
    const myInfo = await User.findOne({ id });
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
      timer: timer,
      boardColor: boardColor,
    });
    await newRoom.save();

    const roomNum = await newRoom.roomNum;
    res.status(201).json({ roomNum, userInfo });
  } catch (err) {
    Sentry.captureException(err);
    console.error(err);
    res.status(401).json({
      errorMessage: 'lobby create err',
    });
  }
};
// 방 참가: 모달창뜰때
const getJoinRoom = async (req, res) => {
  try {
    const { roomNum } = req.params;
    const room = await Room.findOne({ roomNum });
    res.send(room);
  } catch (err) {
    Sentry.captureException(err);
    console.error(err);
    res.status(401).json({
      errorMessage: 'lobby joinroom:roomNumber err',
    });
  }
};
// 방 참가: 모달창 입력
const postJoinRoom = async (req, res) => {
  const { roomNum, id, state } = req.body;

  try {
    // res의 body값 확인(비정상적 접근막아주기)
    if (!roomNum || !id || !state) {
      res.status(400).json({
        message: '비정상적인 접근 입니다.',
      });
      return;
    }

    if (state === 'blackPlayer' || state === 'whitePlayer') {
      let findplayer = await Room.findOne({ roomNum });
      if (findplayer.blackTeamPlayer && state === 'blackPlayer') {
        res.status(400).json({
          message: '앗 블랙플레이어가 이미 있네요. 누군가 자리이동을 했나봐요!',
        });
        return;
      } else if (findplayer.whiteTeamPlayer && state === 'whitePlayer') {
        res.status(400).json({
          message:
            '앗 화이트플레이어가 이미 있네요. 누군가 자리이동을 했나봐요!',
        });
        return;
      }
    }

    const roomState = await Room.findOne({ roomNum }, { state: true });
    if (roomState.state === 'ingame') {
      res.status(400).json({
        message: '게임이 시작된 방입니다.',
      });
    } else {
      await User.updateOne({ id }, { $set: { state } });
      const postuser = await User.findOne({ id });
      const userInfo = {
        id: postuser.id,
        state: postuser.state,
        score: postuser.score,
        point: postuser.point,
      };

      res.status(201).send(userInfo);
    }
  } catch (err) {
    Sentry.captureException(err);
    console.error(err);
    res.status(400).json({
      errorMessage: '/lobby/joinroom POST 에러',
    });
  }
};

// 빠른 참가(플레이어)
const fastPlayer = async (req, res) => {
  try {
    const { id } = req.params;
    const existRooms = await Room.findOne({ playerCnt: { $ne: 2 } });

    if (existRooms === undefined) {
      res.status(401).json({
        ok: false,
        message: '빈 플레이어 방이 없습니다.',
      });
      return;
    }

    if (existRooms.blackTeamPlayer) {
      await User.updateOne({ id }, { $set: { state: 'blackPlayer' } });
    } else if (existRooms.whiteTeamPlayer) {
      await User.updateOne({ id }, { $set: { state: 'whitePlayer' } });
    }

    const userInfo = await User.findOne(
      { id },
      { _id: false, id: true, score: true, point: true, state: true }
    );
    const roomNum = existRooms.roomNum;
    res.status(201).json({
      userInfo,
      roomNum,
    });
  } catch (err) {
    Sentry.captureException(err);
    console.error(err);
    res.status(400).json({
      errorMessage: '빈 플레이어 방이 없습니다.',
    });
  }
};

// 빠른 참가(관전자)
const fastObserver = async (req, res) => {
  try {
    const { id } = req.params;
    const existRooms = await Room.findOne({ state: 'wait' });

    if (existRooms.length === 0) {
      res.status(400).json({
        ok: false,
        message: '대기중인 방이 없습니다.',
      });
      return;
    }

    // 블랙옵저버, 화이트옵저버 수가 블랙이 많은 경우만 화이트로 참가
    if (
      existRooms.blackTeamObserver.length ===
        existRooms.whiteTeamObserver.length ||
      existRooms.blackTeamObserver.length < existRooms.whiteTeamObserver.length
    ) {
      await User.updateOne({ id }, { $set: { state: 'blackObserver' } });
    } else if (
      existRooms.blackTeamObserver.length > existRooms.whiteTeamObserver.length
    ) {
      await User.updateOne({ id }, { $set: { state: 'whiteObserver' } });
    }

    const userInfo = await User.findOne(
      { id },
      { _id: false, id: true, score: true, point: true, state: true }
    );
    const roomNum = existRooms.roomNum;
    res.status(201).json({
      userInfo,
      roomNum,
    });
  } catch (err) {
    Sentry.captureException(err);
    console.error(err);
    res.status(400).json({
      errorMessage: '대기중인 방이 없습니다.',
    });
  }
};

// 방번호로 참가
const roomNumJoin = async (req, res) => {
  try {
    const { id, roomNum } = req.body;

    const findroom = await Room.findOne({ roomNum });
    if (findroom.length !== 0) {
      if (!findroom.whiteTeamPlayer) {
        await User.updateOne({ id }, { $set: { state: 'whitePlayer' } });
      } else {
        await User.updateOne({ id }, { $set: { state: 'blackObserver' } });
      }
      const userInfo = await User.findOne(
        { id },
        { _id: false, id: true, score: true, point: true, state: true }
      );
      res.status(201).json({
        userInfo,
        roomNum,
      });
    }
  } catch (err) {
    Sentry.captureException(err);
    console.error(err);
    res.status(400).json({
      errorMessage: '입장할 수 없는 방번호 입니다',
    });
  }
};

// 로그아웃
const logout = async (req, res) => {
  try {
    const { id } = req.body;

    await User.updateOne({ id }, { connect: 'offline' });
    res.status(201).json({
      ok: 'ok',
    });
  } catch (err) {
    Sentry.captureException(err);
    console.error(err);
    res.status(401).json({
      ok: 'false',
    });
  }
};

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
  logout,
};
