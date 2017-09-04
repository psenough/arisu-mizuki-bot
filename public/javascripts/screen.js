
let address = 'http://192.168.11.1:8080/';

window.onload = function(){ init(); };

function init() {
	try {
		connectWebSockets();
	} catch(e) {
		console.log(e);
	}
	//cv = new drawCanvas();
	//changePart(active_part);
}

let audio = undefined;

function playAudio(source, loop) {
	if (audio) {
		audio.pause();
		delete audio;
	}
	audio = document.createElement('audio');
	audio.setAttribute('src', source);
	audio.setAttribute('autoplay', 'autoplay');
	audio.loop = loop;
	audio.currentTime = 0;
}

let this_websockets = 'ws://'+location.host.split(':')[0]+':3001';
let this_ws = null;
let this_timeout = false;
let params = {};

function connectWebSockets() {

	console.log("attempt to connect");
	this_timeout = false;

	this_ws = new WebSocket(this_websockets);        

	this_ws.onopen = function() {
		console.log("opened socket");
		this_ws.sendParameters();
	};
	
	this_ws.sendParameters = function() {
		let obj = { 'screen': 'ready' };
		this_ws.send(JSON.stringify(obj));
	};

	this_ws.onmessage = function(evt) {
		console.log(evt.data);
		let parsed = JSON.parse(evt.data);
		//TODO:
		// expect { 'type': 'new_challenge', 'images': ['gasdsaodh.jpg','jsbdoasdaois,jpg'], 'text': '_____ ___' }
		// expect { 'type': 'new_guess', 'name': 'username', 'text': 'your mother', 'correct': true }
		
		if ('type' in parsed) {
			switch(parsed['type']) {
				case 'new_challenge': {
					console.log(parsed['text']);
				} break;
				case 'new guess': {
				
				} break;
				default: console.log('weird message');
				break;
			}
		}
	};

	this_ws.onclose = function() {
		console.log("closed socket");
		this_ws = null;
		if (!this_timeout) this_timeout = setTimeout(function(){connectWebSockets()},5000);
	};

	this_ws.onerror = function() {
		console.log("error on socket");
		this_ws = null;
		if (!this_timeout) this_timeout = setTimeout(function(){connectWebSockets()},5000);
	};
};
