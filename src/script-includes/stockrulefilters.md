---
title: "StockRuleFilters"
id: "stockrulefilters"
---

API Name: global.StockRuleFilters

```js
var StockRuleFilters = Class.create();
StockRuleFilters.prototype = {
	initialize : function() {
	},

	getStockRooms : function(model) {
		/**
		 * Description: Used as RefQual for stockroom list in Stock Rule, return
		 * stockrooms for model
		 */
		var sr = new GlideRecord('alm_m2m_stockroom_model');
		sr.addQuery('model', model);
		sr.query();

		var strQuery = 'sys_idIN';
		while (sr.next())
			strQuery += ',' + sr.stockroom;

		return strQuery;
	},
	getParentStockRooms : function(stockRuleGr) {
		/**
		 * Description: Used as RefQual for stockroom list in Stock Rule, return
		 * stockrooms for model
		 */
		var sr = new GlideRecord('alm_m2m_stockroom_model');
		sr.addQuery('model', stockRuleGr.model);
		if (new global.AssetManagementBaseJob().fIsDomainDataSeparationEnabled) {
			sr.addQuery('stockroom.sys_domain', 'IN', ['global', stockRuleGr.sys_domain]);
		}
		sr.query();

		var strQuery = 'sys_idIN';
		while (sr.next()) {
			strQuery += ',' + sr.stockroom;
		}

		return strQuery;
	},

	type : 'StockRuleFilters'
};
```