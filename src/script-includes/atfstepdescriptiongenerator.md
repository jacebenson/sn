---
title: "ATFStepDescriptionGenerator"
id: "atfstepdescriptiongenerator"
---

API Name: global.ATFStepDescriptionGenerator

```js
var ATFStepDescriptionGenerator = Class.create();

ATFStepDescriptionGenerator.prototype = {
    initialize: function() {
    },
	
	getOpenFormDescription: function(table, view, record_id, form_ui) {
		var td, label;
		var isStandardFormUI = !form_ui || form_ui.toString() === "standard_ui";
		var formUIName = "";
		if (!isStandardFormUI)
			formUIName = form_ui.getDisplayValue();
		// Find table label
		td = GlideTableDescriptor.get(table);
		if (td)
			label = td.getLabel();

		var messageMap = {
            "new_standard_ui_view":  gs.getMessage("Open the '{0}' view of a new '{1}' form", [view, label]),
            "existing_standard_ui_view": gs.getMessage("Open the '{0}' view of the '{1}' form with id '{2}'", [view, label, record_id]),
            "new_standard_ui_default": gs.getMessage("Open a new '{0}' form", [label]),
            "new_workspace_default": gs.getMessage("Open a new '{0}' form in '{1}'", [label, formUIName]),
            "existing_standard_ui_default": gs.getMessage("Open the '{0}' form with id '{1}'", [label, record_id]),
            "existing_workspace_default": gs.getMessage("Open the '{0}' form with id '{1}' in '{2}'", [label, record_id, formUIName])
        };

		// build a key based on the provided input variables
		var recordKey = gs.nil(record_id) ? "new_" : "existing_";
		var workspaceKey = isStandardFormUI ? "standard_ui_" : "workspace_";
		var viewKey = "default";
		// only use view if in standard ui
		if (workspaceKey === "standard_ui_" && view)
			viewKey = "view";

        return messageMap[recordKey + workspaceKey + viewKey];
	},

	getTimeoutDescription: function(timeout) {
		if (GlideStringUtil.nil(timeout))
			return "";

		var seconds = timeout.dateNumericValue();
		var description = "";
		if (seconds > 0)
			description = "\n" + gs.getMessage("With a failure timeout of {0}", timeout.getDisplayValue());

		return description;
	},

	/**
	 * Translates an encoded query, such as one from a conditions field, into a human readable format
	 */
	getConditionDescription: function(tableName, encodedQuery){
		return SNC.ATFVariableElementMapper.getConditionDescription(tableName, encodedQuery);
	},

	/**
	 * Returns a comma-separated string of field labels, given a comma-separated string of field names 
	 */
	getFields: function(fields, table) {
		var fieldElements = fields.split(",");
		var fieldNames = [];
		for (var i = 0; i < fieldElements.length; i++) {
			var fieldName = new sn_atf.UserTestProcessor().getFieldName(table, fieldElements[i]);
			fieldNames.push(fieldName);
		}

		return fieldNames.join(", ");
	},

	getOperatorDescription: function(inputOperator){
		var retValue = "UNDEFINED";
		switch (inputOperator.toString())
		{
		   case 'contains':
				retValue = "contains";
				break;
		   case 'does_not_contain':
				retValue = "does not contain";
				break;
		   case 'exists':
				retValue = "is not empty";
				break;
			case 'equals':
				retValue = "is";
				break;
			case 'not_equals':
				retValue = "is not";
				break;
			case 'less_than':
				retValue = "less than";
				break;
			case 'less_than_equals':
				retValue = "less than or is";
				break;
			case 'greater_than':
				retValue = "greater than";
				break;
			case 'greater_than_equals':
				retValue = "greater than or is";
				break;
		}		
		return retValue;
	},
	
	limitTextToSpecifiedLength: function(inputText, limit){
		if (inputText == undefined || limit < 1)
			return inputText;
		inputText = inputText.toString();
		if (inputText.length > limit)
			inputText = inputText.substring(0, limit) + '...';
		return inputText;
	},

	/**
	 * Returns a list of the filenames for the attachments on the record with the specified sys_id (one per line, including prepending a new line for the first one)
	 */
	getAttachmentsForRecord: function(recordID) {
		var result = "";
		var attachmentGR = new GlideRecord("sys_attachment");
		attachmentGR.addQuery("table_sys_id", recordID);
		attachmentGR.query();
		// These filenames cannot be translated so send them as-is
		while (attachmentGR.next())
			result += "\n" + attachmentGR.getValue("file_name");
		return result;
	},

    type: 'ATFStepDescriptionGenerator'
};
```