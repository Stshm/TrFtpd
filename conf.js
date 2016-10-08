var fs   = require('fs');
var path = require('path');


exports.readConfig = function(fileName){
	/* read configuration file block */

	var fileConf = '';
	try {
		fileConf = fs.readFileSync(fileName, { encoding: 'utf8'} );
	}catch(e){
		console.log('Error: failed reading configration file: ' + e.code);
		throw e;
	}

	var lines = fileConf.split('\n');

	var i = 0;
	var config = {};
	for (i in lines) {
		if(lines[i] && !lines[i].trim().match(/^#/)
			){
			var x = lines[i].split('=');
			config[x[0].trim()] = x[1].replace(/[\'\"]/g,'').trim();
		}
	}
	return config;
}

