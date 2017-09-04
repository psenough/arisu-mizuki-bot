
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

var client = new tmi.client(options);
client.connect();

client.on("connected", function(address, port) { 
	client.action("psenough", "Konichiwa!");
});

client.on("chat", function(channel, user, message, self) {
	if (message === "!twitter") {
		client.action("psenough", "http://twitter.com/psenough");
	}
	
	if (message === "!guess") {
		//client.action("psenough", "http://twitter.com/psenough");
	}
	
});

client.on("part", function (channel, username, self) {
    client.action("psenough", username + " has left the building!");
});





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
					client.send(JSON.stringify({ 'type': 'new_challenge', 'images': ['874c60a4dcab66609ebf98f1a73a3fbe.jpg','d1ce5275d63c3f61ec122c76ecf1c37a.jpg'], 'text': '(7+3) &#9647;&#9647;' }));
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

function getTimestamp() {
	return (new Date()).getTime();
}

function logme(thistext) {
	console.log(thistext);
}
