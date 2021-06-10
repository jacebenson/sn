---
title: "VCSAppAccessCheck"
id: "vcsappaccesscheck"
---

API Name: sn_devstudio.VCSAppAccessCheck

```js
var VCSAppAccessCheck = (function() {
	
	return {
		verifyReadAccess : function(appId) {
			var gr = attemptAppLoad(appId);
			if (!gr.canRead())
				throwAccessDenied(appId);
		},
		
		verifyWriteAccess : function(appId) {
			var gr = attemptAppLoad(appId);
			// PRB683568 : For delegated developers canWrite always gives false
			// PRB1365169 : modified the temporary fix originally made for PRB683568 
			//              which was calling canRead() for all users
			if (isDelegatedDeveloper() && !gr.canRead())
				throwAccessDenied(appId);
			if (!isDelegatedDeveloper() && !gr.canWrite())
				throwAccessDenied(appId);
        },
		
		verifyPublishAccess : function(appId) {
			if (!canPublishApp(appId))
				throwAccessDenied(appId);
		},
		
		verifyCreateAccess : function() {
			var gr = new GlideRecord("sys_app");
			if (!gr.canCreate())
				throw new sn_ws_err.ServiceError()
					.setStatus(403)
					.setMessage("Access denied to create a new application");
		}
	};
	
	function attemptAppLoad(appId) {
		var gr = new GlideRecord("sys_app");
		gr.addQuery('sys_id', appId);
		gr.query();
		if (!gr.next())
			throw new sn_ws_err.NotFoundError("Invalid application id " + appId);
		return gr;
	}
	
	function throwAccessDenied(appId) {
		throw new sn_ws_err.ServiceError()
			.setStatus(403)
			.setMessage("Access denied to application " + appId);
	}

	function isDelegatedDeveloper() {
		return gs.hasRole('delegated_developer') && !gs.hasRole('admin');
	}
	
	function canPublishApp(appId){
		return sn_app_api.AppStoreAPI.canPublishToAppRepo(appId) || sn_app_api.AppStoreAPI.canPublishToAppStore(appId);
	}

})();
```