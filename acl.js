var fs   = require('fs');
var readline = require('readline');
var path = require('path');
var crypto = require('crypto');

/* parameters -
 *   must be initialized.
**/
var pathPasswd = '';
var pathGroup = '';
var dirPathUsers = '';
var dirPathFiles = '';
var hashAlgo = 'sha256';
var encoding = 'utf8';
var debug = '1';
/* end of parameters */

var self = this;

function debugLog(msg){ if(debug) console.log('Debug: ' + msg); }

/* check user password */
exports.checkPasswdUser = function(user, pwIn, cbfunc){
	
	self.getUserAll(user, function(userInf){
		if(userInf){
			var sh;
			try{ 
				sh = userInf['passHashed'].split('$');
			}catch(e){ 
				/* XXX */
				debugLog(e);
				cbfunc(undefined);
				return;
			}
			if(self.verifyHashedPassString(pwIn, sh[0]) 
												=== userInf['passHashed']){
				cbfunc(userInf);
			}else{
				cbfunc(undefined);
			}
		}else{
			cbfunc(undefined);
		}
	});
}
/* check group password (only wraped function) */
exports.checkPasswdGroup = function(group, pwIn, cbfunc){
	self.checkPasswdUser(user, pwIn, cbfunc);
}

/* user or uid overlap check */
exports.checkOverlapUser = function(rc, cbfunc) {
	var reader = fs.createReadStream(self.pathPasswd);
	var rl = readline.createInterface({'input': reader, 'output': {}});
	var ret = true;
	rl.on('line', function(line) {
		var v = line.split(':');
		if(rc['user'] === v[0] ||
		   rc['uid'] === v[2] ) {
			/* overlap */
			ret = false;
		}
	});
	rl.on('close', function() {
		cbfunc(ret);
		return;
	});
	rl.resume();
}
/*  logical check 
 *
**/
exports.checkLogicalUser = function(rc) {
	var user = rc['user'].trim();
	var ret = false;
	if (!rc['user'] || !rc['uid'] || !rc['gid']) return false;
	if (rc['user'].search(/\s/) !== -1) return false;
	if(rc['uid'] < 0 || rc['uid'] > 65534) return false;
	if(rc['gid'] < 0 || rc['gid'] > 65534) return false;
	
	if(user.search(/\s/) > 0) return false;
	
	return true;
}
/*  function for oparating User database 
 *  
 *  
**/
exports.verifyHashedPassString = function(pwText, salt){
	var hsha = crypto.createHash(self.hashAlgo);
	hsha.update('' + salt + pwText, 'utf8');
	return salt + '$' + hsha.digest('hex');
}

exports.createHashedPassString = function(pwText){
	return self.verifyHashedPassString(pwText,
						 (Math.floor(Math.random() * 256 * 256)).toString(16));
}
/*  [addUser]
 *    rc:     user infomations { user: 'name', ... }
 *    cbfunc: callback function takes one parameter that is return value.
 *            return value is boolean. true means oparation success.
 *            false means oparation failed. 
 *    note:   new user record will be written the last line of passwd file.
**/
exports.addUser　= function (rc, cbfunc){	
	if(!this.checkLogicalUser(rc)) { 
		cbfunc(false);
		return;
	}
	
	this.checkOverlapUser(rc, function(result){
		if(!result) { 
			cbfunc(false);
			return;
		}
		
		var fldPass = 'x'; /* locked */
		var pass =rc['password'].trim();
		if(pass)
			fldPass = self.createHashedPassString(pass);
		
		var homedir = path.join(self.dirPathUsers, rc['user'].trim());
		if(rc['home'] && rc['home'].match(/^\/.+/) )
			homedir = rc['home'].trim();

		var pwline = rc['user'].trim() + ':' + 
					 fldPass + ':' + 
					 rc['uid'].trim() + ':' + 
					 rc['gid'].trim() + ':' + 					
					 rc['realName'].trim() + ':' + 
					 homedir + ':' + 
					 rc['permissions'].trim();

		var writer=fs.createWriteStream(self.pathPasswd, {   flags: 'a',
				  						     		    encoding: null,
				  				  	     	        	mode: 0600 });
		writer.on('error',function(e){
			debugLog('Error: Cannot write passwd file. ' + e.message);
			cbfunc(false);
			return;
		});

		writer.write(pwline + '\n');
		writer.end();
		
		writer.on('finish', function(){
			
			try {
				fs.readdirSync(path.join(self.dirPathFiles, homedir));
				/* directory already exist, do nothing ...
				 * TODO: replace .acl				
				**/
				debugLog('User directory already exist: ');
			}catch(e){
				if(e.code === 'ENOENT'){
					/* directory dose not exist, do it */
					try{
						self.mkdirAclSync(path.join(self.dirPathFiles, homedir),
															rc['user'].trim());
					}catch(e){
						debugLog('User directory is not created: ' + e.message);
					}
				}else{
					debugLog('User directory is not created: ' + e.message);
				}
			}

			cbfunc(true);
			return;
		});
		
	});
}

exports.randString　= function (){
	return Math.floor(Math.random() * 0xFFFFFFFF).toString(16);
}

exports.removeUser　= function (user, cbfunc){
	var reader = fs.createReadStream(self.pathPasswd);
	var tmpPasswd = self.pathPasswd + '.' + self.randString();
	var writer = fs.createWriteStream(tmpPasswd);
	var rl = readline.createInterface({'input': reader, 'output': {}});
	var ret = false;
	rl.on('line', function(line) {
		var rc = line.split(':');
		if(rc[0] === user) {
			/* match */
			ret = true;
		}else{
			writer.write(line + '\n');
		}
	});
	rl.on('close', function() {
		fs.unlinkSync(self.pathPasswd);
		fs.renameSync(tmpPasswd, self.pathPasswd);
		cbfunc(ret);
	});
	rl.resume();

	writer.on('error',function(e){
		debugLog('Error: Cannot write passwd file. ' + e.message);
		cbfunc(ret);
	});
}

exports.editUser　= function (rc, cbfunc){
	var reader = fs.createReadStream(self.pathPasswd);
	var tmpPasswd = self.pathPasswd + '.' + self.randString();
	var writer = fs.createWriteStream(tmpPasswd);
	var rl = readline.createInterface({'input': reader, 'output': {}});
	var ret = false;
	rl.on('line', function(line) {
		var oldRc = line.split(':');
		var newRc = {};
		if(rc['user'] === oldRc[0]) { /* match */
			newRc['user'] = rc['user'];
			newRc['password'] = rc['password'].trim() ? 
				self.createHashedPassString(rc['password'].trim()) : oldRc[1];
			newRc['uid'] = rc['uid'].trim() ? rc['uid'].trim() : oldRc[2];
			newRc['gid'] = rc['gid'].trim() ? rc['gid'].trim() : oldRc[3];
			newRc['realName'] =	rc['realName'].trim();
			newRc['home'] = rc['home'].trim() ? rc['home'].trim() : oldRc[5];
			newRc['permissions'] = 	rc['permissions'].trim();
			if(self.checkLogicalUser(newRc)){
				writer.write(newRc['user'] + ':' +  newRc['password'] + ':' + 
							 newRc['uid']  + ':' +  newRc['gid'] + ':' + 					
							 newRc['realName'] + ':' + 
							 newRc['home'] + ':' + 
							 newRc['permissions'] + '\n');
				/* updated */
				ret = true;
			}else{
				writer.write(line + '\n');
			}
		}else{
			writer.write(line + '\n');
		}
	});
	rl.on('close', function() {
		fs.unlinkSync(self.pathPasswd);
		fs.renameSync(tmpPasswd, self.pathPasswd);
		cbfunc(ret);
	});
	rl.resume();

	writer.on('error',function(e){
		debugLog('Error: Cannot write passwd file. ' + e.message);
		cbfunc(ret);
	});
}
exports.getUsers　= function (start, n, cbfunc){
	var reader = fs.createReadStream(self.pathPasswd);
	var rl = readline.createInterface({'input': reader, 'output': {}});
	if(!n) n = 65535;
	var last = n - start;
	var i = 0;
	var ret = [];

	rl.on('line', function(line) {
		i++;
		if( start <= i && i < last) {
			var rc = {};
			var v = line.split(':');
			rc['user'] = v[0];
			if(v[1] === 'x')
				rc['passHashed'] = v[1];
			else
				rc['passHashed'] = '*';
			rc['uid'] = v[2];
			rc['gid'] = v[3];
			rc['realName'] = v[4];
			rc['home'] = v[5];
			rc['permissions'] = v[6];
			ret.push(rc);
		}
	});
	rl.on('close', function() {
		cbfunc(ret);
	});
	rl.resume();
}

exports.getUser　= function (user, cbfunc){
	self.getUserImpl(user, false, cbfunc);
}
exports.getUserAll = function (user, cbfunc){
	self.getUserImpl(user, true, cbfunc);
}
exports.getUserImpl　= function (user, opt, cbfunc){
	var reader = fs.createReadStream(self.pathPasswd);
	var rl = readline.createInterface({'input': reader, 'output': {}});
	var rc = undefined;

	rl.on('line', function(line) {
		var v = line.split(':');
		if(v[0] === user) {
			rc = {};
			rc['user'] = v[0];
			if(opt || v[1] === 'x') {
				rc['passHashed'] = v[1];
			}else{
				rc['passHashed'] = '*';
			}
			rc['uid'] = v[2];
			rc['gid'] = v[3];
			rc['realName'] = v[4];
			rc['home'] = v[5];
			rc['permissions'] = v[6];
			rl.close();
		}
	});
	rl.on('close', function() {
		cbfunc(rc);
	});
	rl.resume();
}
/* group or gid overlap check */
exports.checkOverlapGroup　= function (rc, cbfunc) {
	var reader = fs.createReadStream(self.pathGroup);
	var rl = readline.createInterface({'input': reader, 'output': {}});
	var ret = true;
	rl.on('line', function(line) {
		var v = line.split(':');
		if(rc['group'] === v[0] ||
		   rc['gid'] === v[2] ) {
			/* overlap */
			ret = false;
		}
	});
	rl.on('close', function() {
		cbfunc(ret);
		return;
	});
	rl.resume();
}
/*  logical check 
 *
**/
exports.checkLogicalGroup =　function (rc) {
	var group = rc['group'].trim();
	var ret = false;
	if (!rc['group'] || !rc['gid']) return false;
	if(rc['gid'] < 0 || rc['gid'] > 65534) return false;
	
	if(group.search(/\s/) > 0) return false;
	
	return true;
}
/*  [addGroup]
 *    rc:     group infomations { group: 'name', ... }
 *    cbfunc: callback function takes one parameter that is return value.
 *            return value is boolean. true means oparation success.
 *            false means oparation failed. 
 *    note:   new group record will be written the last line of group file.
**/
exports.addGroup　= function (rc, cbfunc){	
	if(!this.checkLogicalGroup(rc)) { 
		cbfunc(false);
		return;
	}
	
	this.checkOverlapGroup(rc, function(result){
		if(!result) { 
			cbfunc(false);
			return;
		}
		
		var fldPass = 'x'; /* locked */
		var pass =rc['password'].trim();
		if(pass)
			fldPass = self.createHashedPassString(pass);

		var pwline = rc['group'].trim() + ':' + 
					 fldPass + ':' + 
					 rc['gid'].trim() + ':' + 					
					 rc['users'].trim() + ':' + 
					 rc['permissions'].trim();
		var writer=fs.createWriteStream(self.pathGroup, {   flags: 'a',
				  						     		    encoding: null,
				  				  	     	        	mode: 0600 });
		writer.on('error',function(e){
			debugLog('Error: Cannot write group file. ' + e.message);
			cbfunc(false);
			return;
		});

		writer.write(pwline + '\n');
		writer.end();
	
		writer.on('finish', function(){
			cbfunc(true);
			return;
		});

		
	});
}
exports.removeGroup　= function (group, cbfunc){
	var reader = fs.createReadStream(self.pathGroup);
	var tmpGroup = self.pathGroup + '.' + self.randString();
	var writer = fs.createWriteStream(tmpGroup);
	var rl = readline.createInterface({'input': reader, 'output': {}});
	var ret = false;
	rl.on('line', function(line) {
		var rc = line.split(':');
		if(rc[0] === group) {
			/* match */
			ret = true;
		}else{
			writer.write(line + '\n');
		}
	});
	rl.on('close', function() {
		fs.unlinkSync(self.pathGroup);
		fs.renameSync(tmpGroup, self.pathGroup);
		cbfunc(ret);
	});
	rl.resume();

	writer.on('error',function(e){
		debugLog('Error: Cannot write group file. ' + e.message);
		cbfunc(ret);
	});
}
exports.editGroup　= function (rc, cbfunc){
	var reader = fs.createReadStream(self.pathGroup);
	var tmpGroup = self.pathGroup + '.' + self.randString();
	var writer = fs.createWriteStream(tmpGroup);
	var rl = readline.createInterface({'input': reader, 'output': {}});
	var ret = false;
	rl.on('line', function(line) {
		var oldRc = line.split(':');
		var newRc = {};
		if(rc['group'] === oldRc[0]) { /* match */
			newRc['group'] = rc['group'];
			newRc['password'] = rc['password'].trim() ? 
				self.createHashedPassString(rc['password'].trim()) : oldRc[1];
			newRc['gid'] = rc['gid'].trim() ? rc['gid'].trim() : oldRc[2];
			newRc['users'] = rc['users'].trim();
			newRc['permissions'] =	rc['permissions'].trim();
			/* Run logical check */
			if(self.checkLogicalGroup(newRc)){
				writer.write(newRc['group'] + ':' +  newRc['password'] + ':' + 
							 newRc['gid']  + ':' +  newRc['users'] + ':' + 	
							 newRc['permissions'] + '\n');
				/* updated */
				ret = true;
			}else{
				writer.write(line + '\n');
			}
		}else{
			writer.write(line + '\n');
		}
	});
	rl.on('close', function() {
		fs.unlinkSync(self.pathGroup);
		fs.renameSync(tmpGroup, self.pathGroup);
		cbfunc(ret);
	});
	rl.resume();

	writer.on('error',function(e){
		debugLog('Error: Cannot write group file. ' + e.message);
		cbfunc(ret);
	});
}
/* get groups data 
 *
**/
exports.getGroups　= function (start, n, cbfunc){
	var reader = fs.createReadStream(self.pathGroup);
	var rl = readline.createInterface({'input': reader, 'output': {}});
	if(!n) n = 65535;
	var last = n - start;
	var i = 0;
	var ret = [];

	rl.on('line', function(line) {
		i++;
		if( start <= i && i < last) {
			var rc = {};
			var v = line.split(':');
			rc['group'] = v[0];
			rc['gpassHashed'] = v[1];
			rc['gid'] = v[2];
			rc['users'] = v[3];
			rc['permissions'] = v[4];
			ret.push(rc);
		}

	});
	rl.on('close', function() {
		cbfunc(ret);
	});

	rl.resume();
}
/*  getGroup
 *
**/
exports.getGroup　= function (group, cbfunc){
	this.getGroupBy(group, 0 ,cbfunc);
}
exports.getGroupByGid　= function (gid, cbfunc){
	this.getGroupBy(gid, 1 ,cbfunc);
}
exports.getGroupBy　= function (p, opt ,cbfunc){
	var reader = fs.createReadStream(self.pathGroup);
	var rl = readline.createInterface({'input': reader, 'output': {}});
	var rc = {};

	rl.on('line', function(line) {
		var v = line.split(':');
		if( (opt === 1 && v[2] === p) ||
			(opt === 0 && v[0] === p))
		{
			rc['group'] = v[0];
			if(v[1] === 'x')
				rc['passHashed'] = v[1];
			else
				rc['passHashed'] = '*';
			rc['gid'] = v[2];
			rc['users'] = v[3];
			rc['permissions'] = v[4];
			rl.close();
		}
	});
	rl.on('close', function() {
		cbfunc(rc);
	});
	rl.resume();
}
/* directory acl functions */
exports.getSubDirectories　= function (directory, cbfunc){ /* cbfunc(dir) */

	var S_IFMT  = parseInt("0170000",8); /* file type mask*/
	var S_IFREG = parseInt("0100000",8); /* file */
	var S_IFDIR = parseInt("0040000",8); /* directory */
	var dirs = [];
	fs.readdir(directory , function(err,files){
			if(err){
		    	debugLog("No such directory: " + err.message );
				cbfunc({});
		    	return;
			}else{
				for( var i in files){
					if((fs.statSync(path.join(directory,files[i]))['mode'] 
														& S_IFMT) === S_IFDIR) {
						dirs.push(files[i]);
					}
				}
				cbfunc(dirs);
				return;
			}	
	});
}

exports.readAcl　= function (directory, cbfunc){ /* cbfunc(directory,acl) */
	var acl = {};
	var reader = fs.createReadStream(path.join(directory,'.acl'));
	var rl = readline.createInterface({'input': reader, 'output': {}});
	rl.on('line',function(line){
		if(line && !line.match(/^#.*/)) {
			var v = line.split(/[\s]+/);
			if( v[0] === '*'){
				acl[v[1]] =  v[2];
			}else{
				acl['+' + v[0]] =  v[1];
				acl[v[1]] =  v[2];
			}
		}
	});
	reader.on('error',function(e){
		/* no such file or permission denied .. */
		cbfunc(path.basename(directory),acl);
		return acl;	
	});

	rl.on('close',function(){
		cbfunc(path.basename(directory),acl);
		return acl;
	});
	rl.resume();
}

exports.getAcl = function (directory, opt , cbfunc){
	var reader = fs.createReadStream(path.join(directory,'.acl'));
	var rl = readline.createInterface({'input': reader, 'output': {}});

	var ret = {};

	rl.on('line', function(line) {
		if(line && !line.match(/^#.*/)) {
			var rc = line.split(/[\s]+/)
			if(opt === 1){
				ret[rc[1]] = rc[2];
			}else if (opt === 0 && rc[0] !== '*'){
				ret[rc[0]] = [rc[1],rc[2]];
			}
		}
	});
	rl.on('close', function() {
		cbfunc(ret);
	});
	reader.on('error', function(e) {
		debugLog('.acl file NOT found.: ' +  e.message);
		cbfunc(ret);
	});

	rl.resume();
}
exports.getAclRecords = function (directory, cbfunc){
	this.getAcl(directory, 1 , cbfunc);
}
exports.getAclOwners = function (directory, cbfunc){
	this.getAcl(directory, 0 , cbfunc);
}

exports.getAclSync = function (directory, opt){

	var data = '';
	var ret = {};

	try{
		data = fs.readFileSync(path.join(directory,'.acl'), 
						{ encoding: 'utf8'} );

	}catch(e){
		debugLog('.acl file NOT found.: ' +  e.message);
		return ret;
	}

	var lines = data.split('\n');

	var i = 0;
	for(i in lines){
		if(lines[i] && !lines[i].match(/^#.*/)) {
			var rc = lines[i].split(/[\s]+/)
			if(opt === 1){
				ret[rc[1]] = rc[2];
			}else if (opt === 0 && rc[0] !== '*'){
				ret[rc[0]] = [rc[1],rc[2]];
			}
		}
	}
	return ret;
}
exports.getAclRecordsSync = function (directory){
	return this.getAclSync(directory, 1 );
}
exports.getAclOwnersSync = function (directory){
	return this.getAclSync(directory, 0 );
}

exports.updateAcl = function(directory, type, target, fp , cbfunc){

	/* check parameter */	
	if( (type !== 'owner')  &&
		(type !== 'group')  &&
		(type !== 'other')  &&
		(type !== 'delete')  &&
		(type !== '*') ){

		cbfunc(false);
		return;
		
	}
	if(!target){
		cbfunc(false);
		return;
	}

	/* end of check */
	var reader = fs.createReadStream(path.join(directory,'.acl'));
	var tmpDotAcl = path.join(directory,'.acl' + '.' + self.randString());
	var writer = fs.createWriteStream(tmpDotAcl);
	var rl = readline.createInterface({'input': reader, 'output': {}});
	var isUpdated = false;
	var isErr = false;
	rl.on('line',function(line){
		if(line && !line.match(/^#.*/)) {
			var v = line.split(/[\s]+/);
			/* same record will be updated */
			if(v[0] === '*' && type === '*' && v[1] === target){
				writer.write(type + ' ' + target + ' ' + fp + '\n');
				isUpdated = true;
			/* default permission records(owner or group, other) */
			}else if (v[0] !== '*' && v[0] === type){
				writer.write(type + ' ' + target + ' ' + fp + '\n');
				isUpdated = true;
			}else if(v[0] === '*' && type === 'delete' && v[1] === target){
				/* do nothing */
				debugLog('record deleted: ' + v[1] + ' ' + type);
			/* unmatch */
			}else{
				writer.write(line + '\n');
			}
		}else{
			writer.write(line + '\n');
		}
	});

	reader.on('error',function(e){
		/* no such file or permission denied .. */
		debugLog('Error: Cannot read acl file. ' + e.message);
		cbfunc(false);
		isErr = true;
		return;
	});

	rl.on('close',function(){
		/* if not updated, add record */
		if(type !== 'delete' && !isUpdated){
				writer.write(type + ' ' + target + ' ' + fp + '\n',
														encoding,function(){
					writer.close();
				});
		}else{
			writer.close();
		}
	});

	writer.on('close', function(){
		fs.unlinkSync(path.join(directory,'.acl'));
		fs.renameSync(tmpDotAcl, path.join(directory,'.acl'));
		cbfunc(true);

	});

	writer.on('error',function(e){
		/* write error */
		debugLog('Error: Cannot write acl file. ' + e.message);
		if(!isErr){
			cbfunc(false);
			isErr = ture;
		}
		return;
	});
	rl.resume();
}

exports.checkAcl = function (directory, user , cbfunc){
	var fp = '';
	this.getAclRecords(directory , function(acls){
		if(acls['*']) fp = acls['*'];
		if(acls[user]) fp = acls[user];
		if(fp === 'rw') {
			cbfunc(fp);
			return;
		}
		self.getUser(user, function(userInf){
			self.getGroupByGid(userInf['gid'],function(pGroup){
				if(acls['g:' + pGroup['group']])
					 fp = acls['g:' + pGroup['group']];
				if(fp === 'rw') {
					cbfunc(fp);
					return;
				}
				self.getGroups(0,0,function(grpInf){
					var i = 0;
					for( i in grpInf ){					
						gUsers = grpInf[i]['users'].split(',');
						var j = 0;
						for(j in gUsers){
							if(user === gUsers[j]) {
								if(acls['g:' + grpInf[i]['group']]){
									 fp = acls['g:' + grpInf[i]['group']];
								}
							}	
						}
					}
					cbfunc(fp);
				});	
			});	
		});
	});
}


exports.mkdirAclSync =function (directory, owner) {
	try{
		fs.mkdirSync(directory);
	}catch(e){ throw e; }
	var fileAcl = path.join(directory, '.acl');
	this.getUser(owner,function(uRc){
		self.getGroupByGid(uRc['gid'] , function(gRc){
			var gPerm = '';
			var addLine = '*	    g:admin	 rw\n'
			if(gRc['group'] === 'admin') { 
				gPerm = 'rw';
				addLine = '';
			}
			var data = '# Default acl file\n';
			data += 'owner  '   + owner       + '  rw\n'; 
			data += 'group  g:' + gRc['group'] + '  ' + gPerm + '\n';        
			data += 'other  *        \n';
			data += addLine;

			fs.writeFileSync(fileAcl, data, {encoding: 'utf8'});
		});
	});
}
exports.rmdirAclSync = function (directory){
	var pathAcl = path.join(directory,'.acl');
	var backup = fs.readFileSync(pathAcl);
	try {
		fs.unlinkSync(pathAcl);
		fs.rmdirSync(directory);
	}catch(e){
		fs.writeFileSync(pathAcl,backup);
		throw e;
	}
}
