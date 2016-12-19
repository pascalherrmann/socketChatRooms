var express = require('express')
  , app = express()
  , http = require('http')
  , server = http.createServer(app)
  , io = require('socket.io').listen(server);

server.listen(8080);

// routing
app.get('/', function (req, res) {
  res.sendfile(__dirname + '/public/index.html');
});

    // wenn der Pfad / aufgerufen wird
    app.get('/classic', function (req, res) {
        // so wird die Datei index.html ausgegeben
        res.sendfile(__dirname + '/public/classic.html');
    });

    //Express sagen: statische Dateien aus public dem Nutzer zur Verfügung stellen bei Anfragen
	// statische Dateien ausliefern
	app.use(express.static(__dirname + '/public'));

// usernames which are currently connected to the chat
var usernames = {};
var clients = [];

// rooms which are currently available in chat
var rooms = ['Welcome-Room','Plauderecke','Games'];

io.sockets.on('connection', function (socket) {

socket.on('newRoom', function (roomname) {
    rooms.push(roomname);
    io.sockets.emit('newRoom', roomname);
});

socket.on('deleteRoom', function (roomname) {
        for(var i = 0; i < rooms.length; i++) {
            if (rooms[i] == roomname) rooms.splice(i,1);
        }
    io.sockets.emit('deleteRoom', roomname);
});

	
	// when the client emits 'adduser', this listens and executes
	socket.on('adduser', function(username){
		// store the username in the socket session for this client
		socket.username = username;
		// store the room name in the socket session for this client
		socket.room = 'Welcome-Room';
		// add the client's username to the global list
		usernames[username] = username;
        clients.push({username:username, room: "Welcome-Room"});
        io.sockets.emit('updateusers', clients);

        
		// send client to room 1
		socket.join('Welcome-Room');
		// echo to client they've connected
		socket.emit('updatechat', { zeit: new Date().getTime(), name:'Information', text: 'Du bist nun mit dem Server verbunden!' });
		// echo to room 1 that a person has connected to their room
		socket.broadcast.to('Welcome-Room').emit('updatechat', { zeit: new Date().getTime(), name:'Information', text: username+' ist dem Chat beigetreten!' });
		socket.emit('updaterooms', rooms, 'Welcome-Room');
	});
	
    
    
    
    //////////////////////////////////////////////////
    /////NEUE NACHRICHT                          /////
    //////////////////////////////////////////////////
	// when the client emits 'sendchat', this listens and executes
	socket.on('sendchat', function (data) {
		// we tell the client to execute 'updatechat' with 2 parameters
        io.sockets.in(socket.room).emit('updatechat', { zeit: new Date().getTime(), name: socket.username, text: data.text }); 
	});
	
    
    
    
    //////////////////////////////////////////////////
    /////RAUM WECHSELN                           /////
    //////////////////////////////////////////////////
	socket.on('switchRoom', function(newroom){
		socket.leave(socket.room);
		socket.join(newroom);
        
        for(var i = 0; i < clients.length; i++) {
            if (clients[i].username == socket.username) clients[i].room=newroom;
        }
        io.sockets.emit('updateusers', clients);

        
		socket.emit('updatechat', { zeit: new Date().getTime(), name:'Information', text: 'Du bist dem Raum "'+newroom+'"  beigetreten!' });
		// sent message to OLD room
		socket.broadcast.to(socket.room).emit('updatechat', { zeit: new Date().getTime(), name:'Information', text: socket.username+' hat den Chat verlassen!' });
		// update socket session room title
		socket.room = newroom;
		socket.broadcast.to(newroom).emit('updatechat', { zeit: new Date().getTime(), name:'Information', text: socket.username+' ist dem Chat beigetreten!' });
		socket.emit('updaterooms', rooms, newroom);
	});
	

    //////////////////////////////////////////////////
    /////USER BEENDET VERBINDUNG                 /////
    //////////////////////////////////////////////////
    socket.on('disconnect', function(){
		// remove the username from global usernames list
		delete usernames[socket.username];
        for(var i = 0; i < clients.length; i++) {
            if (clients[i].username == socket.username) clients.splice(i,1);
        }
        
        
        
        
		// update list of users in chat, client-side
		io.sockets.emit('updateusers', clients);
		// echo globally that this client has left
		socket.broadcast.emit('updatechat', { zeit: new Date().getTime(), name:'Information', text: socket.username+' hat den Chat verlassen!' });
		socket.leave(socket.room);
	});
});


console.log("ready!");
