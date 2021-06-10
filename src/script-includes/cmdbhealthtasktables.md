---
title: "CMDBHealthTaskTables"
id: "cmdbhealthtasktables"
---

API Name: global.CMDBHealthTaskTables

```js
var CMDBHealthTaskTables = Class.create();
CMDBHealthTaskTables.prototype = {
	initialize: function() {
	},
	
	process: function() {
		return j2js(SNC.RemediationUtil.getTaskTables());
	},
	
	type: 'CMDBHealthTaskTables'
};
```