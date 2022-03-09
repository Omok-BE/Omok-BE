const mongoose = require('mongoose');

const teachingSchema = new mongoose.Schema({
    id: String,
    teachingCnt: Number
});

module.exports = mongoose.model('Teaching', teachingSchema)