const Rooms = require('../models/rooms')
const Users = require('../models/users');

// 대기실 입장시 유저 정보 전달
const userInfo = async (req,res) => {
    try {
        const { roomNum } = req.params;
        console.log(roomNum)
        const userInfos = await Rooms.aggregate([
            {
                $match: { roomNum: Number(roomNum) }                
            },
            {
                $lookup:
                {
                    from: "users",
                    localField: "blackTeamPlayer",
                    foreignField: "id",
                    // pipeline: [
                    //     { $project: { _id: 0, __v: 0, nickname: 0, pass: 0, teachingCnt: 0  } }
                    //  ],
                    as: "blackPlayerInfo"
                }
            },
            {
                $lookup:
                {
                    from: "users",
                    localField: "whiteTeamPlayer",
                    foreignField: "id",
                    // pipeline: [
                    //     { $project: { _id: 0, __v: 0, nickname: 0, pass: 0, teachingCnt: 0 } }
                    //  ],
                      as: "whitePlayerInfo"
                }
            },
            {
                $project: { 
                    blackPlayerInfo: 1, whitePlayerInfo: 1, blackTeamObserver: 1, whiteTeamObserver: 1, _id: 0 }
            },
        ])
        res.status(200).json({
            userInfos
        })
    } catch(error){
        console.log(error)
        res.status(400).json({ ok: false })
    }
};

module.exports = { userInfo };