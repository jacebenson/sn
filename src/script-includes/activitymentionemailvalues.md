---
title: "ActivityMentionEmailValues"
id: "activitymentionemailvalues"
---

API Name: global.ActivityMentionEmailValues

```js
var ActivityMentionEmailValues = Class.create();
ActivityMentionEmailValues.prototype = {
    initialize: function() {
    },
	getEmailValues: function(table, sysId) {
		var result = {};

		var recordGR = new GlideRecord(table);
		if (!recordGR.get(sysId))
			return;

		var displayValue = recordGR.getDisplayValue();
		result.subjectText = displayValue
			? displayValue
			: "a record discussion";
		var tableDisplay = recordGR.getClassDisplayValue();
		result.linkText = displayValue
			? "the " + tableDisplay  + " record " + displayValue
			: "this " + tableDisplay  + " record ";
		result.className = recordGR.getRecordClassName();
		result.recordSysId = recordGR.getUniqueValue();

		return JSON.stringify(result);
	},

    type: 'ActivityMentionEmailValues'
};
```