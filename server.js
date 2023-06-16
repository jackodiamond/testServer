    var io = require('socket.io')({
	transports: ['websocket'],
});
    let port = process.env.PORT || 8080;
io.attach(port);
var usernames = {}; 
var roomo = {};
var rooms = []; 
console.log("hello call back clients");
//nothing changed
/* 
struct userData{
	string id;
	string name;
	string room;
	bool isHost;
} 
*/

io.sockets.on('connection', function(socket) {

    console.log(socket.id + " has connected!");

    socket.on('Test', function(msg){
        console.log('Get Message ' + msg);
    });

    socket.on('userInit', function(username) {
        socket.username = username; 
        if(usernames[socket.id])
        {
            delete usernames[socket.id];
        }
        usernames[socket.id] = username; 

        console.log(socket.username + " >>> initiazed >>> ");
        io.to(socket.id).emit('socketID', {'id':socket.id}); 
    });

    socket.on('create', function(room) {

    const obj = JSON.stringify(room); 
    var recv = JSON.parse(obj);

    room = recv.roomName;
    const bidAmount = recv.bidAmount;
    //do not allow to create 2 rooms by same name!
    rooms.push(room);
 	socket.join(room);
	socket.room = room;
	console.log(socket.username + " >>> In >>> " + socket.room); 
	io.sockets.adapter.rooms[socket.room].host = socket.id; //manage boundary condition when the host leaves
	io.sockets.adapter.rooms[socket.room].matchStarted = false;
    io.sockets.adapter.rooms[socket.room].bidAmount = bidAmount;
    roomo[room]=bidAmount;
	//instead of 2 there could be 1!
 	io.to(socket.id).emit('roomJoined', {});
    var clients = io.sockets.adapter.rooms[socket.room].sockets;   
    var roomUsers = [];
    for (var clientId in clients ) {
        roomUsers.push(usernames[clientId]); 
    }
    io.to(socket.id).emit('hostOfGame', {'usernames':usernames});  
    io.sockets["in"](socket.room).emit('usernames', {'names':roomUsers,'room_information': io.sockets.adapter.rooms[socket.room], 'usernames':usernames,'roomHost':io.sockets.adapter.rooms[socket.room].host});
    });

    socket.on('joinRoom', function(newroom) {
    if(io.sockets.adapter.rooms[newroom])
    {
    if(io.sockets.adapter.rooms[newroom].length)
    {
	if(io.sockets.adapter.rooms[newroom].length>3)
	{
		return;
	} 
    }
    }
    if(io.sockets.adapter.rooms[newroom].matchStarted) 
    {
        return;
    }	
    socket.join(newroom);
    io.sockets["in"](socket.room).emit('updatechat', updatechatMsg('System', 'System', socket.username + ' has connected to '+socket.room));
    socket.room = newroom;
    console.log(socket.username + " >>> In >>> " + socket.room);
    io.to(socket.id).emit('roomJoined', {});
	var clients = io.sockets.adapter.rooms[socket.room].sockets;   
	var roomUsers = [];
	for (var clientId in clients ) {
		roomUsers.push(usernames[clientId]);
	}
	io.sockets["in"](socket.room).emit('usernames', {'names':roomUsers,'room_information': io.sockets.adapter.rooms[socket.room], 'usernames':usernames,'roomHost':io.sockets.adapter.rooms[socket.room].host});
    }); 

    socket.on('getRooms', function() {
        console.log("get rooms");  
    	io.to(socket.id).emit('rooms',{'id': socket.id ,'rooms':rooms,'roomo' : roomo});  
    });
 
    socket.on('startGame',function(msg)
    { 
    	console.log("client socket called start game");
    	io.sockets.adapter.rooms[socket.room].matchStarted = true;
        io.sockets["in"](socket.room).emit('usernames', {'room_information': io.sockets.adapter.rooms[socket.room], 'usernames':usernames,'roomHost':io.sockets.adapter.rooms[socket.room].host});
        io.sockets["in"](socket.room).emit('startGame', {'socketDictionary': msg});
    });
 
    socket.on('startCardDistribution',function(msg)
    {
       console.log("start card distribution");
        //start the game now
        io.sockets["in"](socket.room).emit('startCardDistribution', {'playerID': msg});
    });

    socket.on('cardsDistributed',function(msg)
    {
       console.log("cards distributed");
        //start the game now
        io.sockets["in"](socket.room).emit('cardsDistributed', {'socketDictionary': msg});
    });

    socket.on('pointEntered',function(msg)
    {
       console.log("pointEntered");
       socket.broadcast.to(socket.room).emit('pointEntered', {'networkMessage': msg});
    });

    socket.on('allPointsEntered',function(msg)
    { 
       console.log("all points entered");
        io.sockets["in"](socket.room).emit('allPointsEntered', {'networkMessage': msg});
    });

    socket.on('cardPlayed',function(msg)
    {
       console.log("card played");
        //broadcast to everyone in room
        socket.broadcast.to(socket.room).emit('cardPlayed', {'networkMessage': msg});
    });

    socket.on('currentHandWinner',function(msg)
    {
       console.log("currentHandWinner");
        //broadcast to everyone in room
        io.sockets["in"](socket.room).emit('currentHandWinner', {'id': msg});
    });

    socket.on('matchFinished',function(msg)
    {
       console.log("matchFinished"); 
        //broadcast to everyone in room
        io.sockets["in"](socket.room).emit('matchFinished', {'nullData': msg});
    });

    socket.on('userPlayed',function(msg)
    {
        //tell who was this user ie 1,2,3,4 and what was the card to everyone
    });

    socket.on('nextTurn',function(msg)
    {
        //host sends this, telling which number 1,2,3,4 to play next
    });

    socket.on('handWinnger',function(msg)
    {
        //host sends this, telling which number 1,2,3,4 won the hand
    });

    socket.on('gameFinished',function(msg)
    {
        //host sends this, telling rank of players and score after game ended
    });

    socket.on('leaveRoom',function(msg)
    {
        console.log("leave room 1");
        socket.leave(socket.room);

        //deleting it from usernames as well, otherwise getting weird bug on host change on rematch
        delete usernames[socket.id]; 

        if(!io.sockets.adapter.rooms[socket.room])
        {
            //remove room   
            for(var i=0;i<rooms.length;i++) 
            { 
                if(rooms[i]==socket.room)
                {
                    delete roomo[rooms[i]];
                    rooms.splice(i,1); 
                    break; 
                }
            } 
        } 
        console.log("leave room 2");
        io.sockets["in"](socket.room).emit('playerLeft', {'id': socket.id,'name':socket.username});
        io.sockets["in"](socket.room).emit('usernames', {'room_information': io.sockets.adapter.rooms[socket.room], 'usernames':usernames});

    });

    socket.on('checkRoomState', function(){
        io.sockets.emit('UpdateRoomState', {'id': socket.id , 'current_room':socket.room, 'room_information': io.sockets.adapter.rooms[socket.room] });
    });

    socket.on('rename', function(name){ 
        usernames[socket.id] = name;
        socket.username = name;
        console.log(socket.id + "change name >>>>> " + name);
    });

                    
    socket.on('disconnect', function(reason) {
    	console.log(socket.id + " has disconnected!");  
	    
        delete usernames[socket.id];
        if(io.sockets.adapter.rooms[socket.room])
        {
            if(io.sockets.adapter.rooms[socket.room].host == socket.id)
            {
                    clients = io.sockets.adapter.rooms[socket.room].sockets;
                    for (var clientId in clients ) 
                    {
                     console.log("new host : "+clientId); 
                     io.sockets.adapter.rooms[socket.room].host = clientId;
                     io.to(clientId).emit('hostOfGame', {'usernames':usernames}); 
                     break;
                    }
            }
 
            
    	}
        else
        {
            //remove room   
            for(var i=0;i<rooms.length;i++)
            { 
                if(rooms[i]==socket.room)
                {
                    delete roomo[rooms[i]];
                    rooms.splice(i,1);
                    break; 
                } 
            }
        }
        io.sockets["in"](socket.room).emit('playerDisconnect', {'id': socket.id,'isHost':false,'name':socket.username});
        io.sockets["in"](socket.room).emit('usernames', {'room_information': io.sockets.adapter.rooms[socket.room], 'usernames':usernames});
        socket.leave(socket.room);
    }); 
    

 });


function updatechatMsg(id, username,  msg){
    return {'id':id,'username': username ,'msg':msg};
}

function changeHost()
{
    //change the host of a room when host disconnects
}

function removeRoom()
{
    //remove a room when when players leave
}
