const express = require('express');
const Room = require('../models/rooms');
const User = require('../models/users');

const router = express.Router();

const { lobby, userList, leaderList, leaderBoard, createRoom, getJoinRoom, postJoinRoom } = require('../controller/lobby');

// 로비첫 화면
router.get('/lobby', lobby);

//로비 유저리스트
router.get('/lobby/userList', userList);

// 로비 간이 리더리스트
router.get('/lobby/leaderList', leaderList);

// 리더보드 50개 정보띄워주기용
router.get('/leaderBoard',leaderBoard );

// 방 만들기
router.post('/lobby/create', createRoom);

// [방 입장 모달창 ]
router.get('/lobby/joinroom/:roomNum', getJoinRoom);

// [방 입장 모달창]: 버튼 입력
router.post('/lobby/joinroom', postJoinRoom);

module.exports = router;