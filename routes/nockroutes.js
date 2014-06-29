var nocklib = require('../lib/nocklib');

module.exports = {
	getIndex : function(req, res) {
		res.render('index');
	},

	getTrades : function(req, res) {
	db.find('transactions', { init : { $exists : true } }, 100, function(err, trades) {

			if(err) {
				console.error(err);
				return;
			}

			var json = [];
			var lastTime = 0;

			// Highstock expects an array of arrays
			// Each subarray of form [time, price]
			trades.reverse().forEach(function(trade) {
				var date = new Date(parseInt(trade._id.toString().substring(0, 8), 16) * 1000);
				var dataPoint = [date.getTime(), trade.price];
				if(date - lastTime > 1000) {
					json.push(dataPoint);
				}
				lastTime = date;
			});

			res.json(json);
		});
	},

	signup : function(req, res) {
		nocklib.createUser(req.body.username, req.body.email, req.body.password, function(err, user) {
			console.log('Created user - ', user);
			res.redirect('/portfolio');
		});
	},

	getUser : function(req, res) {
		nocklib.getUser(req.params.username, function(err, user) {
			if(user) {
				res.send('1');
			} else {
				res.send('0');
			}
		});
	},

	login : function(req, res) {
		nocklib.authenticate(req.body.username, req.body.password, function(err, id) {
			if(id) {
				req.session._id = id;
				res.redirect('/portfolio');
			} else {
				res.redirect('/');
			}
		});
	},

	addStock : function(req, res) {
		if(req.xhr) {
			nocklib.addStock(req.session._id, req.body.stock, function(err, price) {
				res.send(price);
			});
		}
	},

	portfolio : function(req, res) {
		nocklib.getUserById(req.session._id, function(err, user) {

			var portfolio = [];

			if(user && user.portfolio) {
				portfolio = user.portfolio;
			}

			nocklib.getStockPrices(portfolio, function(err, prices) {
				res.render('portfolio', { portfolio : portfolio, prices : prices });
			});
		});
	}
}