const mongoose = require('mongoose');

const gamesSchema = new mongoose.Schema({
    roomNum: Number,
    black: Array,
    white: Array,
    blackTeam: Array,
    whiteTeam: Array,
});

module.exports = mongoose.model('Games', gamesSchema)