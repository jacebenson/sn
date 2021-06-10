---
title: "CatalogTransactionCheckoutTwo"
id: "catalogtransactioncheckouttwo"
---

API Name: global.CatalogTransactionCheckoutTwo

```js
gs.include('PrototypeServer');
gs.include('AbstractTransaction');

var CatalogTransactionCheckoutTwo = Class.create();

CatalogTransactionCheckoutTwo.prototype = Object.extendsObject(CatalogTransactionCheckout, {

    execute: function() {
        var catalog = this.request.getParameter("sysparm_catalog");
        var catalogView = this.request.getParameter("sysparm_catalog_view");
        var cartName = null;
        if (this.request.getParameter("sysparm_cart_name") != null)
            cartName = '' + this.request.getParameter("sysparm_cart_name");
        var cart;
        if (!JSUtil.nil(cartName))
            cart = GlideappCart.get(cartName);
        else
            cart = GlideappCart.get();
        var isNewOrderNow = gs.getProperty("glide.sc.enable_order_now", "false");
        if (isNewOrderNow == 'true' && !JSUtil.nil(cartName) && cartName.startsWith('cart_')) {
            var default_cart_item_id = gs.getSession().getProperty("default_cart_item");

            //for new order now, an entry was inserted in default cart, on successful checkout, that entry needs to be deleted
            if (!JSUtil.nil(cartName) && !JSUtil.nil(default_cart_item_id)) {
                var def_cart = GlideappCart.get();
                def_cart.remove(default_cart_item_id);
                gs.getSession().clearProperty("default_cart_item");
            }
        }
        if (!cart.getCartItems().hasNext()) {
            gs.addInfoMessage(gs.getMessage("Cannot check out with an empty cart!"));
            return gs.getSession().getStack().purge("com.glideapp.servicecatalog");
        }
        var conflictingCartDomain = cart.findConflictingDomain();
        if (conflictingCartDomain) {
            gs.addErrorMessage(gs.getMessage("Your cart has item(s) belonging to the '{0}' domain. Please change the domain to continue with the checkout.", conflictingCartDomain));
            var urlStack = j2js(gs.getSession().getStack());
            this.response.sendRedirect(urlStack.pop());
            return;
        }
        this._updateCart();
        var gotoURL = this.request.getParameter("sysparm_goto_url");
        if (gotoURL)
            return gotoURL;
        return this._checkout(catalog, catalogView, cartName);
    },

    _updateCart: function() {
        var delivery_address = this.request.getParameter("requestor_location");
        var special_instructions = this.request.getParameter("special_instructions");
        var cartName = this.request.getParameter("sysparm_cart_name");
        var requested_for = this.request.getParameter("sc_cart.requested_for");
        var cart;
        if (!JSUtil.nil(cartName))
            cart = GlideappCart.get(cartName);
        else
            cart = GlideappCart.get();

        if (JSUtil.notNil(requested_for))
            cart.setRequestedFor(requested_for);

        if (delivery_address !== null)
            cart.setDeliveryAddress(delivery_address);

        if (special_instructions !== null)
            cart.setSpecialInstructions(special_instructions);

        cart.update();
    }
});
```