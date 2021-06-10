---
title: "SLABreakdownDefinitionBreakdownFieldSNC"
id: "slabreakdowndefinitionbreakdownfieldsnc"
---

API Name: sn_sla_brkdwn.SLABreakdownDefinitionBreakdownFieldSNC

```js
var SLABreakdownDefinitionBreakdownFieldSNC = Class.create();

SLABreakdownDefinitionBreakdownFieldSNC.prototype = Object.extendsObject(SLABreakdown, {
    initialize: function() {
    },

	process: function(tableName, breakdownDefFieldTable, fieldNameData) {
		var fieldNames = [];

		if (!fieldNameData)
			return fieldNames;

		fieldNameData = new global.JSON().decode(fieldNameData);

		if (!fieldNameData.breakdownDefinitionId)
			return fieldNames;

		fieldNames = this.getAvailableBreakdownFields(fieldNameData.breakdownDefinitionId);
		if (fieldNameData.hasOwnProperty("currentBreakdownField"))
			fieldNames.push(fieldNameData.currentBreakdownField);

		return fieldNames.sort();
	},

	getAvailableBreakdownFields: function(breakdownDefinitionId) {
		var fieldNames = [];

		var breakdownDefinitionGr = new GlideRecord(SLABreakdown.SLA_BREAKDOWN_DEFINITION);
		if (!breakdownDefinitionGr.get(breakdownDefinitionId))
			return fieldNames;

		var breakdownTableName = breakdownDefinitionGr.getValue("sla_breakdown_table");
		if (!gs.tableExists(breakdownTableName))
			return fieldNames;

		var breakdownTableGr = new GlideRecord(breakdownTableName);
		var breakdownTableDescriptor = breakdownTableGr.getED();
		if (!breakdownTableDescriptor)
			return fieldNames;

		var existingFieldNames = this._getExistingFieldNames(breakdownDefinitionGr.getUniqueValue());
		var breakdownTableElements = breakdownTableGr.getElements();
		var breakdownElement;
		for (var i = 0, n = breakdownTableElements.length; i < n; i++) {
			breakdownElement = breakdownTableElements[i].getED();
			if (("" + breakdownElement.getTableName()) !== breakdownTableName)
				continue;

			if (existingFieldNames.indexOf("" + breakdownElement.getName()) >= 0)
				continue;

			if (SLABreakdown.BREAKDOWN_FIELD_TYPES.indexOf("" + breakdownElement.getInternalType()) < 0)
				continue;

			fieldNames.push(breakdownElement.getName());
		}

		return fieldNames;
	},

	getExistingBreakdownFields: function(breakdownDefinitionId) {
		var breakdownDefinitionGr = new GlideRecord(SLABreakdown.SLA_BREAKDOWN_DEFINITION);
		if (!breakdownDefinitionGr.get(breakdownDefinitionId))
			return [];

		var breakdownTableName = breakdownDefinitionGr.getValue("sla_breakdown_table");
		if (!gs.tableExists(breakdownTableName))
			return [];

		var breakdownTableGr = new GlideRecord(breakdownTableName);
		if (!breakdownTableGr.getED())
			return [];

		return this._getExistingFieldNames(breakdownDefinitionGr.getUniqueValue());
	},

	_getExistingFieldNames: function(breakdownDefinitionSysId) {
		var existingFieldNames = [];

		if (!breakdownDefinitionSysId)
			return existingFieldNames;

		var breakdownDefinitionFieldGr = new GlideRecord(SLABreakdown.SLA_BREAKDOWN_DEFINITION_FIELD);
		breakdownDefinitionFieldGr.addQuery(SLABreakdown.SLA_BREAKDOWN_DEFINITION, breakdownDefinitionSysId);
		breakdownDefinitionFieldGr.query();

		while (breakdownDefinitionFieldGr.next()) {
			if (breakdownDefinitionFieldGr.breakdown_field_name.nil())
				continue;

			existingFieldNames.push("" + breakdownDefinitionFieldGr.getValue("breakdown_field_name"));
		}

		return existingFieldNames;
	},

	type: 'SLABreakdownDefinitionBreakdownFieldSNC'
});
```