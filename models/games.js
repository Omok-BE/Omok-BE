const mongoose = require('mongoose');

const gamesSchema = new mongoose.Schema({
    gameNum: Number,
    gameName: String,
    black: Array,
    white: Array,
    blackTeam: Array,
    whiteTeam: Array,
});

module.exports = mongoose.model('Games', gamesSchema)