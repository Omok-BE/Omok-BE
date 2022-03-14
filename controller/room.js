const Rooms = require('../models/rooms')
const Users = require('../models/users');

// 대기실 입장시 유저 정보 전달
const userInfo = async (req,res) => {
    try {
        const { id, roomNum } = req.body;
        await Rooms.updateOne({ roomNum }, { $addToSet: { participants: id }})
        const userList = await Rooms.findOne({ roomNum }, { _id: false, participants: true })
        let userInfos = []
        console.log(userList.participants)
        // for (let element of userList.participants) {
        //     const userInfo = await await Users.findOne({ id: element }, { _id: false, id: true, score: true, point: true, state: true })
        // }
        userList.participants.forEach((element) => {
            const userInfo = await Users.findOne({ id: element }, { _id: false, id: true, score: true, point: true, state: true })
            console.log(userInfo)
            userInfos.push(userInfo)
        });
        console.log(userInfos)
        res.status(200).json({
            userInfos
        })
    } catch(error){
        console.log(error)
        res.status(400).json({ ok: false })
    }
};

module.exports = { userInfo };