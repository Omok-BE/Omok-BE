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


// //결과창-- 작업중
// router.post("/gameFinish", async (req, res) => {
//     try {                      //blackPlayer     //승패결과
//         const { id, score, point, state, gameNum, result } = req.body;
//         // id를 기준으로 디비에서 총인원에 대한 
//         // score, point, state를 찾는다.
//         // req로 들어온 result에서 승자 id를 찾는다.
//         // Object.assign({}, )
        
//         //req의 id를 기준으로 score, point, state를 Users디비에서 찾음
//         const user = await Users.find({id:id}, {_id:false, score, point, state});
    
//         const resultId = result.win;     //result 에서 우승자 id만 찾기
        
//         console.log(`결과창 userInfo>${user}`);

       


        
//         //우승자 id찾기
//         const winnerId = playersId.findIndex((i) =>  i === existId );

//         //score + point 지급 
//         //if players가 resultId와 같으면 디비score.win에 +1 아니면 lose에 +1
//         for(let key in players) {
//             if (players[key] === resultId){
//                 //player 
//                 //score안에 win에만 +1하는 방법: {$inc: {"score.$.win":1}}
//                 await Users.updateOne({id:resultId}, { $inc: {"score.$.win":1}});
//                 await Users.updateOne({id:resultId}, { $set: {point:usersInfo.point + 700} });
//                 console.log(`우승자 score에 1승, point에 +700이 추가되었습니다.`);
//             } else {
//                 await Users.updateOne({id:resultId}, { $inc: {"score.$.lose":1}});
//                 await Users.updateOne({id:resultId}, { $set: {point:usersInfo.point - 500} });
//                 console.log(`패자 score에 1패, point에 -500이 추가되었습니다.`);
//             };
//         };
        
        
      
        
  
        
//         //observer 
//         //1)이겼을때  2)졌을때
//         //게임디비에 저장된 observer들과 teaching관련 정보를 가져온다
//         //훈수채팅소켓에서 보낸 채팅 카운트하기 + teachingPoint에 저장하기
//         //  --> 게임디비에 teachingPoint, teachingCnt만들기
//         // 우승자Id의 팀 찾기
        
        
//         // resultId와 앞에 5글자가 같은 아이디 찾기- indexOf()이용. 없으면 -1반환.
        
        
        

//         //existId가 game디비중 어느 팀에 있는지 찾기
//         const winnerPlayer = await Games.find({id:resultId}, 
//            {_id:false, blackTeamPlayer:true, blackTeamObserver:true, whiteTeamPlayer:true, whiteTeamObserver:true});

//         //디비에서 팀별 옵저버를 찾는다.
//         const [observers] = await Games.find({id:existId}, 
//                              {_id:false, blackTeamObserver:true, whiteTeamObserver:true});
//         console.log(`옵져버들정보는?${observersInfo}`);
        
//         //옵저버가 우승팀인지 아닌지 확인해서 포인트 지급하기
//         // resultId와 앞에 5글자가 같은 아이디 찾기- indexOf()이용. 없으면 -1반환.
//         const findWInTeam = observers; 
//         const winTeamMembers = {}; 
//         for(let i = 0; i < findWInTeam.length; i++){
//             //resultId의 문자가 들어간 이긴팀 옵저버들을 찾았을때
//             if (findWInTeam.indexOf(resultId) !== -1){ 
//                 //찾은 이긴팀 옵저버들의 teachingPoint, teachingCnt 찾기
//                 const [winTeamObservers] = await Games.find({id:winTeamMembers[i]}, 
//                                             {_id:false, teachingPoint:true, teachingCnt:true});
//                 //쓴 포인트
//                 const spendPoint = winTeamObservers.teachingCnt * 100;
//                 //얻은 포인트
//                 const getPoint = spendPoint * 0.5;
                

//                 await Users.updateOne({id:winTeamMember[i]}, { $set {point:updateTeachingPoint} });
//             };
//         }


//         // 쓴 포인트: 훈수 채팅 횟수*100
//         // 얻은 포인트: 이겼는지 확인해서 쓴포인트 * 2



       

//         res.status(200).json({
//             userInfo,
//             gameInfo,
//             result,
//             ok:true,
//             message: "결과창 성공!"
//         });
//         console.log(`결과창 userInfo: ${userInfo}`);
//         console.log(`결과창 gameInfo: ${gameInfo}`);
//         console.log(`결과창 result: ${result}`);

//     } catch(err){
//         res.status(400).json({
//             ok:false,
//             errorMessage:"결과창 실패"
//         });
//         console.log(`결과창 에러: ${err}`);

//     }
// });




module.exports = router;