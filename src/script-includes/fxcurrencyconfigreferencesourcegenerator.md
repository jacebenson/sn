---
title: "FxCurrencyConfigReferenceSourceGenerator"
id: "fxcurrencyconfigreferencesourcegenerator"
---

API Name: global.FxCurrencyConfigReferenceSourceGenerator

```js
var FxCurrencyConfigReferenceSourceGenerator = Class.create();
FxCurrencyConfigReferenceSourceGenerator.prototype = Object.extendsObject(FxCurrencyConfigFieldChoiceListGenerator, {
    initialize: function(numLevels) {
		FxCurrencyConfigFieldChoiceListGenerator.prototype.initialize.call(this, numLevels);
    },

	shouldAddField: function(ed) {
		return (ed.getInternalType() == 'string' || (ed.isReference() && ed.getReference() == 'fx_currency'));
	},

	shouldRecurse: function(ed) {
		return (ed.isReference() && ed.getReference() != 'fx_currency');
	},	

	type: 'FxCurrencyConfigReferenceSourceGenerator'
});
```