const express = require('express');
const router = express.Router();

const {
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
} = require('../controller/lobby');

// 로비첫 화면
router.get('/lobby/:id', lobby);

//로비 유저리스트
router.get('/lobby/userList', userList);

// 로비 간이 리더리스트
router.get('/lobby/leaderList', leaderList);

// 리더보드 50개 정보띄워주기용
router.get('/leaderBoard', leaderBoard);

// 방 만들기
router.post('/lobby/create', createRoom);

// [방 입장 모달창 ]
router.get('/lobby/joinroom/:roomNum', getJoinRoom);

// [방 입장 모달창]: 버튼 입력
router.post('/lobby/joinroom', postJoinRoom);

//빠른 참가(플레이어)
router.get('/lobby/fastPlayer/:id', fastPlayer);

// 빠른 참가(관전자)
router.get('/lobby/fastObserver/:id', fastObserver);

// 방번호 참가
router.post('/lobby/roomNumJoin', roomNumJoin)

module.exports = router;
