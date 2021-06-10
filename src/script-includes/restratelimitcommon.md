---
title: "RESTRateLimitCommon"
id: "restratelimitcommon"
---

API Name: global.RESTRateLimitCommon

```js
var RESTRateLimitCommon = Class.create();
RESTRateLimitCommon.prototype = {
    initialize: function() {
    },
	
	resetRateLimitRule: function(ruleSysId) {
		var countRecord = new GlideRecord('sys_rate_limit_count');
		countRecord.addQuery('rate_limit_rule',ruleSysId);
		countRecord.addQuery('count_start',gs.beginningOfCurrentHour());
		countRecord.setValue('request_count', 0);
		countRecord.updateMultiple();
	
		var violationRecord = new GlideRecord('sys_rate_limit_violations');
		violationRecord.addQuery('rate_limit_rule',ruleSysId);
		violationRecord.addQuery('sys_created_on','>',gs.endOfLastHour());
		violationRecord.query();
		violationRecord.deleteMultiple();	
	},

    type: 'RESTRateLimitCommon'
};
```