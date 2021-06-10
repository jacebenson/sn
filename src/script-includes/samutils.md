---
title: "SAMUtils"
id: "samutils"
---

API Name: global.SAMUtils

```js
var SAMUtils = Class.create();
SAMUtils.prototype = {
    initialize: function() {
    },

	getPluginStatus: function(pluginId){
		var status = GlidePluginManager.isActive(pluginId);
		return status;
	},

	areMultipleJobsRunning: function(jobId) {
		var sysTriggerGr = new GlideRecord("sys_trigger");
		sysTriggerGr.addQuery("job_context", "CONTAINS", jobId);
		sysTriggerGr.addQuery("state", "1");
		sysTriggerGr.setLimit(2);
		sysTriggerGr.query();
		if (sysTriggerGr.getRowCount() === 2) {
			return true;
		}
		return false;
    },

	type: 'SAMUtils'
};
```