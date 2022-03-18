const mongoose = require('mongoose');

const usersSchema = new mongoose.Schema({
  id: String,
  nickname: String,
  pass: String,
  score: Array,
  point: Number,
  state: String,
  teachingCnt: {
    type: Number,
    default: 0,
  },
});

module.exports = mongoose.model('Users', usersSchema);
