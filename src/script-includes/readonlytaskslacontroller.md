---
title: "ReadOnlyTaskSLAController"
id: "readonlytaskslacontroller"
---

API Name: global.ReadOnlyTaskSLAController

```js
var ReadOnlyTaskSLAController = Class.create();
ReadOnlyTaskSLAController.prototype = Object.extendsObject(ReadOnlyTaskSLAControllerSNC, {
	initialize: function() {
		ReadOnlyTaskSLAControllerSNC.prototype.initialize.call(this);
	},

	type: 'ReadOnlyTaskSLAController'
});
```