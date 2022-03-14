const express = require('express');
const nodemon = require('nodemon');
const User = require("../models/users");
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const auth = require('../middlewares/auth-middleware');
const router = express.Router();
// const { userInfo } = require('../controller/room');
const { signup, login, userinfo } = require('../controller/users');

// 회원가입
router.post('/signup', signup);
// 로그인 
router.post('/login', login);
// 로그인 체크
router.get('/userinfo/:id', userinfo);

module.exports = router;