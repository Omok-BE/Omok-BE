const express = require('express');
const router = express.Router();

const Users = require('../models/users');

// 대기실 입장시 유저 정보 전달
router.post('/room/userInfo', async (req,res) => {
    try {
        const { id } = req.body;
        console.log('room', id)
        const userInfo = await Users.findOne({ id }, { _id: false, id: true, state: true })
        console.log('room', userInfo)
        res.status(200).json({
            userInfo
        })
    } catch(error){
        res.status(400).json({ ok: false })
    }
})

module.exports = router;