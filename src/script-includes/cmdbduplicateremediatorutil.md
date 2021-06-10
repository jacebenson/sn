---
title: "CMDBDuplicateRemediatorUtil"
id: "cmdbduplicateremediatorutil"
---

API Name: global.CMDBDuplicateRemediatorUtil

```js
var CMDBDuplicateRemediatorUtil = Class.create();
CMDBDuplicateRemediatorUtil.prototype = {
    initialize: function() {
    },

	getDuplicates: function(taskId, masterSysId) {
		var duplicates = [];
		var gr = new GlideRecord('duplicate_audit_result');
		gr.addQuery('follow_on_task', taskId);
		gr.addQuery('duplicate_ci', '!=', masterSysId);
		
		gr.query();
		while(gr.next()) {
			duplicates.push(gr.duplicate_ci.toString());
		}
		
		return duplicates;
	},
	
    type: 'CMDBDuplicateRemediatorUtil'
};
```