const mongoose = require('mongoose');

const boardsSchema = new mongoose.Schema({
  gameNum: Number,
  board:Array,
  count:{
    type: Number,
    default:0
  },
  pointer:Boolean
});

module.exports = mongoose.model('Boards', boardsSchema);
