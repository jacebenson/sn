---
title: "TransformerDefinitionOutputStrategyList"
id: "transformerdefinitionoutputstrategylist"
---

API Name: global.TransformerDefinitionOutputStrategyList

```js
var TransformerDefinitionOutputStrategyList = Class.create();
TransformerDefinitionOutputStrategyList.prototype = {
    initialize: function() {
    },

    type: 'TransformerDefinitionOutputStrategyList',

	process: function() {
		// Add table names to the list. 
		// These should represent classes that implement ITransformerOutputStrategy interface.
		var list = ['none','sys_complex_object_output_strategy'];
		return list;
	}
};
```