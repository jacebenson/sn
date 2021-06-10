---
title: "getITSMChoiceFields"
id: "getitsmchoicefields"
---

API Name: sn_itsm_workspace.getITSMChoiceFields

```js
var getITSMChoiceFields = Class.create();
getITSMChoiceFields.prototype = {
    initialize: function() {
    },

	process: function(tableName) {
		var fieldNames = [];
	
		if (!tableName)
			return fieldNames;
	
		var gr = new GlideRecord(tableName);
		if (!gr.isValid())
			return fieldNames;
	
		var elements = gr.getElements();
		for (var i = 0; i < elements.length; i++) {
			var elem = elements[i].getED();
			if (!elem.isChoiceTable())
				continue;
	
			fieldNames.push(elem.getName());
		}
	
		return fieldNames;
	},
	
    type: 'getITSMChoiceFields'
};
```