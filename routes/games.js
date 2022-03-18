const express = require('express');
const router = express.Router();
const Rooms = require('../models/rooms')

const { 
    gameCreate,
    gameStart,
    gameFinish,
    gameFinishShow,
    gameDelete
} = require('../controller/games');

//대기실 => 게임방 입장시 게임방 생성
router.post('/game/create', gameCreate); 

//게임방 입장해서 정보가져오기
router.get('/game/start/:gameNum', gameStart);

//[결과창]:게임이 끝나면 바로 보내는 내용  
router.post("/gameFinish", gameFinish); 
    
//[결과창]:페이지로 들어가자마자 
router.post("/gameFinish/show", gameFinishShow); 

//방에서 나가기
router.delete("/game/delete/:gameNum", gameDelete);

router.get('/test/:roomNum', async (req, res) => {
    try {
        const { roomNum } = req.params;
        const userInfos = await Rooms.aggregate([
            {
                $match: { roomNum: Number(roomNum) }                
            },
            {
                $lookup:
                {
                    from: "users",
                    localField: "blackTeamPlayer",
                    foreignField: "nickname",
                    as: "blackPlayerInfo"
                }
            },
            {
                $lookup:
                {
                    from: "users",
                    localField: "whiteTeamPlayer",
                    foreignField: "id",
                    as: "whitePlayerInfo"
                }
            },
            {
                $project: { 
                    blackPlayerInfo: { id: 1, score: 1, point: 1, state: 1}, 
                    whitePlayerInfo: { id: 1, score: 1, point: 1, state: 1}, 
                    blackTeamObserver: 1, 
                    whiteTeamObserver: 1, 
                    _id: 0 }
            },
        ])
        res.json({ userInfos });
    } catch (err) {
        console.log(err);
        res.status(400);
    }
})

module.exports = router;