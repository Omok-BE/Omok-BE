const express = require('express');
const router = express.Router();

const {
  gameCreate,
  gameStart,
  bugReport,
  gameFinish,
  gameFinishShow,
  gameDelete,
} = require('../controller/games');

// 대기실 => 게임방 입장시 게임방 생성
router.post('/game/create', gameCreate);

// 게임방 입장해서 정보가져오기
router.get('/game/start/:gameNum', gameStart);

// [버그리폿]
router.post('/game/bugreport', bugReport);

// 게임 결과 계산
router.post('/gameFinish', gameFinish);

// [결과창] 게임 결과 보여주기
router.post('/gameFinish/show', gameFinishShow);

// 퇴장시 방 삭제
router.delete('/game/delete/:gameNum', gameDelete);

module.exports = router;
