---
title: "ChangeManagementWorker"
id: "changemanagementworker"
---

API Name: global.ChangeManagementWorker

```js
var ChangeManagementWorker = Class.create();

// Table names
ChangeManagementWorker.CHG_MGT_WORKER = ChangeManagementWorkerSNC.CHG_MGT_WORKER;

// Event
ChangeManagementWorker.SN_CHG_MGT = ChangeManagementWorkerSNC.SN_CHG_MGT;

// Status
ChangeManagementWorker.WAITING = ChangeManagementWorkerSNC.WAITING;
ChangeManagementWorker.IN_PROGRESS = ChangeManagementWorkerSNC.IN_PROGRESS;
ChangeManagementWorker.COMPLETE = ChangeManagementWorkerSNC.COMPLETE;
ChangeManagementWorker.ERROR = ChangeManagementWorkerSNC.ERROR;

// Operation
ChangeManagementWorker.CREATE = ChangeManagementWorkerSNC.CREATE;
ChangeManagementWorker.DELETE = ChangeManagementWorkerSNC.DELETE;
ChangeManagementWorker.REFRESH = ChangeManagementWorkerSNC.REFRESH;

// REST enpoint
ChangeManagementWorker.SN_CHG_REST = ChangeManagementWorkerSNC.SN_CHG_REST;

ChangeManagementWorker.prototype = Object.extendsObject(ChangeManagementWorkerSNC, {

	initialize: function(chgMgtWorkerGr) {
		ChangeManagementWorkerSNC.prototype.initialize.call(this, chgMgtWorkerGr);
	},

	type: "ChangeManagementWorker"
});
```