const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    roomId: String,
    sender: String,
    senderEmail: String,
    content: String,
    timestamp: { type: Date, default: Date.now }
  });

  module.exports = mongoose.model('Message', MessageSchema);