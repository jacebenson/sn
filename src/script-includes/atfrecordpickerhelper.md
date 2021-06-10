---
title: "ATFRecordPickerHelper"
id: "atfrecordpickerhelper"
---

API Name: global.ATFRecordPickerHelper

```js
var ATFRecordPickerHelper = Class.create();
ATFRecordPickerHelper.prototype = Object.extendsObject(AbstractAjaxProcessor, {

	/**
	* Queries table and retrieves value and displayValue needed to instrument snRecordPicker component.
	* @returns {success : boolean, message : string, valueField : string, displayField : string };
	*/
	getRecordPickerFieldData: function() {
		var table = this.getParameter("sysparm_table");
		var sysID = this.getParameter("sysparm_sys_id");
		var valueField = this.getParameter("sysparm_value_field") || "sys_id";
		var displayField = this.getParameter("sysparm_display_field") || "";
		
		gs.log("ATFRecordPickerHelper.getRecordPickerFieldData called with parameters, table : " + table + ", sysID : " + sysID + ", valueField : " + valueField + ", displayField : " + displayField);
		var response = {success : false};
		if (gs.nil(table) || gs.nil(sysID))
			response.message = "Table or Sys ID is null or empty";
		else {		
			var gr = new GlideRecordSecure(table);
			if (!gr.isValid())
				response.message = "Invalid table : " + table;
			else if (gr.get(sysID)) {
				response.success = true;
				response.value = gr.getValue(valueField);
				response.displayValue = gr.getDisplayValue(displayField);
				response.message = "successfully retrieved value and display fields";
			} else
				response.message = "Record with sys_id : " + sysID + ", does not exist in table : " + table;
		}
		return JSON.stringify(response);
	},

    type: 'ATFRecordPickerHelper'
});
```