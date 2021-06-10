---
title: "ChangeCIAssociation"
id: "changeciassociation"
---

API Name: global.ChangeCIAssociation

```js
var ChangeCIAssociation = Class.create();
// Tables
ChangeCIAssociation.TASK_CI = ChangeCIAssociationSNC.TASK_CI;
ChangeCIAssociation.TASK_CMDB_CI_SERVICE = ChangeCIAssociationSNC.TASK_CMDB_CI_SERVICE;
ChangeCIAssociation.TASK_SERVICE_OFFERING = ChangeCIAssociationSNC.TASK_SERVICE_OFFERING;

// Field names
ChangeCIAssociation.CI_ITEM = ChangeCIAssociationSNC.CI_ITEM;
ChangeCIAssociation.CMDB_CI_SERVICE = ChangeCIAssociationSNC.CMDB_CI_SERVICE;
ChangeCIAssociation.SERVICE_OFFERING = ChangeCIAssociationSNC.SERVICE_OFFERING;

// type
ChangeCIAssociation.AFFECTED = ChangeCIAssociationSNC.AFFECTED;
ChangeCIAssociation.IMPACTED = ChangeCIAssociationSNC.IMPACTED;
ChangeCIAssociation.OFFERING = ChangeCIAssociationSNC.OFFERING;

// response param
ChangeCIAssociation.IGNORED_CMDB_CI_SYS_IDS = ChangeCIAssociationSNC.IGNORED_CMDB_CI_SYS_IDS;

ChangeCIAssociation.prototype = Object.extendsObject(ChangeCIAssociationSNC, {

	initialize: function(taskAssociationGr) {
		ChangeCIAssociationSNC.prototype.initialize.call(this, taskAssociationGr);
	},

	type: "ChangeCIAssociation"
});
```