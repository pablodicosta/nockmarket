var fs = require('fs');

var data = fs.readFileSync('./config.json'),
	config;

try {
	config = JSON.parse(data);
}
catch (err) {
	console.error('There has been an error parsing configuration file - ', err)
}

module.exports = {
	isProxyEnabled : function() {
		return config.proxy.enabled;
	},
	getProxyHost : function() {
		return config.proxy.host;
	},
	getProxyPort : function() {
		return config.proxy.port;
	},
	getDbHost : function() {
		return config.database.host;
	},
	getDbPort : function() {
		return config.database.port;
	},
	getDbAuth : function() {
		return config.database.authenticate;
	},
	getDbUser : function() {
		return config.database.user;
	},
	getDbPassword : function() {
		return config.database.password;
	}
}