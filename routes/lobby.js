const express = require('express');
const Room = require('../models/rooms');
const User = require('../models/users');

const router = express.Router();

// 로비첫 화면
router.get('/lobby', async (req, res) => {
    try{
        const allRoom = await Room.find()

        res.send(allRoom);
    }catch(err){
        console.log(err);
        res.status(401).send({
            errorMessage: 'lobby 요청에러'
        })
    }
    
    
});

//로비 유저리스트
router.get('/lobby/userList', async (req, res) => {
    try{
        const allUser = await User.find({ state: "online"});

        res.send(allUser);
    }catch(err){
        console.log(err);
        res.status(401).send({
            errorMessage: 'lobby userlist err'
        })
    }
});

// 로비 간이 리더리스트
router.get('/lobby/leaderList', async (req, res) => {
    try{
        const leaderList = await User.find({}).sort({"point": -1}).limit(5);

        res.send(leaderList);
    }catch(err){
        console.log(err);
        res.status(401).send({
            errorMessage: 'lobby leaderlist err'
        })
    }
    

});

// 리더보드 50개 정보띄워주기용
router.get('/leaderBoard', async (req, res) => {
    try{
        const leaderList = await User.find({}).sort({"point": -1}).limit(50);

        res.send(leaderList);
    }catch(err){
        console.log(err);
        res.status(401).send({
            errorMessage: 'lobby leaderboard err'
        })
    }
});

router.post('/lobby/create', async (req, res) => {
    try{
        const { roomName, id } = req.body;

        // !!!소켓 연결시(실제로 소켓에서 방생성)cnt가 올라가는지 확인해 보고 수정해야할 수 있음 
        const newRoom = new Room({
            roomName: roomName,
            playerCnt: 1,
            observerCnt: 0,
            state: 'wait',
        });
        await newRoom.save();
        // 방생성자의 state값 Aplayer로 바꿔주는거 (post메서드 put으로 바꿔줘야 하나?)
        await User.updateOne({ id: id}, {$set: {state: "blackPlayer"}});
        // roomNum 받아오는지 확인하기
        const roomNum = await newRoom.roomNum;
        res.send({roomNum});
    }catch(err){
        console.log(err);
        res.status(401).send({
            errorMessage: 'lobby create err'
        })
    }
    
    
});

// [방 입장 모달창 ]
router.get('/lobby/joinroom/:roomNumber', async (req, res) => {
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
});

// [방 입장 모달창]: 버튼 입력
router.post('/lobby/joinroom', async (req, res) => {
    const { roomNum, id, state } = req.body;

    try{
        console.log('받아온 id', id)
        const user = await User.updateOne({ id: id }, {$set: { state: state }})
        
        const postuser = await User.findOne({id: id})
        const userInfo = {"id": postuser.id, "state": postuser.state}
        res.status(201).send(userInfo);
    }catch(err){
        console.log(err);
        res.status(400).send({
            errorMessage: '/lobby/joinroom POST 에러'
        });
    }
})




module.exports = router;