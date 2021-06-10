---
title: "CatalogDomainUtil"
id: "catalogdomainutil"
---

API Name: global.CatalogDomainUtil

```js
var CatalogDomainUtil = Class.create();
CatalogDomainUtil.prototype = {
    initialize: function() {
    },

	isDomainIsolationEnabled: function() {
				return (gs.getProperty("glide.sys.domain.partitioning") == "true" ||
						gs.getProperty("glide.sys.domain.delegated_administration") == "true")
		&& gs.getProperty("com.glide.sc.domain_separation.enabled", "true") == "true" && GlidePluginManager.isActive("com.glideapp.servicecatalog.domain_separation");
	},
	
    type: 'CatalogDomainUtil'
};
```