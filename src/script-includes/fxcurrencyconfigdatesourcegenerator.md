---
title: "FxCurrencyConfigDateSourceGenerator"
id: "fxcurrencyconfigdatesourcegenerator"
---

API Name: global.FxCurrencyConfigDateSourceGenerator

```js
var FxCurrencyConfigDateSourceGenerator = Class.create();
FxCurrencyConfigDateSourceGenerator.prototype = Object.extendsObject(FxCurrencyConfigFieldChoiceListGenerator, {
    initialize: function(numLevels) {
		FxCurrencyConfigFieldChoiceListGenerator.prototype.initialize.call(this, numLevels);
    },

	shouldAddField: function(ed) {
		return (ed.getInternalType() == 'glide_date_time');
	},

	type: 'FxCurrencyConfigDateSourceGenerator'
});
```