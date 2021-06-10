---
title: "CurrencyConversionTableList"
id: "currencyconversiontablelist"
---

API Name: global.CurrencyConversionTableList

```js
var CurrencyConversionTableList = Class.create();
CurrencyConversionTableList.prototype = {
    initialize: function() {
    },

    type: 'CurrencyConversionTableList',
	
	process: function() {
		var list = GlideDBObjectManager.get().getTableExtensions('fx_conversion_rate');
		var array = [];
		for (var ii = 0; ii < list.size(); ++ii)
			array.push(list.get(ii));
		return array;
	}
};
```