---
title: "AJAXStoreListState"
id: "ajaxstoreliststate"
---

API Name: global.AJAXStoreListState

```js
var AJAXStoreListState = Class.create();
AJAXStoreListState.prototype = Object.extendsObject(AbstractAjaxProcessor, {
	process: function() {
		var key = this.getParameter("key");
		var state = this.getParameter("state");
		
		if (!key)
			return false;
		
		gs.getSession().putClientData(key, state);
		
		return true;
	},
    type: 'AJAXStoreListState'
});
```