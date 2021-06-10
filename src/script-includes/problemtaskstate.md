---
title: "ProblemTaskState"
id: "problemtaskstate"
---

API Name: global.ProblemTaskState

```js
var ProblemTaskState = Class.create();

ProblemTaskState.States = {
							NEW: ProblemTaskStateSNC.NEW,
							ASSESS: ProblemTaskStateSNC.ASSESS,
							WORK_IN_PROGRESS: ProblemTaskStateSNC.WORK_IN_PROGRESS,
							CLOSED: ProblemTaskStateSNC.CLOSED
						  };

ProblemTaskState.prototype = Object.extendsObject(global.AbstractAjaxProcessor, {

	getProblemTaskState: function() {
		return ProblemTaskState.States;
	},
	
    type: 'ProblemTaskState'
});
```