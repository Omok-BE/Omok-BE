const express = require('express');
const router = express.Router();
const Users = require('../models/users')
const Games = require('../models/rooms')
const Rooms = require('../models/rooms')
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

router.get('/', (req, res) => {
    res.render('adminLogin');
});

router.get('/page', (req, res) => {
    res.render('admin');
});

router.get('/page', (req, res) => {
    res.render('admin');
});

router.get('/waitingRoom', (req, res) => {
    res.render('waitingRoom');
});

router.get('/gameRoom', (req, res) => {
    res.render('gameRoom');
});

router.get('/users', (req, res) => {
    res.render('users');
});

// 관리자 로그인      
router.post('/login', async (req, res) => {
    try {
        const { id, pass } = req.body;
        const encodedPass = crypto
        .createHash(process.env.Algorithm)
        .update(pass + process.env.salt)
        .digest('base64');

        if (id !== 'admin') {
            return res.status(400).json({
                errorMessage: '관리자가 아닙니다.'
            });
        };
        const admin = await Users.findOne({ id });
        if (encodedPass !== admin.pass){
            return res.status(400).json({
                errorMessage: '패스워드를 확인해주세요'
            });
        };
        if (pass === admin.pass){
                return res.status(400).json({
                    errorMessage: '패스워드를 확인해주세요'
            });
        }
        const token = jwt.sign({ id: admin.id }, process.env.TOKENKEY);
        res.status(200).json({
            token,
            message: '관리자 로그인 성공'
        })
    } catch(error) {
        console.error(error);
        res.status(400).json({
            errorMessage: '요청한 데이터 형식이 올바르지 않습니.'
        })
    }
});

router.get('/waitingRoom/list', async (req, res) => {
    try {
        const waitingRooms = await Rooms.find().sort('roomNum').exec();
        res.status(200).json({
            waitingRooms
        })
    } catch(error) {
        console.error(error)
        res.status(400).json({
            errorMessage: '데이터 불러오기에 실패했습니다.'
        })
    }
});

router.delete('/waitingRoom/delete/:roomNum', async (req, res) => {
    try {
        const { roomNum } = req.params
        await Rooms.deleteOne({ roomNum })
        res.status(200).json({
            message: '삭제되었습니다.'
        })
    } catch(error) {
        console.error(error)
        res.status(400).json({
            errorMessage: '오류가 발생하였습니다. 대기실을 확인해주세요.'
        })
    }
});

router.get('/gameRoom/list', async (req, res) => {
    try {
        const gameRooms = await Games.find().sort('gameNum').exec();
        res.status(200).json({
            gameRooms
        })
    } catch(error) {
        console.error(error)
        res.status(400).json({
            errorMessage: '데이터 불러오기에 실패했습니다.'
        })
    }
});

router.delete('/gameRoom/delete/:gameNum', async (req, res) => {
    try {
        const { roomNum } = req.params
        await Games.deleteOne({ roomNum })
        res.status(200).json({
            message: '삭제되었습니다.'
        })
    } catch(error) {
        console.error(error)
        res.status(400).json({
            errorMessage: '오류가 발생하였습니다. 대기실을 확인해주세요.'
        })
    }
});

router.get('/users/list', async (req, res) => {
    try {
        const userList = await Users.find({id: {$ne: 'admin'}});
        res.status(200).json({
            userList
        })
    } catch(error) {
        console.error(error)
        res.status(400).json({
            errorMessage: '데이터 불러오기에 실패했습니다.'
        })
    }
});

router.put('/users/editPoint/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { point } = req.body;
        await Users.updateOne({ id }, { $set: { point }})
        res.status(200).json({
            message: '포인트가 수정되었습니다.'
        })
    } catch(error) {
        console.error(error)
        res.status(400).json({
            errorMessage: '오류가 발생하였습니다. 다시 시도해주세요.'
        })
    }
});

router.delete('/users/delete/:id', async (req, res) => {
    try {
        const { id } = req.params
        await Users.deleteOne({ id })
        res.status(200).json({
            message: '삭제되었습니다.'
        })
    } catch(error) {
        console.error(error)
        res.status(400).json({
            errorMessage: '오류가 발생하였습니다. 유저리스트를 확인해주세요.'
        })
    }
});

module.exports = router;