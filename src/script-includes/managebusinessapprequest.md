---
title: "ManageBusinessAppRequest"
id: "managebusinessapprequest"
---

API Name: global.ManageBusinessAppRequest

```js
var ManageBusinessAppRequest = Class.create();
ManageBusinessAppRequest.prototype = {
    initialize: function() {
    },
	registerBusinessApp: function(inputVariables) {
		var registerObj = {};
		registerObj.name = inputVariables.business_application;
		var appGr = new GlideRecord("cmdb_ci_business_app");
		appGr.initialize();
		appGr.setValue('name', inputVariables.business_application);
		appGr.setValue('short_description', inputVariables.description);
		appGr.setValue('it_application_owner', inputVariables.it_app_owner);
		appGr.setValue('owned_by', inputVariables.business_owner);
		appGr.setValue('application_type', inputVariables.application_type);
		appGr.setValue('install_status', '0');
		if(appGr.insert())
			return true ;
		else
			return false;
	},

    type: 'ManageBusinessAppRequest'
};
```