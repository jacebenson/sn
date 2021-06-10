---
title: "FxCurrencyConfigRateFilterTargetFieldGenerator"
id: "fxcurrencyconfigratefiltertargetfieldgenerator"
---

API Name: global.FxCurrencyConfigRateFilterTargetFieldGenerator

```js
var FxCurrencyConfigRateFilterTargetFieldGenerator = Class.create();
FxCurrencyConfigRateFilterTargetFieldGenerator.prototype = Object.extendsObject(FxCurrencyConfigFieldChoiceListGenerator, {
    initialize: function(numLevels) {
		FxCurrencyConfigFieldChoiceListGenerator.prototype.initialize.call(this, numLevels);
    },
	
	shouldAddField: function(ed) {
		return (!(ed.getName()).startsWith("sys_")); // Don't want system fields
	},
	
    type: 'FxCurrencyConfigRateFilterTargetFieldGenerator'
}); 
```