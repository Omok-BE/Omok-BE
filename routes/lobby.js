const express = require('express');
const Room = require('../models/rooms');
const User = require('../models/users');

const router = express.Router();

// 로비첫 화면
router.get('/lobby', async (req, res) => {
    const allRoom = await Room.find()

    res.send(allRoom);
});

//로비 유저리스트
router.get('/lobby/userList', async (req, res) => {
    const allUser = await User.find({ state: "online"});

    res.send(allUser);
});

// 로비 간이 리더리스트
router.get('/lobby/leaderList', async (req, res) => {
    const leaderList = await User.find({}).sort({"point": -1}).limit(5);

    res.send(leaderList);
});

// 리더보드 50개 정보띄워주기용
router.get('/leaderBoard', async (req, res) => {
    const leaderList = await User.find({}).sort({"point": -1}).limit(50);

    res.send(leaderList);
});

router.post('/lobby/create', async (req, res) => {
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
    await User.updateOne({ id: id}, {$set: {state: "Aplayer"}});
});

// [방 입장 모달창 ]
router.get('/lobby/joinroom/:roomNumber', async (req, res) => {
    const { roomNumber } = req.params;

    const room = await Room.findOne({ roomNumber: roomNumber });

    res.send(room);
});

// [방 입장 모달창]: 버튼 입력
router.post()


module.exports = router;