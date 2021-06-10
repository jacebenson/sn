---
title: "TransferOrderLineTaskUtils"
id: "transferorderlinetaskutils"
---

API Name: global.TransferOrderLineTaskUtils

```js
var TransferOrderLineTaskUtils = Class.create();
TransferOrderLineTaskUtils.prototype = {
    initialize: function() {
    },

	/*
 	* Description: Used as RefQual for Vendor list in Transfer Order Line Task for Ship,
 	* return Campany list with vendor = true filter
  	*/
	getVendorList : function() {
		
		var coreCompany = new GlideRecord('core_company');
        	coreCompany.addQuery('vendor', true);
		coreCompany.query();
		var result = [];
		while (coreCompany.next()){
		    result.push(coreCompany.sys_id.toString());
		}
		var strQuery = "sys_idIN";
		if (result.length > 0)
		    return strQuery + result.join(",");
		else
		    return strQuery + null;
	},
	
    type: 'TransferOrderLineTaskUtils'
};
```