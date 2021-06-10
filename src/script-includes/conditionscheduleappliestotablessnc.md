---
title: "ConditionScheduleAppliesToTablesSNC"
id: "conditionscheduleappliestotablessnc"
---

API Name: global.ConditionScheduleAppliesToTablesSNC

```js
var ConditionScheduleAppliesToTablesSNC = Class.create();
ConditionScheduleAppliesToTablesSNC.prototype = {
	initialize: function() {
	},

	process: function() {
		var tableUtils = new TableUtils('cmdb_ci');
		var tables = j2js(tableUtils.getAllExtensions());
		tableUtils = new TableUtils('change_request');
		tables = tables.concat(j2js(tableUtils.getAllExtensions()));
		return tables;
	},

    type: 'ConditionScheduleAppliesToTablesSNC'
};
```