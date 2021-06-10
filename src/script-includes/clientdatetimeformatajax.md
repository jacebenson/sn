---
title: "ClientDateTimeFormatAjax"
id: "clientdatetimeformatajax"
---

API Name: global.ClientDateTimeFormatAjax

```js
var ClientDateTimeFormatAjax = Class.create();
ClientDateTimeFormatAjax.prototype = Object.extendsObject(AbstractAjaxProcessor, {
	
	/*
	 * Formats date_time value from glideRecord to be in user timezone.
	 * sysparm_utc_date_times - array of date_time strings in format of GlideRecord field values.
	 * return array of date_time strings in use timezone for provided date, smae order as the input.
	 */
	formatDateTime: function() {
		var inputs = JSON.parse(this.getParameter('sysparm_utc_date_times'));
		
		if (!inputs || Number(inputs.length) < 1)
			return [];
		
		var outputs = new Array(inputs.length);
		
		for (var i = 0; i < inputs.length; i++) {
			var gt = new GlideDateTime(inputs[i]);
			outputs[i] = gt.getDisplayValue();
		}
		
		return JSON.stringify(outputs);
	},
	type: 'ClientDateTimeFormatAjax'
});
```