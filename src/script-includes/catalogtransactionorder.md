---
title: "CatalogTransactionOrder"
id: "catalogtransactionorder"
---

API Name: global.CatalogTransactionOrder

```js
gs.include("PrototypeServer");

var CatalogTransactionOrder = Class.create();

CatalogTransactionOrder.prototype = {

    initialize: function(request, response) {
        this.request = request;
        this.response = response;
    },

    execute: function() {
		try {
			var cart;
			var cartName = this.request.getParameter("sysparm_cart_name");
			if (!JSUtil.nil(cartName))
				cart = GlideappCart.get(cartName);
			else
				cart = GlideappCart.get();

			var wishListItemId = this.request.getParameter("sysparm_wish_list_item_id") || '';
			wishListItemId = '' + wishListItemId;

			var requestedFor = this.request.getParameter("sysparm_requested_for") || "";
			var itemID = this.request.getParameter("sysparm_id") + "";
			var parentID = this.request.getParameter("sysparm_parent_sys_id") || "";
			var parentTable = this.request.getParameter("sysparm_parent_table") || "";

			var catalogItem = GlideappCatalogItem.get(itemID);
			if (!catalogItem || !catalogItem.canView())
				return;

			var cartItemId = cart.addToCart(this.request);
			if (!cartItemId) {
				return GlideappCatalogURLGenerator.getItemBaseURLWithParams(itemID, {
					sysparm_parent_sys_id: parentID,
					sysparm_parent_table: parentTable
				});
			}

			if (!JSUtil.nil(cartName) && !requestedFor) {
				//If requested_for is not sent in request default to either default cart or current logged in user, based on property
				//If property is true (default value), set requested for to that of default cart, else set it to the current logged in user
				var reqForOnCustomCart = GlideProperties.getBoolean("glide.sc.use_default_cart_requested_for", true) ? GlideappCart.get().getRequestedFor() : gs.getUserID();
				cart.setRequestedFor(reqForOnCustomCart);
			}

			if (cartItemId && wishListItemId)
				this.removeWishListItem(cartItemId, wishListItemId);
			return new CatalogTransactionCheckout(this.request, this.response).execute();
		} catch(e) {
			var catalogExceptionUtils = new CatalogExceptionUtils();
			if(catalogExceptionUtils.isCartException(e)) {
				return catalogExceptionUtils.handleCartException(e);	
			}
			gs.debug(e);
		}
    },

    removeWishListItem: function(cartItemId, wishListItemId) {
        var savedItemCart = GlideappCart.get("saved_items");
		if (!savedItemCart.copyAttachments(wishListItemId, cartItemId))
			return;

        savedItemCart.remove(wishListItemId);
    }
};
```