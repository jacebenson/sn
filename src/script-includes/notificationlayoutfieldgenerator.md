---
title: "NotificationLayoutFieldGenerator"
id: "notificationlayoutfieldgenerator"
---

API Name: global.NotificationLayoutFieldGenerator

```js
var NotificationLayoutFieldGenerator = Class.create();
NotificationLayoutFieldGenerator.prototype = {
    initialize: function() {
    },
    layoutField: function(tableName, sysId, fieldName) {
		var tableGR = GlideRecord(tableName);
		tableGR.addQuery('sys_id', sysId);
		tableGR.query();
		tableGR.next();
		var displayValue = tableGR.getElement(fieldName).getDisplayValue();
		var payload = { "Label": displayValue };
		var gr = new GlideRecord('sys_sg_ui_style');
		gr.addQuery('table', tableName);
		gr.addQuery('field', fieldName);
		gr.query();
		while (gr.next()) {
			if (GlideFilter.checkRecord(tableGR, gr.condition)) {
				var parser = new JSON();
				var obj = parser.decode(gr.style);
				payload.Style = obj;
				break;
			}
		}
		return payload;
	},
    type: 'NotificationLayoutFieldGenerator'
};
```