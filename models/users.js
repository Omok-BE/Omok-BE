const mongoose = require('mongoose');

const usersSchema = new mongoose.Schema({
    id: String, 
    nickname: String,
    pass: String, 
    score: Array,
    point: Number,
    state: String,
});

module.exports = mongoose.model('Users', usersSchema)