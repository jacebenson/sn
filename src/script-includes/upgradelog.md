---
title: "UpgradeLog"
id: "upgradelog"
---

API Name: global.UpgradeLog

```js
var UpgradeLog = Class.create();

/**
* DEPRECATED API. WILL BE REMOVED IN FUTURE RELEASE
*/
UpgradeLog.prototype = {
	
	initialize: function() {},
	
	getAllDescriptions: function(parent) {
	    gs.warn("DEPRECATED API: The UpgradeLog Script Include has been deprecated, and will be removed in a future release");
		new SNC.UpgradeSummary(parent).getAllDescriptions();
	},

	getSummary: function(parent) {
	    gs.warn("DEPRECATED API: The UpgradeLog Script Include has been deprecated, and will be removed in a future release");
	    new SNC.UpgradeSummary(parent).calculateSummary();
	},
};
```