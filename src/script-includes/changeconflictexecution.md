---
title: "ChangeConflictExecution"
id: "changeconflictexecution"
---

API Name: global.ChangeConflictExecution

```js
var ChangeConflictExecution = Class.create();
ChangeConflictExecution.prototype = Object.extendsObject(ChangeConflictExecutionSNC, {

	initialize: function(_gr, _gs) {
		ChangeConflictExecutionSNC.prototype.initialize.call(this, _gr, _gs);
	},

	type: 'ChangeConflictExecution'
});
```