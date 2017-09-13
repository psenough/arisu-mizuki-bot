
//
// init tmi bot
//

var auth = require('./auth.js');
var tmi = require('tmi.js'); // https://docs.tmijs.org/

var options = {
	options: {
		debug: true
	},
	connection: {
		cluster: "aws",
		reconnect: true
	},
	identity: {
		username: auth.username,
		password: auth.password
	},
	channels: ["psenough"]
};

var tmi_client = new tmi.client(options);
tmi_client.connect();

tmi_client.on("connected", function(address, port) { 
	tmi_client.action("psenough", "Konichiwa!");
});

tmi_client.on("chat", function(channel, user, message, self) {
	if (message === "!twitter") {
		tmi_client.action("psenough", "http://twitter.com/psenough");
	}
	
	if (message.substring(0, 6) === "!guess") {
		let answer = message.slice(7, message.length);
		//console.log('answer: ' + answer);
		if (game.guessing === true) {
			if (game.guess(answer, user.username) === true) {
				sendMessage(JSON.stringify({'type': 'guess_correct', 'user': user.username, 'answer': answer}));
				setTimeout(function(){ 
								game.active_level++;
								if (game.active_level >= game.levels.length) {
									// end of game
									sendMessage(JSON.stringify({'type': 'eog', 'historic': game.historic}));
								} else {
									// new level
									sendMessage(JSON.stringify(game.getChallengeStruct()));
								}
							}, 20000);
			} else {
				sendMessage(JSON.stringify({'type': 'guess_wrong', 'user': user.username, 'answer': answer}));
			}
		}
	}
	
});

tmi_client.on("part", function (channel, username, self) {
    tmi_client.action("psenough", username + " has left the building!");
});

//TODO: also read youtube livechat https://www.youtube.com/watch?v=8-PZLps8XdM
// https://github.com/nullifiedcat/youtube-live-chat-everywhere



//
// init express
//

var net = require('net');
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var bodyParser = require('body-parser');
//var fs = require('fs');
var http = require('http');
var request = require('request');
//var parseString = require('xml2js').parseString;
var app = express();
//var util = require('util')

var port = 8080;
var httpServer = http.createServer(app);
httpServer.on('error', onError);
httpServer.listen(port); // on windows 8, we need to call httpServer.listen(80,'172.17.0.20');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

// serve master page
app.get('/', catchall);
function catchall(req, res) {
	res.render('screen', {title: 'Screen'});
}
/*
// serve favicon
app.get('/favicon.ico', function(req, res){
	var options = {
		root: __dirname + '/public/',
		dotfiles: 'deny',
		headers: {
			'x-timestamp': Date.now(),
			'x-sent': true
		}
	};
	var fileName = 'images/favicon.ico';
	res.sendFile(fileName, options, function (err) {
		if (err) {
		  console.log(err);
		  res.status(err.status).end();
		} else {
		  //console.log('Sent:', fileName);
		}
	});
	res.attachment(fileName);
});*/

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      logme('Can not access port ' + port + ', either its already in use or requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      logme('Port ' + port + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

app.use(catchall);

app.on('error', onError);




//
// init websockets
//

var WebSocketServer = require('ws').Server
  , ws_server = new WebSocketServer({ port: 3001 });

var active_conn = [];
var id = 0;

ws_server.on('connection', function (client) {
    client.id = id++;
	client.ra = client.upgradeReq.connection.remoteAddress;
	
	//console.log(client.ra);
    //client.send(JSON.stringify({'uniqueID': '2'}));
    active_conn.push({'uid': client.id, 'socket': client, 'latest_message': {}, 'client_type': null, 'latest_timestamp': getTimestamp()});
    logme('new ws connection from: ' + client.ra);
	logme('total ws active conns: ' + active_conn.length);

    client.on('message', function (data) {
		
		// if crashes trying to parse, ignore
		var parsed;
		try {
			parsed = JSON.parse(data);
		} catch (e) {
			logme('crashed trying to parse json: ' + data);
			console.error(e);
			return;
		}

		// fails to parse, ignore
		if (!parsed) {
			logme('received with bad json format2: ' + data);
			return;
		} else {
			if (('screen' in parsed)) {
				if (parsed['screen'] === 'ready') {
					logme('screen is ready');
					//TODO: send current active challenge
					client.send(JSON.stringify(game.getChallengeStruct()));
				}
			}
		}
		
    });

    client.on('close', function () {
        logme("websocket closed, removing it");
        var thisid = getID(client.id);
        if (thisid != -1) {
			console.log('removing...' + client.ra);
			//if (client.ra) removeTakenParamFromClosingIP(client.ra);
			active_conn.splice(thisid, 1);
		}
    });

    client.on('error', function () {
        logme("websocket error, removing it");
        var thisid = getID(client.id);
        if (thisid != -1) {
			console.log('removing...' + client.ra);			
			//if (client.ra) removeTakenParamFromClosingIP(client.ra);
			active_conn.splice(thisid, 1);
		}
    });
});

function getID(thisid) {
    for (var i = 0; i < active_conn.length; i++) {
        if (active_conn[i]['uid'] == thisid) {
            return i;
        }
    }
    return -1;
}

function sendWebSocketUpdateToCanvas(thisparam) {
	if (thisparam in params) {
		for (var i = 0; i < active_conn.length; i++) {
			if (active_conn[i]['socket'] && (active_conn[i]['client_type'] == 'canvas')) {
				var obj = {};
				obj[thisparam] = params[thisparam]['value'];
				active_conn[i]['socket'].send(JSON.stringify(obj));
			}
		}
	}
}

function sendMessage(messageObj) {
	for (var i = 0; i < active_conn.length; i++) {
		if (active_conn[i]['socket']) {
			active_conn[i]['socket'].send(JSON.stringify(messageObj));
		}
	}
}

function getTimestamp() {
	return (new Date()).getTime();
}

function logme(thistext) {
	console.log(thistext);
}



//
// game stuff
//

let Game = function() {
	this.historic = [];
	this.active_level = 0;
	this.levels = [];
	this.guessing = false;
}

Game.prototype.addHistoric = function(level, winner) {
	this.historic.push({ 'level': level, 'winner': winner});
}

Game.prototype.getChallengeStruct = function() {
	if (this.active_level <= this.levels.length) this.guessing = true;
	return { 'type': 'new_challenge', 'level': this.levels[this.active_level], 'historic': this.historic }
}
	
Game.prototype.guess = function(answer, player) {
	if (answer.toLowerCase() === this.levels[this.active_level]['answer']) {
		this.addHistoric(this.levels[this.active_level]['title'], player);
		this.active_level++;
		return true;
	} else {
		return false;
	}
}

Game.prototype.loadLevels = function(levels) {
	this.levels = levels;
}


let test_levels = [
	{ 'title': 'Level 1', 'answer': 'super nova', 'images': ['874c60a4dcab66609ebf98f1a73a3fbe.jpg','d1ce5275d63c3f61ec122c76ecf1c37a.jpg'], 'text': '(7+3) &#9647;&#9647;' },
	{ 'title': 'Level 2', 'answer': 'giraffe', 'images': ['d1ce5275d63c3f61ec122c76ecf1c37a.jpg'], 'text': 'yout mother' }
];

let game = new Game();
game.loadLevels(test_levels);



//
// keyboard input
// 


//
// simulate gamestate changes with arrow keys
//

stdin = process.stdin;
stdin.on('data', function (data) {
    if (data == '\u0003') { process.exit(); }
	if (data == '\u001B\u005B\u0043') {
		process.stdout.write('right');
	}
    if (data == '\u001B\u005B\u0044') {
		process.stdout.write('left');
	}
	if (data == 'c') {
		console.log(active_conn);
	}
	if (data == 'r') {
		reassignParameters();
	}
	if (data == 'g') {
		console.log(game);
	}
    process.stdout.write('Captured Key : ' + data + "\n");
});
stdin.setEncoding('utf8');
stdin.setRawMode(true);
stdin.resume();