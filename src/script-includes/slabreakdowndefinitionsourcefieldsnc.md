---
title: "SLABreakdownDefinitionSourceFieldSNC"
id: "slabreakdowndefinitionsourcefieldsnc"
---

API Name: sn_sla_brkdwn.SLABreakdownDefinitionSourceFieldSNC

```js
var SLABreakdownDefinitionSourceFieldSNC = Class.create();
SLABreakdownDefinitionSourceFieldSNC.prototype = {
	HANDLER_SUFFIX: "Handler",

    initialize: function() {
    },

	process: function(tableName, currentTableName, fieldNameData) {
		var fieldNames = [];

		if (!fieldNameData)
			return fieldNames;

		fieldNameData = new global.JSON().decode(fieldNameData);

		if (!fieldNameData.sourceTable ||
			!fieldNameData.breakdownTable ||
			!fieldNameData.formBreakdownField)
			return fieldNames;

		return this.getSourceFields(fieldNameData.sourceTable,
									 fieldNameData.breakdownTable,
									 fieldNameData.formBreakdownField);
	},

	getSourceFields: function(sourceTable, targetTable, targetField) {
		var fieldNames = [];

		var sourceTableGr = new GlideRecord(sourceTable);
		var targetTableGr = new GlideRecord(targetTable);

		var sourceTableDescriptor = sourceTableGr.getED();

		var targetTableDescriptor = targetTableGr.getED();
		if (!gs.tableExists(targetTable))
			return fieldNames;

		var targetElementDescriptor = targetTableGr.getElement(targetField).getED();
		if (targetElementDescriptor === null)
			return fieldNames;

		var elementType = targetElementDescriptor.getInternalType();

		var handlerFunction = this["_" + elementType + this.HANDLER_SUFFIX];

		if (typeof handlerFunction !== "function")
			return fieldNames;

		return handlerFunction(sourceTableDescriptor, targetElementDescriptor);
	},

	_referenceHandler: function(sourceTableDescriptor, targetElementDescriptor) {
		var fieldNames = [];

		if (!sourceTableDescriptor || !targetElementDescriptor)
			return fieldNames;

		var referenceTable = targetElementDescriptor.getReference();
		if (!referenceTable)
			return fieldNames;

		var referenceTables = new GlideTableHierarchy(referenceTable).getAllExtensions();

		var sourceElements = new GlideRecord(sourceTableDescriptor.getName()).getElements();
		var sourceElementDescriptor;

		for (var i = 0, n = sourceElements.length; i < n; i++) {
			sourceElementDescriptor = sourceElements[i].getED();
			if (sourceElementDescriptor.getInternalType() + "" !== "reference")
				continue;

			if (referenceTables.indexOf("" + sourceElementDescriptor.getReference()) < 0)
				continue;

			fieldNames.push(sourceElementDescriptor.getName());
		}

		return fieldNames;
	},

	_integerHandler: function(sourceTableDescriptor, targetElementDescriptor) {
		var fieldNames = [];

		if (!sourceTableDescriptor || !targetElementDescriptor)
			return fieldNames;

		var sourceElements = new GlideRecord(sourceTableDescriptor.getName()).getElements();
		var sourceElementDescriptor;

		for (var i = 0, n = sourceElements.length; i < n; i++) {
			sourceElementDescriptor = sourceElements[i].getED();
			if (sourceElementDescriptor.getInternalType() + "" !== "integer")
				continue;

			fieldNames.push(sourceElementDescriptor.getName());
		}

		return fieldNames;
	},

	type: 'SLABreakdownDefinitionSourceFieldSNC'
};
```