const app = require('../app');
const Users = require('../models/users');
const Boards = require('../models/boards');
const Rooms = require('../models/rooms');
const Sentry = require("@sentry/node");
const { check_33 } = require('../lib/gameSocket/check_33');
const { check_44 } = require('../lib/gameSocket/check_44');
const { xyToIndex } = require('../lib/gameSocket/xyToIndex');

//유저 id를 닉네임 설정 
exports.nicknameEvent = function(socket){
    socket.on('nickname', (nickname) => (socket['nickname'] = nickname));
};
 
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
        const userInfo = await Users.findOne({ id },{ state: 1});
        if(userInfo.state.includes("Player")){
            await Users.updateOne({ id }, { $set: { connect: 'inGame' } });
        } else {
            await Users.updateOne({ id }, { $set: { teachingCnt: 0, connect: 'inGame' } });
        };
        const observerCnt = gameRoomCount(gameNum) - 2;
        await Rooms.updateOne({ roomNum: gameNum }, { $set: { observerCnt, playerCnt: 2 } });
    });
};

//game방 채팅
exports.chat = function(socket){
    socket.on('chat', (chat, gameNum) => {
        const data = { name: socket.nickname.id, chat };
        app.get("gameRoom").to(gameNum).emit('chat', data, chat.state);
    });
};

//game방 훈수채팅W
exports.teachingW = function(socket){
    socket.on('teachingW', async (chat, gameNum) => {
        const data = { name: socket.nickname.id, chat };
        app.get("gameRoom").to(gameNum).emit('teachingW', data);
        await Users.updateOne({ id: socket.nickname.id }, { $inc: { teachingCnt: 1 }}, { upsert: true });
    });
};
    
//game방 훈수채팅B
exports.teachingB = function(socket){
    socket.on('teachingB', async (chat, gameNum) => {
        const data = { name:socket.nickname.id, chat };
        app.get("gameRoom").to(gameNum).emit('teachingB', data);
        await Users.updateOne({ id: socket.nickname.id }, { $inc: { teachingCnt: 1 }}, { upsert: true });
    });
};
    
//game방 훈수채팅- 플라잉
exports.flyingWord = function(socket){
    socket.on('flyingWord', async (chat, gameNum) => {
        const data = { name: socket.nickname.id, chat };
        app.get("gameRoom").to(gameNum).emit('flyingWord', data);
        await Users.updateOne({ id: socket.nickname.id }, { $inc: { teachingCnt: 1 }}, { upsert: true });
    });
};

//game방 신의한수- 마우스 포인트
exports.Pointer = function(socket){
    socket.on("Pointer", (chat, gameNum) =>{
        pointer = true;
        const data = { name: socket.nickname.id, pointer };
        app.get("gameRoom").to(gameNum).emit("Pointer", data, chat);
    }); 
};

//오목 게임 좌표값을 받아 좌표값에 해당하는 값
exports.omog = function(socket){
    socket.on('omog', async (data, state, gameNum) => {
        const findBoard = await Boards.findOne({ gameNum });
        let bboard = findBoard.board;
        let count = findBoard.count;
        if(count % 2 == 0) {
            if( check_33(data.x,data.y,bboard) || check_44(data.x,data.y,bboard) ) {
                let checkSamsam = 0;
                app.get("gameRoom").to(gameNum).emit("omog", data, checkSamsam, state);
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
            await Boards.updateMany({ gameNum },{ $set: { count, board:bboard }});
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
        if (bboard[xyToIndex(data.x, data.y)] != -1) {
            return;
        } else {
            bboard[xyToIndex(data.x, data.y)] = 3;
            data.board = bboard;
            let pointer = false;
            app.get("gameRoom").to(gameNum).emit("pointerOmog", data, count, pointer);            
         };
    });
};
    
//game방 퇴장
exports.disconnecting = function(socket){
    socket.on('disconnecting', async () => {
        try {
            const { id, gameNum } = socket.nickname
            console.log("gameNUm",gameNum)
            app.get("gameRoom").to(gameNum).emit('bye', id);
            const observerCnt = gameRoomCount(gameNum) - 2; 
            if (observerCnt >= 0) 
            await Rooms.updateOne({ roomNum: gameNum }, { $set: { observerCnt } });
            await Users.updateOne({ id }, { $set: { connect: 'online' }});
        } catch (err) {
            Sentry.captureException(err);
            console.error("게임소켓,disconnecting 에러:",err);
        }
    });
};
    
//게임방 나갈떄
exports.byebye = function(socket){
    socket.on('byebye', async ( state, gameNum, id ) => {
        try{
            app.get("gameRoom").to(gameNum).emit("byebye",state, id);
        } catch(err) {
            Sentry.captureException(err);
            console.error("겜방소켓 byebye이벤트 에러:",err);
        }
    });
};

//게임 소켓 접속자 수  
function gameRoomCount(gameNum) {
    return app.get("gameRoom").adapter.rooms.get(gameNum)?.size;
};