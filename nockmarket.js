'use strict';

var exch = require('./lib/exchange'),
	nocklib = require('./lib/nocklib'),
	db = require('./lib/db'),
	express = require('express'),
	nockroutes = require('./routes/nockroutes');

var exchangeData = {},
	timeFloor = 500,
	timeRange = 1000;

function submitRandomOrder() {
	// order
	var ord = nocklib.generateRandomOrder(exchangeData);

	if(ord.type == exch.BUY)
		exchangeData = exch.buy(ord.price, ord.volume, exchangeData);
	else
		exchangeData = exch.sell(ord.price, ord.volume, exchangeData);

	db.insertOne('transactions', ord, function(err, order) {
		if(exchangeData.trades && exchangeData.trades.length > 0) {
			var trades = exchangeData.trades.map(function(trade) {
				trade.init = (ord.type == exch.BUY) ? 'b' : 's';
				return trade;
			});
			db.insert('transactions', trades, function(err, trades) {
				pauseThenTrade();
			});
		} else {
			pauseThenTrade();
		}
	});

	function pauseThenTrade() {
		var pause = Math.floor(Math.random() * timeRange) + timeFloor;
		setTimeout(submitRandomOrder, pause);
	}
}

var app = express.createServer();

app.configure(function() {
	app.use(express.bodyParser());
	app.use(express.cookieParser());
	app.use(express.session({ secret : 'secretpassword' }));
	app.set('views', __dirname + '/views');
	app.set('view engine', 'ejs');
	app.use(express.static(__dirname + '/public'));
});

app.set('view options', {
	layout : false
});

app.get('/', nockroutes.getIndex);

app.get('/api/trades', nockroutes.getTrades);

app.get('/api/user/:username', nockroutes.getUser);

app.post('/login', nockroutes.login);

app.post('/signup', nockroutes.signup);

app.post('/add-stock', nockroutes.addStock);

app.get('/portfolio', nocklib.ensureAuthenticated, nockroutes.portfolio);

db.open(function(err) {
	if(!err) {
		submitRandomOrder();
		app.listen(3000);
	} else {
		console.error("Error connecting to database - ", err);
	}

});

