const express = require('express');
const router = express.Router();

const {
  gameCreate,
  gameStart,
  gameFinish,
  thisGameOut,
  gameFinishShow,
  gameDelete,
} = require('../controller/games');

//대기실 => 게임방 입장시 게임방 생성
router.post('/game/create', gameCreate);

//게임방 입장해서 정보가져오기
router.get('/game/start/:gameNum', gameStart);

//[결과창]:게임이 끝나면 바로 보내는 내용
router.post('/gameFinish', gameFinish);

//[결과창]기권패: 게임중간에 player가 나갔을때
router.post('thisGameOut', thisGameOut);

//[결과창]:페이지로 들어가자마자
router.post('/gameFinish/show', gameFinishShow);

//방에서 나가기
router.delete('/game/delete/:gameNum', gameDelete);

module.exports = router;
