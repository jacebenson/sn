---
title: "ConnectionTestAjax"
id: "connectiontestajax"
---

API Name: global.ConnectionTestAjax

```js
var ConnectionTestAjax = Class.create();

ConnectionTestAjax.prototype = Object.extendsObject(AbstractAjaxProcessor, {
		
	ajaxFunction_testConnectionJdbc: function() {	
		
		var grConnection = new GlideRecord("jdbc_connection");
		
		if(!grConnection.isValid()){
			gs.logWarning("jdbc_connection doesnt exist.");
			return;
		}
		if (!grConnection.canRead()) {
            gs.logWarning("Insufficient privileges to test JDBC connection.");
            return;
        }
		
		var credentialId = this.getParameter("sysparm_credential_id");
		var url = this.getParameter("sysparm_url");
		var dbDriver = this.getParameter("sysparm_db_driver");	
		
		var userName = "";
		var pwd = ""; 
		
		var credentialData = this._getCredentialData(credentialId);		
		if (!gs.nil(credentialData)) {		
			userName = credentialData.user_name;		
			pwd = credentialData.password;
		}
		
		return SNC.ConnectionTest.testJdbc(dbDriver, url ,userName, pwd );
	},
	
	_getCredentialData: function(credSysId){	
		var provider = new sn_cc.StandardCredentialsProvider(); 
		var credential = provider.getCredentialByID(credSysId); 
		if (gs.nil(credential))
			return null;
		
		var credentialData = {};
		credentialData["user_name"] = credential.getAttribute("user_name");
		credentialData["password"] = credential.getAttribute("password");		
				
		return credentialData;		
	},
	
	type: 'ConnectionTestAjax'
});
```