const express = require('express');
const router = express.Router();
const Rooms = require('../models/rooms');
const Games = require('../models/games')

//대기실 => 게임방 입장시 게임방 생성
router.post('/game/userInfo', async (req, res) => {
    try {
        const { blackTeam, whiteTeam, roomNum} = req.body;
        const state = "게임중"
        await Rooms.updateOne({ roomNum }, { set: { state }});

        const room = await Rooms.findOne({ roomNum });
        await Games.create({
            gameNum: roomNum,
            gameName: room.Name,
            blackTeam,
            whiteTeam,
        });
        res.json({ ok: true });
    } catch(error) {
        res.status(400).json({ ok: false });
    }
})

module.exports = router;