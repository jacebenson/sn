---
title: "EmailDisplayProcessorUtil"
id: "emaildisplayprocessorutil"
---

API Name: global.EmailDisplayProcessorUtil

```js
var EmailDisplayProcessorUtil = Class.create();

EmailDisplayProcessorUtil.prototype = {
    initialize: function() {
    },
	
	getParentRecord: function(emailRecord) {
		var table = emailRecord.target_table;
		var emailParentRecord = new GlideRecord(table);
		if (emailParentRecord.get(emailRecord.instance)) {
			if (emailParentRecord.canRead())
				return emailParentRecord;
			else
				return "No access";
		}
		return null;
	},
	
    type: 'EmailDisplayProcessorUtil'
};
```