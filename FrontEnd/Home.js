document.addEventListener('DOMContentLoaded', () => {
    const username = document.getElementById('username');
    const userSearch = document.getElementById('userSearch');
    const chatList = document.getElementById('chatList');
    const groups = document.getElementById('groups');
    const groupBtn = document.getElementById('groupBtn');
    const socket = io();

    let currentUser;
    let currentRoomId;

    const userString = localStorage.getItem('user');
    currentUser = JSON.parse(userString);
    username.textContent = currentUser.username;

    socket.emit('user', currentUser.email)

    fetchChatList();

    userSearch.addEventListener('input', debounce(searchUsers, 250));

    let newGroupMembers = [];
    let grouping = false;
    groupBtn.addEventListener('click', createGroup);

    function createGroup(){
        groups.innerHTML = '<button id="cancelBtn">Cancel</button><button id="createBtn">Create</button>';
        chatArea.innerHTML = `
            <div class="chat-header">
                <div class="chat-title" id="chatTitle">No user selected</div>
                <div class="chat-actions">
                </div>
            </div>
            <div class="chat-messages" id="chatMessages"></div>
            <div class="message-input">
                <input type="text" id="messageInput" placeholder="Type a message...">
                <button id="sendButton">Send</button>
            </div>
        `;
        document.getElementById('cancelBtn').addEventListener('click', cancelGroup);
        grouping = true;
        userSearch.value = '';   
        fetchSelected();
        document.getElementById('createBtn').addEventListener('click', Create);
    }

    function cancelGroup(){
        groups.innerHTML = '<button id="groupBtn">Create Group</button>';
        document.getElementById('groupBtn').addEventListener('click', createGroup);
        grouping = false;
        userSearch.value = '';
        newGroupMembers = [];    
        fetchChatList();
        const title = document.getElementById('chatTitle');
        title.textContent = 'No chat selected';
    }

    function Create() {
        let names = [];
        let emails = [];
        newGroupMembers.forEach(member => {
            names.push(member.username);
            emails.push(member.email);
        })
        createOrOpenChat(emails, names);
        socket.emit('new chat', );
    }

    async function searchUsers() {
        const searchTerm = userSearch.value.trim();
        if (searchTerm === '') {
            if (grouping === false) {
                fetchChatList();
                return;
            }
            else {
                fetchSelected();
                return
            }
        }
    
        try {
            const response = await fetch(`/api/users/search?term=${encodeURIComponent(searchTerm)}`, {
                method: 'GET',
                headers: {
                  'Accept': 'application/json',
                }
            });
            const users = await response.json();
            displaySearchResults(users);
        } catch (error) {
            console.error('Error searching users:', error);
        }
    }

    function displaySearchResults(users) {
        chatList.innerHTML = '';
        users.forEach(user => {
            if (user.email !== currentUser.email) {
                const userItem = createUserItem(user);
                chatList.appendChild(userItem);

            }
        });
    }

    function createUserItem(user) {
        const userItem = document.createElement('div');
        userItem.classList.add('chat-item');
        
        const nameElement = document.createElement('div');
        nameElement.classList.add('chat-item-name');
        nameElement.textContent = user.username;
        
        const emailElement = document.createElement('div');
        emailElement.classList.add('chat-item-email');
        emailElement.textContent = user.email;
        
        userItem.appendChild(nameElement);
        userItem.appendChild(emailElement);

        if (newGroupMembers.find(member => member.username === user.username)) {
            userItem.classList.add('selected');
        }
        
        if (grouping === false) {
            userItem.addEventListener('click', () => createOrOpenChat([user.email], [user.username]));
            return userItem;
        }
        else {
            userItem.addEventListener('click', () => selectUser(user, userItem));
            return userItem;
        }
    }

    async function createOrOpenChat(otherUserEmails, otherNames,  chatName = '', isGroup = false) {
        try {
            const participants = [currentUser.username, ...otherNames];
            if (participants.length > 2) {
                isGroup = true;
            }
            const emails = [currentUser.email, ...otherUserEmails];
            const response = await fetch('/api/chats', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ participants, emails,  name: chatName, isGroup }),
            });
            const chat = await response.json();
            openChat(chat.roomId, chat.name, chat.participants, chat.isGroup, chat.emails);
            userSearch.value = '';

            otherUserEmails.forEach(email => {
                socket.emit('new chat', email);
            })

            if (isGroup) {
                cancelGroup();
            } 
            else {
                fetchChatList();
            }
        } catch (error) {
            console.error('Error creating/opening chat:', error);
        }
    }

    async function fetchChatList() {
        try {
            const response = await fetch(`/api/chats/${currentUser.email}`, {
                method: 'GET',
                headers: {
                  'Accept': 'application/json',
                }
            });
            const chats = await response.json();
            displayChatList(chats);
        } catch (error) {
            console.error('Error fetching chat list:', error);
        }
    }

    async function fetchSelected() {
        chatList.innerHTML = '';
        newGroupMembers.forEach(user => {
            const userItem = document.createElement('div');
            userItem.classList.add('chat-item');
            userItem.classList.add('selected');
        
            const nameElement = document.createElement('div');
            nameElement.classList.add('chat-item-name');
            nameElement.textContent = user.username;
        
            const emailElement = document.createElement('div');
            emailElement.classList.add('chat-item-email');
            emailElement.textContent = user.email;

            userItem.appendChild(nameElement);
            userItem.appendChild(emailElement);   
            
            userItem.addEventListener('click', () => selectUser(user, userItem));

            chatList.appendChild(userItem);   
        });
        
    }

    function selectUser(users, userItem) {
        if (!newGroupMembers.find(member => member.username === users.username)) {
            userItem.classList.add('selected');
            newGroupMembers.push(users);
        }
        else {
            var index = newGroupMembers.indexOf(users);
            newGroupMembers.splice(index, 1);
            userItem.classList.remove('selected');
        }
        const title = document.getElementById('chatTitle');

        if (newGroupMembers.length > 0) {
            title.textContent = newGroupMembers.filter(user => user.username !== currentUser.username).map(user => user.username).join(', ');

        } else {
            title.textContent = 'No users selected';

        }
    }

    function displayChatList(chats) {
        chatList.innerHTML = '';
        chats.forEach(chat => {
            const chatItem = document.createElement('div');
            chatItem.classList.add('chat-item');
            
            const nameElement = document.createElement('div');
            nameElement.classList.add('chat-item-name');
            nameElement.textContent = chat.participants.filter(p => p !== currentUser.username).join(', ');
            // displays the usernames of all users in thet chat other than current user

            const emailElement = document.createElement('div');
            emailElement.classList.add('chat-item-email');
            emailElement.textContent = chat.emails.filter(p => p !== currentUser.email).join(', ');
            // displays the emails of all users in thet chat other than current user
            
            chatItem.appendChild(nameElement);
            chatItem.appendChild(emailElement);
            
            chatItem.addEventListener('click', () => openChat(chat.roomId, chat.name, chat.participants, chat.isGroup, [chat.emails]));
            chatList.appendChild(chatItem);
        });
    }

    function openChat(roomId, chatName, participants, isGroup, emails) {
        currentRoomId = roomId;
        const chatArea = document.getElementById('chatArea');
        chatArea.innerHTML = `
            <div class="chat-header">
                <div class="chat-title">${participants.filter(p => p !== currentUser.username).join(', ')}</div>
                <div class="chat-actions">
                    <button class="delete-chat-btn" title="Leave chat" id="leaveChat"><i class="fas fa-trash"></i></button>
                </div>
            </div>
            <div class="chat-messages" id="chatMessages"></div>
            <div class="message-input">
                <input type="text" id="messageInput" placeholder="Type a message...">
                <button id="sendButton">Send</button>
            </div>
        `;
        document.getElementById('leaveChat').addEventListener('click',(event) => {
            LeaveChat(currentUser.email, currentRoomId);
        });
        document.getElementById('sendButton').addEventListener('click', sendMessage);
        document.getElementById('messageInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });

        socket.emit('join chat', roomId, currentUser, emails);
        fetchPreviousMessages(roomId);
    }

    async function LeaveChat(email, roomId) {
        try {
            await fetch(`/api/chats/${roomId}/leaveChat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            })
            fetchChatList()
        } catch (error) {
            console.error('Error adding user:', error);
            alert('Failed to Leave.');
        }
    }

    async function fetchPreviousMessages(roomId) {
        try {
            // finds messages from room id
            const response = await fetch(`/api/messages/${roomId}`);
            const messages = await response.json();
            displayMessages(messages);
        } catch (error) {
            console.error('Error fetching messages:', error);
        }
    }

    function displayMessages(messages) {
        const chatMessages = document.getElementById('chatMessages');
        chatMessages.innerHTML = '';
        messages.forEach(message => {
            // adds each messages, checks wether current user sent or recieved message
            const messageElement = document.createElement('div');
            messageElement.classList.add('message-bubble', message.sender === currentUser.email ? 'sent' : 'received');
            messageElement.textContent = `${message.content}`;
            chatMessages.appendChild(messageElement);


        });
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function sendMessage() {
        // sends message using socket using room id
        const messageInput = document.getElementById('messageInput');
        const content = messageInput.value.trim();
        if (content && currentRoomId) {
            socket.emit('chat message', {
                roomId: currentRoomId,
                sender: currentUser.email,
                content: content
            });
            messageInput.value = '';
        }
    }

    socket.on('chat message', (data) => {
        const chatMessages = document.getElementById('chatMessages');
        const messageElement = document.createElement('div');
        messageElement.classList.add('message-bubble', data.sender === currentUser.email ? 'sent' : 'received');
        //check if current user is the one who sent the message
        messageElement.textContent = `${data.content}`;
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });

    socket.on('new chat', fetchChatList);

    async function addUserToGroup(roomId) {
        // not implented yet
        const userEmail = prompt("Enter the email of the user you want to add:");
        if (userEmail) {
            try {
                const response = await fetch(`/api/chats/${roomId}/addUser`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ userEmail }),
                });
                const updatedChat = await response.json();
                alert(`User ${userEmail} added to the chat.`);
                // Optionally, update the chat display here
            } catch (error) {
                console.error('Error adding user:', error);
                alert('Failed to add user to the group.');
            }
        }
    }

    function debounce(func, delay) {
        let timeoutId;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }
});