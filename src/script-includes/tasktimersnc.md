---
title: "TaskTimerSNC"
id: "tasktimersnc"
---

API Name: global.TaskTimerSNC

```js
var TaskTimerSNC = Class.create();
TaskTimerSNC.prototype = {
	initialize: function() {},

	updateTaskTimer: function(taskGr, zeroWhenNoTimeWorked) {
		if (!taskGr || !taskGr.isValid())
			return;

		var totalTimeworked = 0;
		var updateRecord = zeroWhenNoTimeWorked || false;

		//get all time worked for this task
		var taskTimeWorkedGa = new GlideAggregate("task_time_worked");
		taskTimeWorkedGa.addQuery("task", taskGr.getUniqueValue());
		taskTimeWorkedGa.addAggregate("SUM", "time_worked");
		taskTimeWorkedGa.groupBy("task");
		taskTimeWorkedGa.query();
		if (taskTimeWorkedGa.next()) {
			totalTimeworked = taskTimeWorkedGa.getAggregate("SUM", "time_worked");
			updateRecord = true;
		}

		if (!updateRecord)
			return;

		taskGr.setValue("time_worked", totalTimeworked);
		// don't run task workflows because BR: "Task Time Worked" will create more time worked records
		taskGr.setWorkflow(false);
		taskGr.update();
		return gs.getMessage("Time worked entry was modified, updated time in task {0}", taskGr.getDisplayValue());
	},

	type: 'TaskTimerSNC'
};
```