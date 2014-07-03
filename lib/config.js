var fs = require('fs');

var data = fs.readFileSync('./config.json'),
	config;

try {
	config = JSON.parse(data);
}
catch (err) {
	console.error('There has been an error parsing your JSON - ', err)
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
	}
}