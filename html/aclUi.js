/* common functions */
function httpRequest() {
	if(window.XMLHttpRequest) {
		var req;
		req = new XMLHttpRequest();
		req.overrideMimeType('text/xml');
	return req;
	} 
	// IE
	try {
	    return new ActiveXObject('Msxml2.XMLHTTP');
	} catch (e) {
	    return new ActiveXObject('Microsoft.XMLHTTP');
	}
}

function _rpc(method, path, reqPairs, onOkey){
	var req = httpRequest();
	var enForm = null;
	req.open(method , "https://" + window.location.host + path);
	req.onreadystatechange = onRes;
	if(method.match(/post/i)) {
		req.setRequestHeader( 'Content-Type', 
									'application/x-www-form-urlencoded' );
		enForm = encodeUrlForm(reqPairs);
	}
	req.send(enForm);

	function onRes() {
		if(req.readyState == 4) {
		    if(req.status == 200 || req.status == 201) {
		        var ret = JSON.parse(req.responseText);
				onOkey(ret);
			} else { }
		}
	}
}

function encodeUrlForm(pairs) {
    var after = [];

    for( var name in pairs ) {
        var value = pairs[name];
        var p = encodeURIComponent(name) + '=' + encodeURIComponent(value);
        after.push(p);
    }

    return after.join('&').replace(/%20/g, '+');
}
function decodeUrlForm(uStr) {
    var pairs = {};
	var arr = uStr.replace(/\+/g, '%20').split('&');
	for(var i in arr){
		var q = arr[i].split('=');	
		pairs[decodeURIComponent(q[0])] = decodeURIComponent(q[1]);
	}
	return pairs;
}
/* end common functions */

/* operations for user account*/
function clearUsers() {
	var oTbl = document.getElementById("uTbl");
	var childs = oTbl.childNodes; 

	for(var i = childs.length-1; i >= 0; i--){
		if(childs[i].getAttribute("class") === 'record'){ 
			console.log(childs[i].getAttribute("class"));
			oTbl.removeChild(childs[i]);
		}
	}
}

function loadUsers(isInputForm){
	_rpc('GET', '/users', {}, onResUsers);

	function onResUsers(rcsUsers) {
		var oTbl = document.getElementById("uTbl");
		for (i in rcsUsers){
			var oTr = document.createElement('tr');
			oTr.setAttribute("class",'record');
			oTr.setAttribute("id",'uTr_' + rcsUsers[i]['user']);
			oTbl.appendChild(oTr);
			var oTd0 = document.createElement('td');
			var oTd1 = document.createElement('td');
			var oTd2 = document.createElement('td');
			var oTd3 = document.createElement('td');
			var oTd4 = document.createElement('td');
			var oTd5 = document.createElement('td');
			var oTd6 = document.createElement('td');
			var oTd7 = document.createElement('td');
			var oButtonEdit=  document.createElement('button');
			oButtonEdit.setAttribute('type', 'button');
			oButtonEdit.innerText = 'edit';
			oButtonEdit.setAttribute("onclick", 
							'openEditUser(\'' + rcsUsers[i]['user'] + '\');');
			var oTd8 = document.createElement('td');
			var oButtonDelete=  document.createElement('button');
			oButtonDelete.setAttribute('type', 'button');
			oButtonDelete.innerText = 'del';
			oButtonDelete.setAttribute('onclick', 
								'removeUser(\'' + rcsUsers[i]['user'] + '\');');
			/* set inner text */
			oTd0.innerText = rcsUsers[i]['user']; 
			if(rcsUsers[i]['passHashed'] === '*'){
				oTd1.innerText = "enable"; 
			}else{
				oTd1.innerText = "locked"; 
			}
			oTd2.innerText = rcsUsers[i]['uid'];
			oTd2.setAttribute("align", "right");
			oTd3.innerText = rcsUsers[i]['gid']; 
			oTd3.setAttribute("align", "right");
			oTd4.innerText = rcsUsers[i]['realName']; 
			oTd5.innerText = rcsUsers[i]['home']; 
			oTd6.innerText = rcsUsers[i]['permissions']; 
			oTr.appendChild(oTd0);
			oTr.appendChild(oTd1);
			oTr.appendChild(oTd2);
			oTr.appendChild(oTd3);
			oTr.appendChild(oTd4);
			oTr.appendChild(oTd5);
			oTr.appendChild(oTd6);
			oTr.appendChild(oTd7);
			oTd7.appendChild(oButtonEdit);
			oTr.appendChild(oTd8);
			oTd8.appendChild(oButtonDelete);
		}
		if(isInputForm){
			openInputUser();
		}
	}
}
function reloadUsers(isInputForm){
	closeInputUser();
	clearUsers();
	loadUsers(isInputForm);
}

function openEditUser(user){
	
	var update = { 'method': 'getUser', 'user': user, 'end': ''};

	_rpc('POST', '', update , onResGetUser);

	function onResGetUser(rc){

		var oTr = document.getElementById('uTr_' + user);
		var childs = oTr.childNodes; 
		for(var i = childs.length-1; i >= 0; i--){
			oTr.removeChild(childs[i]);
		}
		var oTd0 = document.createElement('td');
		var oTd1 = document.createElement('td');
		var oIn1 = document.createElement('input');
		oIn1.setAttribute('type', 'password');
		oIn1.setAttribute('id', 'edPassword');
		oIn1.setAttribute('size', 9);
		var oTd2 = document.createElement('td');
		var oIn2 = document.createElement('input');
		oIn2.setAttribute('type', 'text');
		oIn2.setAttribute('id', 'edUid');
		oIn2.setAttribute('size', 6);
		oIn2.setAttribute('value', rc['uid']);
		var oTd3 = document.createElement('td');
		var oIn3 = document.createElement('input');
		oIn3.setAttribute('type', 'text');
		oIn3.setAttribute('id', 'edGid');
		oIn3.setAttribute('size', 6);
		oIn3.setAttribute('value', rc['gid']);
		var oTd4 = document.createElement('td');
		var oIn4 = document.createElement('input');
		oIn4.setAttribute('type', 'text');
		oIn4.setAttribute('id', 'edRealName');
		oIn4.setAttribute('size', 20);
		oIn4.setAttribute('value', rc['realName']);
		var oTd5 = document.createElement('td');
		var oIn5 = document.createElement('input');
		oIn5.setAttribute('type', 'text');
		oIn5.setAttribute('id', 'edHome');
		oIn5.setAttribute('size', 20);
		oIn5.setAttribute('value', rc['home']);
		var oTd6 = document.createElement('td');
		var oIn6 = document.createElement('input');
		oIn6.setAttribute('type', 'text');
		oIn6.setAttribute('id', 'edPermissions');
		oIn6.setAttribute('size', 20);
		oIn6.setAttribute('value', rc['permissions']);
		var oTd7 = document.createElement('td');
		var oButtonEdit=  document.createElement('button');
		oButtonEdit.setAttribute('type', 'button');
		oButtonEdit.innerText = 'update';
		oButtonEdit.setAttribute("onclick", 
								'updateUser(\'' + user + '\');');
		var oTd8 = document.createElement('td');
		var oButtonDelete=  document.createElement('button');
		oButtonDelete.setAttribute('type', 'button');
		oButtonDelete.innerText = 'cancel';
		oButtonDelete.setAttribute('onclick','reloadUsers();');
		/* set inner text */
		oTd0.innerText = user; 

		oTr.appendChild(oTd0);
		oTr.appendChild(oTd1);
		oTd1.appendChild(oIn1);
		oTr.appendChild(oTd2);
		oTd2.appendChild(oIn2);
		oTr.appendChild(oTd3);
		oTd3.appendChild(oIn3);
		oTr.appendChild(oTd4);
		oTd4.appendChild(oIn4);
		oTr.appendChild(oTd5);
		oTd5.appendChild(oIn5);
		oTr.appendChild(oTd6);
		oTd6.appendChild(oIn6);
		oTr.appendChild(oTd7);
		oTd7.appendChild(oButtonEdit);
		oTr.appendChild(oTd8);
		oTd8.appendChild(oButtonDelete);
		
	}
}


function closeInputUser(){
	var oTbl = document.getElementById("uTbl");
	var childs = oTbl.childNodes; 

	for(var i = childs.length-1; i >= 0; i--){
		if(childs[i].getAttribute("class") === 'input'){ 
			oTbl.removeChild(childs[i]);
		}
	}
	var oButton = document.getElementById("ifUser");
	oButton.innerText = 'New user';
	oButton.setAttribute("onclick", 'openInputUser();');

}
function openInputUser(){
	var oTbl = document.getElementById("uTbl");
	var oTr = document.createElement('tr');
	oTr.setAttribute("class",'input');
	oTbl.appendChild(oTr);
	var oTd0 = document.createElement('td');
	var oIn0 = document.createElement('input');
	oIn0.setAttribute('type', 'text');
	oIn0.setAttribute('id', 'inUser');
	oIn0.setAttribute('size', 9);
	var oTd1 = document.createElement('td');
	var oIn1 = document.createElement('input');
	oIn1.setAttribute('type', 'password');
	oIn1.setAttribute('id', 'inPassword');
	oIn1.setAttribute('size', 9);
	var oTd2 = document.createElement('td');
	var oIn2 = document.createElement('input');
	oIn2.setAttribute('type', 'text');
	oIn2.setAttribute('id', 'inUid');
	oIn2.setAttribute('size', 6);
	var oTd3 = document.createElement('td');
	var oIn3 = document.createElement('input');
	oIn3.setAttribute('type', 'text');
	oIn3.setAttribute('id', 'inGid');
	oIn3.setAttribute('size', 6);
	var oTd4 = document.createElement('td');
	var oIn4 = document.createElement('input');
	oIn4.setAttribute('type', 'text');
	oIn4.setAttribute('id', 'inRealName');
	oIn4.setAttribute('size', 20);
	var oTd5 = document.createElement('td');
	var oIn5 = document.createElement('input');
	oIn5.setAttribute('type', 'text');
	oIn5.setAttribute('id', 'inHome');
	oIn5.setAttribute('disabled','');
	oIn5.setAttribute('title','Home directory will be created automaticaly.\n\
For manual configuration, you can edit home directory,\n\
then create directory and install .acl file.');
	oIn5.setAttribute('size', 20);
	var oTd6 = document.createElement('td');
	var oIn6 = document.createElement('input');
	oIn6.setAttribute('type', 'text');
	oIn6.setAttribute('id', 'inPermissions');
	oIn6.setAttribute('size', 20);
	var oTd7 = document.createElement('td');
	var oButton = document.createElement('button');
	oButton.setAttribute("type", 'button');
	oButton.innerText = 'add';
	oButton.setAttribute("onclick", 'addUser();');

	oTr.appendChild(oTd0);
	oTd0.appendChild(oIn0);
	oTr.appendChild(oTd1);
	oTd1.appendChild(oIn1);
	oTr.appendChild(oTd2);
	oTd2.appendChild(oIn2);
	oTr.appendChild(oTd3);
	oTd3.appendChild(oIn3);
	oTr.appendChild(oTd4);
	oTd4.appendChild(oIn4);
	oTr.appendChild(oTd5);
	oTd5.appendChild(oIn5);
	oTr.appendChild(oTd6);
	oTd6.appendChild(oIn6);
	oTr.appendChild(oTd7);
	oTd7.appendChild(oButton);

	var oButton2 = document.getElementById("ifUser");
	oButton2.innerText = 'Clear input form';
	oButton2.setAttribute("onclick", 'closeInputUser();');

}
/* rpc calls for user account operatiton  */
function addUser() {
	var update = {
	'method': 'addUser',
	'user' 		 : document.getElementById("inUser").value,
	'password'	 : document.getElementById("inPassword").value,
	'uid'  		 : document.getElementById("inUid").value,
	'gid'  		 : document.getElementById("inGid").value,
	'realName'   : document.getElementById("inRealName").value,
	'home'  	 : document.getElementById("inHome").value,
	'permissions': document.getElementById("inPermissions").value,
	'end'        : ''
};

	_rpc('POST', '', update , onResAddUser);

	function onResAddUser(ret) {
		reloadUsers(true);
	}
}
function updateUser(user){
	if(!confirm('Update account [' + user + ']?')) return;

	var update = {
	'method': 'editUser',
	'user' 		 : user,
	'password'	 : document.getElementById("edPassword").value,
	'uid'  		 : document.getElementById("edUid").value,
	'gid'  		 : document.getElementById("edGid").value,
	'realName'   : document.getElementById("edRealName").value,
	'home'  	 : document.getElementById("edHome").value,
	'permissions': document.getElementById("edPermissions").value,
	'end'        : ''
};

	_rpc('POST', '', update , onResEditUser);

	function onResEditUser(ret) {
		if(ret)
			alert('USER['+user+'] has been updated.');
		else
			alert('FAILED -- user['+user+'] NOT updated.');
		reloadUsers(false);
	}
}
function removeUser(user){
	if(!confirm('Remove account [' + user + ']?')) return;

	var update = {
	'method': 'removeUser',
	'user' 		 : user,
	'end'        : ''
};

	_rpc('POST', '', update , onResRemoveUser);

	function onResRemoveUser(ret) {
		if(ret)
			alert('USER['+user+'] has been removed.');
		else
			alert('FAILED -- user['+user+'] NOT removed.');
		reloadUsers(false);
	}
}

/* operations for group */
function clearGroups() {
	var oTbl = document.getElementById("gTbl");
	var childs = oTbl.childNodes; 

	for(var i = childs.length-1; i >= 0; i--){
		if(childs[i].getAttribute("class") === 'record'){ 
			console.log(childs[i].getAttribute("class"));
			oTbl.removeChild(childs[i]);
		}
	}
}
function loadGroups(isInputForm){
	_rpc('GET', '/groups', {}, onResGroups);

	function onResGroups(rcsGroups) {

		oTbl = document.getElementById("gTbl");
		for (i in rcsGroups){
			var oTr = document.createElement('tr');
			oTr.setAttribute("class",'record');
			oTr.setAttribute("id",'gTr_' + rcsGroups[i]['group']);
			oTbl.appendChild(oTr);
			var oTd0 = document.createElement('td');
			var oTd1 = document.createElement('td');
			var oTd2 = document.createElement('td');
			var oTd3 = document.createElement('td');
			var oTd4 = document.createElement('td');
			var oTd5 = document.createElement('td');
			var oButtonEdit=  document.createElement('button');
			oButtonEdit.setAttribute('type', 'button');
			oButtonEdit.innerText = 'edit';
			oButtonEdit.setAttribute("onclick", 
						'openEditGroup(\'' + rcsGroups[i]['group'] + '\');');
			var oTd6 = document.createElement('td');
			var oButtonDelete=  document.createElement('button');
			oButtonDelete.innerText = 'del';
			oButtonDelete.setAttribute('type', 'button');
			oButtonDelete.setAttribute('onclick', 
							'removeGroup(\'' + rcsGroups[i]['group'] + '\');');

			oTd0.innerText = rcsGroups[i]['group']; 
			if(rcsGroups[i]['gpassHashed'] === 'x'){
				oTd1.innerText = "disable"; 
			}else{
				oTd1.innerText = "enable"; 
			}
			oTd2.innerText = rcsGroups[i]['gid']; 
			oTd2.setAttribute("align", "right");
			oTd3.innerText = rcsGroups[i]['users']; 
			oTd4.innerText = rcsGroups[i]['permissions']; 
			oTr.appendChild(oTd0);
			oTr.appendChild(oTd1);
			oTr.appendChild(oTd2);
			oTr.appendChild(oTd3);
			oTr.appendChild(oTd4);
			oTr.appendChild(oTd5);
			oTd5.appendChild(oButtonEdit);
			oTr.appendChild(oTd6);
			oTd6.appendChild(oButtonDelete);
		}
		if(isInputForm){
			openInputGroup();
		}
	}
}
function reloadGroups(isInputForm){
	closeInputGroup();
	clearGroups();
	loadGroups(isInputForm);
}

function closeInputGroup(){
	var oTbl = document.getElementById("gTbl");
	var childs = oTbl.childNodes; 

	for(var i = childs.length-1; i >= 0; i--){
		if(childs[i].getAttribute("class") === 'input'){ 
			oTbl.removeChild(childs[i]);
		}
	}
	var oButton = document.getElementById("ifGroup");
	oButton.innerText = 'New group';
	oButton.setAttribute("onclick", 'openInputGroup();');
}
function openInputGroup(){
	var oTbl = document.getElementById("gTbl");
	var oTr = document.createElement('tr');
	oTr.setAttribute("class",'input');
	oTbl.appendChild(oTr);
	var oTd0 = document.createElement('td');
	var oIn0 = document.createElement('input');
	oIn0.setAttribute('type', 'text');
	oIn0.setAttribute('id', 'inGroup');
	oIn0.setAttribute('size', 9);
	var oTd1 = document.createElement('td');
	var oIn1 = document.createElement('input');
	oIn1.setAttribute('type', 'password');
	oIn1.setAttribute('id', 'inGPasswd');
	oIn1.setAttribute('size', 9);
	var oTd2 = document.createElement('td');
	var oIn2 = document.createElement('input');
	oIn2.setAttribute('type', 'text');
	oIn2.setAttribute('id', 'inGrpId');
	oIn2.setAttribute('size', 6);
	var oTd3 = document.createElement('td');
	var oIn3 = document.createElement('input');
	oIn3.setAttribute('type', 'text');
	oIn3.setAttribute('id', 'inGUsers');
	oIn3.setAttribute('size', 20);
	var oTd4 = document.createElement('td');
	var oIn4 = document.createElement('input');
	oIn4.setAttribute('type', 'text');
	oIn4.setAttribute('id', 'inGPermissions');
	oIn4.setAttribute('size', 20);
	var oTd5 = document.createElement('td');
	var oButton = document.createElement('button');
	oButton.setAttribute("type", 'button');
	oButton.innerText = 'add';
	oButton.setAttribute("onclick", 'addGroup();');

	oTr.appendChild(oTd0);
	oTd0.appendChild(oIn0);
	oTr.appendChild(oTd1);
	oTd1.appendChild(oIn1);
	oTr.appendChild(oTd2);
	oTd2.appendChild(oIn2);
	oTr.appendChild(oTd3);
	oTd3.appendChild(oIn3);
	oTr.appendChild(oTd4);
	oTd4.appendChild(oIn4);
	oTr.appendChild(oTd5);
	oTd5.appendChild(oButton);

	var oButton2 = document.getElementById("ifGroup");
	oButton2.innerText = 'Clear input form';
	oButton2.setAttribute("onclick", 'closeInputGroup();');

}
function openEditGroup(group){

	var params = { 'method': 'getGroup', 'group': group, 'end': ''};

	_rpc('POST', '', params , onResGetGroup);

	function onResGetGroup(rc){
		var oTr = document.getElementById('gTr_' + group);
		var childs = oTr.childNodes; 
		for(var i = childs.length-1; i >= 0; i--){
			oTr.removeChild(childs[i]);
		}
		var oTd0 = document.createElement('td');
		var oTd1 = document.createElement('td');
		var oIn1 = document.createElement('input');
		oIn1.setAttribute('type', 'password');
		oIn1.setAttribute('id', 'edGPasswd');
		oIn1.setAttribute('size', 9);
		var oTd2 = document.createElement('td');
		var oIn2 = document.createElement('input');
		oIn2.setAttribute('type', 'text');
		oIn2.setAttribute('id', 'edGrpId');
		oIn2.setAttribute('size', 6);
		oIn2.setAttribute('value', rc['gid']);
		var oTd3 = document.createElement('td');
		var oIn3 = document.createElement('input');
		oIn3.setAttribute('type', 'text');
		oIn3.setAttribute('id', 'edGUsers');
		oIn3.setAttribute('size', 20);
		oIn3.setAttribute('value', rc['users']);
		var oTd4 = document.createElement('td');
		var oIn4 = document.createElement('input');
		oIn4.setAttribute('type', 'text');
		oIn4.setAttribute('id', 'edGPermissions');
		oIn4.setAttribute('size', 20);
		oIn4.setAttribute('value', rc['permissions']);

		var oTd5 = document.createElement('td');
		var oButtonEdit=  document.createElement('button');
		oButtonEdit.setAttribute('type', 'button');
		oButtonEdit.innerText = 'update';
		oButtonEdit.setAttribute("onclick", 
								'updateGroup(\'' + group + '\');');
		var oTd6 = document.createElement('td');
		var oButtonDelete=  document.createElement('button');
		oButtonDelete.setAttribute('type', 'button');
		oButtonDelete.innerText = 'cancel';
		oButtonDelete.setAttribute('onclick','reloadGroups();');
		/* set inner text */
		oTd0.innerText = group; 

		oTr.appendChild(oTd0);
		oTr.appendChild(oTd1);
		oTd1.appendChild(oIn1);
		oTr.appendChild(oTd2);
		oTd2.appendChild(oIn2);
		oTr.appendChild(oTd3);
		oTd3.appendChild(oIn3);
		oTr.appendChild(oTd4);
		oTd4.appendChild(oIn4);
		oTr.appendChild(oTd5);
		oTd5.appendChild(oButtonEdit);
		oTr.appendChild(oTd6);
		oTd6.appendChild(oButtonDelete);
	}
}
/* rpc calls for GROUP account operatiton  */
function addGroup() {
	var update = {
	'method': 'addGroup',
	'group' 	 : document.getElementById("inGroup").value,
	'password'	 : document.getElementById("inGPasswd").value,
	'gid'  		 : document.getElementById('inGrpId').value,
	'users'  	 : document.getElementById("inGUsers").value,
	'permissions': document.getElementById("inGPermissions").value,
	'end'        : ''
};

	_rpc('POST', '', update , onResAddGroup);

	function onResAddGroup(ret) {
		reloadGroups(true);
	}
}
function updateGroup(group){
	if(!confirm('Update group [' + group + ']?')) return;

	var update = {
	'method': 'editGroup',
	'group'		 : group,
	'password'	 : document.getElementById("edGPasswd").value,
	'gid'  		 : document.getElementById("edGrpId").value,
	'users'  	 : document.getElementById("edGUsers").value,
	'permissions': document.getElementById("edGPermissions").value,
	'end'        : ''
};

	_rpc('POST', '', update , onResEditGroup);

	function onResEditGroup(ret) {
		if(ret)
			alert('GROUP['+group+'] has been updated.');
		else
			alert('FAILED -- group['+group+'] NOT updated.');

		reloadGroups(false);
	}
}
function removeGroup(group){
	if(!confirm('Remove group [' + group + ']?')) return;

	var update = {
	'method': 'removeGroup',
	'group' 		 : group,
	'end'        : ''
};

	_rpc('POST', '', update , onResRemoveGroup);

	function onResRemoveGroup(ret) {
		if(ret)
			alert('GROUP['+group+'] has been removed.');
		else
			alert('FAILED -- group['+group+'] NOT removed.');
		reloadGroups(false);
	}
}
/* oparations for dirirectory permission */
function formatAcl(acl){
	var owner, group, other; 

	var sLine = '['
	var i;
	for (var key in acl){
		if(!key.match(/^\+/)){
			var x;
			if(acl[key] === 'rw'){      x = 'rwx';
			}else if(acl[key] === 'r'){ x = 'r-x';
			}else {                     x = '---'; }
			if(acl['+owner'] === key){	     owner = x;
			}else if(acl['+group'] === key){ group = x;
			}else if(acl['+other'] === key){ other = x;
			}else{
				sLine += key + '(' + acl[key] + '),';
			}
		}
	}
	return owner + group + other + ' ' +
							acl['+owner'] + ':' +
							acl['+group'].substring(2) + ' ' +
							sLine + ']';
}
function readAcl(dir,cbfunc){
	_rpc('POST', '', 
			{'method': 'readAcl', 'directory':dir, 'end':''}, onGetAcl);

	function onGetAcl(acl) {
		cbfunc(acl);
	}
}
function getSubDirectories(dir, cbfunc){
	_rpc('POST', '',
			{'method': 'getSubDirectories', 'directory':dir, 'end':''}, 
															onResSubDir);

	function onResSubDir(subdirs) {
		cbfunc(subdirs);
	}
}

function expandTree(id){
	var root = document.getElementById(id);
	var prefix = '';
	var dir;
	var dirs;
	if(id === 'root') {
		prefix = '|';
		dir = '.';
	}else{
		prefix = id + '|';
		dir = id.replace(/\|/g,'/');
	}

	var i;

	if(root.getAttribute("class") === 'close'){
		getSubDirectories(dir,function(dirs){ 
			for( i in dirs){
				var oUl = document.createElement('ul');
				var oLi = document.createElement('li');
				var oLiAcl = document.createElement('li');
				var oSpan = document.createElement('span');

				oUl.setAttribute("id",prefix +  dirs[i]);
				oUl.setAttribute("class",'close');
				oLi.setAttribute("onclick", 
								"expandTree('"+ prefix + dirs[i] + "');");

				oLiAcl.setAttribute("onclick", 
									"openAclWindow('"+ 
									(prefix + dirs[i]).replace(/\|/g,'/') + 
									"');");
				oLiAcl.setAttribute("class", 'acl');
				//oLiAcl.innerText = '.acl';
				oSpan.innerText = dirs[i];
				root.appendChild(oUl);
				oUl.appendChild(oLi);
				oLi.appendChild(oSpan);
				oUl.appendChild(oLiAcl);
				
			}
			root.setAttribute("class",'open');

		});
	}else if(root.getAttribute("class") === 'open'){
		root.setAttribute("class",'close');
		var childs = root.childNodes; 
		for(var i = childs.length-1; i >= 0; i--){
			if(childs[i].id){ root.removeChild(childs[i]); }
		}
	}

}

function noop(){console.log('NOOP!');};

function openAclWindow(directory){
	var x = 480;
	var y = 400;
	var dx = (window.screenX);
	var dy = (window.screenY);

	var q = encodeUrlForm({'directory': directory});
	var aclWnd=window.open('/wndSubAcl.html?' + q,'aclWnd','menubar=no,toolbar=no,\
							location=no,scrollbars=yes,resizable=no,\
							left='+dx+',top='+dy+',width='+x+',height='+y+'');
}

function loadAcl(directory){
	var d = document;
	readAcl(directory,function(acl){
		var i = 3;
		var tblSrc = {};
		for (var key in acl){
			if(!key.match(/^\+/)){
				var n, type, read, write;
				if(acl[key] === 'rw'){  
					read ='o';
					write='o';
				}else if(acl[key] === 'r'){ 
					read ='o';
					write='x';
				}else {  
					read ='x';
					write='x';
				}
				if(acl['+owner'] === key){ 
					n = 0;
					type = 'owner';				
				}else if(acl['+group'] === key){ 
					n = 1;
					type = 'group';
				}else if(acl['+other'] === key){ 
					n = 2;
					type = 'everyone';
				}else{
					n = i++;
					type = 'additional';
				}
				tblSrc[n] = [type, key, read, write];
			}
		}
		i= 0;
		var oTbl = d.getElementById("aTbl");
		for(i in tblSrc){
			var oTr = d.createElement('tr');
			oTr.setAttribute("class",'record');
			oTr.setAttribute("id",'aTr_' + i);
			oTbl.appendChild(oTr);
			var oTd0 = d.createElement('td');
			var oTd1 = d.createElement('td');
			var oTd2 = d.createElement('td');
			var oTd3 = d.createElement('td');
			var oTd4 = d.createElement('td');
			var oButtonEdit = undefined;
			oButtonEdit = document.createElement('button');
			oButtonEdit.setAttribute('type', 'button');
			if(i < 3){
				oButtonEdit.innerText = 'edit';
				oButtonEdit.setAttribute("onclick", 
							'openEditAcl(\'' + directory + '\',\'' + i + '\');');
			}else{
				oButtonEdit.innerText = 'del';
				oButtonEdit.setAttribute("onclick", 
							'deleteAcl(\'' + directory + '\',\'' 
										  + i + '\',\'' + tblSrc[i][1] + '\');');
			}

			oTd2.setAttribute("align",'center');
			oTd3.setAttribute("align",'center');
			oTd0.innerText = tblSrc[i][0]; 
			oTd1.innerText = tblSrc[i][1]; 
			oTd2.innerText = tblSrc[i][2]; 
			oTd3.innerText = tblSrc[i][3]; 
			oTr.appendChild(oTd0);
			oTr.appendChild(oTd1);
			oTr.appendChild(oTd2);
			oTr.appendChild(oTd3);
			oTr.appendChild(oTd4);
			oTd4.appendChild(oButtonEdit);
		}
		var oTitle = d.getElementById("aTitle");
		var displayDir = directory;
		if(directory === '.') displayDir = '/';
		oTitle.innerText = 'Access control list of [ ' + displayDir + ' ]';
		var oH4 = d.getElementById("aH4");
		oH4.innerText = oTitle.innerText;

	});
}

function openEditAcl(directory, col){

	var params = { 'method': 'getAclOwners', 'directory': directory, 'end': ''};

	_rpc('POST', '', params , onResGetAclOwners);

	function onResGetAclOwners(rc){
		var type = '';
		if(col == 0) type = 'owner';
		if(col == 1) type = 'group';
		if(col == 2) type = 'other';

		var oTr = document.getElementById('aTr_' + col);
		oTr.setAttribute('class', 'record');
		var childs = oTr.childNodes; 
		for(var i = childs.length-1; i >= 0; i--){
			oTr.removeChild(childs[i]);
		}
		var oTd0 = document.createElement('td');
		var oTd1 = document.createElement('td');
		var oIn1 = document.createElement('input');
		oIn1.setAttribute('type', 'text');
		oIn1.setAttribute('id', 'edTarget_'  + col );
		oIn1.setAttribute('size', 9);
		var oTd2 = document.createElement('td');
		var oSel2 = document.createElement('select');
		var oOpt21 = document.createElement('option');
		var oOpt22 = document.createElement('option');
		oSel2.setAttribute('id', 'edReadPerm_'  + col );
		oOpt21.innerText = 'o';
		oOpt22.innerText = 'x';

		var oTd3 = document.createElement('td');
		var oSel3 = document.createElement('select');
		var oOpt31 = document.createElement('option');
		var oOpt32 = document.createElement('option');
		oSel3.setAttribute('id', 'edWritePerm_'  + col );
		oOpt31.innerText = 'o';
		oOpt32.innerText = 'x';


		var oTd4 = document.createElement('td');
		var oButtonEdit=  document.createElement('button');
		oButtonEdit.setAttribute('type', 'button');
		oButtonEdit.innerText = 'update';
		oButtonEdit.setAttribute("onclick", 
								'updateAcl(\'' + directory + '\',' +
											'\'' + col + '\'' +
											');');
		var oTd5 = document.createElement('td');
		var oButtonCancel=  document.createElement('button');
		oButtonCancel.setAttribute('type', 'button');
		oButtonCancel.innerText = 'cancel';
		oButtonCancel.setAttribute('onclick','reloadAcl(\''+ directory+'\');');




		oTd0.innerText = type;
		oIn1.setAttribute('value', rc[type][0]);

		oTr.appendChild(oTd0);
		oTr.appendChild(oTd1);
		oTd1.appendChild(oIn1);
		oTr.appendChild(oTd2);
		oTd2.appendChild(oSel2);
		oSel2.appendChild(oOpt21);
		oSel2.appendChild(oOpt22);
		if(rc[type][1].match(/r/))
			oOpt21.setAttribute('selected', '');
		else
			oOpt22.setAttribute('selected', '');
		oTr.appendChild(oTd3);
		oTd3.appendChild(oSel3);
		oSel3.appendChild(oOpt31);
		oSel3.appendChild(oOpt32);
		if(rc[type][1].match(/w/))
			oOpt31.setAttribute('selected', '');
		else
			oOpt32.setAttribute('selected', '');
		oTr.appendChild(oTd3);
		oTr.appendChild(oTd4);
		oTr.appendChild(oTd5);
		oTd4.appendChild(oButtonEdit);
		oTd5.appendChild(oButtonCancel);

		if(type === 'other') oIn1.setAttribute('readonly', '');
	}
}
function deleteAcl(directory, col, target){
	if(!confirm('Delete acl record ?')) return;

	var update = {
		'method': 'updateAcl',
		'directory'	 : directory,
		'type'	 : 'delete',
		'target' : target,
		'fp'  	 : '',
		'end'    : ''
	};

	_rpc('POST', '', update , onResDeleteAcl);

	function onResDeleteAcl(ret) {
		if(ret)
			alert('Acl record['+directory+'] has been deleted.');
		else
			alert('FAILED -- Acl record['+directory+'] NOT deleted.');

		reloadAcl(directory);
	}
}
function updateAcl(directory, col){
	var type = '';
	var id_prefix = 'ed';
	var id_endfix = '_' + col;
	if(col == 0) type = 'owner';
	if(col == 1) type = 'group';
	if(col == 2) type = 'other';
	if(col === undefined){
		type = '*';
		id_endfix = '';
		id_prefix = 'in';
	}

	var oIn = document.getElementById(id_prefix + 'Target'  + id_endfix);
	var target = oIn.value;
	var oSel2 = document.getElementById(id_prefix + 'ReadPerm'  + id_endfix);
	var oSel3 = document.getElementById(id_prefix + 'WritePerm'  + id_endfix);
	var fp = '';
	if( oSel2.options[oSel2.selectedIndex].text === 'o') fp += 'r';
	if( oSel3.options[oSel3.selectedIndex].text === 'o') fp += 'w';

	if(!confirm('Update acl record ?')) return;

	var update = {
		'method': 'updateAcl',
		'directory'	 : directory,
		'type'	 : type,
		'target' : target,
		'fp'  	 : fp,
		'end'    : ''
	};

	_rpc('POST', '', update , onResEditAcl);

	function onResEditAcl(ret) {
		if(ret)
			alert('Acl record['+directory+'] has been updated.');
		else
			alert('FAILED -- Acl record['+directory+'] NOT updated.');

		reloadAcl(directory);
	}
}
function openInputAcl(directory){
	var oTbl = document.getElementById("aTbl");
	var oTr = document.createElement('tr');
	oTr.setAttribute("class",'input');
	oTbl.appendChild(oTr);
	var oTd0 = document.createElement('td');
	oTd0.innerText = 'additional';
	var oTd1 = document.createElement('td');
	var oIn1 = document.createElement('input');
	oIn1.setAttribute('type', 'text');
	oIn1.setAttribute('id', 'inTarget');
	oIn1.setAttribute('size', 9);
	var oTd2 = document.createElement('td');
	var oSel2 = document.createElement('select');
	var oOpt21 = document.createElement('option');
	var oOpt22 = document.createElement('option');
	oSel2.setAttribute('id', 'inReadPerm' );
	oOpt21.innerText = 'o';
	oOpt22.innerText = 'x';

	var oTd3 = document.createElement('td');
	var oSel3 = document.createElement('select');
	var oOpt31 = document.createElement('option');
	var oOpt32 = document.createElement('option');
	oSel3.setAttribute('id', 'inWritePerm');
	oOpt31.innerText = 'o';
	oOpt32.innerText = 'x';
	var oTd4 = document.createElement('td');
	var oButton = document.createElement('button');
	oButton.setAttribute("type", 'button');
	oButton.innerText = 'add/update';
	oButton.setAttribute("onclick", 'updateAcl(\'' + directory + '\');');

	oTr.appendChild(oTd0);
	oTr.appendChild(oTd1);
	oTd1.appendChild(oIn1);

	oTr.appendChild(oTd2);
	oTd2.appendChild(oSel2);
	oSel2.appendChild(oOpt21);
	oSel2.appendChild(oOpt22);

	oTr.appendChild(oTd3);
	oTd3.appendChild(oSel3);
	oSel3.appendChild(oOpt31);
	oSel3.appendChild(oOpt32);

	oTr.appendChild(oTd4);
	oTd4.appendChild(oButton);


	var oButton2 = document.getElementById("ifAcl");
	oButton2.innerText = 'Clear input form';
	oButton2.setAttribute("onclick", 'closeInputAcl();');

}

function closeInputAcl(){
	var oTbl = document.getElementById("aTbl");
	var childs = oTbl.childNodes; 

	for(var i = childs.length-1; i >= 0; i--){
		if(childs[i].getAttribute("class") === 'input'){ 
			oTbl.removeChild(childs[i]);
		}
	}
	var oButton = document.getElementById("ifAcl");
	oButton.innerText = 'New acl';
	oButton.setAttribute("onclick", 'openInputLine();');
}

function clearAcl(){

	var oTbl = document.getElementById("aTbl");
	var childs = oTbl.childNodes; 

	for(var i = childs.length-1; i >= 0; i--){
		if(childs[i].getAttribute("class") === 'record'){ 
			console.log(childs[i].getAttribute("class"));
			oTbl.removeChild(childs[i]);
		}
	}
}
function reloadAcl(directory){
	closeInputAcl();
	clearAcl();
	loadAcl(directory);
}
