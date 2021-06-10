---
title: "CatalogTransactionUpdateProceed"
id: "catalogtransactionupdateproceed"
---

API Name: global.CatalogTransactionUpdateProceed

```js
gs.include("PrototypeServer");

var CatalogTransactionUpdateProceed = Class.create();

CatalogTransactionUpdateProceed.prototype = {
	
	initialize : function(request, response) {
		this.request = request;
		this.response = response;
	},
	
	execute : function() {
		try {
			var cart;
			var cartName = this.request.getParameter("sysparm_cart_name");
			if (!JSUtil.nil(cartName))
				cart = GlideappCart.get(cartName);
			else
				cart = GlideappCart.get();
			var cart_item = this.request.getParameter('sysparm_cart_id');
			cart.updateCart(this.request, cart_item);
			return new CatalogTransactionCheckout(this.request, this.response).execute();
		} catch (e) {
			var catalogExceptionUtils = new CatalogExceptionUtils();
			if(catalogExceptionUtils.isCartException(e)) {
				return catalogExceptionUtils.handleCartException(e);	
			}
			gs.debug(e);
		}
	}
};
```