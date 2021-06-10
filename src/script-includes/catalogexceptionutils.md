---
title: "CatalogExceptionUtils"
id: "catalogexceptionutils"
---

API Name: global.CatalogExceptionUtils

```js
var CatalogExceptionUtils = Class.create();
CatalogExceptionUtils.prototype = {
    initialize: function() {
    },
	isCartException: function (e) {
		var exceptionString = e.toString();
		if(exceptionString.split(':')[0].indexOf('CartException') > 0)
			return true;
		return false;
	},
	isValveException: function (e) {
		var exceptionString = e.toString();
		if(exceptionString.split(':')[0].indexOf('ValveException') > 0)
			return true;
		return false;
	},
	handleCartException: function(e) {
		gs.addErrorMessage(e.getMessage());
		var redirect = e.getRedirectURL();
		if (!redirect)
			redirect = gs.getSession().getStack().top();
		
		return redirect;
	},
	handleCartExceptionInPortal: function(e) {
		var response_body = {};
		response_body.errMsg = e.getMessage();
		return response_body;
	},
	handleValveException: function (e) {
		gs.addErrorMessage(e.getMessage());
		return gs.getSession().getStack().top();
	},
	handleValveExceptionInPortal: function (e) {
		var response_body = {};
		response_body.errMsg = e.getMessage();
		return response_body;
	},
    type: 'CatalogExceptionUtils'
};
```