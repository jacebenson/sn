---
title: "ChangeConflictWorker"
id: "changeconflictworker"
---

API Name: global.ChangeConflictWorker

```js
var ChangeConflictWorker = Class.create();
ChangeConflictWorker.prototype = {
	initialize: function() {
	},

	start: function (sysId, sysClassName) {
		var sourceGR = new GlideRecord(sysClassName || "change_request");
		if (!sourceGR.get(sysId))
			return;

		var ccc = new ChangeCheckConflicts(sourceGR);
		ccc.checkAndUpdate();
	},

    type: 'ChangeConflictWorker'
};
```