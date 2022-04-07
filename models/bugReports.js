const mongoose = require('mongoose');

const bugReportSchema = new mongoose.Schema({
  reportUser: Object,
  gameData: Object,
  gameInfo: Object,
  content: String, 
});

module.exports = mongoose.model('bugReport', bugReportSchema);