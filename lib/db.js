var Db = require('mongodb').Db,
	Connection = require('mongodb').Connection,
	Server = require('mongodb').Server;

var envHost = process.env['MONGO_NODE_DRIVER_HOST'],
	envPort = process.env['MONGO_NODE_DRIVER_PORT'],
	host = envHost != null ? envHost : 'localhost',
	port = envPort != null ? envPort : Connection.DEFAULT_PORT;

var db = new Db('nockmarket', 
	new Server(host, port, {}),
	{ native_parser : false, safe : true } );