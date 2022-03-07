const express = require('express');
const router = express.Router();
const Rooms = require('../models/rooms');
const Games = require('../models/games')
const Users = require('../models/users');
const games = require('../models/games');

//대기실 => 게임방 입장시 게임방 생성
router.post('/game/create', async (req, res) => {
    try {
        const { roomNum, blackTeamPlayer, blackTeamObserver, whiteTeamPlayer, whiteTeamObserver} = req.body;
        const state = "ingame"
        await Rooms.updateOne({ roomNum }, { set: { state }});

        const room = await Rooms.findOne({ roomNum });
        await Games.create({
            gameNum: roomNum,
            gameName: room.Name,
            blackTeamPlayer,
            blackTeamObserver,
            whiteTeamPlayer,
            whiteTeamObserver
        });
        res.json({ ok: true });
    } catch(error) {
        res.status(400).json({ ok: false });
    }
})


//게임방 입장해서 정보가져오기
router.get('/game/start/:gameNum', async (req, res)=>{
    try {
        const { gameNum } = req.params;

        const user = await Users.findOne({id, score, point, state});
        const userInfo = user;
        console.log(`user정보:${user}`);
        
        const roomInfo = await Games.find({ gameNum }, 
            {_id:false, blackTeamPlayer:true, blackTeamObserver:true, 
                whiteTeamPlayer:true, whiteTeamObserver:true }
        );
        console.log(`gameNum?${gameNum}`);
        console.log(`룸인포안정보:${roomInfo}`);

        res.status(200).json({
            userInfo,
            roomInfo,
            ok:true,
            message: "게임방 입장해서 정보가져오기 성공!"
        });
        console.log(`게임방 userInfo: ${userInfo}`);
        console.log(`게임방 roomInfo: ${roomInfo}`);

    } catch(err) {
        res.status(400).json({ 
            ok:false,
            errorMessage:"게임방 입장해서 정보를 가져오지 못했어요"
        });
        console.log(`게임방 에러: ${err}`);

    };
});


//결과창-- 다시 확인하기
router.post("/gameFinish", async (req, res) => {
    try {                           //승패결과
        const { userInfo, gameInfo, result } = req.body;
        // 중첩된 객체 접근
        // userInfo.user.id
        // userInfo.user['id']
        // Object.keys(userInfo)[0]  -user
        //userInfo.user.객체 접근(중첩된 객체 접근)
        const existId = userInfo[Object.keys(userInfo)[0]].id;
        const findId = existId.id;

        //userInfo.user안에 id를 기준으로 score, point, state를 Users디비에서 찾음
        userInfo = await Users.find({id:findId}, {_id:false, id:true, score:true, point:true, state:true});
        console.log(`결과창 userInfo>${userInfo}`);
        

        //userInfo.user.id가 gameInfo안의 어느 팀 포지션인지 찾음
        const id = userInfo.id;
        
        btp = gameInfo.blackTeamPlayer
        bto = gameInfo.blackTeamObserver
        wtp = gameInfo.whiteTeamPlayer
        wto = gameInfo.whiteTeamObserver

        for ( let i = 0; i < btp.length; i++) {
            if ( btp[i] === id ){
                blackTeamPlayer = await games.updateOne({id}, {$set: {blackTeamPlayer:btp[i]} });
            } else if ( bto[i] === id ){
                blackTeamObserver = await games.updateOne({id}, {$set: {blackTeamObserver:bto[i]} });
            } else if ( wtp[i] === id ){
                whiteTeamPlayer = await games.updateOne({id}, {$set: {whiteTeamPlayer:wtp[i]} });
            } else if ( wto[i] === id ){
                whiteTeamObserver = await games.updateOne({id}, {$set: {whiteTeamObserver:wto[i]} });
            }
        }
        for ( let i = 0; i < bto.length; i++) {
            if ( bto[i] === id ){
                blackTeamObserver = await games.updateOne({id}, {$set: {blackTeamObserver:bto[i]} });
            } else if ( wtp[i] === id ){
                whiteTeamPlayer = await games.updateOne({id}, {$set: {whiteTeamPlayer:wtp[i]} });
            } else if ( wto[i] === id ){
                whiteTeamObserver = await games.updateOne({id}, {$set: {whiteTeamObserver:wto[i]} });
            } else if ( btp[i] === id ){
                blackTeamPlayer = await games.updateOne({id}, {$set: {blackTeamPlayer:btp[i]} });
            }
        }
        for ( let i = 0; i < wtp.length; i++) {
            if ( wtp[i] === id ){
                whiteTeamPlayer = await games.updateOne({id}, {$set: {whiteTeamPlayer:wtp[i]} });
            } else if ( wto[i] === id ){
                whiteTeamObserver = await games.updateOne({id}, {$set: {whiteTeamObserver:wto[i]} });
            } else if ( btp[i] === id ){
                blackTeamPlayer = await games.updateOne({id}, {$set: {blackTeamPlayer:btp[i]} });
            } else if ( bto[i] === id ){
                blackTeamObserver = await games.updateOne({id}, {$set: {blackTeamObserver:bto[i]} });
            }
        }
        for ( let i = 0; i < wto.length; i++) {
            if ( wto[i] === id ){
                whiteTeamObserver = await games.updateOne({id}, {$set: {whiteTeamObserver:wto[i]} });
            } else if ( btp[i] === id ){
                blackTeamPlayer = await games.updateOne({id}, {$set: {blackTeamPlayer:btp[i]} });
            } else if ( bto[i] === id ){
                blackTeamObserver = await games.updateOne({id}, {$set: {blackTeamObserver:bto[i]} });
            } else if ( wtp[i] === id ){
                whiteTeamPlayer = await games.updateOne({id}, {$set: {whiteTeamPlayer:wtp[i]} });
            }
        }

        gameInfo = { whiteTeamObserver, blackTeamPlayer, blackTeamObserver, whiteTeamPlayer };

        //result= Users.score
        result = await Users.create({score:result});

        res.status(200).json({
            userInfo,
            gameInfo,
            result,
            ok:true,
            message: "결과창 성공!"
        });
        console.log(`결과창 userInfo: ${userInfo}`);
        console.log(`결과창 gameInfo: ${gameInfo}`);
        console.log(`결과창 result: ${result}`);

    } catch(err){
        res.status(400).json({
            ok:false,
            errorMessage:"결과창 실패"
        });
        console.log(`결과창 에러: ${err}`);

    }
});




module.exports = router;