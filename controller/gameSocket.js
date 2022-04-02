const app = require('../app');
const Users = require('../models/users');
const Boards = require('../models/boards');
const Rooms = require('../models/rooms');
const Games = require('../models/games');
const { check_33 } = require('../lib/games/check_33')
const { check_44 } = require('../lib/games/check_44')
const { xyToIndex } = require('../lib/games/xyToIndex')


//게임 소켓 접속자 수  
function gameRoomCount(gameNum) {
    return app.get("gameRoom").adapter.rooms.get(gameNum)?.size;
};

//유저 id를 닉네임 설정 
exports.nicknameEvent = function(socket){
    socket.on('nickname', (nickname) => (socket['nickname'] = nickname));
}
 
// socket event 메시지
exports.onAny = function(socket) {
    socket.onAny((event) => {
        console.log(`게임방 이벤트: ${event}`);
    });
};

// socket nickname 설정
exports.nicknameEvent = function(socket){
    socket.on('nickname', (nickname) => (socket['nickname'] = nickname))
};

//game방 JoinGame
exports.joinGame = function(socket){
    socket.on('joinGame', async (gameNum, id) => {
        socket.join(gameNum);
        //게임방 입장시 유저 connect변경
        const joinGameIds = await Games.findOne({gameNum})
        if(joinGameIds.blackTeamPlayer === id || joinGameIds.whiteTeamPlayer === id)
        await Users.updateOne({ id }, { $set: { connect:'inGame' } });
        
        //blackTeamObserver
        const gameIdB = joinGameIds.blackTeamObserver
        const blackOIds = [];
        for(let i=0; i<gameIdB.length; i++){
          if(gameIdB[i] !== blackOIds && gameIdB[i] === id ) {
            await Users.updateOne({ id }, { $set: { teachingCnt: 0, connect:'inGame' } });
          }
        }
        console.log("게임소켓,joinGame,gameIdBBBB배열안:",gameIdB)
        // whiteTeamObserver
        const gameIdW = joinGameIds.whiteTeamObserver
        const whiteOIds = [];
        for(let i=0; i<gameIdW.length; i++){
          if(gameIdW[i] !== whiteOIds && gameIdW[i] === id) {
            await Users.updateOne({ id }, { $set: { teachingCnt: 0, connect:'inGame' } });
          }
        }
        console.log("게임소켓,joinGame,gameIdWWWW배열안:",gameIdW)
    
        const observerCnt = gameRoomCount(gameNum) - 2;
        await Rooms.updateOne({ roomNum:gameNum }, { $set: { observerCnt, playerCnt: 2 } });
    });
};

//game방 채팅
exports.chat = function(socket){
    socket.on('chat', (chat, gameNum) => {
        console.log("겜방소켓,socket.nickname",socket.nickname)
        console.log("겜방소켓,chat:",chat)
        const data = { name:socket.nickname.id, chat };
        app.get("gameRoom").to(gameNum).emit('chat', data, chat.state);
    });
};

//game방 훈수채팅W
exports.teachingW = function(socket){
    socket.on('teachingW', async (chat, gameNum) => {
        const data = { name:socket.nickname.id, chat };
        app.get("gameRoom").to(gameNum).emit('teachingW', data);
        await Users.updateOne({ id:socket.nickname.id }, { $inc: { teachingCnt: 1 }}, { upsert:true });
    });
};
    
//game방 훈수채팅B
exports.teachingB = function(socket){
    socket.on('teachingB', async (chat, gameNum) => {
        const data = { name:socket.nickname.id, chat };
        app.get("gameRoom").to(gameNum).emit('teachingB', data);
        await Users.updateOne({ id:socket.nickname.id }, { $inc: { teachingCnt: 1 }}, { upsert:true});
    });
};
    
//game방 훈수채팅- 플라잉
exports.flyingWord = function(socket){
    socket.on('flyingWord', async (chat, gameNum) => {
        const data = { name: socket.nickname.id, chat };
        app.get("gameRoom").to(gameNum).emit('flyingWord', data);
        await Users.updateOne({ id:socket.nickname.id }, { $inc: { teachingCnt: 1 }}, { upsert:true });
    });
};

//game방 신의한수- 마우스 포인트
exports.Pointer = function(socket){
    socket.on("Pointer", (chat, gameNum) =>{
        pointer = true;
        const data = {name:socket.nickname.id, pointer:pointer};
        app.get("gameRoom").to(gameNum).emit("Pointer", data, chat);
    }); 
};

//오목 게임 좌표값을 받아 좌표값에 해당하는 값
exports.omog = function(socket){
    socket.on('omog', async (data, state, gameNum) => {
        const findBoard = await Boards.findOne({gameNum});
        let bboard = findBoard.board;
        let count = findBoard.count;
        if(count % 2 == 0) {
            if(check_33(data.x,data.y,bboard) || check_44(data.x,data.y,bboard)) {
                let checkSamsam=0 //삼삼확인
                app.get("gameRoom").to(gameNum).emit("omog", data,checkSamsam,state);
                return;
            }
        } 
        
        if (bboard[xyToIndex(data.x, data.y)] != -1 &&
            bboard[xyToIndex(data.x, data.y)] != 3) {
            console.log("돌아가");
        } else if (
            (state == 'whitePlayer' && count % 2 == 0) ||
            (state == 'blackPlayer' && count % 2 !== 0)
        ) {
            console.log("너의 순서가 아니다 돌아가");
        } else {
            count % 2 == 0
            ? (bboard[xyToIndex(data.x, data.y)] = 1)
            : (bboard[xyToIndex(data.x, data.y)] = 2);
            data.board = bboard;
            count++;
            data.count = count;
            await Boards.updateMany({gameNum},{$set: {count, board:bboard}});
            app.get("gameRoom").to(gameNum).emit('omog', data);
        }
    });
};

//Pointer 훈수 실질적으로 오목두는 부분
exports.pointerOmog = function(socket){
    socket.on("pointerOmog", async (data, gameNum) => {
        const findBoard = await Boards.findOne({ gameNum });
        let bboard = findBoard.board;
        let count = findBoard.count;
        
        if (pointer){
            if (bboard[xyToIndex(data.x, data.y)] != -1) {
                return;
            }
            (bboard[xyToIndex(data.x, data.y)] = 3)
            data.board = bboard;
            // data.order
            let pointer = false;
            app.get("gameRoom").to(gameNum).emit("pointerOmog", data, count, pointer);
        }
    });
};
    
//game방 퇴장
exports.disconnecting = function(socket){
    socket.on('disconnecting', async () => {
        try {
            const {id, gameNum} = socket.nickname
            app.get("gameRoom").to(gameNum).emit('bye', id);
            const observerCnt = gameRoomCount(gameNum) - 2; 
            if (observerCnt >= 0) 
            await Rooms.updateOne({ roomNum:gameNum }, { $set: { observerCnt } });
            console.log('게임방 퇴장 소켓 disconnecting🖐️🖐️');
            console.log('게임방 퇴장 소켓,gameNum:', gameNum);
            console.log('게임방 퇴장 소켓,id:', id);
            
            //게임방 퇴장시 (게임 중간에 나감) 옵저버 state변경, connect변경
            await Users.updateOne({ id }, { $set: { state: 'online', connect: 'online' }});
        } catch (error) {
            console.log("게임소켓,disconnecting 에러:",error);
        }
    });
};
    
//게임방 나갈떄
exports.byebye = function(socket){
    socket.on('byebye', async ( state, gameNum, id ) => {
        try{
            console.log("겜방소켓,byebye,state:",state)
            console.log("겜방소켓,byebye,gameNum:",gameNum)
            console.log("겜방소켓,byebye,id:",id)
            
            app.get("gameRoom").to(gameNum).emit("byebye",state, id);
            console.log("겜방소켓 byebye이벤트 성공");
        } catch(err) {
            console.log("겜방소켓 byebye이벤트 에러:",err);
        }
    });
};
