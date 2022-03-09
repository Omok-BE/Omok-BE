const mongoose = require('mongoose');

const gamesSchema = new mongoose.Schema({
    gameNum: Number,
    gameName: String,
    black: Array,
    white: Array,
    blackTeamPlayer: String,
    blackTeamObserver: Array,
    whiteTeamPlayer: String,
    whiteTeamObserver: Array
});

module.exports = mongoose.model('Games', gamesSchema)