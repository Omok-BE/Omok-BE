const express = require('express');
const router = express.Router();

const {
    adminLogin,
    getWaitingRooms,
    deleteWaitingRoom,
    getGameRooms,
    deleteGameRoom,
    getUsers,
    editUserPoint,
    deleteUser
} = require('../controller/admin')

// 관리자 로그인 페이지
router.get('/', (req, res) => {
    res.render('adminLogin');
});
// 관리자 페이지
router.get('/page', (req, res) => {
    res.render('admin');
});
// 대기실 관리 페이지
router.get('/waitingRoom', (req, res) => {
    res.render('waitingRoom');
});
// 게임방 관리 페이지
router.get('/gameRoom', (req, res) => {
    res.render('gameRoom');
});
// 유저 관리 페이지
router.get('/users', (req, res) => {
    res.render('users');
});

// 관리자 로그인      
router.post('/login', adminLogin)
// 대기방 리스트 불러오기
router.get('/waitingRoom/list', getWaitingRooms);
// 대기방 삭제
router.delete('/waitingRoom/delete/:roomNum', deleteWaitingRoom);
// 게임방 리스트 불러오기
router.get('/gameRoom/list', getGameRooms);
// 게임방 삭제
router.delete('/gameRoom/delete/:gameNum', deleteGameRoom);
// 유저 리스트 불러오기
router.get('/users/list', getUsers);
// 유저 포인트 수정하기
router.put('/users/editPoint/:id', editUserPoint);
// 유저 삭제하기
router.delete('/users/delete/:id', deleteUser);

module.exports = router;