---
title: "SAMRefreshEligibityCalculator"
id: "samrefresheligibitycalculator"
---

API Name: global.SAMRefreshEligibityCalculator

```js
var SAMRefreshEligibityCalculator = Class.create();
SAMRefreshEligibityCalculator.prototype = {
    initialize: function() {
    },

	process:  function() {
		var hwModelGr = new GlideRecord('cmdb_hardware_product_model');
		hwModelGr.addNotNullQuery('useful_life');
		hwModelGr.query();
		while (hwModelGr.next()) {
			var hwGr = new GlideRecord('alm_hardware');
			hwGr.addQuery('model', hwModelGr.getUniqueValue());
			hwGr.addQuery('sys_created_on', '<', gs.monthsAgo(parseInt(hwModelGr.getValue('useful_life'))));
			hwGr.addQuery('eligible_for_refresh', false);
			hwGr.setValue('eligible_for_refresh', true);
			hwGr.updateMultiple();
		}
	},

    type: 'SAMRefreshEligibityCalculator'
};
```