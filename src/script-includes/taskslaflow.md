---
title: "TaskSLAFlow"
id: "taskslaflow"
---

API Name: global.TaskSLAFlow

```js
var TaskSLAFlow = Class.create();
TaskSLAFlow.prototype = Object.extendsObject(TaskSLAFlowSNC, {
    initialize: function(taskSLAGr, slaDefGr) {
		TaskSLAFlowSNC.prototype.initialize.call(this, taskSLAGr, slaDefGr);
	},

    type: 'TaskSLAFlow'
});
```