var http = require('http');
var https = require('https');
var url = require('url');
var fs   = require('fs');
var readline = require('readline');
var path = require('path');
var querystring = require('querystring')

var acl = require('./acl.js');
var conf = require('./conf.js');

var config = conf.readConfig(path.join('etc','trftpd.conf'));

var debug = true;
var listenPort  = 9443;
var dirPathFiles = 'files';
var dirPathHtml = 'html';

acl.pathPasswd = 'etc/passwd';
acl.pathGroup = 'etc/group';
acl.dirPathFiles = dirPathFiles;
acl.dirPathUsers = '/users';
acl.hashAlgo = 'sha256';
acl.debug = true;

var tlsKey       = path.join(process.cwd(), 'etc/tls-key.pem');
var tlsCert      = path.join(process.cwd(), 'etc/tls-cert.pem');

/* program path */
var pathProg = process.cwd();
/* control port */
listenPort 	 = config['WebAdminPort'];
/* passwd file for this service */
if(config['PathPasswd'].match(/^\//))
	acl.pathPasswd = config['PathPasswd'];
else
	acl.pathPasswd = path.join(pathProg, config['PathPasswd']);
/* group file */
if(config['PathGroup'].match(/^\//))
	acl.pathGroup = config['PathGroup'];
else
	acl.pathGroup = path.join(pathProg,config['PathGroup']);
/* ftp root path */
if(config['DirPathFiles'].match(/^\//))
	acl.dirPathFiles = config['DirPathFiles'];
else
	acl.dirPathFiles = path.join(pathProg,config['DirPathFiles']);
/* ftp user directory path */
if(config['DirPathUsers'].match(/^\//))
	acl.dirPathUsers = config['DirPathUsers'];
else
	acl.dirPathUsers = path.join(pathProg,config['DirPathUsers']);
/* stored hashed password algol */
acl.hashAlgo = config['HashAlgo']

/* tls key file */
if(config['WebAdminFileTlsKey'].match(/^\//))
	tlsKey = config['FileTlsKey'];
else
	tlsKey = path.join(pathProg, config['FileTlsKey']);
/* tls cert file */
if(config['WebAdminFileTlsCert'].match(/^\//))
	tlsCert = config['FileTlsCert'];
else
	tlsCert = path.join(pathProg, config['FileTlsCert']);

if(config['Debug'] === 'true'){
	debug = true;
	acl.debug = true;
}else{
	debug = false;
	acl.debug = true;
}

/* end of configuration */

var opts = { key:  fs.readFileSync(tlsKey),  
	 	     cert: fs.readFileSync(tlsCert) 
};

function debugLog(msg){ if(debug) console.log('Debug: ' + msg); }


function getMimeType(filename){
	var ext = filename.substring(filename.lastIndexOf('.'));
	const types = 
{
'.html': 'text/html',				
'.htm' : 'text/html',
'.css':  'text/css',
'.js':   'text/javascript',
'.ico':  'image/x-icon'
};

	if(types[ext]) return  types[ext];
	
	return 'text/plain';

}
var server = https.createServer(opts, function(req, res) {

	var url_obj = url.parse(req.url);
	debugLog(req.method + ' ' + url_obj.pathname);
	/* user authorization [Basic] */
	if(req.headers['authorization']){
		var msgAuth = req.headers['authorization'].split(' ');
		var auth = new Buffer(msgAuth[1],'base64').toString().split(':');
		acl.checkPasswdUser(auth[0], auth[1],function(userInf) {
			if(userInf && userInf['gid'] == 0) {
				authorized();
			}else{
				unauthorized();
			}
		});
	}else{
		unauthorized();
	}

	function unauthorized(){
		res.writeHead(401,  { 'Content-Type': 'text/html',
								'WWW-Authenticate': 
										'Basic realm=\"Web FTP Admin\"' });
		fs.createReadStream('errdocs/401.html').pipe(res);
	}

	function authorized(){ 
		if(req.method === 'GET'){
			/* control page */
			if (url_obj.pathname === '/'){
				res.writeHead(200, { "Content-Type": "text/html" });
				fs.createReadStream('html/index.html').pipe(res);

			}else if (url_obj.pathname.match(/\/icons\/.+/)){
				res.writeHead(200, { "Content-Type": "image/png" });
				fs.createReadStream('html' + url_obj.pathname).pipe(res);

			}else if (url_obj.pathname === '/users'){

				res.writeHead(200, {'Content-Type': 'text/plain' });

				acl.getUsers(0,0,function(users){
					res.write(JSON.stringify(users)); 
					res.end();
					return;

				});
			}else if (url_obj.pathname === '/groups'){
				res.writeHead(200, {'Content-Type': 'text/plain' });

				acl.getGroups(0,0,function(groups){
					res.write(JSON.stringify(groups)); 
					res.end();
					return;

				});
			}else{
						
				var reader = fs.createReadStream('html' + url_obj.pathname);
				reader.on('error', function(e){
					res.writeHead(403, { "Content-Type": "text/html" });
					fs.createReadStream('errdocs/403.html').pipe(res);
				});
				reader.on('open',function(){
					res.writeHead(200, 
							{ "Content-Type": getMimeType(url_obj.pathname) });
					reader.pipe(res);
				});			
			}
		}else if(req.method === 'POST'){
		   var data = '';
		    
		    req.on('readable', function(chunk) {
		        data += req.read();
		    });

		    req.on('end', function() {
		        var q = querystring.parse(data);
			
				if(q['method'] === 'readAcl'){
					res.writeHead(200, {'Content-Type': 'text/plain' });
					debugLog( q['directory']);
					acl.readAcl(path.join(dirPathFiles, q['directory']),
														function(directory,acl){
						debugLog(acl);
						res.write(JSON.stringify(acl)); 
						res.end();
					});
				}else if(q['method'] === 'getSubDirectories'){
					res.writeHead(200, {'Content-Type': 'text/plain' });
					acl.getSubDirectories(path.join(dirPathFiles, 
														q['directory']),
															function(dirs){
						res.write(JSON.stringify(dirs)); 
						res.end();
					});
				}else if(q['method'] === 'addUser'){
					res.writeHead(200, {'Content-Type': 'text/plain' });
					var ret = acl.addUser(q, function(ret){ 
						debugLog('addUser: ' + ret );
						res.write(JSON.stringify(ret));
						res.end();
					});
				}else if(q['method'] === 'removeUser'){
					res.writeHead(200, {'Content-Type': 'text/plain' });
					var ret = acl.removeUser(q['user'],function(ret){
						debugLog('removeUser: ' + ret );
						res.write(JSON.stringify(ret));
						res.end();
					});
				}else if(q['method'] === 'editUser'){
					res.writeHead(200, {'Content-Type': 'text/plain' });
					var ret = acl.editUser(q,function(ret){
						debugLog('editUser: ' + ret );
						res.write(JSON.stringify(ret));
						res.end();
					});
				}else if(q['method'] === 'getUser'){
					res.writeHead(200, {'Content-Type': 'text/plain' });
					var ret = acl.getUser(q['user'], function(ret){
						debugLog('getUser: ' + ret );
						res.write(JSON.stringify(ret));
						res.end();
					});
				}else if(q['method'] === 'addGroup'){
					res.writeHead(200, {'Content-Type': 'text/plain' });
					var ret = acl.addGroup(q, function(ret){ 
						debugLog('addGroup: ' + ret );
						res.write(JSON.stringify(ret));
						res.end();
					});	
				}else if(q['method'] === 'removeGroup'){
					res.writeHead(200, {'Content-Type': 'text/plain' });
					var ret = acl.removeGroup(q['group'], function(ret){ 
						debugLog('removeGroup: ' + ret );
						res.write(JSON.stringify(ret));
						res.end();
					});
				}else if(q['method'] === 'editGroup'){
					res.writeHead(200, {'Content-Type': 'text/plain' });
					var ret = acl.editGroup(q,function(ret){
						debugLog('editGroup: ' + ret );
						res.write(JSON.stringify(ret));
						res.end();
					});
				}else if(q['method'] === 'getGroup'){
					res.writeHead(200, {'Content-Type': 'text/plain' });
					var ret = acl.getGroup(q['group'], function(ret){
						debugLog('getGroup: ' + ret );
						res.write(JSON.stringify(ret));
						res.end();
					});
				}else if(q['method'] === 'getAclOwners'){
					res.writeHead(200, {'Content-Type': 'text/plain' });
					var ret = acl.getAclOwners(path.join(dirPathFiles, q['directory']),
					function(ret){
						debugLog('getAclOwners: ' + ret );
						res.write(JSON.stringify(ret));
						res.end();
					});
				}else if(q['method'] === 'updateAcl'){
					res.writeHead(200, {'Content-Type': 'text/plain' });
					var ret = acl.updateAcl(path.join(dirPathFiles, q['directory']),
												q['type'], q['target'],
												q['fp'],
					function(ret){
						debugLog('updateAcl: ' + ret );
						res.write(JSON.stringify(ret));
						res.end();
					});
				}			
		    });

		}else{

			res.writeHead(403, { "Content-Type": "text/html" });
			fs.createReadStream('errdocs/403.html').pipe(res);
		}
	}
});


server.listen(listenPort);
console.log("server listening on port %d", listenPort);

server.on('clientError', function(e, socket) {
    debugLog("Got clent error: " + e.message);
	socket.end();
	socket.destroy();	
});

