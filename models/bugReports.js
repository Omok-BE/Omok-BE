const mongoose = require('mongoose');

const bugReportSchema = new mongoose.Schema({
  reportUser: Object,
  gameData: Object, //제보당시의 gameroom 정보 
  gameInfo: Object,
  content: String, // 간단 내용 
});

module.exports = mongoose.model('bugReport', bugReportSchema);