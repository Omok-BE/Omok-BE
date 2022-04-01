const Games = require('../../models/games');

//게임방내 유저 state별 정보
module.exports.gameUserInfo = async(gameNum) =>{
  await Games.aggregate([
     {
       $match: { gameNum: Number(gameNum) },
     },
     {
       $lookup: {
         from: 'users',
         localField: 'blackTeamPlayer',
         foreignField: 'id',
         as: 'blackTeamPlayer',
       },
     },
     {
       $lookup: {
         from: 'users',
         localField: 'blackTeamObserver',
         foreignField: 'id',
         as: 'blackTeamObserver',
       },
     },
     {
       $lookup: {
         from: 'users',
         localField: 'whiteTeamPlayer',
         foreignField: 'id',
         as: 'whiteTeamPlayer',
       },
     },
     {
       $lookup: {
         from: 'users',
         localField: 'whiteTeamObserver',
         foreignField: 'id',
         as: 'whiteTeamObserver',
       },
     },
     {
       $project: {
         _id: 0,
         blackTeamPlayer: { id: 1, score: 1, point: 1, state: 1, profileImage:1 },
         blackTeamObserver: { id: 1, score: 1, point: 1, state: 1, teachingCnt:1, profileImage:1 },
         whiteTeamPlayer: { id: 1, score: 1, point: 1, state: 1, profileImage:1 },
         whiteTeamObserver: { id: 1, score: 1, point: 1, state: 1, teachingCnt:1, profileImage:1 },
         timer: 1
       },
     },
  ]);
}