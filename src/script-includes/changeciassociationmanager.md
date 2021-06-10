---
title: "ChangeCIAssociationManager"
id: "changeciassociationmanager"
---

API Name: global.ChangeCIAssociationManager

```js
var ChangeCIAssociationManager = Class.create();
ChangeCIAssociationManager.prototype = Object.extendsObject(ChangeCIAssociationManagerSNC, {

	initialize: function(changeRequest, chgMgtWorker) {
		ChangeCIAssociationManagerSNC.prototype.initialize.call(this, changeRequest, chgMgtWorker);
	},

	type: "ChangeCIAssociationManager"
});
```