---
title: "SLABreakdownDefinitionTaskTablesSNC"
id: "slabreakdowndefinitiontasktablessnc"
---

API Name: sn_sla_brkdwn.SLABreakdownDefinitionTaskTablesSNC

```js
var SLABreakdownDefinitionTaskTablesSNC = Class.create();
SLABreakdownDefinitionTaskTablesSNC.prototype = {
    initialize: function() {
    },

	process: function() {
		return new global.SLABreakdownUtils().getAuditedTaskTables();
	},

    type: 'SLABreakdownDefinitionTaskTablesSNC'
};
```