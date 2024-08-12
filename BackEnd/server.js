// install requiremnets:
// npm install express socket.io mongoose bcrypt body-parser

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = 3000;

// Routes and Sockets
const routes = require('./Routes');
const Sockets = require('./Sockets');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/loginApp');

// Default Page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'Login.html'));
});

// Routes
app.use('/', routes);

// Sockets
Sockets(io);

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));