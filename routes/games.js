const express = require('express');
const router = express.Router();
const Rooms = require('../models/rooms');
const Games = require('../models/games')

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




//결과창
router.post("/gameFinish", async (req, res) => {
    try {                           //승패결과
        const { userInfo, gameInfo, result } = req.body;
        //userInfo안에 id, socre, point, state를 Users디비에 업뎃
        await findOne({id, score, point, state});
        console.log(`userInfo>${userInfo}`);




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