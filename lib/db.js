var Db = require('mongodb').Db,
	Connection = require('mongodb').Connection,
	Server = require('mongodb').Server,
	config = require('./config');

var host = config.getDbHost(),
	port = config.getDbPort(),
	auth = config.getDbAuth();

var db = new Db('nockmarket', 
	new Server(host, port, {}),
	{ native_parser : false, safe : true } );

module.exports = {
	find : function(name, query, limit, callback) {
		db.collection(name).find(query)
		  .sort({ _id : -1 })
		  .limit(limit)
		  .toArray(callback);
	},
	findOne : function(name, query, callback) {
		db.collection(name).findOne(query, callback);
	},
	insert : function(name, items, callback) {
		db.collection(name).insert(items, callback);
	},
	insertOne : function(name, item, callback) {
		module.exports.insert(name, item, function(err, items) {
			callback(err, items[0]);
		});
	},
	open : function(callback) {
		db.open(function(err, data) {
			if(!err) {
				if(auth) {
					data.authenticate(config.getDbUser(), config.getDbPassword(), function(err2, authData) {
						if(authData) {
							callback();
						} else {
							callback(err2);
						}
					});
				} else {
					callback();
				}
			} else {
				callback(err);
			}
		});
	},
	push : function(name, id, updateQuery, callback) {
		db.collection(name).update({ _id: id }, { $push : updateQuery }, { safe : true }, callback);
	},
	updateById : function(name, id, updateQuery, callback) {
		db.collection(name).update({ _id : id }, { $set : updateQuery }, { safe : true }, callback);
	}
}