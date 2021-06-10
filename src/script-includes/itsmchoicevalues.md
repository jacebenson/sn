---
title: "ITSMChoiceValues"
id: "itsmchoicevalues"
---

API Name: sn_itsm_workspace.ITSMChoiceValues

```js
var ITSMChoiceValues = Class.create();
ITSMChoiceValues.prototype = {
    initialize: function() {
    },

	getTableChoices: function(tableName, fieldName) { 
		if (!tableName || !fieldName)
			return "";
		
		var choiceListObj = GlideChoiceList.getChoiceList(tableName, fieldName);
		var choiceListSize = choiceListObj.getSize();
		var choices = [];
		for (var i = 0; i < choiceListSize; i++){
			var choice = choiceListObj.getChoice(i);
			choices.push({
				"label": choice.getLabel(),
				"value": choice.getValue()
			});
		}

		return JSON.stringify(choices);
	},
	
    type: 'ITSMChoiceValues'
};
```