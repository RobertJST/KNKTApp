const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const path = require('path');

// Models
const Chat = require('./../models/Chat');
const User = require('./../models/User');
const Message = require('./../models/Message');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/loginApp');

// Default Page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'Login.html'));
});

app.post('/login', async (req, res) => {
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

app.post('/register', async (req, res) => {
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

app.get('/api/users/search', async (req, res) => {    
  try {
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

app.post('/api/chats', async (req, res) => {
  try {
    const { participants, emails, name, isGroup } = req.body;
    
    if (!isGroup && participants.length !== 2) {
      return res.status(400).json({ message: 'Non-group chats must have exactly 2 participants' });
    }

    const roomId = isGroup ? 
      `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` : 
      `${participants.sort().join('_')}`.replace(/[@.]/g, '_');

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
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/chats/:userEmail', async (req, res) => {
  try {
    const userEmail = req.params.userEmail;
    const chats = await Chat.find({ emails: userEmail});
    res.json(chats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});


app.get('/api/messages/:roomId', async (req, res) => {
  try {
    const roomId = req.params.roomId;
    const messages = await Message.find({ roomId }).sort('timestamp');
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/chats/:roomId/addUser', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userEmail } = req.body;

    const chat = await Chat.findOne({ roomId });
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    if (!chat.isGroup) {
      return res.status(400).json({ message: 'Cannot add users to non-group chats' });
    }

    if (!chat.participants.includes(userEmail)) {
      chat.participants.push(userEmail);
      await chat.save();
    }

    res.json(chat);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

io.on('connection', (socket) => {
  console.log('A user connected');
  

  socket.on('user', (roomId) => {
      socket.join(roomId);
      console.log(`User joined: ${roomId}`);
  });

  socket.on('new chat', (roomId) => {
    io.to(roomId).emit('new chat');
    console.log(`User joined chat: ${roomId}`);
});

  socket.on('join chat', (roomId) => {
    socket.join(roomId);
    io.to(roomId).emit('join chat');
    console.log(`User joined room: ${roomId}`);
  });

  socket.on('chat message', async (data) => {
    const { roomId, sender, content } = data;
    
    try {
      const newMessage = new Message({
        roomId,
        sender,
        content
      });
      await newMessage.save();

      io.to(roomId).emit('chat message', {
        roomId,
        sender,
        content,
        timestamp: newMessage.timestamp
      });
    } catch (error) {
      console.error('Error saving message:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));