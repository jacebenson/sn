---
title: "ChangeConflictHandler"
id: "changeconflicthandler"
---

API Name: global.ChangeConflictHandler

```js
var ChangeConflictHandler = Class.create();

ChangeConflictHandler.CONFLICT = ChangeConflictHandlerSNC.CONFLICT;
ChangeConflictHandler.HAS_BEEN_HANDLED = ChangeConflictHandlerSNC.HAS_BEEN_HANDLED;
ChangeConflictHandler.CHANGE_CONFLICT_HANDLER_LOG = ChangeConflictHandlerSNC.CHANGE_CONFLICT_HANDLER_LOG;

ChangeConflictHandler.prototype = Object.extendsObject(ChangeConflictHandlerSNC, {
	
	initialize: function (dumpCount, consolidatedConflicts, sourceRecordCISysId) {
		ChangeConflictHandlerSNC.prototype.initialize.call(this, dumpCount, consolidatedConflicts, sourceRecordCISysId);
	},

	type: "ChangeConflictHandler"
});

```