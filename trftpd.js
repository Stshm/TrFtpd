/*
 *   TrFtp: ftp server application
 *   version: 0.9b
 *
 *
 */

var net = require('net');
var tls = require('tls');
var crypto = require('crypto');
var fs = require('fs');
var util = require('util');
var path = require('path');
var os   = require('os');
var emitter = require('events').EventEmitter;

var acl = require('./acl.js');
var conf = require('./conf.js');

/* set up global variable */
var pathConf 	 = undefined;
pathConf     = path.join(process.cwd(), 'etc/trftpd.conf');

/* set up parameters */
var debug 		 = true;
var ctrlPort 	 = 0;
var pathPasswd 	 = undefined;
var pathGroup 	 = undefined;
var dirPathFiles = undefined;
/* log files */
var pathLog		 = undefined;
var logFormat 	 = undefined;
var logLevel     = 0;
/* TLS keys */
var tlsKey       = undefined;
var tlsCert		 = undefined;
/* reply for SYST */
var sysType      = os.type();


var config = conf.readConfig(path.join('etc','trftpd.conf'));

/* program path */
var pathProg = process.cwd();
/* control port */
ctrlPort 	 = config['CtrlPort'];
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
/* path of log file */
if(config['PathLog'].match(/^\//))
	pathLog	= config['PathLog'];
else
	pathLog = path.join(pathProg, config['PathLog']);
/* log format eg. [%t] - %a - %u - %p */
logFormat	 = config['LogFormat']; 
/* log level */
logLevel     = config['LogLevel']; 
/* tls key file */
if(config['FileTlsKey'].match(/^\//))
	tlsKey = config['FileTlsKey'];
else
	tlsKey = path.join(pathProg, config['FileTlsKey']);
/* tls cert file */
if(config['FileTlsCert'].match(/^\//))
	tlsCert = config['FileTlsCert'];
else
	tlsCert = path.join(pathProg, config['FileTlsCert']);

if(config['SystemType'])
	sysType = config['SystemType'];


/* debug log */
debugLog('Server parameters');
debugLog('  Configuration file = ' + pathConf);
debugLog('  Passwd file        = ' + acl.pathPasswd);
debugLog('  Group  file        = ' + acl.pathGroup);
debugLog('  Ftp root directory = ' + acl.dirPathFiles);
debugLog('  Ftp user directory = ' + acl.dirPathUsers);
debugLog('  Log file           = ' + pathLog);
debugLog('  Log level          = ' + logLevel);
debugLog('  Log format         = ' + logFormat);
debugLog('  TLS key file       = ' + tlsKey);
debugLog('  TLS cert file      = ' + tlsCert);

/* set up parameters for ftp session object */
var optGlobal = { 'pathRoot': acl.dirPathFiles,
				  'pathLog': pathLog,
				  'logLevel': logLevel,
				  'logFormat': logFormat,
				  'encoding' : 'utf8',
				  'sysType'  : sysType
};

/* for AUTH TLS */
var cred = tls.createSecureContext({key:  fs.readFileSync(tlsKey),  
					  			    cert: fs.readFileSync(tlsCert) 
						           });
var optTls = { credentials: cred,
			   isServer: true,
			   requestCert: false			
};

/* class constants */
const DEFAULT_CTRL_PORT = 21;
const DEFAULT_DATA_PORT = 20;
const ALT_CTRL_PORT = 8021;

const REPLY_CODES = {
	110: 'Restart marker reply.',
	120: 'Service ready in %d minutes.',
	125: 'Data connection already open; transfer starting.',
	150: 'File status okay; about to open data connection.',
	200: 'Command okay.',
		20001: 'PORT command succcessful.',
		20002: 'EPRT command succcessful.',
		20003: 'EPSV ALL accepted.',
		20004: 'Directory changed to %s' ,
	202: 'Command not implemented, superfluous at this site.',
	211: 'System status, or system help reply.',
		21101: 'Extensions supported\r\n' + 
			   ' AUTH TLS\r\n PBSZ\r\n PROT\r\n',
	212: 'Directory status.',
	213: 'File status.',
	214: 'Help message.',
	215: '%s.',
	220: 'Service ready for new user.',
	221: 'Service closing control connection.',
	225: 'Data connection open; no transfer in progress.',
	226: 'Closing data connection.',
	227: 'Entering Passive Mode (%d,%d,%d,%d,%d,%d).',
	229: 'Entering Passive Mode (|||%d|).',
	230: 'User logged in, proceed.',
	234: 'Acceped %s security mechanism.',
	250: 'Requested file action okay, completed.',
	257: '%s created.', /* %s = path name */
		25701: 'Current directory is %s',
	331: 'User name okay, need password.',
	332: 'Need account for login.',
	350: 'Requested file action pending further information.', 
	421: 'Service not available, closing control connection.',
	425: 'Cannot open data connection.',
	426: 'Connection closed; transfer aborted.',
	450: 'Requested file action not taken. File unavailable',
	451: 'Requested action aborted: local error in processing.',
	452: 'Requested action not taken.', /* disk full */
	500: 'Syntax error, command unrecognized.',
	501: 'Syntax error in parameters or arguments.',
	502: 'Command not implemented.',
	503: 'Bad sequence of commands.',
		50301: 'EPSV ALL received - command not allowed after EPSV ALL.',
		50302: 'User already logged in.',
		50303: 'Tls negotiation failed.',
	504: 'Command not implemented for that parameter.',
	521: 'Requested action not taken: Cannot create file.',
		52101: 'Requested action not taken: No such directory, or unavailable.',
	522: 'Network protocol not supported, use (%s).', /* %s = 1,2 or 1 or 2 */
		52201: 'Cannot bind to IPv4 address, try EPSV (%s).',
	530: 'Not logged in.',
	532: 'Need account for storing files.',
	550: 'Requested action not taken: File unavailable',
		55001: 'Requested action not taken: No such file, or unavailable.',
		55002: 'Requested action not taken: Permission denied.',
	551: 'Requested action aborted: page type unknown.',
	552: 'Requested file action aborted: Exceeded storage allocation',
	553: 'Requested action not taken.'
};


const S_IFMT  = parseInt("0170000",8); /* file type mask*/
const S_IFREG = parseInt("0100000",8); /* file */
const S_IFDIR = parseInt("0040000",8); /* directory */

function debugLog(msg){ if(debug) console.log('Debug: ' + msg); }

/* %t = time 
 * %a = ip address
 * %u = user name 
 * %p = processing
 **/
class Logger {
	constructor(emitter, writer, level, format){
		this.logFormat = '[%t] - %a - %u - %p';
		this.logWriter = writer;
		this.logLevel  = level;

		if(format) 
			this.logFormat = format;

		var self = this;
		this.logWriter.on('error',function(e) {
			console.log('Error: Cannot open log file -> ' + e.message);
		});
		this.logWriter.on('open',function() {
			emitter.on('log',function(level, proc, host, user){
				if(self.logLevel >= level)
					self.log(proc, host, user);
			});
		});
	}
	log(proc, host, user){
		var logStr = logFormat;

		logStr = logStr.replace(/\%t/, (new Date()).toString());
		logStr = logStr.replace(/\%a/, host);
		logStr = logStr.replace(/\%u/, user);
		logStr = logStr.replace(/\%p/, 
					proc.replace(/^pass (.+)$/i, 'PASS ********'));
		this.logWriter.write(logStr + '\r\n');
	}
}

function formatDate(d){
	var strDate = '';
	var monEN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug',
		         'Sep','Oct','Nov','Dec'];
	var y  = ' ' + d.getFullYear();
	var mon = monEN[d.getMonth()];
	var dd  = (' ' + d.getDate()).slice(-2);
	var hh  = ('0' + d.getHours()).slice(-2);
	var mm  = ('0' + d.getMinutes()).slice(-2);
	
	if((new Date()).getFullYear() === d.getFullYear())
		return mon + ' ' + dd + ' ' + hh + ':' + mm;

	return mon + ' ' + dd + ' ' + y;
}

/* format string of drirectory listing 
 *  XXX it's not good enough clean....
**/
function getDirectoryListSync(dir, fAcl){
	var files;
	var listString = '';
	try {
		var files = fs.readdirSync(dir);
	}catch(e){
		debugLog('Cannot read directory: ' + e.message);
		throw(e);
	}
	
	var i = 0;
	var lines = {};
	var oLen = gLen = sLen = 0; 
	for(i in files){
		lines[i] = getDirectoryLineSync(dir, files[i], fAcl);
		
		if(oLen < lines[i][7]) oLen = lines[i][7];
		if(gLen < lines[i][8]) gLen = lines[i][8];
		if(sLen < lines[i][9]) sLen = lines[i][9];
	}
	j = 0;
	for(j in lines) {
		var f = lines[j][6];
		if ( f.match(/^\./) ) {
			 continue;
		}
		listString += lines[j][0] + ' ' + lines[j][1] + ' ';
		var k, oStr = lines[j][2];
		for(k = 0; k < oLen; k++) oStr += ' ';
		listString += oStr.substr(0,oLen) + ' ';
		var gStr = lines[j][3];
		for(k = 0; k < gLen; k++) gStr += ' ';
		listString += gStr.substr(0,gLen) + ' ';
		var sStr = '';
		for(k = 0; k < sLen; k++) sStr += ' ';
		listString += (sStr + lines[j][4]).slice(-1 * sLen) + ' ' + 
						lines[j][5] + ' ' +	lines[j][6] + '\r\n';
	}
	return listString;
}

function getDirectoryLineSync(dir, fname, fAcl){

	var line = [];
	var stat = fs.statSync(path.join(dir, fname));
	var mode = stat['mode'];
	var d     = '';
	var owner = 'nobody';
	var urwx  = '';
    var group = 'nobody';
    var grwx  = '';
    var orwx  = '';
	var end = false;
	/* is directory */
    if( (mode & S_IFMT) == S_IFREG){
		d = "-";
		_formatLine(fAcl);
		return line;
	}

	if( (mode & S_IFMT) == S_IFDIR){
		d =   "d";
		_formatLine(acl.getAclOwnersSync(path.join(dir, fname)));
		return line;
    }
 
	return line;
	
	function _formatLine(_acl){
		if(_acl['owner']) {
			owner = _acl['owner'][0];
			(_acl['owner'][1].search(/r/) === -1)? urwx += '-' : urwx += 'r';
			(_acl['owner'][1].search(/w/) === -1)? urwx += '-' : urwx += 'w';
			(d === 'd')? urwx += 'x' : urwx += '-';
		}else{
			urwx = '---';
		}
		if(_acl['group']) {
			group = _acl['group'][0].substring(2);
			(_acl['group'][1].search(/r/) === -1)? grwx += '-' : grwx += 'r';
			(_acl['group'][1].search(/w/) === -1)? grwx += '-' : grwx += 'w';
			(d === 'd')? grwx += 'x' : grwx += '-';
		}else{
			grwx = '---';
		}
		if(_acl['other']) {
			(_acl['other'][1].search(/r/) === -1)? orwx += '-' : orwx += 'r';
			(_acl['other'][1].search(/w/) === -1)? orwx += '-' : orwx += 'w';
			(d === 'd')? orwx += 'x' : orwx += '-';
		}else{
			orwx = '---';
		}
		
		line[0] = d + urwx + grwx + orwx;
		line[1] = '1';
		line[2] = owner;
		line[3] = group;
		line[4] = stat['size'].toString(10);
		line[5] = formatDate(stat['mtime']);
		line[6] = fname;
		line[7] = line[2].length;
		line[8] = line[3].length;
		line[9] = line[4].length;
		
	}
}

/* class to treat static data as readable */
const Readable = require('stream').Readable;

class TextReader extends Readable { 

	constructor(data, opt){
		super(opt);
    	this._data   = data;
    	this._length = data.length;
    	this._pos    = 0;
		this._encoding = 'utf8';
	}
	
	setEncoding(enc){
		this._encoding = enc;
	}
	open() {
		this.emit('open');
		debugLog('TextReader emitted open');
	}

	_read(n) {
       	if(this._pos < this._length){
        	var buf = new Buffer(this._data, this._encoding);
		this._pos = this._length;
        	this.push(buf);
    	}else{
        	this.push(null);
    	}
	}
}
/* end of class */

class FtpCommandInterpreter extends  emitter{
	constructor(opts){
		super();
		this.list = {
			'quit': this.onQuit,
			'user': this.onUser,
			'pass': this.onPass,
			'port':	this.onPort,
			'eprt': this.onEprt,
			'pasv': this.onPasv,
			'epsv': this.onEpsv,
			'retr':	this.onRetr,
			'stor': this.onStor,
			'dele': this.onDele,
			'list': this.onList,
			'nlst': this.onNlst,
			'type': this.onType,
			'syst': this.onSyst,
			'noop':	this.onNoop,
			'pwd' : this.onPwd,
			'cwd' : this.onCwd,
			'cdup': this.onCdup,
			'mkd' : this.onMkd,
			'rmd' : this.onRmd,
			/* rfc 4217 */
			'auth': this.onAuth,
			'pbsz': this.onPbsz,
			'prot': this.onProt,
			'ccc' : undefined, 
			'feat': this.onFeat,
		};
	}

	disable(command){
		debugLog('disable command -> ' + command);
		if(command in this.list)
			this.list[command] = false;
	}
	enable(command, onFunc){
		debugLog('enable command -> ' + command);
		if(command in this.list)
			this.list[command] = onFunc;
	}
	applyPermissions(pLine){
		var p = pLine.split('|');
		var	cmds = p[1].split(',');
		var i = 0;
		var key = '';
		if(p[0] === 'allow'){
			for( i in cmds) this.disable(cmds[i]);
		}else if(p[0] === 'deny'){
			for (key in this.list) disable(key);
			for( i in cmds) this.enable(cmds[i]);
		}
	}
	/* QUIT */
	onQuit(session){
		var self = session.commands;
		self.emit('quit');
	}
	/* USER */
	onUser(session, param){
		if(!session.login){
			session.user = param;
			session.reply(331);
		}else{
			session.reply(503, 2);
		}
	}
	/* PASS */
	onPass(session, param){
		var self = session.commands;
		if(session.user && !session.login) {
			acl.checkPasswdUser(session.user, param, function(uInf){
				if(uInf){
					session.login = true;
					session.pwd = self.resolvePath(uInf['home'],
														session.pwd, 
														session.pathRoot);
					/* set command permission */
					if(uInf['permissions'].trim()){
						self.applyPermissions(uInf['permissions'].trim());
					}else{
						acl.getGroupByGid(uInf['gid'], function(gInf){
							self.applyPermissions(gInf['permissions'].trim());
						});
					}
					session.reply(230);
				}else{
					session.reply(530);
				}
			});
		}else{
			session.reply(503);
		}
	}
	/* PORT */
	onPort(session, param){
		var self = session.commands;
		if(!self.checkLogin(session)) return;
		if(self.checkEpsvAll(session)) return;
		
		var p = param.split(',');
		var port = (p[4] * 0x100) + ( 1 * p[5]);
		if(p[0] >= 0 && p[0] <= 255 && p[1] >= 0 && p[1] <= 255 &&
		   p[2] >= 0 && p[2] <= 255 && p[3] >= 0 && p[3] <= 255 &&
		   port > 0 && port <=  65536) {

			session.activeAddress = p[0] +'.' + p[1] +'.' + p[2] +'.' + p[3];
		    session.activePort    = port;

			debugLog('PORT -> ip: ' + session.activeAddress + 
							 				' port: ' + session.activePort);
			if(session.isPasv()){
				session.exitPasv();
			}
			session.reply(200, 1);
		}else{
			session.reply(501);
		}	
	}
	/* EPRT */
	onEprt(session, param){
		var self = session.commands;
		if(!self.checkLogin(session)) return;
		if(self.checkEpsvAll(session)) return;

		var ip = self.parseExtensions(param);
		if(ip['af'] == 1 || ip['af'] == 2){
			session.activeAddress = ip['addr'];
			session.activePort    = ip['port'];
			debugLog('ip: ' + session.activeAddress + 
						' port: ' + session.activePort);
			session.reply(200, 2);
			return;
		}
		session.reply(522, 0, ['1,2']);
	}
	/* PASV */
	onPasv(session){
		var self = session.commands;
		if(!self.checkLogin(session)) return;
		if(self.checkEpsvAll(session)) return;

		session.enterPasv(function(conn){
			conn.listenServer();
			var bind = conn.pasvServer.address();
			
			debugLog('Server address: ' + conn.serverAddr);
			var ips = 
				session.splitIPv4Addr(session.trimIPv4MapAddr(conn.serverAddr));
			if(ips[0] === 0 && ips[1] === 0 && ips[2] === 0 && ips[3] === 0) {
				session.reply(522, 1, '2');
				session.exitPasv();
			}

			session.reply(227, 0, [ips[0],ips[1],ips[2],ips[3],
										Math.floor(bind['port']/0x100),
										bind['port'] % 0x100]);
		});
	}
	/* EPSV */
	onEpsv(session, param){
		var self = session.commands;
		if(!self.checkLogin(session)) return;

		if(param == 1 || param == 2){
			session.enterPasv(function(conn){
				conn.listenServer();
				var bind = conn.pasvServer.address();
			
				debugLog('server address: ' + conn.serverAddr);

				session.reply(229, 0, [bind['port']]);
			});
			return;
		}
		if(param.search(/^all/i) != -1) {
			session.epsvAll = true;
			session.reply(200, 3);
			return;
		}
		session.reply(522, 0, ['1,2']);
	}
	/* RETR */
	onRetr(session, param){
		var self = session.commands;
		if(!self.checkLogin(session)) return;

        /* open file */
		var conn = session.getConnection();

		var recvFile = self.resolvePath(self.filterPath(param), session.pwd,
												session.pathRoot);
		/* check access control list */
		acl.checkAcl(path.dirname(recvFile), session.user, function(rwx){
			if(rwx.search(/r/) == -1) {
				session.reply(550, 2);
				return;
			}

			var reader = fs.createReadStream(recvFile);
		    reader.on('error',function(e){
		            debugLog("No such file: " + e.message );
		            session.reply(550, 1);
					if(conn) /* if passive mode */
						session.pasvConnection.closeServer();
		            return;
		    });
			reader.on('open',function(){
			
				if(conn) { /* if passive mode */
					conn.transmitPasv(reader, function(replyCode, branch){
						session.reply(replyCode, branch);
					});
				}else{
					session.reply(150);	
					session.createDataConnection(false).transmit(reader,
													function(replyCode, branch){
						session.reply(replyCode, branch);
					});
				}
			});
		});
	}
	/* STOR */
	onStor(session, param){
		var self = session.commands;
		if(!self.checkLogin(session)) return;

		/* file for write */
		var conn = session.getConnection();

		var storFile = self.resolvePath(self.filterPath(param), session.pwd,
												session.pathRoot);

		/* check access control list */
		acl.checkAcl(path.dirname(storFile), session.user, function(rwx){
				if(rwx.search(/w/) == -1) {
					session.reply(550, 2);
					return;
				}
		    var writer = fs.createWriteStream(storFile);
		    writer.on('error',function(e){
		            debugLog("Cannot create file: "  + e.message );
		            session.reply(521);
					if(conn) /* if passive mode */
						session.pasvConnection.closeServer();
		            return;
		    });

			writer.on('open',function(){
				/* do it now */
				if(conn){ /* if passive mode */
					conn.receivePasv(writer, function(replyCode, branch){
						session.reply(replyCode, branch);
					}, storFile);
				}else{
					session.createDataConnection(false).receive(writer, 
						function(replyCode, branch){ 
						session.reply(replyCode, branch);
					}, storFile);
				}
			});
		});
	}
	/* LIST */
	onList(session,param){
		/* ignore option */
		var d = param.replace(/-.*\s/, '');
		    d = d.replace(/-.*$/, '');
		session.commands.onFileList(session, d,true);
	}
	onNlst(session,param){
		session.commands.onFileList(session,param,false);
	}
	/* if flag is true, LIST else NLST */
	onFileList(session, param, flag){
		var self = session.commands;
		if(!self.checkLogin(session)) return;

		/* Read directory */
		var conn = session.getConnection();

		var directory = self.resolvePath(self.filterPath(param), session.pwd,
												session.pathRoot);
		if(directory.length === 0) directory = './';
		/* check access control list */
		acl.checkAcl(directory, session.user, function(rwx){
			if(rwx.search(/r/) == -1) {
				session.reply(550, 2);
				return;
			}
			var list = '';
			if(!flag){
				fs.readdir(directory , function(err,files){
					if(err){
						debugLog("Got error: " + err.message );
						session.reply('550');
						if(conn) /* if passive mode */
							session.pasvConnection.closeServer();
						return;
					}else{
						for( var i in files){
							if(!files[i].match(/^\./))
									list += files[i] + '\r\n';
						}
						_transmit(list);
						return;
					}
				});
			}else{
				acl.getAclOwners(directory,function(rcAcl){		
					try{
						_transmit(getDirectoryListSync(directory, rcAcl));
						return;
					}catch(e){
						session.reply('550');
						if(conn) /* if passive mode */
							session.pasvConnection.closeServer();
						return;
					}
				});
			}
		});

		function _transmit(list){
			if(!list) list = '\r\n';
			var reader = new TextReader(list);
			reader.on('open',function(){

				if(conn) { /* if passive mode */
					conn.transmitPasv(reader,
										 function(replyCode, branch){
						session.reply(replyCode, branch);
					});
				}else{
					session.reply(150);	
					session.createDataConnection(false).transmit(reader,
											function(replyCode, branch){
						session.reply(replyCode, branch);
					});
				}
			});
			reader.open();
		}

	}
	/* DELE */
	onDele(session,param){
		var self = session.commands;
		if(!self.checkLogin(session)) return;

        /* open file */
		var conn = session.getConnection();

		var deleFile = self.resolvePath(self.filterPath(param), session.pwd,
												session.pathRoot);
		/* check access control list */
		acl.checkAcl(path.dirname(deleFile), session.user, function(rwx){
			if(rwx.search(/w/) == -1) {
				session.reply(550, 2);
				return;
			}
			fs.unlink(deleFile,function(e){
				if(e){
					session.reply(550, 1);
					return;
				}
				session.reply(250, 0);
				return;
			});
		});
	}
	/* MKD */
	onMkd(session, param){
		var self = session.commands;
		if(!self.checkLogin(session)) return;

		/* Read directory */
		var conn = session.getConnection();

		var directory = self.resolvePath(self.filterPath(param), session.pwd,
												session.pathRoot);
		/* check access control list */
		acl.checkAcl(path.dirname(directory), session.user, function(rwx){
			if(rwx.search(/w/) == -1) {
				session.reply(550, 2);
				return;
			}
			try{
				acl.mkdirAclSync(directory, session.user);
			}catch(e){
				debugLog('Cannot create directory. ' + e.message);
				session.reply(550, 1);
				return;
			}
			var displayPath = 
					 session.commands.chrootPath(directory, session.pathRoot);
			session.reply(257, 0, [ '\"' + displayPath + '\"' ]);

		});

	}
	/* RMD */
	onRmd(session, param){
		var self = session.commands;
		if(!self.checkLogin(session)) return;

		/* Read directory */
		var conn = session.getConnection();

		var directory = self.resolvePath(self.filterPath(param), session.pwd,
												session.pathRoot);
		/* check access control list */
		acl.checkAcl(directory, session.user, function(rwx){
			if(rwx.search(/w/) == -1) {
				session.reply(550, 2);
				return;
			}
			try{
				acl.rmdirAclSync(directory, session.user);
			}catch(e){
				debugLog('Cannot remove directory. ' + e.message);
				session.reply(550, 1);
				return;
			}
			session.reply(250, 0);
		});
	}
	/* TYPE */
	onType(session, param){
		session.reply(200);
	}
	/* SYST */
	onSyst(session){
		session.reply(215, 0, [session.sysType]);
	}
	/* NOOP */
	onNoop(session, param){
		session.reply(200);
	}
	/* PWD  */
	onPwd(session){
		var self = session.commands;
		if(!self.checkLogin(session)) return;

		var displayPath = 
			session.commands.chrootPath(session.pwd, session.pathRoot);
		session.reply(257, 1, [ '\"' + displayPath + '\"' ] );
	}
	/* CWD  */
	onCwd(session, param, flag){ /* if flag is true, no path filter */
		var self = session.commands;
		if(!self.checkLogin(session)) return;

		var chPath = self.resolvePath(flag ? param : self.filterPath(param),
												session.pwd,
												session.pathRoot);
		/* check access control list */
		acl.checkAcl(chPath, session.user, function(rwx){
			if(rwx.search(/r/) == -1) {
				session.reply(550, 2);
				return;
			}
			fs.readdir(chPath , function(err,files){
				if(err){
					debugLog("No such directory: " + err.message );
					session.reply(521, 1);
					return;
				}

				session.pwd = chPath;
				debugLog('session.pwd = ' + chPath);
				var displayPath = 
						session.commands.chrootPath(chPath, session.pathRoot);
			 	session.reply(200, 4, [ '\"' + displayPath + '\"' ]);

			});
		});
	}
	/* CDUP */
	onCdup(session){
		var self = session.commands;
		if(!self.checkLogin(session)) return;

		var cdup = '..';
		if(session.pwd === session.pathRoot) cdup = '';
		self.onCwd(session, cdup, true);
	}
	/* AUTH(TLS) */
	onAuth(session, param){
		if(param.match(/^tls$/i)){
			session.reply(234, 0,['TLS']);
			session.tlsSocket = new tls.TLSSocket(session.socket, optTls);
			session.tlsSocket.on('secure',function(){
				debugLog('TLS negotiation completed.');
				session.enterTls();
			});
			return;
		}
		session.reply(504);
	}
	/* PBSZ */
	onPbsz(session, param){
		if(session.isTls && param.match(/^0$/i)) {
			session.reply(200);
			return;
		}
		if(session.isTls){
			session.reply(501);
			return;
		}
		session.reply(503, 3);
	}
	/* PROT */
	onProt(session, param){
		if(session.isTls && param.match(/^p$/i)) { 
			session.reply(200);
			return;
		}
		if(session.isTls) { 
			session.reply(501);
			return;
		}
		session.reply(503, 3);
	}
	/* FEAT */
	onFeat(session) {
		session.reply(211, 1);
	}
	/* utilities */
	checkLogin(session){
		if(!session.login)  { 
			session.reply(530);
		    return false;
		}
		return true;
	}
	checkEpsvAll(session){
		if(session.epsvAll) {
			session.reply(503, 1); 
			return true;
		}
		return false;
	}
	resolvePath(input, pwd, pathRoot){
		if(input.match(/^\/.*/)) return pathRoot + input;
		return path.join(pwd, input);
	}
	filterPath(targetPath){
		var r = targetPath;
		r = r.replace(/\.\.\//g,'');
		r = r.replace(/^\.\.$/g,'');
		r = r.replace(/\/\./g,'');
		r = r.replace(/^\./g,'');
        debugLog('path name filtered: ' + targetPath + '->' + r);
		return r;
	}
	chrootPath(targetPath, rootPath){
		var r = targetPath;
		var re = new RegExp('^' + rootPath);
		r = r.replace(re,'');
		if(r === '') r = '/';
		debugLog('chroot path: ' + targetPath + ' -> ' + r);
		return r;
	}
	parseExtensions(cmd){ /* rfc 2428 */
		var p = cmd.split('|');
		if (p.length == 5)
			return {'af' : p[1], 'addr' : p[2], 'port' : p[3]};
		else return {'af' : 0, 'addr' : 0, 'port' : 0}; /* parse error */
	}

}

class FtpDataConnection extends  emitter {
	constructor(addr, port, opt){
		super();
		this.remoteAddr = addr;
		this.remotePort = port;
		this.isPasv = false;
		this.isTls  = opt['isTls'];
		this.af     = 1;
		this.serverAddr = '0.0.0.0';
		this.serverPort = 0;
		this.rangePort = {min: 30001, max: 39999}
		this.pasvServer;
		this.pasvClient;
		if(opt && 'isPasv' in opt && opt['isPasv']){	
			this.isPasv = true;
			if(opt['af'])   this.af = opt['af'];
			if(opt['addr']) this.serverAddr = opt['addr'];
			if(opt['rangePort']) this.rangePort = opt['rangePort'];
			this.serverPort = this.randPort();
		}

		debugLog('FtpDataConnection initilized.');
		debugLog('  remoteAddr = ' + this.remoteAddr);
		debugLog('  remotePort = ' + this.remotePort);
		debugLog('  af         = ' + this.af);
		debugLog('  serverAddr = ' + this.serverAddr);
		debugLog('  serverPort = ' + this.serverPort);
	}
	
	/* Active mode data transmit */
	transmit(reader, cbReply){
		var self = this;
		var sockClr = net.connect(this.remotePort, this.remoteAddr, 
															function() {
			if(self.isTls) {
				debugLog('TLS wrapping socket ...');
				var sockTls = new tls.TLSSocket(sockClr, optTls);
				sockTls.on('secure', function() {
					debugLog('TLS data connection is established.');
					onConnect(sockTls);
				});
			}else{
				onConnect(sockClr);
			}
        });
		
		function onConnect(sock){
			reader.pipe(sock);

            reader.on('error',function(e){
            	debugLog('error@transmit->reader.on-> ' + e.message);
                cbReply(426);
                sock.end();
                return;
            });

            reader.on('end', function(){
                cbReply(250);
                return;
            });

		}
		sockClr.on('error',function(e){
        	debugLog('error@transmit->sock.on-> ' + e.message);
            cbReply(425);
            return;

        });
	}

	/* Active mode data receive */
	receive(writer, cbReply, filename){
		var self = this;

    	var sockClr = net.connect(this.remotePort, this.remoteAddr ,
															 function() {
			cbReply(125);
			if(self.isTls){
				debugLog('TLS wrapping socket ...');
				var sockTls = new tls.TLSSocket(sockClr, optTls);
				sockTls.on('secure', function() {
					debugLog('TLS data connection is established.');
					onConnect(sockTls);
				});
			}else{
				onConnect(sockClr);
			}
    	});

		function onConnect(sock){
            	sock.pipe(writer);

            	writer.on('error',function(e){
                	debugLog('error@receive->writer.on-> ' + e.message);
                	cbReply(426);
                	sock.end();
               	 	return;
            	});

            	sock.on('end', function(e){
                	cbReply(250);
					self.emit('stored',filename, writer.bytesWritten);
                	return;
            	});
		}
    	sockClr.on('error',function(e){
        	debugLog('error@receive->sock.on-> ' + e.message);
        	cbReply('425');
        	return;
    	});
	}

	/*   Passive mode data exchange 
     *   create one server by one data exchange session.
     *   Server will be closed when the session has been ended
     **/
	/* Passive mode data transmit */
	transmitPasv(reader, cbReply){

		var self = this;
		
		/* Client has not yet connected */
		if(!this.pasvClient){
			this.on('connect', function(){
				self.transmitPasv(reader, cbReply);
			});
			return;
		}
		
        cbReply(125);
        reader.pipe(this.pasvClient);

        this.pasvClient.on('error',function(e){
            debugLog('error@transmitPasv->pasvClient.on-> ' + e.message);
            cbReply(426);
            /* close server */
			self.closeServer();
            return;
        });

        reader.on('error',function(e){
            debugLog('error@transmitPasv->reader.on-> ' + e.message);
            cbReply(451);
            self.pasvClient.end();
            /* close server */
			self.closeServer();
            return;
        });

        reader.on('end', function(){
            cbReply(250);
            /* close server */
            self.pasvClient.end();
			self.closeServer();
            return;
        });
		/* error with me ! */
        this.pasvServer.on('error',function(e){
            debugLog('error@transmitPasv->pasvServer.on-> ' + e.message);
            cbReply(426);
            self.closeServer();
            return;
        });

	}
	/* Passive mode data receive */
	receivePasv(writer, cbReply, filename){

 		var self  = this;

		/* Client has not yet connected */
		if(!this.pasvClient){
			this.on('connect', function(){
				self.receivePasv(writer, cbReply);
			});
			debugLog('Client has not yet connected, wait to connect');
			return;
		}
		
        cbReply(125);
		this.pasvClient.pipe(writer);

        this.pasvClient.on('error',function(e){
            debugLog('error@receivePasv->pasvClient.on-> ' + e.message);
            cbReply(426);
            /* close server */
			self.closeServer();
			writer.end();
            return;
        });

        writer.on('error',function(e){
            debugLog('error@receivePasv->writer.on-> ' + e.message);
            cbReply(451);
            self.pasvClient.end();
            /* close server */
			self.closeServer();
            return;
        });
		
        this.pasvClient.on('end', function(){
            cbReply(250);
			self.emit('stored',filename, writer.bytesWritten);
            /* close server */
			self.closeServer();
            return;
        });
		/* error with me! */
        this.pasvServer.on('error',function(e){
            debugLog('error@receivePasv->pasvServer.on-> ' + e.message);
            cbReply(426);
            self.closeServer();
            return;
        });

	}
	/* create server */
	createServer(){
		var self = this;
		var port = this.serverPort;

		this.pasvServer = net.createServer(function(client){
			/* TODO: check remote address */
			self.isTls ? self.pasvClient = new tls.TLSSocket(client, optTls) :
													self.pasvClient = client;
			debugLog('Connect from ' + self.pasvClient.remoteAddress + 
						' on data port.');

			/* notify connection event */
			self.emit('connect');
	
			self.pasvClient.on('end',function(){
				debugLog('Close connection of data port for ' + 
										self.pasvClient.remoteAddress ); 			
			});
		});
		
	}
	/* listen server */
	listenServer(){
		/* todo: Retry when port is in use*/
		var port = this.serverPort;
		this.pasvServer.listen(this.serverPort,function() {
			debugLog('Server for data trasfer listening on ' 
							+ port);
		});
	}
	/* exitting passive mode */
	closeServer(){
		debugLog('Closing passive mode server.');
		this.pasvServer.close();
		this.isPasv = false;
	}
	/* create randam port number */
	randPort() {
        return Math.floor(Math.random()*(this.rangePort['max'] - 
							this.rangePort['min']) + 1) + this.rangePort['min'];
	}
}

class FtpSession extends emitter {
	constructor(_socket, opt){
		super();
		/* Logger */
		if(opt && 'pathLog' in opt) {
			var writer = fs.createWriteStream(opt['pathLog'],
											  { flags: 'a',
  											    encoding: null,
  											    mode: parseInt("0644",8) });

			this.logger = new Logger(this, writer, opt['logLevel'],
											  			opt['logFormat']);
		}

		this.socket = _socket;
		this.clrSocket = this.socket;
		this.tlsSocket = undefined;
		this.isTls  = false;
		this.clReq  = '';
		this.user	= '';
		this.login  = false;
		if(opt && 'pathRoot' in opt)
			this.pathRoot = opt['pathRoot'];
		else this.pathRoot = '';
		this.pathRoot = path.resolve(this.pathRoot);
		this.pwd = this.pathRoot;
		this.epsvAll = false;
		/* active mode */
		this.af = 1;
		this.activeAddress = this.socket.remoteAddress;
		var ipv = this.detectAddress(this.socket.remoteAddress);
		if(ipv === 6) {	this.af = 2; }
		if(ipv === 4.6) {
		  this.activeAddress = this.trimIPv4MapAddr(this.socket.remoteAddress);
		}
		this.activePort = DEFAULT_DATA_PORT;
		/* passive mode */
		this.pasvConnection =undefined;
		/* Command Interpreter */
		this.commands = new FtpCommandInterpreter();
		if(opt && 'sysType' in opt)
			this.sysType = opt['sysType'];
		else this.sysType = os.type();

		var self = this;
		this.socket.on('error',function(e){
			debugLog('Got error: ' + e.message);
			self.onCleanUp();
		});

		this.socket.on('close',function(){
			self.onCleanUp();
		});

		this.commands.on('quit', function(){
			self.reply(221);
			self.socket.end();
		});

		debugLog('Ftp session started. ');
		debugLog('  remoteAddress = ' +this.socket.remoteAddress);
		debugLog('  activeAddress = ' +this.activeAddress);
		debugLog('  rootPath ='  + this.pathRoot);
		debugLog('  pwd = ' +this.pwd);
		
		setTimeout(function() { 
			self.emit('log', 1, 
			   		  'Ftp session started(50ms delay)' ,
					  self.activeAddress, self.user);
		});
	}

	onCleanUp(){
		debugLog('Session has been closed. clean up.');
		this.emit('log', 1, 'Ftp session ended' ,
						this.activeAddress, this.user);
		if(this.pasvConnection) {
			this.pasvConnection.closeServer();
		}
	}

	parseClientReq(chunk) {
		this.clReq += chunk;
		if(this.clReq.search(/^.+\r\n/) === -1)  return;
		debugLog('parseClientReq: ' + this.clReq.trim());
		this.emit('log', 3, this.clReq.trim(),this.activeAddress, this.user);
		var n = 0;
 	    if(this.clReq.search(/^.{3}[ \t\r\n]/i) != -1) n = 3; 
		if(this.clReq.search(/^.{4}[ \t\r\n]/i) != -1) n = 4;

		if(!n) 	{
			this.reply(500);
			return;
		}

		this.dispatchProccess(this.clReq.substr(0, n), 
							  this.clReq.slice(n + 1,-2));
		
	}
	
	dispatchProccess(_command, _param){
		for(var cmd in this.commands.list) {
			if(_command.search(new RegExp('^' + cmd, 'i')) != -1 &&
											this.commands.list[cmd]) {
				this.commands.list[cmd](this, _param);
				return;
			}
		}

		/* NOT IMPLEMENTTED */
		this.reply(502);
	}

	clearCmdBuffer(){
		this.clReq = '';
	}

	reply(code, branch, args) {
		var x = 0;
		(branch) ? x = code*100 + branch : x = code;
		this.clearCmdBuffer();

		var re = /\%[ds]/;
		var replyStr = REPLY_CODES[x];
		if(args){
			for(var i in args){
				replyStr = replyStr.replace(re, args[i]);
			}
		}
		if(REPLY_CODES[x].match(/\r\n/)){
			this.socket.write(code + "-" + replyStr + 
							  code + " END\r\n");
		}else{
			this.socket.write(code + " " + replyStr + "\r\n");
		}
		this.emit('log', 3, code + " " + 
						replyStr.replace(/\r\n/g,'[CRCF]'),
							this.activeAddress, this.user);
		return;

	}
	/* Passive mode */
	isPasv(){
		if(this.pasvConnection && this.pasvConnection.isPasv) return true;
		return false;
	}
	enterPasv(cbfunc){
		if(!this.isPasv())  { 
			this.createDataConnection(true);		
		}
		cbfunc(this.pasvConnection);
	}
	exitPasv(cbfunc){
		this.pasvConnection.closeServer();
		this.pasvConnection = undefined;
	}
	createDataConnection(isPasv){
		var self = this;
		var opt = {'isPasv': isPasv ,
		           'isTls': this.isTls};
		if(this.af === 2 && this.detectAddress(this.socket.localAddress) > 4 ) {
			opt['af'] = 2;
			opt['addr'] = this.socket.localAddress;
		}else {
			opt['af'] = 1;
			opt['addr'] = this.trimIPv4MapAddr(this.socket.localAddress);
		} 
		
		var conn = new FtpDataConnection(this.activeAddress, 
													this.activePort, opt);
		
		if(isPasv) {
			this.pasvConnection = conn;
			this.pasvConnection.createServer();
		}
		/* event triggered */
		conn.on('stored',function(fname,bytes){
			self.emit('stored', fname, bytes);
		});
		return conn;
	}
	getConnection(){ 
		if(this.isPasv) return this.pasvConnection;
		return undefined;
	}
	/* TLS */
	enterTls(){
		this.socket = this.tlsSocket;
		this.emit('starttls',this.tlsSocket);
		this.isTls = true;
	}
	/* XXX */
	trimIPv4MapAddr(mapAddr){
		var x = this.detectAddress(mapAddr);
		if( x === 4.6) return mapAddr.split(':').pop();
		if( x === 4) return mapAddr;
		return '0.0.0.0';
	}
	splitIPv4Addr(ipAddr){
		if(this.detectAddress(ipAddr) === 4) return ipAddr.split('.');
		return [0, 0, 0, 0];
	}
	detectAddress(ipAddr){
		var reV4  = /^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$/;
		var reMap = 
			/^[0-9a-fA-F:]+:[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$/;
		var reV6  = /^[0-9a-fA-F:]+$/;
		if(ipAddr.match(reV4)) return 4;
		if(ipAddr.match(reMap)) return 4.6;
		if(ipAddr.match(reV6)) return 6;
		return 0;
	}
}


function connectionListener(socket){
	debugLog('connect from client.');
	var session = new FtpSession(socket, optGlobal);

	session.on('stored',function(fname, bytes){
		debugLog(fname + ' has been stored. File size: ' + bytes + 'bytes');
		/* code to do when file uploaded */
	});

	function soketOnData(chunk){
		session.parseClientReq(chunk);
	}
	session.on('starttls',function(tlsSocket){
		socket.removeAllListeners('data');
		tlsSocket.on('data', soketOnData);
	});

	session.reply(220);

	socket.on('data', soketOnData);
	socket.on('end',function(){
		debugLog(socket.remoteAddress + ' closed connection.');
	});
}


var server = net.createServer(connectionListener);
ctrlPort = ctrlPort ? ctrlPort : DEFAULT_CTRL_PORT;
server.listen(ctrlPort);

server.on('listening',function(){
	debugLog('ftp server has started. listening on ' + 
						server.address()['port']);
});
server.on('error',function(e){
		console.log('Error: Cannot use this port(' + ctrlPort + ') ');
		debugLog(e.message);
		console.log('       Trying alternative port.');
		server.listen(ALT_CTRL_PORT);
})



