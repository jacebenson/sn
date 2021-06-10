---
title: "TopicVariableAsChoice"
id: "topicvariableaschoice"
---

API Name: global.TopicVariableAsChoice

```js
var TopicVariableAsChoice = Class.create();
TopicVariableAsChoice.prototype = {
    initialize: function() {
    },
	
	getReferences: function getReferences(dictionary_table) {
		if (!dictionary_table)
			return;
		
		var choices = [];
		var var_dict = new GlideRecord('var_dictionary');
		var_dict.addQuery('name', dictionary_table);
		var_dict.addQuery('internal_type','reference');
		var_dict.query();
		
		while(var_dict.next()) {
			choices.push({ 
				label : var_dict.getValue('label'),
				value: var_dict.getValue('element')
			});
		}
		
		return choices;
	},
	
	getReferenceMap : function getReferenceMap(dictionary_table) {
		if (!dictionary_table)
			return;
		
		var map = {};
		var var_dict = new GlideRecord('var_dictionary');
		var_dict.addQuery('name', dictionary_table);
		var_dict.addQuery('internal_type','reference');
		var_dict.query();
		
		while(var_dict.next()) {
			map[var_dict.getValue('element')] = var_dict.getValue('reference');
		}
		
		return map;
	},
	
	getChoices: function getChoices(dictionary_table) {
		if (!dictionary_table)
			return;
		
		var choices = [];
		var var_dict = new GlideRecord('var_dictionary');
		var_dict.addQuery('name', dictionary_table);
		var_dict.addQuery('internal_type','choice');
		var_dict.query();
		
		while(var_dict.next()) {
			choices.push({ 
				label : var_dict.getValue('label'),
				value: var_dict.getValue('element')
			});
		}
		
		return choices;
	},
	
	getBooleans: function(dictionary_table) {
		if (!dictionary_table)
			return;
		
		var choices = [];
		var var_dict = new GlideRecord('var_dictionary');
		var_dict.addQuery('name', dictionary_table);
		var_dict.addQuery('internal_type','boolean');
		var_dict.query();
		
		while(var_dict.next()) {
			choices.push({ 
				label : var_dict.getValue('label'),
				value: var_dict.getValue('element')
			});
		}
		
		return choices;
	},
	
	getURLs: function(dictionary_table) {
		if (!dictionary_table)
			return;
		
		var choices = [];
		var var_dict = new GlideRecord('var_dictionary');
		var_dict.addQuery('name', dictionary_table);
		var_dict.addQuery('internal_type','url');
		var_dict.query();
		
		while(var_dict.next()) {
			choices.push({ 
				label : var_dict.getValue('label'),
				value: var_dict.getValue('element')
			});
		}
		
		return choices;
	},

    type: 'TopicVariableAsChoice'
};
```