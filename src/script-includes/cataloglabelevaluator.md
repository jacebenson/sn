---
title: "CatalogLabelEvaluator"
id: "cataloglabelevaluator"
---

API Name: global.CatalogLabelEvaluator

```js
gs.include("PrototypeServer");

var CatalogLabelEvaluator = Class.create();

CatalogLabelEvaluator.prototype = {
	initialize : function(/* GlideRecord */ gr) {
		this.cartItem = gr;
	},

	getLabels: function() {
		var returnArray = [];
		var variable_set = new GlideappVariablePoolQuestionSet();
		variable_set.setCartID(this.cartItem.sys_id);
		variable_set.load();
		var question_list = variable_set.getSummaryVisibleQuestions();
		for (var i=0; i<question_list.size(); i++) {
			var question = question_list.get(i);
			var optionArray = [];
			optionArray.push(question.getLabel());
			optionArray.push(question.getDisplayValue());
			optionArray.push(question.getSummaryMacro());
			optionArray.push(question.getId());
			optionArray.push(question.getType());
			optionArray.push(question.getValue());
			question.getType() == '33' && !GlideStringUtil.nil(question.getValue()) && optionArray.push(new GlideSysAttachment(question.getValue()).getState());
			returnArray.push(optionArray);
		}
		return returnArray;
	},

	getDisplayValue: function(question, questionType, value) {
		return question.getDisplayValue();
	}
}
```