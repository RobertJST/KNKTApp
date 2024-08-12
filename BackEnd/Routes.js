const express = require('express');
const bcrypt = require('bcrypt');
// models
const User = require('./../models/User');
const Chat = require('./../models/Chat');
const Message = require('./../models/Message');

const router = express.Router();

router.post('/login', async (req, res) => {
    // verifies use credentials
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (user && await bcrypt.compare(password, user.password)) {
      res.json({
        user: {
            id: user._id,
            username: user.username,
            email: user.email,
            status: 'ok'
        }
      });
    } else {
      res.status(400).send('Invalid credentials');
    }
  });
  
  router.post('/register', async (req, res) => {
    // registers new users
    const { username, email, password } = req.body;
    
    try {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).send('Email already registered');
      }
  
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = new User({ username, email, password: hashedPassword });
      await user.save();
  
      res.status(201).send('Success');
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).send('Error during registration');
    }
  });
  
  router.get('/api/users/search', async (req, res) => {    
    try {
      // return all users username and email
      const searchTerm = req.query.term;
      const users = await User.find({ 
        $or: [
          { username: new RegExp(searchTerm, 'i') },
          { email: new RegExp(searchTerm, 'i') }
        ]
      }, 'username email');
      res.json(users);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  router.post('/api/chats', async (req, res) => {
    try { 
      // create chats, or group chats
      const { participants, emails, name, isGroup } = req.body;
      // randomize group chats ids, one on one chat ids are constant
      const roomId = isGroup ? 
        `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` : 
        `${emails.sort().join('_')}`.replace(/[@.]/g, '_');
  
      let chat = await Chat.findOne({ roomId });
  
      if (!chat) {
        chat = new Chat({
          roomId,
          name: name || `${roomId}`,
          participants,
          emails,
          isGroup
        });
        await chat.save();
      } 
      res.json(chat);
    } catch (error) {
      console.error(error);
      res.json({ message: 'Server error' });
    }
  });
  
  router.get('/api/chats/:userEmail', async (req, res) => {
    try {
      // return all chats currentUser is in
      const userEmail = req.params.userEmail;
      const chats = await Chat.find({ emails: userEmail});
      res.json(chats);
    } catch (error) {
      console.error(error);
      res.json({ message: 'Server error' });
    }
  });
  
  
  router.get('/api/messages/:roomId', async (req, res) => {
    try {
      // return all messages in specific roomId
      const roomId = req.params.roomId;
      const messages = await Message.find({ roomId }).sort('timestamp');
      res.json(messages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      res.json({ message: 'Server error' });
    }
  });
  
  router.post('/api/chats/:roomId/leaveChat', async (req, res) => {
    try {
      const roomId = req.params.roomId;
      const user = req.body;
  
      const result = await Chat.findOneAndUpdate(
        { roomId: roomId },
        {
          $pull: { emails: user.email },
          $addToSet: { removedUsers: user.email }
        },
        { new: true }
      );
  
      if (result) {
        res.json(result);
      } else {
        res.status(404).json({ message: 'Chat room not found or user not in the chat' });
      }
    } catch (error) {
      console.error('Error:', error);
      res.json({ message: 'Server error' });
    }
  });

module.exports = router;