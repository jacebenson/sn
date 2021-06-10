---
title: "ITSMChoiceValuesAJAX"
id: "itsmchoicevaluesajax"
---

API Name: sn_itsm_workspace.ITSMChoiceValuesAJAX

```js
var ITSMChoiceValuesAJAX = Class.create();
ITSMChoiceValuesAJAX.prototype = Object.extendsObject(global.AbstractAjaxProcessor, {
	getTableChoicesAJAX: function() { 
		var tableName = this.getParameter('sysparm_table');
		var tableField = this.getParameter('sysparm_field');

		if (!tableName || !tableField)
			return "";

		return new ITSMChoiceValues().getTableChoices(tableName, tableField);
	},

    type: 'ITSMChoiceValuesAJAX'
});
```