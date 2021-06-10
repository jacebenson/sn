---
title: "SLABreakdownUtilsSNC"
id: "slabreakdownutilssnc"
---

API Name: global.SLABreakdownUtilsSNC

```js
var SLABreakdownUtilsSNC = Class.create();

SLABreakdownUtilsSNC.prototype = {
	initialize: function() {
    },

	getAuditedTaskTables: function() {
		var taskTables = j2js(new TableUtils("task").getTableExtensions()).sort();

		return taskTables.filter(function(tableName) {
				return GlideTableDescriptor(tableName).auditWanted();
			}
		);
	},

	getDurationCalculatorForSLA: function(taskSLAGr) {
		var durationCalculator = new DurationCalculator();
		if (!taskSLAGr || !(taskSLAGr instanceof GlideRecord))
			return durationCalculator;

		if (!taskSLAGr.schedule.nil()) {
			durationCalculator.setSchedule(taskSLAGr.getValue("schedule"));
			durationCalculator.setTimeZone(new SLAUtil().getTimezone(taskSLAGr));
		}

		return durationCalculator;
	},

	getSLADefinitionFromTaskSLA: function(taskSLAGr) {
		if (!taskSLAGr || !(taskSLAGr instanceof GlideRecord))
			return null;

		var slaDefinitionGr = new GlideRecord("contract_sla");
		slaDefinitionGr.addQuery("sys_id", taskSLAGr.getValue("sla"));
		slaDefinitionGr.queryNoDomain();

		if (!slaDefinitionGr.next())
			return null;

		return slaDefinitionGr;
	},

	getTaskFromTaskSLA: function(taskSLAGr, taskType) {
		if (!taskSLAGr || !taskSLAGr.isValidRecord())
			return null;

		if (!taskType || !GlideTableDescriptor.get(taskType).isValid())
			return null;

		var taskGr = new GlideRecord(taskType);
		taskGr.addQuery("sys_id", taskSLAGr.getValue("task"));
		taskGr.queryNoDomain();

		if (!taskGr.next())
			return null;

		return taskGr;
	},

	setBreakdownModulesVisible: function(trueOrFalse) {
		var showModules = trueOrFalse && trueOrFalse === true;

		var moduleGr = new GlideRecord("sys_app_module");
		moduleGr.addQuery("sys_id", SLABreakdownUtils.MODULE_IDS);
		moduleGr.query();

		while (moduleGr.next()) {
			moduleGr.active = showModules;
			moduleGr.update();
		}
	},

	getBreakdownDefIdsForSLA: function(slaId) {
		var slaBreakdownIds = [];

		if (!slaId)
			return slaBreakdownIds;

		var slaDefinitionSlaBreakdownGr = new GlideAggregate(sn_sla_brkdwn.SLABreakdown.SLA_DEFINITION_SLA_BREAKDOWN);
		slaDefinitionSlaBreakdownGr.addQuery("contract_sla", slaId);
		slaDefinitionSlaBreakdownGr.groupBy("sla_breakdown_definition");
		slaDefinitionSlaBreakdownGr.queryNoDomain();

		while (slaDefinitionSlaBreakdownGr.next())
			slaBreakdownIds.push(slaDefinitionSlaBreakdownGr.getValue("sla_breakdown_definition"));

		return slaBreakdownIds;
	},

	breakdownDataExists: function(breakdownTableName, encodedQuery) {
		if (!breakdownTableName || !GlideTableDescriptor.get(breakdownTableName).isValid())
			return false;
		
		var breakdownGr = new GlideRecord(breakdownTableName);
		if (encodedQuery)
			breakdownGr.addEncodedQuery(encodedQuery);
		breakdownGr.setLimit(1);
		breakdownGr.queryNoDomain();
		
		return breakdownGr.hasNext();
	},

	deleteBreakdownData: function(breakdownTableName, encodedQuery) {
		if (!breakdownTableName || !GlideTableDescriptor.get(breakdownTableName).isValid())
			return;
		
		var breakdownGr = new GlideRecord(breakdownTableName);
		if (encodedQuery)
			breakdownGr.addEncodedQuery(encodedQuery);
		breakdownGr.queryNoDomain();

		while (breakdownGr.next())
			breakdownGr.deleteRecord();
	},

	type: 'SLABreakdownUtilsSNC'
};
```