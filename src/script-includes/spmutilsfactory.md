---
title: "SPMUtilsFactory"
id: "spmutilsfactory"
---

API Name: global.SPMUtilsFactory

```js
var SPMUtilsFactory = Class.create();
SPMUtilsFactory.prototype = {
	initialize: function() {
		
	},
	
	getUtils: function() {
		if (typeof GlideScriptedExtensionPoint == "undefined") {
			gs.info(gs.getMessage("Scripted extension points are not enabled", epName));
			return false;
		}
		try {
			var ep = new GlideScriptedExtensionPoint().getExtensions('SPMUtils');
			if (ep.length > 0) {
				ep[0].initialize();
				return ep[0];
			}
		} catch (ex) {
			gs.error("global.SPMUtilsFactory: Error fetching extension point - "+ex);
		}

		return false;
	},
	type: 'SPMUtilsFactory'
};
```