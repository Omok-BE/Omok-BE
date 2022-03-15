const Room = require('../models/rooms');
const User = require('../models/users');

const lobby = async (req, res) => {
    try{
        const allRoom = await Room.find()

        res.send(allRoom);
    }catch(err){
        console.log(err);
        res.status(401).send({
            errorMessage: 'lobby 요청에러'
        })
    }
}

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

const createRoom = async (req, res) => {
    try{
        const { roomName, id } = req.body;
 
        const newRoom = new Room({
            roomName: roomName,
            playerCnt: 1,
            observerCnt: 0,
            state: 'wait',
        });
        await newRoom.save();
        // 방생성자의 state값 Aplayer로 바꿔주는거 (post메서드 put으로 바꿔줘야 하나?)
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

const postJoinRoom = async (req, res) => {
    const { roomNum, id, state } = req.body;

    try{
        const user = await User.updateOne({ id: id }, {$set: { state: state }})
        const postuser = await User.findOne({id: id})
        const userInfo = {"id": postuser.id, "state": postuser.state, "score": postuser.score, "point":postuser.point}
        
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
        const existRooms = await Room.findOne({ playerCnt: { $ne: 2 } })
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