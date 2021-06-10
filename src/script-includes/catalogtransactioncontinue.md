---
title: "CatalogTransactionContinue"
id: "catalogtransactioncontinue"
---

API Name: global.CatalogTransactionContinue

```js
gs.include("PrototypeServer");

var CatalogTransactionContinue = Class.create();
CatalogTransactionContinue.prototype = {
	initialize : function(request, response) {
		this.request = request;
		this.response = response;
	},
	
	execute : function() {
		return GlideappCatalogURLGenerator.getContinueShoppingUrl(this.request.getParameter("sysparm_catalog"), this.request.getParameter("sysparm_catalog_view"));
	}
}
```