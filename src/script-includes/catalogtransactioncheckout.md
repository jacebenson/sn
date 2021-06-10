---
title: "CatalogTransactionCheckout"
id: "catalogtransactioncheckout"
---

API Name: global.CatalogTransactionCheckout

```js
gs.include('PrototypeServer');
gs.include('AbstractTransaction');

var CatalogTransactionCheckout = Class.create();

CatalogTransactionCheckout.prototype = Object.extendsObject(AbstractTransaction, {

    execute: function() {
        var catalog = this.request.getParameter("sysparm_catalog");
        var catalogView = this.request.getParameter("sysparm_catalog_view");
        var cartName = this.request.getParameter("sysparm_cart_name");
        var parentID = this.request.getParameter("sysparm_parent_sys_id");
        var parentTable = this.request.getParameter("sysparm_parent_table");
		var paramRequestedFor = this.request.getParameter("sysparm_requested_for");
        var viewName = this.request.getParameter("sysparm_view");
        var params = {
            "sysparm_parent_sys_id": parentID,
            "sysparm_parent_table": parentTable,
            "sysparm_view": viewName
        };
        var cart;
        if (!JSUtil.nil(cartName))
            cart = GlideappCart.get(cartName);
        else
            cart = GlideappCart.get();
		
        if (!cart.getCartItems().hasNext()) {
            gs.addInfoMessage(gs.getMessage("Cannot check out with an empty cart!"));
            return gs.getSession().getStack().purge("com.glideapp.servicecatalog");
        }

		var requestForSysID = new global.GlobalServiceCatalogUtil().getRequestForSysID(parentTable, parentID) || paramRequestedFor;
		if (JSUtil.notNil(requestForSysID))
            cart.setRequestedFor(requestForSysID);
		
        var twoStep = gs.getProperty("glide.sc.checkout.twostep", "false") == 'true' && !cart.checkAllItemsHaveRequestedFor();
        if (twoStep) {
			if (!this._validateCart(cart))
				return;
			
            if (!JSUtil.nil(cartName))
                return SNC.CatalogURLGenerator.getRedirectPreviewOrderWithParams(catalog, catalogView, cartName, params);
            else
				return GlideappCatalogURLGenerator.getRedirectOneStageCheckoutWithParams(catalog, catalogView, params);
		}
        return this._checkout(catalog, catalogView, cartName);
    },

    _checkout: function(catalog, catalogView, cartName) {
		try {
			var view = this.request.getParameter("sysparm_view");
			if (!view)
				view = "ess";
			var parentID = this.request.getParameter("sysparm_parent_sys_id");
			var parentTable = this.request.getParameter("sysparm_parent_table");
			var params = {};
			params.sysparm_parent_sys_id = parentID;
			params.sysparm_parent_table = parentTable;
			var req = new GlideappRequestNew();
			req.setParentParams(params);

			var requestRecord;
			var cart;
			if (!JSUtil.nil(cartName)) {
				requestRecord = req.copyCart(cartName);
				cart = GlideappCart.get(cartName);
			} else {
				requestRecord = req.copyCart();
				cart = GlideappCart.get();
			}
			var isNewOrderNow = gs.getProperty("glide.sc.enable_order_now", "false");
			if (isNewOrderNow == 'true' && !JSUtil.nil(cartName) && cartName.startsWith('cart_')) {
				var def_cart;
				def_cart = GlideappCart.get();

				// reset requested_for and special instructions property for default cart
				def_cart.setRequestedFor(gs.getUserID());
				def_cart.setSpecialInstructions('');

				//for new order now, an entry was inserted in default cart, on successful checkout, that entry needs to be deleted
				var id = gs.getSession().getProperty("default_cart_item");
				if (!JSUtil.nil(id)) {
					def_cart.remove(id);
					gs.getSession().clearProperty("default_cart_item");
				}
			}
			cart.empty();
			return this._checkoutRedirect(view, catalog, catalogView, requestRecord);
		} catch(e) {
			var catalogExceptionUtils = new CatalogExceptionUtils();
			if(catalogExceptionUtils.isCartException(e)) {
				return catalogExceptionUtils.handleCartException(e);
			}
			gs.debug(e);
		}
    },

    _checkoutRedirect: function(view, catalog, catalogView, requestRecord) {
        // If an alternative redirect was specified, use it!
        var altRedirect = this.request.getParameter("sysparm_redirect");
        if (!gs.nil(altRedirect)) {
            gs.addInfoMessage(gs.getMessage('Your request has been placed: {0}', '<a href="' + requestRecord.getLink() + '">' + requestRecord.number + '</a>'));
            return altRedirect;
        }
        var checkoutForm = gs.getProperty("glide.sc.checkout.form", "com.glideapp.servicecatalog_checkout_view");
        if (!checkoutForm) {
            gs.addErrorMessage(gs.getMessage("Invalid or empty checkout form specified in property : glide.sc.checkout.form"));
            return "home.do";
        }
        if (!view)
            view = "";
        var parentID = this.request.getParameter("sysparm_parent_sys_id");
        var parentTable = this.request.getParameter("sysparm_parent_table");
        var viewName = this.request.getParameter("sysparm_view");
        var params = {
            "sysparm_parent_sys_id": parentID,
            "sysparm_parent_table": parentTable,
            "sysparm_view": viewName
        };
        answer = GlideappCatalogURLGenerator.getCheckoutURLForPageWithParams(checkoutForm, requestRecord.sys_id, view, catalog, catalogView, params);
        return answer;
    },
	
	_validateCart: function(cart) {
		var msg = cart.validateCartItems();
		if (msg != "valid") {
			gs.addErrorMessage(msg);
			var urlStack = j2js(gs.getSession().getStack());
			this.response.sendRedirect(urlStack.pop());
			return false;
		}
		return true;
	}
});
```