---
title: "ChangeManagementEventHandler"
id: "changemanagementeventhandler"
---

API Name: global.ChangeManagementEventHandler

```js
var ChangeManagementEventHandler = Class.create();

ChangeManagementEventHandler.AFFECTED_CREATE = ChangeManagementEventHandlerSNC.AFFECTED_CREATE;
ChangeManagementEventHandler.IMPACTED_CREATE = ChangeManagementEventHandlerSNC.IMPACTED_CREATE;
ChangeManagementEventHandler.OFFERING_CREATE = ChangeManagementEventHandlerSNC.OFFERING_CREATE;
ChangeManagementEventHandler.IMPACTED_SERVICES_REFRESH = ChangeManagementEventHandlerSNC.IMPACTED_SERVICES_REFRESH;

ChangeManagementEventHandler.prototype = Object.extendsObject(ChangeManagementEventHandlerSNC, {

	initialize: function(gr) {
		ChangeManagementEventHandlerSNC.prototype.initialize.call(this, gr);
	},

	type: "ChangeManagementEventHandler"
});
```