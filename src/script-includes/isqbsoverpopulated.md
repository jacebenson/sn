---
title: "IsQBSOverpopulated"
id: "isqbsoverpopulated"
---

API Name: global.IsQBSOverpopulated

```js
var IsQBSOverpopulated = Class.create();
IsQBSOverpopulated.prototype = Object.extendsObject(AbstractAjaxProcessor, {
    type: 'IsQBSOverpopulated',
	
	getErrorMessage: function() {
		var qbsSysId = this.getParameter('qbs_sys_id');
	    var qbsm = new SNC.QueryBasedServiceManager();
		var err = qbsm.getErrorMessageIfTooManyElements(qbsSysId);
		//create a tooltip text by removing all the HTML tags
		var regex = /<.+?>/g;
		var tooltip = err.replace(regex, '');
		if (0 !== err.length)
			err = {message: err, tooltip: tooltip};
		return JSON.stringify(err);
	}
});
```