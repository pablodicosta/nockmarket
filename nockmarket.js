'use strict';

var exch = require('./lib/exchange'),
	nocklib = require('./lib/nocklib'),
	db = require('./lib/db');

var exchangeData = {},
	timeFloor = 500,
	timeRange = 1000;

function submitRandomOrder() {
	// order
	var ord = nocklib.generateRandomOrder(exchangeData);
	console.log('order', ord);
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
		console.log(exch.getDisplay(exchangeData));
	}
}

db.open(function() {
	submitRandomOrder();
});


