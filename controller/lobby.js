const express = require('express');
const Room = require('../models/rooms');
const User = require('../models/users');

const router = express.Router();

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

const userlist =  async (req, res) => {
    try{
        const allUser = await User.find({ state: "online"});

        res.send(allUser);
    }catch(err){
        console.log(err);
        res.status(401).send({
            errorMessage: 'lobby userlist err'
        })
    }
}

const userList = async (req, res) => {
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
        const userInfo = {"id": postuser.id, "state": postuser.state}
        
        res.status(201).send(userInfo);
    }catch(err){
        console.log(err);
        res.status(400).send({
            errorMessage: '/lobby/joinroom POST 에러'
        });
    }
}

module.exports = {
    lobby, userList, leaderBoard, createRoom, getJoinRoom
};