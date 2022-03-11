const express = require('express');
const router = express.Router();

const Users = require('../models/users');

// 대기실 입장시 유저 정보 전달
const userInfo = async (req,res) => {
    try {
        const { id } = req.body;
        const userInfo = await Users.findOne({ id }, { _id: false, id: true, score: true, state: true,  })
        res.status(200).json({
            userInfo
        })
    } catch(error){
        console.log(error)
        res.status(400).json({ ok: false })
    }
};

module.exports = { userInfo };