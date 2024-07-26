const mongoose = require('mongoose');


const ChatSchema = new mongoose.Schema({
    roomId: String,
    name: String,
    participants: [String],
    emails: [String],
    isGroup: { type: Boolean, default: false }
});

module.exports = mongoose.model('Chat', ChatSchema);