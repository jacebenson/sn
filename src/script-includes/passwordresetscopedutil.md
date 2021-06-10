---
title: "PasswordResetScopedUtil"
id: "passwordresetscopedutil"
---

API Name: global.PasswordResetScopedUtil

```js
var PasswordResetScopedUtil = Class.create();
PasswordResetScopedUtil.prototype = {
    initialize: function() {
    },
	
	setChangePasswordFlowInTransaction: function(){
		var txn = GlideTransaction.get();
		txn.setAttribute("isChangePasswordFlow","true");
	},
	authenticateUser: function(user_name, password) {
		var pwdUserManager = new SNC.PwdUserManager();
		var authed = pwdUserManager.authenticateUser(user_name,password);
		if(!authed) {
			return false;
		}
		return true;
	},
	updatePassword: function(user_name, password, passwordNeedsReset, unlockAccount) {
		var pwdUserManager = new SNC.PwdUserManager();
		var response = pwdUserManager.updatePassword(user_name, password, passwordNeedsReset, unlockAccount);
		return response;
	},
	isPasswordInHistory: function(user_name, password, credStoreID) {
		var pwdUtil = new SNC.PwdHistoryManager(credStoreID,user_name);
		if(pwdUtil.isPwdInHistory(password)) {
			return true;
		} 
		return false;
	},
	add: function(user_name, password, credStoreID) {
		var pwdUtil = new SNC.PwdHistoryManager(credStoreID,user_name);
		pwdUtil.addToHistory(password);
	},
	passwordExtensionScript: function(Id,sys_id) {
		var params = new SNC.PwdExtensionScriptParameter();
		params.userId = Id;
		var userLookupExtension = new SNC.PwdExtensionScript(sys_id);
		var lookupResult = userLookupExtension.process(params);
		return lookupResult;
	},
	sendConfirmationEmail: function(eventName, gr, param1, param2) {
		var emailManager = new SNC.PwdEmailManager();
		emailManager.sendEmail(eventName, gr, param1, param2);
	},
	generatePassword: function(credStore) {
		var autoGenScript = credStore.auto_gen_password_script.name;
		var params = {credentialStoreId : credStore.getId()};
		var tempPassword = new global[autoGenScript]().process(params);
		var finalTempPassword = '' + new GlideEncrypter().encrypt(tempPassword);
		return finalTempPassword;
	},
    type: 'PasswordResetScopedUtil'
};
```