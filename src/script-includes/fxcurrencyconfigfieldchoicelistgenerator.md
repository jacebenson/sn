---
title: "FxCurrencyConfigFieldChoiceListGenerator"
id: "fxcurrencyconfigfieldchoicelistgenerator"
---

API Name: global.FxCurrencyConfigFieldChoiceListGenerator

```js
var FxCurrencyConfigFieldChoiceListGenerator = Class.create();
FxCurrencyConfigFieldChoiceListGenerator.prototype = {
    initialize: function(numLevels) {
		this.numLevels = numLevels || 3;
    },

	process: function(targetTable) {
		var fields = this.generate(this.numLevels, targetTable);
		var choiceList = new GlideChoiceList();
		for (var i = 0; i < fields.length; ++i)
			choiceList.add(fields[i].name, fields[i].label);

		return choiceList;
	},

	generate: function(numLevels, targetTable) {
		var fields = [];
		this._addFields(numLevels, fields, targetTable);

		fields.sort(function(first, second) {
			return String.localeCompare(first.label, second.label);
		});		
	
		return fields;
	},

	shouldAddField: function(ed) {
		return !ed.isReference();
	},

	shouldRecurse: function(ed) {
		return ed.isReference();
	},

	_addFields: function(level, fields, tableName, prefix) {
		var td = GlideTableDescriptor.get(tableName);
		if (!td.isValid())
			return;

		var eds = td.getSchemaList();
		for (var i = 0; i < eds.size(); ++i) {
			var ed = eds.get(i);
			var name = (prefix) ? prefix + '.' + ed.getName() : ed.getName() + '';

			if (this.shouldAddField(ed)) {
				var label = ed.getLabel() + ' [' + name + ']';
				fields.push({"name" : name, "label" : label});
			}

			if (this.shouldRecurse(ed) && level > 0) {
				this._addFields(level - 1, fields, ed.getReference(), name);
			}
		}
	},
	
	type: 'FxCurrencyConfigFieldChoiceListGenerator'
};
```