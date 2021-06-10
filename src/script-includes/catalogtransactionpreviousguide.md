---
title: "CatalogTransactionPreviousGuide"
id: "catalogtransactionpreviousguide"
---

API Name: global.CatalogTransactionPreviousGuide

```js
gs.include('PrototypeServer');
gs.include('AbstractTransaction');

var CatalogTransactionPreviousGuide = Class.create();

CatalogTransactionPreviousGuide.prototype =  Object.extendsObject(AbstractTransaction, {
	
	execute : function() {
		try {
			var cart;
			var cartName = this.request.getParameter("sysparm_cart_name");
			if (!JSUtil.nil(cartName))
				cart = GlideappCart.get(cartName);
			else
				cart = GlideappCart.get();
			var og = new GlideappOrderGuide(cart.getGuide());
			og.previous(this.request, this.response, cart);
		} catch (e) {
			var catalogExceptionUtils = new CatalogExceptionUtils();
			if (catalogExceptionUtils.isCartException(e)) {
				return catalogExceptionUtils.handleCartException(e);
			}
			gs.debug(e);
		}
	}
});
```