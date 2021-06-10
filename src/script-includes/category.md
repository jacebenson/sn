---
title: "Category"
id: "category"
---

API Name: global.Category

```js
gs.include("PrototypeServer");

var Category = Class.create();

Category.prototype = {
    initialize : function() {
		
    },

    getReferenceQual : function(current) {
		var catalog = current.sc_catalog;
        if (catalog)
            return 'sc_catalog=' + catalog;
        return '';
    },
	
	getDefaultCatalogValue: function() {
		return GlideappCategory.getDefaultCatalogValue();
	}
};

```