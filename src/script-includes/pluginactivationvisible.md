---
title: "PluginActivationVisible"
id: "pluginactivationvisible"
---

API Name: global.PluginActivationVisible

```js
var PluginActivationVisible = Class.create();
PluginActivationVisible.prototype = Object.extendsObject(AbstractUpdateUIActionUtil, {
    initialize: function() {
    },

	_userHasAccess: function() {
		return (gs.hasRole("admin")
				&& !gs.getUser().isReadOnlyUser()
				&& this._isCurrentDomainSafe());
	},
	
	getCurrentPluginInInstallation: function() {
		if (GlidePluginManager.isUpgradeSystemBusy())
			return "Upgrade system is busy running an upgrade";
		else
			return SNC.UpdateMutex.getCurrentMutexMessage();
	},
	
	isInstallationAllowed : function() {
		if (GlidePluginManager.isUpgradeSystemBusy() || !SNC.UpdateMutex.isAvailable())
            return {
                installationAllowed: false,
                message: gs.getMessage("Application installation is unavailable because another operation is running: {0}", this.getCurrentPluginInInstallation())
            };
		if (!(gs.hasRole('admin') || gs.hasRole('sn_appclient.app_client_user')) || gs.getUser().isReadOnlyUser())
            return {
                installationAllowed: false,
                message: gs.getMessage("Insufficient privileges to install or update application packages.")
            };
		if(!this._isCurrentDomainSafe())
			return {
                installationAllowed: false,
                message: gs.getMessage("You must be part of global domain to install or update application packages.")
            };
        return { installationAllowed: true };
    },

    type: 'PluginActivationVisible'
});
```