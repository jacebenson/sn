---
title: "AppClientAccess"
id: "appclientaccess"
---

API Name: sn_appclient.AppClientAccess

```js
var AppClientAccess = Class.create();
AppClientAccess.prototype = {
    initialize: function() {
    },

	hasReadAccessSysStoreApp: function(current) {
		return (gs.isScopeAdminForAnyApp() ||
				gs.hasRole("sn_appclient.app_client_user") ||
				gs.hasRole("sn_appclient.app_client_company_installer") || 
				gs.hasRole("unified_plugin_read_only") || this.canUpgradeAnyStoreApp()) &&
			(current.getValue("private") != 1);
	},

	/* check if the current use has the delegated permission to upgrade any store app*/
	canUpgradeAnyStoreApp: function() {
		if (GlidePluginManager.isActive("com.glide.app_api")) {
			if (typeof sn_app_api.AppStoreAPI.canUpgradeAnyStoreApp != "undefined")
				return sn_app_api.AppStoreAPI.canUpgradeAnyStoreApp();
		}

		// If API is not available, check if the customer has admin role instead
		return gs.hasRole('admin') || false;
	},

    type: 'AppClientAccess'
};
```