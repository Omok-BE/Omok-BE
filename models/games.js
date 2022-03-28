const mongoose = require('mongoose');

const gamesSchema = new mongoose.Schema({
  gameNum: Number,
  gameName: String,
  blackTeamPlayer: String,
  blackTeamObserver: Array,
  whiteTeamPlayer: String,
  whiteTeamObserver: Array,
});

module.exports = mongoose.model('Games', gamesSchema);
