---
title: "VariableQueryParser"
id: "variablequeryparser"
---

API Name: global.VariableQueryParser

```js
var VariableQueryParser = Class.create();

VariableQueryParser.prototype = Object.extendsObject(QueryParseAjax, {
	
	process: function() {
		QueryParseAjax.prototype.process.call(this);
		var elements = this.getRootElement().childNodes;
		for (var i = 0; i < elements.length; i++) {
			var field = elements.item(i).getAttribute("field");
			var value = elements.item(i).getAttribute("value");
			if (field && value.startsWith("javascript:")) {
				var sBoxEvalObj = new GlideScriptEvaluator();
				sBoxEvalObj.setEnforceSecurity(true);
				value = sBoxEvalObj.evaluateString(value, false);
				var question = GlideappQuestion.getQuestion(field.substring(3));
				if (question.getType() == 9 || question.getType() == 10) 
					question.setDisplayValue(value);	
				else
					question.setValue(value);
				
				value = question.getValue();
				elements.item(i).setAttribute("value", value);
			} else
				elements.item(i).setAttribute("value", value.replace('^^', '^'));
				//	Query separator(^) is escaped via StringUtil::escapeQueryTermSeparator
		}
	},
	
	type: "VariableQueryParser"
});
```