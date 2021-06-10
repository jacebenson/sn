---
title: "CatalogPortalSettingsMigration"
id: "catalogportalsettingsmigration"
---

API Name: global.CatalogPortalSettingsMigration

```js
var CatalogPortalSettingsMigration = Class.create();
CatalogPortalSettingsMigration.prototype = {
    initialize: function() {
    },
	migrate: function(standardUpdate) {
		var gr = new GlideRecord('sc_cat_item');
		gr.setWorkflow(standardUpdate);
		gr.query();
		while (gr.next()) {
			var updated = false;
			if (gr.no_cart == true) {
				updated = true;
				gr.no_cart_v2 = gr.no_cart;
			}
			if (gr.no_quantity == true) {
				updated = true;
				gr.no_quantity_v2 = gr.no_quantity;
			}
			if (updated)
				gr.update();
		}
	},
    type: 'CatalogPortalSettingsMigration'
};
```