---
title: "sc_ic_TaskDefnStagingAJAX"
id: "sc_ic_taskdefnstagingajax"
---

API Name: global.sc_ic_TaskDefnStagingAJAX

```js
var sc_ic_TaskDefnStagingAJAX = Class.create();
sc_ic_TaskDefnStagingAJAX.prototype = Object.extendsObject(AbstractAjaxProcessor, {
	getNextOrderNumber : function() {		
		var itemStagingSysId = this.getParameter("sysparm_sc_ic_item_staging");
		
		return sc_ic_Factory.getWrapperClass(sc_ic.TASK_DEFN_STAGING).getNextOrderNumber(itemStagingSysId);		
	},

	isPublic: function() {
		return false;
	},

    type: 'sc_ic_TaskDefnStagingAJAX'
});
```