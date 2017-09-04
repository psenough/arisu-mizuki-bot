var tmi = require('tmi.js'); // https://docs.tmijs.org/

var auth = require('./auth.js');

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

