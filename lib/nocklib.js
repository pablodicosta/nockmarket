'use strict';

var exchange = require('./exchange'),
	crypto = require('crypto'),
	db = require('./db'),
	http = require('http'),
	ObjectID = require('mongodb').ObjectID,
	express = require('express'),
	MemoryStore = express.session.MemoryStore,
	socketio = require('socket.io'),
	cookie = require('cookie'),
	config = require('./config'),
	url = require('url');

var priceFloor = 35,
	priceRange = 10,
	volFloor = 80,
	volRange = 40;

var sessionStore = new MemoryStore();
var io,
	online = [],
	lastExchangeData = {};

module.exports = {
	generateRandomOrder: function(exchangeData) {
		var order = {};

		if(Math.random() > 0.5)
			order.type = exchange.BUY;
		else 
			order.type = exchange.SELL;

		var buyExists = exchangeData.buys && exchangeData.buys.prices.peek();
		var sellExists = exchangeData.sells && exchangeData.sells.prices.peek();

		var ran = Math.random();

		if(!buyExists && !sellExists) {
			order.price = Math.floor(ran * priceRange) + priceFloor;
		} else if(buyExists && sellExists) {
			if(Math.random() > 0.5) {
				order.price = exchangeData.buys.prices.peek();
			} else {
				order.price = exchangeData.sells.prices.peek();
			}			
		} else if(buyExists) {
			order.price = exchangeData.buys.prices.peek();
		} else {
			order.price = exchangeData.sells.prices.peek();
		}

		var shift = Math.floor(Math.random() * priceRange / 2);

		if(Math.random() > 0.5) 
			order.price += shift;
		else
			order.price -= shift;

		order.volume = Math.floor(Math.random() * volRange) + volFloor;

		return order;
	},

	createUser : function(username, email, password, callback) {
		var user = {
			username : username,
			email : email,
			password : encryptPassword(password)
		};
		db.insertOne('users', user, callback);
	},

	getUser : function(username, callback) {
		db.findOne('users', { username : username }, callback);
	},

	authenticate : function(username, password, callback) {
		db.findOne('users', { username : username }, function(err, user) {
			if(user && (user.password === encryptPassword(password))) {
				callback(err, user._id);
			} else {
				callback(err, null);
			}
		});
	},

	getStockPrices : function(stocks, callback) {
		var stockList = '';

		stocks.forEach(function(stock) {
			stockList += stock + ',';
		});

		var proxyEnabled = config.isProxyEnabled();

		var	urlFull = 'http://download.finance.yahoo.com/d/quotes.csv?s=' + stockList + '&f=sl1c1d1&e=.csv',
			parsedUrl = url.parse(urlFull),
			urlHost = parsedUrl.host,
			urlPath = parsedUrl.path,
			urlQuery = parsedUrl.query;

		var options = {
			host : proxyEnabled ? config.getProxyHost() : urlHost,
			port : proxyEnabled ? config.getProxyPort() : 80,
			path : proxyEnabled ? urlFull : urlPath,
			headers : proxyEnabled ? { Host : urlHost } : {}
		};

		http.get(options, function(res) {
			var data = '';
			res.on('data', function(chunk) {
				data += chunk.toString();
			}).on('error', function(err) {
				console.err('Error retrieving Yahoo stock prices');
				throw err;
			}).on('end', function() {
				var tokens = data.split('\r\n');
				var prices = [];
				tokens.forEach(function(line) {
					var price = line.split(',')[1];
					if(price) {
						prices.push(price);
					}
				});
				callback(null, prices);
			});
		});
	},

	addStock : function(uid, stock, callback) {
		var price, counter = 0;

		module.exports.getStockPrices([stock], function(err, retrieved) {
			price = retrieved[0];
			doCallback();
		})

		db.push('users', new ObjectID(uid), { portfolio : stock }, doCallback);

		function doCallback() {
			counter++;
			if(counter == 2) {
				callback(null, price);
			}
		}
	},

	getUserById : function(id, callback) {
		db.findOne('users', { _id : new ObjectID(id) }, callback);
	},

	ensureAuthenticated : function(req, res, next) {
		if(req.session._id) {
			return next();
		}

		res.redirect('/');
	},

	getSessionStore : function() {
		return sessionStore;
	},

	createSocket: function(app) {
		io = socketio.listen(app);

		io.use(function(socket, next) {
			var handshakeData = socket.request;
			if(handshakeData.headers.cookie) {
				handshakeData.cookie = cookie.parse(decodeURIComponent(handshakeData.headers.cookie));
				handshakeData.sessionID = handshakeData.cookie['connect.sid'];
				sessionStore.get(handshakeData.sessionID, function(err, session) {
					if(err || !session) {
						next(new Error("Not authorized"));
					} else {
						handshakeData.session = session;
						console.info('Session data - ', session);
						next();
					}
				});
			} else {
				next(new Error("Not authorized"));
			}
		});

		io.sockets.on('connection', function(socket) {

			console.info("Connected - ", socket.request.session.username);

			socket.on('joined', function(data) {
				var username = socket.request.session.username;
				online.push(username);
				var message = 'Admin: ' + username + ' has joined in\n';

				console.info("Joined - ", username);

				socket.emit('chat', {
					message : message,
					users : online
				});

				socket.broadcast.emit('chat', {
					message : message,
					username : username
				});
			});

			socket.on('clientchat', function(data) {
				var message = socket.request.session.username + ': ' + data.message + '\n';
				socket.emit('chat', { message : message });
				socket.broadcast.emit('chat', { message : message });
			});

			socket.on('disconnect', function(data) {
				var username = socket.request.session.username;

				console.info("Disconnected - ", username);

				var index = online.indexOf(username);
				online.splice(index, 1);
				socket.broadcast.emit('disconnected', { username : username });
			});

			socket.on('updateAccount', function(data) {
				module.exports.updateEmail(socket.request.session._id, data.email, function(err, numUpdates) {
					socket.emit('updateSuccess', {});
				});
			});

			socket.on('requestData', function(data) {
				socket.emit('initExchangeData', { exchangeData : transformExchangeData(lastExchangeData) });
			});

		});

	},

	sendTrades : function(trades) {
		io.sockets.emit('trade', JSON.stringify(trades));
	},

	updateEmail : function(id, email, callback) {
		db.updateById('users', new ObjectID(id), { email : email }, callback);
	},

	sendExchangeData : function(stock, exchangeData) {
		lastExchangeData[stock] = exchangeData;
		var current = transformStockData(stock, exchangeData);
		io.sockets.emit('exchangeData', current);
	}
}

function encryptPassword(plainText) {
	return crypto.createHash('md5').update(plainText).digest('hex');
}

function transformStockData(stock, existingData) {
	var newData = {},
		buyPrices = {},
		askPrices = {};

	newData.st = stock;

	if(existingData && existingData.trades && existingData.trades.length > 0) {
		newData.tp = existingData.trades[0].price;
		newData.tv = existingData.trades[0].volume;
	}

	if(existingData && existingData.buys) {
		buyPrices = Object.keys(existingData.buys.volumes);
		for (var i = buyPrices.length - 5; i < buyPrices.length; i++) {
			var index = buyPrices.length - i;
			newData['b' + index + 'p'] = buyPrices[i];
			newData['b' + index + 'v'] = existingData.buys.volumes[buyPrices[i]];
		};
	}

	if(existingData && existingData.sells) {
		askPrices = Object.keys(existingData.sells.volumes);
		for (var i = 0; i < 5; i++) {
			var index = i + 1;
			newData['a' + index + 'p'] = askPrices[i];
			newData['a' + index + 'v'] = existingData.sells.volumes[askPrices[i]];
		};
	}

	for (var i = 1; i <= 5 ; i++) {
		if(!newData['b' + i + 'p']) {
			newData['b' + i + 'p'] = 0;
			newData['b' + i + 'v'] = 0;
		}
		if(!newData['a' + i + 'p']) {
			newData['a' + i + 'p'] = 0;
			newData['a' + i + 'v'] = 0;
		}
		if(!newData['tv']) {
			newData['tv'] = 0;
		}
		if(!newData['tp']) {
			newData['tp'] = 0;
		}
	};

	return newData;
}

function transformExchangeData(data) {
	var transformed = [];
	for (var stock in data) {
		var existingData = data[stock];
		var newData = transformStockData(stock, existingData);
		transformed.push(newData);
	}
	return transformed;
}