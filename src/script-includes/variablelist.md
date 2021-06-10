---
title: "VariableList"
id: "variablelist"
---

API Name: sn_cs_builder.VariableList

```js
var VariableList = Class.create();
VariableList.prototype = {
    initialize: function() {
    },

	getVariablesForTopic : function getVariablesForTopic(/* String */ topic) {
		var variables = [];

		if (!topic)
			return variables;

		var variableGR = new GlideRecordSecure("topic_variable");
		variableGR.addQuery("model", topic);
		variableGR.query();

		while (variableGR.next()) {
			var elements = variableGR.getElements();
			var field = elements.reduce(function(els, el) {
				var name = el.getName();
				if(!variableGR.isValidField(name)) return els;
				els[el.getName()] = {
					value: variableGR.getValue(name),
					display_value: variableGR.getDisplayValue(name)
				};
				return els;
			}, {});
			field.sys_id = variableGR.getUniqueValue();
			variables.push(field);
		}

		return variables;
	},

	getVariable : function getVariable(topic, variable) {
		var variableObj = {};

		if (!topic || !variable)
			return variableObj;

		var variableGR = new GlideRecordSecure("topic_variable");
		variableGR.addQuery("model", topic);
		variableGR.addQuery("element", variable);
		variableGR.query();

		variableObj = this._getVariableObject(variableGR);

		return variableObj;
	},

	_getVariableObject : function _getVariableObject(variableGR) {
		return {
			label : variableGR.getValue("label"),
			column_name : variableGR.getValue("element"),
			type : variableGR.getValue("internal_type"),
			max_length : variableGR.getValue("max_length")
		};
	},

    type: 'VariableList'
};
```