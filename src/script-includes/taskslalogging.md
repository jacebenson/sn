---
title: "TaskSLALogging"
id: "taskslalogging"
---

API Name: global.TaskSLALogging

```js
var TaskSLALogging = Class.create();
TaskSLALogging.prototype = {
	SLA_LOGGING_EXCLUDED_FIELD_TYPES: "com.snc.sla.logging.excluded_field_types",
	
    initialize: function() {
		this.gru = new GlideRecordUtil();
		this.excludedFieldTypesVal = gs.getProperty(this.SLA_LOGGING_EXCLUDED_FIELD_TYPES, "");
		this.excludedFieldTypes = this.excludedFieldTypesVal ? this.excludedFieldTypesVal.split(",") : [];
    },

	getBusinessRuleStackMsg: function() {
		var stackMsg = "Business rule stack: " + this.getBusinessRuleStack();

		return stackMsg;
	},

	getRecordContentMsg: function(record, recordLabel) {
		if (!record || !(record instanceof GlideRecord))
			return "No record supplied so content cannot be logged";

		if (!recordLabel)
			recordLabel = "";
		else
			recordLabel = " (" + recordLabel + ")";

		var recordContentMsg = "Field values for " + record.getRecordClassName() +
								" " + record.getDisplayValue() +
								recordLabel + ":\n" +
								this.getRecordContent(record);

		return recordContentMsg;
	},

	getBusinessRuleStack: function() {
		return gs.getSession().getBusinessRuleStack();
	},

	getRecordContent: function(record) {
		var fieldData = {};
		if (!record || !(record instanceof GlideRecord))
			return JSON.stringify(fieldData);

		var fieldsToExclude = this._getExcludedFields(record);
		this.gru.populateFromGR(fieldData, record, fieldsToExclude);

		return JSON.stringify(fieldData);
	},

	_getExcludedFields: function(record) {
		var excludedFields = {};
		if (!record || !(record instanceof GlideRecord))
			return excludedFields;

		if (this.excludedFieldTypes.length === 0)
			return excludedFields;

		var fieldElements = record.getElements();
		for (var i = 0; i < fieldElements.size(); i++) {
			var elementDescriptor = fieldElements.get(i).getED();
			if (!elementDescriptor)
				continue;
			if (this.excludedFieldTypes.indexOf("" + elementDescriptor.getInternalType()) >= 0)
				excludedFields["" + elementDescriptor.getName()] = true;
		}

		return excludedFields;
	},

    type: 'TaskSLALogging'
};
```