---
title: "FxCurrencyConfigFieldListGenerator"
id: "fxcurrencyconfigfieldlistgenerator"
---

API Name: global.FxCurrencyConfigFieldListGenerator

```js
var FxCurrencyConfigFieldListGenerator = Class.create();
FxCurrencyConfigFieldListGenerator.prototype = {
    initialize: function() {
    },

	process: function(targetTable) {
		var fields = [];

		if (JSUtil.nil(targetTable))
			return fields;

		var td = GlideTableDescriptor.get(targetTable);
		if (!td.isValid())
			return fields;

		var eds = td.getSchemaList();
		for (var i = 0; i < eds.size(); ++i) {
			var ed = eds.get(i);
			if (ed.getTableName() == targetTable && ed.getInternalType() == 'currency2')
				fields.push(ed.getName());
		}
	
		return fields;
	},

	type: 'FxCurrencyConfigFieldListGenerator'
};
```