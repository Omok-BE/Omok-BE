const mongoose = require('mongoose');
const AutoIncrement = require('mongoose-sequence')(mongoose);

const roomsSchema = new mongoose.Schema({
    roomName: String,
    playerCnt: Number,
    observerCnt: Number,
    state: String
});

roomsSchema.plugin(AutoIncrement, { inc_field: 'roomNum'});

module.exports = mongoose.model('Rooms', roomsSchema)