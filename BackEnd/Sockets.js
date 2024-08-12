const Chat = require('./../models/Chat');
const Message = require('./../models/Message');

module.exports = function(io) {
  io.on('connection', (socket) => {
    socket.on('user', (roomId) => {
        // each user is put in their own room when they connect to server
        
          socket.join(roomId);
      });
    
      socket.on('new chat', (roomId) => {
        // updates chatList when another user opens a new chat with you
        io.to(roomId).emit('new chat');
      })
    
      socket.on('leave chat', (roomId) => {
        // removes user from room
        socket.leave(roomId);
      })
    
    socket.on('join chat', async (roomId, currentUser) => {
      socket.join(roomId);
      try {
        const chat = await Chat.findOne({ roomId });
        if (!chat) {
          console.log(`Chat room ${roomId} not found`);
          return;
        }
        // If the user was previously removed, add them back
        if (chat.removedUsers.includes(currentUser.email)) {
          await Chat.updateOne(
            { roomId },
            {
              $pull: { removedUsers: currentUser.email },
              $addToSet: { emails: currentUser.email }
            }
          );
        } else if (!chat.emails.includes(currentUser.email)) {
          // If the user wasn't in the chat before, add them
          await Chat.updateOne(
            { roomId },
            { $addToSet: { emails: currentUser.email } }
          );
        }
    
        // For one-on-one conversations, add the other user back if they were removed
        if (!chat.isGroup && chat.emails.length < 2 && chat.removedUsers.length > 0) {
          chat.removedUsers.forEach(async user => {
            await Chat.updateOne(
            { roomId },
            {
              $pull: { removedUsers: user },
              $addToSet: { emails: user }
            }
          );
        
          })
         }
        io.to(roomId).emit('join chat');
      } catch (error) {
        console.error('Join chat error:', error);
      }
    });
    
    
    
    socket.on('chat message', async (data) => {
      const { roomId, sender, senderEmail, content } = data;
      try {
        const chat = await Chat.findOne({ roomId });
        if (!chat) {
          console.log(`Chat room ${roomId} not found`);
          return;
        }
    
        // for one on one conversations, add the other user back if they were removed
        if (!chat.isGroup && chat.emails.length === 1 && chat.removedUsers.length > 0) {
          chat.removedUsers.forEach(async user => {
            await Chat.updateOne(
            { roomId },
            {
              $pull: { removedUsers: user },
              $addToSet: { emails: user }
            }
          );
        
          })
         } 
    
        const newMessage = new Message({
          roomId,
          sender,
          senderEmail,
          content
        });
        await newMessage.save();
    
        io.to(roomId).emit('chat message', {
          roomId,
          sender,
          senderEmail,
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
};