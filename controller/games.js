const express = require('express');
const Games = require('../models/games');
const Rooms = require('../models/rooms');
const Teaching = require('../models/teaching');
const Users = require('../models/users');

//대기실 => 게임방 입장시 게임방 생성
const gameCreate = async (req, res) => {
    try {
        const { roomNum, blackTeamPlayer, blackTeamObserver, whiteTeamPlayer, whiteTeamObserver} = req.body;
        const state = "ingame"
        await Rooms.updateOne({ roomNum }, { set: { state }});

        const room = await Rooms.findOne({ roomNum });
        await Games.create({
            gameNum: roomNum,
            gameName: room.roomName,
            blackTeamPlayer,
            blackTeamObserver,
            whiteTeamPlayer,
            whiteTeamObserver
        });
        res.status(201).json({ ok: true });
    } catch(error) {
        console.log(error)
        res.status(400).json({ ok: false });
    };
};


//게임방 입장해서 정보가져오기
const gameStart = async (req, res)=>{
    try {
        const { gameNum } = req.params;
        const gameInfo = await Games.findOne({ gameNum:gameNum }, 
                            { _id:false, blackTeamPlayer:true, blackTeamObserver:true, 
                            whiteTeamPlayer:true, whiteTeamObserver:true });
        console.log(`API_gameNum?${gameNum}`);
        console.log(`API_게임인포 정보:${gameInfo}`);

        res.status(200).json({
            gameInfo,
            ok:true,
            message: "게임방 입장해서 정보가져오기 성공!"
        });
    } catch(err) {
        console.log(`API_게임방 에러: ${err}`);
        res.status(400).json({ 
            ok:false,
            errorMessage:"게임방 입장해서 정보를 가져오지 못했어요"
        });
    };
};


//결과창 post
const gameFinish = async (req, res) => {
    try {                      //blackPlayer     //승패결과
        const { userInfo, gameNum, result } = req.body;
        const id = userInfo.id;
        const state = userInfo.state;
        const score = userInfo.score;
        const point = userInfo.point;
       
         //승자id 
        const resultId = result.win;    
        console.log(`API_결과창 resultId>${resultId}`); 
        const winPlayer = {};
        //Player 
        if (state === "blackPlayer" && state === "whitePlayer"){
            //resultId가 id와 같으면 (우승자 id일떄)
            if(resultId === id){    //승Player
                winPlayer = await Users.findOne({ id:resultId }, { score:score, point:point, state:state }); 
                await Users.updateOne({ id:resultId }, { $inc: { "score.$.win":1 } });  //승 +1
                await Users.updateOne({ id:resultId }, { $set: { point:point + 700 } }) //포인트 +700
                console.log(`API_우승자 score에 1승, point에 +700이 추가되었습니다.`);
            } else {   //패Player
                await Users.updateOne({ id:resultId }, { $inc: {"score.$.lose":1 }}); //패 +1
                await Users.updateOne({ id:resultId }, { $set: { point:point - 500 } }); //포인트 -500
                console.log(`API_패자 score에 1패, point에 -500이 추가되었습니다.`);
            };
        };
        
        //Observer 
        //이긴팀 whiteObserver 포인트 지급   
        if (winPlayer.state === "whitePlayer"){ 
            if(whiteObserver){
            //훈수채팅 수
            const winExistTeachingCnt = await Teaching.findOne({ id:state }, 
                                                                  { _id:false, teachingCnt:true });
            console.log("API_winExistTeachingCnt는?", winExistTeachingCnt);
            
            //Number형 values값
            const findWinTeamCnt = winExistTeachingCnt.teachingCnt;  
            console.log("API_findWinTeamCnt값은?", findWinTeamCnt);
            console.log("API_findWinTeamCnt타입은?", typeof(findWinTeamCnt));    
            
            //point
            const winUseTeachingPoint = findWinTeamCnt * 100;            //쓴 포인트 
            const winGetTeachingPoint = winUseTeachingPoint * 0.5;            //얻은 포인트
            const winTotalPoint = winGetTeachingPoint + winUseTeachingPoint;  //총 포인트 
            //포인트 업데이트
            const winPointUp = await Users.updateOne({ id:state.whiteObserver }, 
                                                                { $set: { point:winTotalPoint} }); 
            console.log(`API_이긴백팀 포인트업: ${ winPointUp }`);
                res.status(200).json({
                    ok:true,
                    message: "이긴백팀 포인트업 성공!"
                });
            } else (state === "blackObserver"); {  //진팀 blackObserver 포인트 지급
            //훈수채팅 수
            const loseExistTeachingCnt = await Teaching.findOne({ id:state }, 
                                                                    { _id:false, teachingCnt:true });
            console.log("API_loseExistTeachingCnt>>", loseExistTeachingCnt);
            const findLoseTeamCnt = loseExistTeachingCnt.teachingCnt;  
            console.log("API_findLoseTeamCnt값은?", findLoseTeamCnt);
            console.log("API_findLoseTeamCnt타입은?", typeof(findLoseTeamCnt)); 
            
            //point
            const loseUseTeachingPoint = findLoseTeamCnt * 100;   //쓴 포인트 
            const loseTotalPoint = point - loseUseTeachingPoint;      //게임후 총 포인트
            const losePointDown = await Users.updateOne( { id:state },    //포인트 업데이트
                                                            { $set: { point:loseTotalPoint } });  
            console.log(`API_진흑팀 포인트 다운다운: ${ losePointDown }`);
                res.status(200).json({
                    ok:true,
                    message: "진흑팀 포인트 다운다운"
                });  
            };
            
        } else (winPlayer.state === "blackPlayer"); {   //이긴팀 blackTeamObserver 포인트 지급  
            if(blackObserver){
                //훈수채팅 수
                const winExistTeachingCnt = await Teaching.findOne({ id:state }, 
                                                                        { _id:false, teachingCnt:true });
                console.log("API_winExistTeachingCnt>>", winExistTeachingCnt);
                const findWinTeamCnt = winExistTeachingCnt.teachingCnt;
                console.log("API_findWinTeamCnt값은?", findWinTeamCnt);
                console.log("API_findWinTeamCnt타입은?", typeof(findWinTeamCnt));
                
                //point
                const winUseTeachingPoint = findWinTeamCnt * 100;         //쓴 포인트 
                const getTeachingPoint = winUseTeachingPoint * 0.5;            //얻은 포인트
                const winTotalPoint = getTeachingPoint + winUseTeachingPoint;  //총 포인트
                //포인트 업데이트
                const winPointUp = await Users.updateOne({ id:state }, 
                                                                  { $set: { point:winTotalPoint} }); 
                console.log(`API_이긴흑팀 포인트업업!: ${ winPointUp }`);
                    res.status(200).json({
                        ok:true,
                        message: "이긴흑팀 포인트업업 성공!"
                    });
            } else (state === "whiteObserver"); {  //진팀 whiteObserver 포인트 지급
                //훈수채팅 수
                const loseExistTeachingCnt = await Teaching.findOne({ id:state }, 
                                                                       { _id:false, teachingCnt:true });
                console.log("API_loseExistTeachingCnt>>", loseExistTeachingCnt);
                const findLoseTeamCnt = loseExistTeachingCnt.teachingCnt;
                console.log("API_findLoseTeamCnt값은?", findLoseTeamCnt);
                console.log("API_findLoseTeamCnt타입은?", typeof(findLoseTeamCnt));

                //point            
                const loseUseTeachingPoint = findLoseTeamCnt * 100;   //쓴 포인트 
                const loseTotalPoint = point - loseUseTeachingPoint;       //게임후 총 포인트 
                //포인트 업데이트
                const losePointDown = await Users.updateOne( { id:state }, 
                                                              { $set: { point:loseTotalPoint } });
                console.log(`API_진백팀 포인트 다운다운: ${ losePointDown }`);
                res.status(200).json({
                    ok:true,
                    message: "진백팀 포인트 다운다운"
                });   
            };
        };        
    } catch(err){
        console.log(`API_결과창post 에러: ${err}`);
        res.status(400).json({
            ok:false,
            errorMessage:"결과창post 실패"
        });
    };
};


//결과창 post 
const gameFinishShow = async (req, res) => {
    try{
        const { id, gameNum, result } = req.body;
        
        //훈수채팅 수
        const existTeachingCnt = await Teaching.findOne({ id:id }, { _id:false, teachingCnt:true });
        console.log("API_existTeachingCnt>>", existTeachingCnt);
        const findTeachingCnt = existTeachingCnt.teachingCnt;
        console.log("API_findTeachingCnt값은?", findTeachingCnt);
        console.log("API_findTeachingCnt타입은?", typeof(findTeachingCnt));

        //point
        const usePoint = findTeachingCnt * 100;      //쓴 포인트 
        const getPoint = useTeachingPoint * 0.5;     //얻은 포인트
        console.log("API_결과창get usePoint:", usePoint);
        console.log("API_결과창get getPoint:", getPoint);
        
        //score
        let userInfo = [];
        const user = await Users.findOne({id:id}, {_id:false, id:true, score:true});
        const score = await Users.findOne({id:id}, {_id:false, state:true});
        userInfo.push(user);
        userInfo.usePoint = usePoint;
        userInfo.getPoint = getPoint;
        userInfo.push(score);
        console.log("API_결과창get userInfo:", userInfo);
        
        const gameInfo = await Games.findOne({gameNum:gameNum}, {_id:false, blackTeamPlayer:true, 
                                                 blackTeamObserver:true, whiteTeamPlayer:true, whiteTeamObserver:true});
        console.log("API_결과창get gameInfo:", gameInfo);
            
        res.status(200).json({
            userInfo,
            gameInfo,
            result,
            ok:true,
            message: "결과창get 성공!"
        }); 
    } catch(err){
        console.log(`API_결과창get 에러: ${err}`);
        res.status(400).json({
            ok:false,
            errorMessage:"결과창get 실패"
        });
    };
};

//방에서 나가기
const gameDelete = async (req, res) => {
    try{
        const { gameNum } = req.params;
        const existGamePlayers = await Games.findOne({ gameNum:gameNum }, 
            { _id:false, blackTeamPlayer:true, whiteTeamPlayer:true });
        if(!existGamePlayers.blackTeamPlayer || !existGamePlayers.whiteTeamPlayer )   
        await Games.delete({gameNum});
            res.status(200).json({
                ok:true,
                message: "방에서 나가기 성공!"
            });
        } catch(err){
            console.log(`API_방에서 나가기 에러: ${err}`);
            res.status(400).json({
            ok:false,
            errorMessage:"방에서 나가기 실패"
        });
        }
};

module.exports = {
    gameCreate,
    gameStart,
    gameFinish,
    gameFinishShow,
    gameDelete
};