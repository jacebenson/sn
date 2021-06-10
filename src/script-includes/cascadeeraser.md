---
title: "CascadeEraser"
id: "cascadeeraser"
---

API Name: global.CascadeEraser

```js
var CascadeEraser = Class.create();
CascadeEraser.prototype = {
	initialize: function() {
	},
	
	deleteRecordByFieldNameAndFieldId : function(fieldName, recordId, tableName)	{
		var gr = new GlideRecord(tableName);
		if (!gr.isValid() || !gr.isValidField(fieldName))
			return;

		gr.addQuery(fieldName, recordId);
		gr.query();
		while(gr.next()) {
			gr.deleteRecord();
		}
	},
	
	removeDependentValueFromListField : function(fieldName, fieldValue, tableName) {
		var gr = new GlideRecord(tableName);
		if (!gr.isValid() || !gr.isValidField(fieldName))
			return;

		gr.addQuery(fieldName, 'CONTAINS', fieldValue);
		gr.query();
		while (gr.next()) {
			var oldFieldValue = gr.getValue(fieldName);
			var newFieldValue = oldFieldValue.replace(fieldValue, '');
			
			gr.setValue(fieldName, newFieldValue);
			gr.update();
		}
	},
	
	deleteByParentId : function(parentId, tableName) {
		this.deleteRecordByFieldNameAndFieldId('parent', parentId, tableName);
	},
	
	deleteBySysId : function(sysId, tableName) {
		this.deleteRecordByFieldNameAndFieldId('sys_id', sysId, tableName);
	},

	
	
	type: 'CascadeEraser'
};
```