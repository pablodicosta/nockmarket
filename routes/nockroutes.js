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
	}
}