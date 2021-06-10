---
title: "SLABreakdownDefinitionSNC"
id: "slabreakdowndefinitionsnc"
---

API Name: sn_sla_brkdwn.SLABreakdownDefinitionSNC

```js
var SLABreakdownDefinitionSNC = Class.create();
SLABreakdownDefinitionSNC.prototype = {

	initialize: function(breakdownDefinitionGr) {
		this._gr = breakdownDefinitionGr;
	},

	getBreakdownTableData: function() {
		var tableData = [];

		var tableNames = this._getBreakdownTableNames();
		tableNames.sort();
		tableNames.forEach(function(tableName) {
			tableData.push({tableName: tableName,
							tableLabel: this._getTableLabel(tableName),
							taskTypesDefined: this._getTaskTypesByBreakdownTable(tableName)});
		}, this);

		return tableData;
	},

	breakdownDataExists: function() {
		if (!this._gr || !this._gr.isValidRecord())
			return false;

		var breakdownTable = this._gr.getValue("sla_breakdown_table");

		return new global.SLABreakdownUtils().breakdownDataExists(breakdownTable, this._getBreakdownDefinitionQuery());
	},

	activeBreakdownDataExists: function() {
		if (!this._gr || !this._gr.isValidRecord())
			return false;

		var breakdownTable = this._gr.getValue("sla_breakdown_table");

		return new global.SLABreakdownUtils().breakdownDataExists(breakdownTable, this._getBreakdownDefinitionQuery("task_sla.active=true"));
	},

	removeRelatedSlaDefinitions: function() {
		if (!this._gr || !this._gr.isValidRecord())
			return false;

		var slaDefinitionSlaBreakdownGr = new GlideRecord(SLABreakdown.SLA_DEFINITION_SLA_BREAKDOWN);
		slaDefinitionSlaBreakdownGr.addQuery("sla_breakdown_definition", this._gr.getUniqueValue());
		slaDefinitionSlaBreakdownGr.query();

		if (!slaDefinitionSlaBreakdownGr.hasNext())
			return;

		while (slaDefinitionSlaBreakdownGr.next())
			slaDefinitionSlaBreakdownGr.deleteRecord();

		gs.addInfoMessage(gs.getMessage("All related SLA Definitions have been removed from breakdown definition {0}",  "<b>" + this._gr.getValue("name") + "</b>"));
	},

	removeRelatedFields: function () {
		if (!this._gr || !this._gr.isValidRecord())
			return false;

		var breakdownDefinitionFieldGr = this._getBreakdownDefinitionFields();
		while (breakdownDefinitionFieldGr.next())
			breakdownDefinitionFieldGr.deleteRecord();

		gs.addInfoMessage(gs.getMessage("Breakdown definition fields have been deleted from breakdown definition {0}", "<b>" + this._gr.getValue("name") + "</b>"));
	},

	deleteBreakdownDataForActiveSLAs: function() {
		if (!this._gr || !this._gr.isValidRecord())
			return;

		var breakdownTable = this._gr.getValue("sla_breakdown_table");

		return new global.SLABreakdownUtils().deleteBreakdownData(breakdownTable, this._getBreakdownDefinitionQuery("task_sla.active=true"));
	},

	validateRelatedFields: function() {
		if (!this._gr || !this._gr.isValidRecord())
			return false;

		var breakdownDefinitionFieldGr = this._getBreakdownDefinitionFields();

		var breakdownTableGr = new GlideRecord(this._gr.getValue("sla_breakdown_table"));
		var taskTableGr = previous !== null ? new GlideRecord(previous.getValue("task_table")) : new GlideRecord(this._gr.getValue("task_table"));

		var invalidFields = [];
		while (breakdownDefinitionFieldGr.next()) {
			var breakdownFieldName = breakdownDefinitionFieldGr.getValue("breakdown_field_name");
			var sourceFieldName = breakdownDefinitionFieldGr.getValue("source_field_name");
			var availableSourceFields = new SLABreakdownDefinitionSourceField().getSourceFields(this._gr.getValue("task_table"),
																								this._gr.getValue("sla_breakdown_table"),
																								breakdownFieldName);
			if (availableSourceFields.indexOf(sourceFieldName) < 0) {
				var breakdownFieldLabel = breakdownFieldName;
				var breakdownFieldElement = breakdownTableGr.getElement(breakdownFieldName);
				if (breakdownFieldElement + "" !== "null")
					breakdownFieldLabel = breakdownFieldElement.getED().getLabel();

				var sourceFieldLabel = sourceFieldName;
				var sourceFieldElement = taskTableGr.getElement(sourceFieldName);
				if (sourceFieldElement + "" !== "null")
					sourceFieldLabel = sourceFieldElement.getED().getLabel();

				invalidFields.push({breakdownFieldLabel: breakdownFieldLabel, sourceFieldLabel: sourceFieldLabel});
				breakdownDefinitionFieldGr.deleteRecord();
			}
		}

		if (invalidFields.length === 0)
			return;

		var sourceTableName = new GlideRecord(this._gr.getValue("task_table")).getED().getLabel();
		var deletedFieldsMsg = gs.getMessage("The following breakdown fields were deleted from breakdown definition {0} as they reference fields that are not available in table {1}: ",
											 ["<b>" + this._gr.getValue("name") + "</b>", "<b>" + sourceTableName + "</b>"]) + "<br/><br/>";
		invalidFields.forEach(function(invalidField) {
			deletedFieldsMsg += "<span style='padding-left:1em'>" + gs.getMessage("Breakdown field: {0}", "<b>" + invalidField.breakdownFieldLabel + "</b>") + "</span>" + 
								"<span style='padding-left:1em'>" + gs.getMessage("Source field: {0}", "<b>" + invalidField.sourceFieldLabel + "</b>") + "<br/></span>";
		});

		gs.addInfoMessage(deletedFieldsMsg);
	},

	_getBreakdownTableNames: function() {
		return new GlideTableHierarchy(SLABreakdown.SLA_BREAKDOWN_CORE).getTableExtensions();
	},

	_getTableLabel: function(tableName) {
		var tableDisplayValue = "";

		if (!gs.tableExists(tableName))
			return tableDisplayValue;

		var td = new GlideRecord(tableName).getED();

		return td.getLabel() + " [" + tableName +"]";
	},

	_getTaskTypesByBreakdownTable: function(tableName) {
		var taskTypes = {};

		if (!tableName)
			return taskTypes;

		var breakdownDefinitionGr = new GlideAggregate(SLABreakdown.SLA_BREAKDOWN_DEFINITION);
		breakdownDefinitionGr.addQuery("sla_breakdown_table", tableName);
		breakdownDefinitionGr.groupBy("task_table");
		breakdownDefinitionGr.query();

		while (breakdownDefinitionGr.next())
			taskTypes[breakdownDefinitionGr.getValue("task_table")] = true;

		return taskTypes;
	},

	_getBreakdownDefinitionFields: function() {
		var breakdownDefinitionFieldGr = new GlideRecord(SLABreakdown.SLA_BREAKDOWN_DEFINITION_FIELD);
		breakdownDefinitionFieldGr.addQuery("sla_breakdown_definition", this._gr.getUniqueValue());
		breakdownDefinitionFieldGr.query();

		return breakdownDefinitionFieldGr;
	},

	_getBreakdownDefinitionQuery: function(partialQuery) {
		return (partialQuery ? partialQuery + "^" : "") + "sla_breakdown_definition=" + this._gr.getUniqueValue() + "^EQ";
	},

	type: 'SLABreakdownDefinitionSNC'
};
```