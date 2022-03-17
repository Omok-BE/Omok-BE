const Room = require('../models/rooms');
const User = require('../models/users');
// 로비 들어가서 방리스트 가져오기
const lobby = async (req, res) => {
    try{
        await Room.deleteMany({ playerCnt: 0})
        const allRoom = await Room.find()

        res.send(allRoom);
    }catch(err){
        console.log(err);
        res.status(401).send({
            errorMessage: 'lobby 요청에러'
        })
    }
}
// 로비에서 offline제외 유저리스트
const userList =  async (req, res) => {
    try{
        const allUser = await User.find({ state: { $ne: "offline" } });

        res.send(allUser);
    }catch(err){
        console.log(err);
        res.status(401).send({
            errorMessage: 'lobby userlist err'
        })
    }
}
// 로비에서 포인트기준 리더리스트
const leaderList = async (req, res) => {
    try{
        const leaderList = await User.find({}).sort({"point": -1}).limit(5);

        res.send(leaderList);
    }catch(err){
        console.log(err);
        res.status(401).send({
            errorMessage: 'lobby leaderlist err'
        })
    }
}
// 리더보드
const leaderBoard = async (req, res) => {
    try{
        const leaderList = await User.find({}).sort({"point": -1}).limit(50);

        res.send(leaderList);
    }catch(err){
        console.log(err);
        res.status(401).send({
            errorMessage: 'lobby leaderboard err'
        })
    }
}
// 방만들기
const createRoom = async (req, res) => {
    try{
        const { roomName, id } = req.body;
 
        const newRoom = new Room({
            roomName: roomName,
            playerCnt: 1,
            observerCnt: 0,
            state: 'wait',
            blackPlayer: id,
        });
        await newRoom.save();
        
        await User.updateOne({ id: id}, {$set: {state: "blackPlayer"}});
        const myInfo = await User.findOne({ id: id });
        const userInfo = { id: myInfo.id, state: myInfo.state, score:myInfo.score, point:myInfo.point }

        const roomNum = await newRoom.roomNum;
        res.send({roomNum, userInfo});
    }catch(err){
        console.log(err);
        res.status(401).send({
            errorMessage: 'lobby create err'
        })
    }  
}
// 방 참가: 모달창뜰때
const getJoinRoom = async (req, res) => {
    try{
        const { roomNum } = req.params;
        const room = await Room.findOne({ roomNum: roomNum });
        res.send(room);
    }catch(err){
        console.log(err);
        res.status(401).send({
            errorMessage: 'lobby joinroom:roomNumber err'
        })
    }
}
// 방 참가: 모달창 입력
const postJoinRoom = async (req, res) => {
    const { roomNum, id, state } = req.body;

    try{
        const user = await User.updateOne({ id: id }, {$set: { state: state }})
        const postuser = await User.findOne({id: id})
        const userInfo = {"id": postuser.id, "state": postuser.state, "score": postuser.score, "point":postuser.point}
        
        // Roomdb에도 state에 맞는 값으로 정보 변경하기
        if(state === 'blackPlayer'){
            await Room.updateOne({ roomNum }, {$set: { blackTeamPlayer: id }})
            await Room.updateOne({ roomNum }, {$inc: { playerCnt: 1 }})
        }else if(state === 'whitePlayer'){
            await Room.updateOne({ roomNum }, {$set: { whiteTeamPlayer: id }})
            await Room.updateOne({ roomNum }, {$inc: { playerCnt: 1 }})
        }else if(state === 'blackObserver'){
            await Room.updateOne({ roomNum }, {$addToSet: { blackTeamObserver: id }})
            await Room.updateOne({ roomNum }, {$inc: { observerCnt: 1 }})
        }else if(state === 'whiteObserver'){
            await Room.updateOne({ roomNum }, {$addToSet: { whiteTeamObserver: id }})
            await Room.updateOne({ roomNum }, {$inc: { observerCnt: 1 }})
        }

        res.status(201).send(userInfo);
    }catch(err){
        console.log(err);
        res.status(400).send({
            errorMessage: '/lobby/joinroom POST 에러'
        });
    }
}
// 작업중임
const fastPlayer = async (req, res) => {
    try{
        const { id } = req.params;
        const existRooms = await Room.findOne({ playerCnt: { $ne: 2 } });

        if(!existRooms.blackTeamPlayer){
            await User.updateOne({id}, {$set: {state: blackPlayer}});
            await Room.updateOne({ roomNum: existRooms.roomNum }, {$set: { blackTeamPlayer: id }})
        }
    }catch(err){
        console.log(err)
    }
}

module.exports = {
    lobby, 
    userList, 
    leaderList, 
    leaderBoard, 
    createRoom, 
    getJoinRoom, 
    postJoinRoom,
    fastPlayer
};