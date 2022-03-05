const express = require('express');
const Room = require('../models/rooms');
const User = require('../models/users');

const router = express.Router();

// 로비첫 화면
router.get('/lobby', async (req, res) => {
    const allRoom = await Room.find()

    res.send(allRoom);
})

//로비 유저리스트
router.get('/lobby/userList', async (req, res) => {
    const allUser = await User.find({ state: "online"});

    res.send(allUser);
})

// 로비 리더리스트
router.get('/lobby/leaderList', async (req, res) => {
    const leaderList = await User.find({}).sort({"point": -1}).limit(5);

    res.send(leaderList);
})
module.exports = router;