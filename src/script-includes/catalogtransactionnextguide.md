---
title: "CatalogTransactionNextGuide"
id: "catalogtransactionnextguide"
---

API Name: global.CatalogTransactionNextGuide

```js
gs.include('PrototypeServer');
gs.include('AbstractTransaction');

var CatalogTransactionNextGuide = Class.create();

CatalogTransactionNextGuide.prototype =  Object.extendsObject(AbstractTransaction, {
	
	execute : function() {
		try {
			var cartName = this.request.getParameter("sysparm_cart_name");
			var cart;
			if (!JSUtil.nil(cartName))
				cart = GlideappCart.get(cartName);
			else
				cart = GlideappCart.get();
			var og = new GlideappOrderGuide(cart.getGuide());
			og.next(this.request, this.response, cart);
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