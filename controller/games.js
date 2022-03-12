const express = require('express');
const Games = require('../models/games');
const Rooms = require('../models/rooms');
const Users = require('../models/users');

//대기실 => 게임방 입장시 게임방 생성
const gameCreate = async (req, res) => {
    try {
        const { roomNum, blackTeamPlayer, blackTeamObserver, whiteTeamPlayer, whiteTeamObserver} = req.body;
        const state = "ingame";
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
    try {                     
        const { userInfo, gameNum, result } = req.body;
        const id = userInfo.id;
        const state = userInfo.state;
        const score = userInfo.score;
        const point = userInfo.point;
       
         //승자id 
        const resultId = result.win;    
        const winPlayer = await Users.findOne({ id:resultId }, { score:score, point:point, state:state }); 

        //Player 
        if (state === "blackPlayer" || state === "whitePlayer"){
            if(resultId === id){    //승Player

                await Users.updateOne({ id:resultId }, { $inc: { "score.0.win":  1} });  //승 +1
                await Users.updateOne({ id:resultId }, { $set: { point:point + 700 } }) //포인트 +700
                console.log(`API_우승자 score에 1승, point에 +700이 추가되었습니다.`);
            } else {   //패Player
                await Users.updateOne({ id:resultId }, { $inc: {"score.0.lose":1 }}); //패 +1
                await Users.updateOne({ id:resultId }, { $set: { point:point - 500 } }); //포인트 -500
                console.log(`API_패자 score에 1패, point에 -500이 추가되었습니다.`);
            };
        };

        //Observer
        //훈수채팅 수 
        const observerTeachingCnt = await Users.findOne({ id:id }, { _id:false, teachingCnt:true });

        //이긴팀 point
        const winUseTeachingPoint = observerTeachingCnt * 100;            //쓴 포인트 
        const winGetTeachingPoint = winUseTeachingPoint * 0.5;            //얻은 포인트
        const winTotalPoint = winGetTeachingPoint + winUseTeachingPoint + score;  //총 포인트     
        
        //이긴 Player가 white팀 일때
        if (winPlayer.state === "whitePlayer"){
            if( state === "whiteObserver" && observerTeachingCnt !== 0 ){
                
                //포인트 업데이트
                await Users.updateOne({ id:id }, { $set: { point:winTotalPoint} }); 
            } else if ( state === "blackObserver" && observerTeachingCnt !== 0 ){
                const findLoseTeamCnt = observerTeachingCnt.teachingCnt;  
                
                //point
                const loseUseTeachingPoint = findLoseTeamCnt * 100;   //쓴 포인트 
                const loseTotalPoint = point - loseUseTeachingPoint;      //게임후 총 포인트
                await Users.updateOne( { id:id }, { $set: { point:loseTotalPoint } }); 
            }
        };
        
        //이긴 Player가 black팀 일때
        if (winPlayer.state === "blackPlayer"){
            if( state === "blackObserver" && observerTeachingCnt !== 0 ){
                
              //point updateOne
              await Users.updateOne({ id:id }, { $set: { point:winTotalPoint} }); 
            } else if ( state === "whiteObserver" && observerTeachingCnt !== 0 ){
                const findLoseTeamCnt = observerTeachingCnt.teachingCnt;  
                
                //point
                const loseUseTeachingPoint = findLoseTeamCnt * 100;   //쓴 포인트 
                const loseTotalPoint = point - loseUseTeachingPoint;      //게임후 총 포인트
                await Users.updateOne( { id:id }, { $set: { point:loseTotalPoint } });  
            }
        };
        res.status(200).json({
            ok:true,
            message: "결과창gameFinish 성공!"
        });
    } catch(err){
        console.log(`API_결과창gameFinish 에러: ${err}`);
        res.status(400).json({
            ok:false,
            errorMessage:"결과창gameFinish 실패"
        });
    };
};


//결과창 post 
const gameFinishShow = async (req, res) => {
    try{
        const { id, gameNum, result } = req.body;
        //훈수채팅 수
        const existTeachingCnt = await Users.findOne({ id:id }, { _id:false, teachingCnt:true });
        const findTeachingCnt = existTeachingCnt.teachingCnt;

        //point
        const usePoint = findTeachingCnt * 100;      //쓴 포인트 
        const getPoint = usePoint * 0.5;     //얻은 포인트
        
        //score
        let userInfo = [];
        const user = await Users.findOne({id:id}, {_id:false, id:true, score:true});
        const score = await Users.findOne({id:id}, {_id:false, state:true});
        userInfo.push(user);
        userInfo.usePoint = usePoint;
        userInfo.getPoint = getPoint;
        userInfo.push(score);
        
        const gameInfo = await Games.findOne({gameNum:gameNum}, {_id:false, blackTeamPlayer:true, 
                                                 blackTeamObserver:true, whiteTeamPlayer:true, whiteTeamObserver:true});
        res.status(200).json({
            userInfo,
            gameInfo,
            result,
            ok:true,
            message: "gameFinishShow 성공!"
        }); 
    } catch(err){
        console.log(`API_gameFinishShow 에러: ${err}`);
        res.status(400).json({
            ok:false,
            errorMessage:"gameFinishShow 실패"
        });
    };
};

//게임방에서 play가 나갈때
const gameDelete = async (req, res) => {
    //먼저 전인원이 겜방에서 대기방으로 이동 후 마지막 플레이어가 겜방 나갈때 방폭
    try{
        const { gameNum } = req.params;
        const existGamePlayers = await Games.findOne({ gameNum:gameNum }, 
                                                        { _id:false, blackTeamPlayer:true, whiteTeamPlayer:true });
        if(!existGamePlayers.blackTeamPlayer || !existGamePlayers.whiteTeamPlayer )   
        await Games.deleteOne({gameNum});
        await Rooms.deleteOne({roomNum:gameNum});
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