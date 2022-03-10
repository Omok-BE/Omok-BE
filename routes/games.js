const express = require('express');
const router = express.Router();
const Rooms = require('../models/rooms');
const Games = require('../models/games');
const Users = require('../models/users');
const Teaching = require('../models/teaching');

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
        const gameInfo = await Games.findOne({ gameNum }, 
                            { _id:false, blackTeamPlayer:true, blackTeamObserver:true, 
                            whiteTeamPlayer:true, whiteTeamObserver:true });
        console.log(`gameNum?${gameNum}`);
        console.log(`게임인포 정보:${gameInfo}`);

        res.status(200).json({
            gameInfo,
            ok:true,
            message: "게임방 입장해서 정보가져오기 성공!"
        });
        console.log(`게임방 userInfo: ${userInfo}`);
        console.log(`게임방 roomInfo: ${gameInfo}`);

    } catch(err) {
        res.status(400).json({ 
            ok:false,
            errorMessage:"게임방 입장해서 정보를 가져오지 못했어요"
        });
        console.log(`게임방 에러: ${err}`);
    };
});


//결과창 post
router.post("/gameFinish", async (req, res) => {
    try {                      //blackPlayer     //승패결과
        const { id, score, point, state, gameNum, result } = req.body;
        // id를 기준으로 디비에서 총인원에 대한 
        // score, point, state를 찾는다.
       
         //승자id 
        const resultId = result.win;    
        console.log(`결과창 resultId>${resultId}`); 
        const winPlayer = {};
        //Player 
        //state가 blackTeamPlayer와 whiteTeamPlayer같고  (player일때)
        if (state === blackTeamPlayer && state === whiteTeamPlayer){
            //resultId가 id와 같으면 (우승자 id일떄)
            if(resultId === id){    //승Player
                winPlayer = await Users.findOne({ id:resultId }, { score:score, point:point, state:state }); 
                await Users.updateOne({ id:resultId }, { $inc: { "score.$.win":1 } });  //승 +1
                await Users.updateOne({ id:resultId }, { $set: { point:point + 700 } }) //포인트 +700
                console.log(`우승자 score에 1승, point에 +700이 추가되었습니다.`);
            } else {   //패Player
                await Users.updateOne({ id:resultId }, { $inc: {"score.$.lose":1 }}); //패 +1
                await Users.updateOne({ id:resultId }, { $set: { point:point - 500 } }); //포인트 -500
                console.log(`패자 score에 1패, point에 -500이 추가되었습니다.`);
            };
        };
        
        //Observer 
        //이긴팀 whiteTeamObserver 포인트 지급   
        if (winPlayer.state === whiteTeamPlayer){ 
            if(whiteTeamObserver){
            //훈수채팅 수
            const winExistTeachingCnt = await Teaching.findOne({ id:state.whiteTeamObserver }, 
                                                                  { _id:false, teachingCnt:true });
            const winUseTeachingPoint = winExistTeachingCnt * 100;            //쓴 포인트 
            const winGetTeachingPoint = winUseTeachingPoint * 0.5;            //얻은 포인트
            const winTotalPoint = winGetTeachingPoint + winUseTeachingPoint;  //총 포인트 
            //포인트 업데이트
            const winPointUp = await Users.updateOne({ id:state.whiteTeamObserver }, 
                                                                { $set: { point:winTotalPoint} }); 
            console.log(`이긴팀 observer포인트업: ${ winPointUp }`);
                res.status(200).json({
                    ok:true,
                    message: "결과창 성공!"
                });
            } else (state === blackTeamObserver); {  //진팀 blackTeamObserver 포인트 지급
            //훈수채팅 수
            const loseExistTeachingCnt = await Teaching.findOne({ id:state.blackTeamObserver }, 
                                                                      { _id:false, teachingCnt:true });
            const loseUseTeachingPoint = loseExistTeachingCnt * 100;   //쓴 포인트 
            const loseTotalPoint = point - loseUseTeachingPoint;      //게임후 총 포인트
            const losePointDown = await Users.updateOne( { id:state.blackTeamObserver },    //포인트 업데이트
                                                            { $set: { point:loseTotalPoint } });  
            console.log(`진팀 observer총포인트: ${ losePointDown }`);  
            };
        } else (winPlayer.state === blackTeamPlayer); {   //이긴팀 blackTeamObserver 포인트 지급  
            if(blackTeamObserver){
                //훈수채팅 수
                const winExistTeachingCnt = await Teaching.findOne({ id:state.blackTeamObserver }, 
                                                                        { _id:false, teachingCnt:true });
                const winUseTeachingPoint = winExistTeachingCnt * 100;         //쓴 포인트 
                const getTeachingPoint = winUseTeachingPoint * 0.5;            //얻은 포인트
                const winTotalPoint = getTeachingPoint + winUseTeachingPoint;  //총 포인트
                //포인트 업데이트
                const winPointUp = await Users.updateOne({ id:state.blackTeamObserver }, 
                                                                  { $set: { point:winTotalPoint} }); 
                console.log(`이긴팀 observer포인트업: ${ winPointUp }`);
                    res.status(200).json({
                        ok:true,
                        message: "결과창 성공!"
                    });
            } else (state === whiteTeamObserver); {  //진팀 whiteTeamObserver 포인트 지급
                //훈수채팅 수
                const loseExistTeachingCnt = await Teaching.findOne({ id:state.whiteTeamObserver }, 
                                                                       { _id:false, teachingCnt:true });
                const loseUseTeachingPoint = loseExistTeachingCnt * 100;   //쓴 포인트 
                const loseTotalPoint = point - loseUseTeachingPoint;       //게임후 총 포인트 
                //포인트 업데이트
                const losePointDown = await Users.updateOne( { id:state.whiteTeamObserver }, 
                                                              { $set: { point:loseTotalPoint } });
                console.log(`진팀 observer총포인트: ${ losePointDown }`);    
            };
        };        
    } catch(err){
        res.status(400).json({
            ok:false,
            errorMessage:"결과창get 실패"
        });
        console.log(`결과창get 에러: ${err}`);
    };
});


//결과창 get 
router.get("/gameFinish", async (req, res) => {
    try{
        const { id, gameNum, result } = req.body;
        
        //훈수채팅 수
        const existTeachingCnt = await Teaching.findOne({ id:id }, { _id:false, teachingCnt:true });
        const useTeachingPoint = existTeachingCnt * 100;         //쓴 포인트 
        const getTeachingPoint = useTeachingPoint * 0.5;         //얻은 포인트
        let point = [];
        point.push(useTeachingPoint);    
        point.push(getTeachingPoint);    
        
        //score, point
        let user = await Users.findOne({id:id}, {_id:false, id:true, score:true, state:true});
        user.point = point;
        const userInfo = user;

        const gameInfo = await Games.findOne({gameNum:gameNum}, {_id:false, blackTeamPlayer:true, 
                                    blackTeamObserver:true, whiteTeamPlayer:true, whiteTeamObserver:true});

        res.status(200).json({
            userInfo,
            gameInfo,
            result,
            ok:true,
            message: "결과창get 성공!"
        });

    } catch(err){
        res.status(400).json({
            ok:false,
            errorMessage:"결과창get 실패"
        });
        console.log(`결과창get 에러: ${err}`);
    };
});

module.exports = router;