---
title: "SLASchedule"
id: "slaschedule"
---

API Name: global.SLASchedule

```js
var SLASchedule = Class.create();

// decode com.snc.sla.schedule choice values into real field values
// (saves using an eval())
SLASchedule.source = function(source, /* task_sla */ gr, taskGr) {
	switch(source) {
		// The SLA definition's schedule
		case 'sla_definition':
			return gr.sla.schedule.sys_id;
		// A "Field from task" selected as source
		case 'task_field':
			if (!taskGr || taskGr.sys_id.nil())
				return gr.getElement("task." + gr.sla.schedule_source_field);
			else
				return taskGr.getElement(gr.sla.schedule_source_field);
		// No schedule selected as source
		case 'no_schedule':
			return null;

		// ----------------------------------------------------------------------------------------
		// Legacy values for schedule source (taken from system property "com.snc.sla.schedule")
		// ----------------------------------------------------------------------------------------

		// The CI's schedule
		case 'sla.schedule':
			return gr.sla.schedule.sys_id;
		// The SLA definition's schedule
		case 'task.cmdb_ci.schedule':
			return gr.task.cmdb_ci.schedule.sys_id;

		// ----------------------------------------------------------------------------------------

		default:
			return null;
	}
};

SLASchedule.prototype = {
	initialize : function() {
	},

	type:'SLASchedule'
};
```