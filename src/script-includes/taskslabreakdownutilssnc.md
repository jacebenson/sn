---
title: "TaskSLABreakdownUtilsSNC"
id: "taskslabreakdownutilssnc"
---

API Name: sn_sla_brkdwn.TaskSLABreakdownUtilsSNC

```js
var TaskSLABreakdownUtilsSNC = Class.create();
TaskSLABreakdownUtilsSNC.prototype = {
	initialize: function(taskSLAGr) {
		this._gr = taskSLAGr;
	},

	//Return an array of field names representing the configured breakdown fields
	//I.e. those fields for which there is a record in sla_breakdown_definition_field
	getBreakdownFields: function(breakdownTableName) {
		if (!this._gr || !(this._gr instanceof GlideRecord))
			return [];

		if (!this._isValidBreakdownTable(breakdownTableName))
			return [];

		var breakdownsGr = new GlideRecord(breakdownTableName);
		breakdownsGr.addQuery("task_sla", this._gr.getUniqueValue());
		breakdownsGr.query();

		if (!breakdownsGr.next())
			return [];

		var brkdwnDefField = new SLABreakdownDefinitionBreakdownField();

		var slaBreakdownDefId = breakdownsGr.getValue('sla_breakdown_definition');
		if (!brkdwnDefField)
			return [];

		return brkdwnDefField.getExistingBreakdownFields(slaBreakdownDefId, false);
	},

	_isValidBreakdownTable: function(breakdownTableName) {
		if (!breakdownTableName)
			return false;

		if (!gs.tableExists(breakdownTableName))
			return false;

		if (new GlideTableHierarchy(SLABreakdown.SLA_BREAKDOWN_CORE).getTableExtensions().indexOf(breakdownTableName) < 0)
			return false;

		return true;
	},

	type: 'TaskSLABreakdownUtilsSNC'
};
```