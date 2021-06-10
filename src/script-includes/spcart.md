---
title: "SPCart"
id: "spcart"
---

API Name: global.SPCart

```js
var SPCart = Class.create();
  
// Static methods
SPCart._getValueForVariable = function(value, type) {
    if (type == 'glide_date') {
        var d = new GlideDate();
        d.setDisplayValue(value);
        value = d.getValue();
    } else if (type == 'glide_date_time') {
        var dt = new GlideDateTime();
        dt.setDisplayValue(value);
        value = dt.getValue();
    }
    return value;
};

SPCart.updateItem = function(itemID, vars) {
    var scCartItemGR = new GlideRecord("sc_cart_item");
    if (!scCartItemGR.get(itemID))
        return false;
    var scItemOptionGR;
    var variable;
    for (var i = 0; i < vars.length; i++) {
        variable = vars[i];
        scItemOptionGR = new GlideRecord("sc_item_option");
        scItemOptionGR.addQuery("cart_item", itemID);
        scItemOptionGR.addQuery("item_option_new", variable.sys_id);
        scItemOptionGR.query();

        if (scItemOptionGR.next()) {
            scItemOptionGR.setValue("value", this._getValueForVariable(variable.value, variable.type));
            scItemOptionGR.update();
        }
    }
};

//Instance methods
SPCart.prototype = Object.create(Cart.prototype);

SPCart.prototype.initialize = function(cartName, userID) {
    this.cartName = !cartName ? null : cartName;
    this.userID = !userID ? null : userID;

    this.cart = this.getCart();
};

SPCart.prototype.getCartID = function() {
    return this.cart.sys_id;
};

SPCart.prototype.setHidden = function(state) {
    var gr = new GlideRecord('sc_cart');
    if (gr.get(this.cart.sys_id)) {
        gr.hidden = state;
        gr.update();
    }
};

SPCart.prototype.getCartObj = function() {
    var cart = GlideappCart.getCartForRhino(this.cartName, this.userID);
    var formatter = new SPCurrencyFormatter();
    var deliveryAddr = cart.getDeliveryAddress();
    var additionalDetails = cart.getSpecialInstructions();
    return {
        requested_for: cart.getRequestedFor(),
        delivery_address: deliveryAddr ? deliveryAddr : sn_sc.CartJS.getRequestedForAddress(this.userID),
        additional_details: additionalDetails,
        requested_for_display_name: cart.getRequestedForDisplayName(),
        user: cart.getCartRecord.getValue("user"),
        name: this.cartName,
        subtotal: this.getSubtotal(),
        display_subtotal: formatter.trim(this.getSubtotal()),
        recurring_subtotals: this.getRecurringSubtotals()
    };
};

SPCart.prototype.getSubtotal = function() {
    return this.getItems().map(function(item) {
        return item.subtotal;
    }).reduce(function(prevValue, currValue) {
        return prevValue + currValue;
    }, 0.0);
};

SPCart.prototype.getRecurringSubtotals = function() {
    var recurringSubtotalArr = {};
    this.getItems().filter(function(item) {
        return item.recurring_price && item.recurring_price > 0;
    }).map(function(item) {
        return {
            period: item.recurring_frequency_display,
            subtotal: item.recurring_subtotal
        };
    }).forEach(function(item) {
        if (!recurringSubtotalArr[item.period])
            recurringSubtotalArr[item.period] = item.subtotal;
        else
            recurringSubtotalArr[item.period] += item.subtotal;
    });

    var formatter = new SPCurrencyFormatter();

    for (var key in recurringSubtotalArr) {
        recurringSubtotalArr[key] = formatter.trim(recurringSubtotalArr[key]);
    }

    return recurringSubtotalArr;
};

SPCart.prototype.getItems = function() {
    var items = [];
    var cartItemGR = new GlideRecord("sc_cart_item");
    cartItemGR.addQuery("cart", this.cart.getUniqueValue());
    cartItemGR.query();

    while (cartItemGR.next()) {
        items.push(this.getItem(cartItemGR.getUniqueValue()));
    }

    return items;
};

SPCart.prototype.setDeliveryAddress = function(deliveryAddress) {
    var cart = GlideappCart.getCartForRhino(this.cartName, this.userID);
    cart.setDeliveryAddress(deliveryAddress);
};

SPCart.prototype.setSpecialInstructions = function(specialInstructions) {
    var cart = GlideappCart.getCartForRhino(this.cartName, this.userID);
    cart.setSpecialInstructions(specialInstructions);
};

SPCart.prototype.setRequestedFor = function(requestedFor) {
    var cart = GlideappCart.getCartForRhino(this.cartName, this.userID);
    var cartGR = cart.getGlideRecord();
    cartGR.setValue("requested_for", requestedFor);
    cartGR.update();
};

SPCart.prototype.canViewRF = function() {
    var helper = new GlideappCalculationHelper();
    return helper.canViewRF();
};

SPCart.prototype.getItem = function(cartItemID) {
    var optionCount = 0;
    var optionGR = new GlideRecord("sc_item_option");
    optionGR.addQuery("cart_item", cartItemID);
    optionGR.query();
    optionCount = optionGR.getRowCount();

    var cartItem = GlideappCartItem.get(cartItemID);
    return {
        name: cartItem.getDisplayName(),
        price: cartItem.getPrice(),
        display_price: cartItem.getDisplayPrice(),
        can_order: cartItem.canOrder(),
        has_options: optionCount > 0,
        recurring_price: cartItem.getRecurringPrice(),
        display_recurring_price: cartItem.getRecurringDisplayPrice(),
        quantity: cartItem.getQuantity(),
        show_quantity: cartItem.getShowQuantity(),
        subtotal: cartItem.getSubtotal(),
        subtotal_price: cartItem.getSubtotalPrice(),
        subtotal_price_with_currency: cartItem.getSubtotalWithCurrency(),
        recurring_subtotal: cartItem.getRecurringSubtotal(),
        recurring_subtotal_price: cartItem.getRecurringSubtotalPrice(),
        recurring_subtotal_price_with_currency: cartItem.getRecurringSubtotalWithCurrency(),
        recurring_frequency_display: cartItem.getGr().cat_item.recurring_frequency.getDisplayValue(),
        short_description: cartItem.getGr().cat_item.short_description.getDisplayValue(),
        picture: cartItem.getGr().cat_item.picture.getDisplayValue(),
        item_id: cartItem.getGr().getValue("cat_item"),
        sys_class_name: cartItem.getGr().cat_item.sys_class_name.getValue(),
        show_price: cartItem.showPrice(),
        show_recurring_price: cartItem.showRecurringPrice(),
        sys_id: cartItemID,
        sys_updated_on: cartItem.getGr().sys_updated_on.getValue()
    };
};

//Copy the contents of a given cart into this one.
//Optionally, provide an array of cart item sys_ids to copy. Anything not included is ignored.
//Or, leave undefined to copy every item.
SPCart.prototype.loadCart = function(loadFromCartID, includedItemsArr) {
    var cartItemGR = new GlideRecord("sc_cart_item");
    cartItemGR.addQuery("cart", loadFromCartID);
    if (includedItemsArr && includedItemsArr.length > 0)
        cartItemGR.addQuery("sys_id", "IN", includedItemsArr.join(","));
    cartItemGR.query();
    var tableVarMap = {}; //Stores map of newCartItemId and [{name, value}]
    var newCartItemIds = [];
    while (cartItemGR.next()) {
        var newCartItemGR = new GlideRecord("sc_cart_item");
        newCartItemGR.initialize();
        newCartItemGR.cart = this.cart.sys_id;
        newCartItemGR.cat_item = cartItemGR.cat_item;
        newCartItemGR.quantity = cartItemGR.quantity;
        newCartItemGR.requested_for = cartItemGR.requested_for;
        newCartItemGR.setUseEngines(false);
        var newCartItemID = newCartItemGR.insert();
        newCartItemIds.push(newCartItemID);
		
		//copy attachments from cartItem to bundle item
		var attachmentNewIds = 
			GlideSysAttachment.copy('ZZ_YYsc_cart_item', cartItemGR.sys_id, 'sc_cart_item', newCartItemGR.sys_id);
		var attachmentIdsMap = {} // stores maps of old and new sysids of copied attachments
		for (var j = 0; j < attachmentNewIds.size(); j++) {
			var ids  = attachmentNewIds.get(j).split(',');
			attachmentIdsMap[ids[0]] = ids[1];
		}
        //copy the variables for this cart item
        var variableGR = new GlideRecord("sc_item_option");
        variableGR.addQuery("cart_item", cartItemGR.getUniqueValue());
        variableGR.query();

        var item_option_ids = [];
        while (variableGR.next()) {
            var newVariable = new GlideRecord("sc_item_option");
            newVariable.initialize();
            newVariable.cart_item = newCartItemID;
            newVariable.item_option_new = variableGR.item_option_new;
            item_option_ids.push(variableGR.getValue('item_option_new'));
            newVariable.order = variableGR.order;
            newVariable.sc_cat_item_option = variableGR.sc_cat_item_option;
			// Handling case for attachment type variable
			newVariable.value = variableGR.item_option_new.type != '33' ? variableGR.value : attachmentIdsMap[variableGR.value];
            newVariable.insert();
        }

        /** 
        	For TableVar newCartItemGR doesn't understand variables yet because the variables are created
        	freshly in the above loop. So we need to do a re-query at which point it loads table-var with empty value
        */
        //First get multi-row-set ids
        var tableVarIds = [];
        //Initialize for each new cart item
        tableVarMap[newCartItemID] = [];
        var itemOptionGr = new GlideAggregate("item_option_new");
        itemOptionGr.addNotNullQuery("variable_set");
        itemOptionGr.addAggregate("COUNT", "variable_set");
        itemOptionGr.addQuery("variable_set.type", "one_to_many");
        itemOptionGr.addQuery("sys_id", item_option_ids);
        itemOptionGr.query();
        while (itemOptionGr.next()) {
            tableVarIds.push(itemOptionGr.getValue("variable_set"));
        }
        //now iterate through multi-row-sets
        var multiRowSets = new GlideRecord("item_option_new_set");
        multiRowSets.addQuery("sys_id", tableVarIds);
        multiRowSets.query();
        while (multiRowSets.next()) {
            var tvarName = multiRowSets.getValue("internal_name");
            var tvarVal = cartItemGR.variables[tvarName];
            var valueDetails = {
                name: tvarName,
                value: tvarVal
            };
            tableVarMap[newCartItemID].push(valueDetails);
        }
    }

    //Insert table-var values
    var newCartItemsGr = new GlideRecord("sc_cart_item");
    newCartItemsGr.addQuery("sys_id", newCartItemIds);
    newCartItemsGr.query();
    while (newCartItemsGr.next()) {
        var cartItemTableVars = tableVarMap[newCartItemsGr.getUniqueValue()];
        for (var i = 0; i < cartItemTableVars.length; i++) {
            var cartItemTableVarInfo = cartItemTableVars[i];
            cartItemTableVars.variables;
            newCartItemsGr.variables[cartItemTableVarInfo.name] = "" + cartItemTableVarInfo.value;
        }
        newCartItemsGr.update();
    }
};
```