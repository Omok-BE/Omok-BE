const express = require('express');
const nodemon = require('nodemon');
const User = require("../models/users");
const jwt = require('jsonwebtoken');
const auth = require('../middlewares/auth-middleware');

const router = express.Router();

router.post('/signup', async (req, res) => {
    try{
        const { id, nickname, pass, confirmPass } = req.body;

        // 비밀번호, 비밀번호 확인 비교
        if(pass !== confirmPass){
            res.status(400).send({
                ok: false,
                errorMessage: '회원가입 실패: 비밀번호가 일치하지 않습니다'
            });
            return;
        }

        // id 존재검사
        const existId = await User.find({ id })
        if(existId.length){
            res.status(400).send({
                ok: false,
                errorMessage: '이미 사용중인 ID입니다.'
            });
            return;
        }

        // nickname 검사
        const existNickname = await User.find({ nickname });
        if(existNickname.length){
            res.status(400).send({
                ok: false,
                errorMessage: '이미 사용중인 닉네임 입니다.'
            });
            return;
        }

        const user = new User({
            id: id,
            nickname: nickname,
            pass: pass,
            score: [ { win: 0 }, { lose: 0 } ],
            point: 1000,
            state: "",
        });
        await user.save();

        res.status(201).send({
            ok: true,
            message: '회원가입 성공',
        })

    }catch(err){
        console.log(err);
        res.status(400).send({
            errorMessage: '요청한 데이터 형식이 올바르지 않습니다',
        });
    }
});

// 로그인 
router.post('/login', async (req, res) => {
    try{
        const { id, pass } = req.body;

        const user = await User.findOne({ id });

        if(!user || pass !== user.pass){
            res.status(400).send({
                errorMessage: '아이디 또는 패스워드를 확인해주세요'
            });
            return;
        }

        const token = jwt.sign({ id: user.id }, 'my-secret-key');
        //user state값 online으로 만들어주는거
        if(token){
            await User.updateOne({ id: user.id }, {$set: { state: "online"}})
        }
        res.send({
            token,
            ok: true,
            message: '로그인 성공'
        })
    }catch(err){
        console.log(err);
        res.status(400).send({
            errorMessage: '요청한 데이터 형식이 올바르지 않습니다.',
        });
    }
});

router.get('/userinfo/:id', async (req, res) => {
    const { id } = req.params;

    const userinfo = await User.findOne({ id });
    res.send({
        'id': userinfo.id,
        'nickname': userinfo.nickname,
        'score': userinfo.score,
        'point': userinfo.point,
    })
})

module.exports = router;