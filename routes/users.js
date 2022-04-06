const express = require('express');
const router = express.Router();
const { signup, login, findpass, newpass, userinfo } = require('../controller/users');

// 회원가입
router.post('/signup', signup);

// 로그인
router.post('/login', login);

// 비밀번호 찾기 가기
router.post('/findpass', findpass);

// 비밀번호 변경
router.post('/newpass', newpass)

// 로그인 체크
router.get('/userinfo/:id', userinfo);

module.exports = router;
