const express = require('express');
const router = express.Router();

const { userInfo } = require('../controller/room');

// 대기실 입장시 유저 정보 전달
router.post('/room/userInfo/:roomNum', userInfo);

module.exports = router;