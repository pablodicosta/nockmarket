'use strict';

var exch = require('./lib/exchange'),
	nocklib = require('./lib/nocklib'),
	db = require('./lib/db'),
	express = require('express'),
	nockroutes = require('./routes/nockroutes');

var exchangeData = {},
	timeFloor = 500,
	timeRange = 1000;

var stocks = ['NOCK1', 'NOCK2', 'NOCK3', 'NOCK4', 'NOCK5'],
	allData = [];

stocks.forEach(function(stock) {
	allData.push({});
});

function submitRandomOrder(index) {
	var exchangeData = allData[index];
	var ord = nocklib.generateRandomOrder(exchangeData);

	ord.stock = stocks[index];
	if(ord.type == exch.BUY)
		allData[index] = exch.buy(ord.price, ord.volume, exchangeData);
	else
		allData[index] = exch.sell(ord.price, ord.volume, exchangeData);

	db.insertOne('transactions', ord, function(err, order) {

		if(exchangeData.trades && exchangeData.trades.length > 0) {
			var trades = exchangeData.trades.map(function(trade) {
				trade.init = (ord.type == exch.BUY) ? 'b' : 's';
				trade.stock = stocks[index];
				return trade;
			});

			nocklib.sendExchangeData(stocks[index], exchangeData);

			db.insert('transactions', trades, function(err, trades) {
				pauseThenTrade();
			});

		} else {
			pauseThenTrade();
		}
	});

	function pauseThenTrade() {
		var pause = Math.floor(Math.random() * timeRange) + timeFloor;
		setTimeout(submitRandomOrder.bind(this, index), pause);
	}
}

var app = express.createServer();

app.configure(function() {
	app.use(express.bodyParser());
	app.use(express.cookieParser());
	app.use(express.session({ secret : 'secretpassword', store: nocklib.getSessionStore() }));
	app.set('views', __dirname + '/views');
	app.set('view engine', 'ejs');
	app.use(express.static(__dirname + '/public'));
});

app.configure('development', function() {
	app.use(express.errorHandler({
		dumpExceptions : true,
		showStack : true
	}));
});

app.configure('production', function() {
	app.use(express.errorHandler());
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

app.use(function(req, res) {
	res.render('404');
});

db.open(function(err) {
	if(!err) {
		nocklib.createSocket(app);
		for (var i = 0; i < stocks.length; i++) {
			submitRandomOrder(i);
		};
		var port = process.env.PORT || 3000;
		app.listen(port);
		console.info("Application started...");
	} else {
		console.error("Error connecting to database - ", err);
		process.exit();
	}

});

