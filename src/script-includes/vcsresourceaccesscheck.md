---
title: "VCSResourceAccessCheck"
id: "vcsresourceaccesscheck"
---

API Name: sn_devstudio.VCSResourceAccessCheck

```js
var VCSResourceAccessCheck = (function() {
	
	return {
		verifyPluginAccess : function(pluginId) {
			if (isDelegatedDeveloper() && pluginId !== 'com.glide.source_control')
				throwAccessDenied(pluginId);
        },
	};
	
	function throwAccessDenied(pluginId) {
		throw new sn_ws_err.ServiceError()
			.setStatus(403)
			.setMessage("Access denied to resource " + pluginId);
	}

	function isDelegatedDeveloper() {
		return gs.hasRole('delegated_developer') && !gs.hasRole('admin');
	}

})();
```