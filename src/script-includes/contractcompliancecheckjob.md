---
title: "ContractComplianceCheckJob"
id: "contractcompliancecheckjob"
---

API Name: global.ContractComplianceCheckJob

```js
var ContractComplianceCheckJob = Class.create();
ContractComplianceCheckJob.prototype = Object.extendsObject(global.AssetManagementPerGlideRecordBaseJob, {
	initialize: function() {
		this.tablesProcessed = [];
	},

	getRecords: function() {
		var check = new GlideRecord('clm_condition_check');
		check.query();
		return check;
	},

	getDomains: function() {
		return this.getDomainsGeneric();
	},

	preRunJob: function() {
		this.tablesProcessed = [];
	},

	runJobForRecord: function(conditionCheckGr) {
		var table = conditionCheckGr.getValue('table');
		// Check if table is already processed, if not add it to the list and process
		if (this.tablesProcessed.indexOf(table) === -1) {
			this.tablesProcessed.push(table);
			new ConditionChecks().check(table);
		}
	},

	type: 'ContractComplianceCheckJob',
});
```