---
title: "SLATimezone"
id: "slatimezone"
---

API Name: global.SLATimezone

```js
var SLATimezone = Class.create();

// decode com.snc.sla.timezone.source into real field values
// (saves an eval(), and allows more flexible choices based upon task record type)
SLATimezone.source = function(source, /* task_sla */ gr, taskGr) {
	if (!taskGr || taskGr.sys_id.nil())
		taskGr = gr.task.getRefRecord();

	switch(source) {
		// The caller's time zone
		case 'task.caller_id.time_zone':
			return (SLATimezone._getCaller(taskGr)).time_zone;
		// The SLA definition's time zone
		case 'sla.timezone':
			return gr.sla.timezone;
		// The CI's location's time zone
		case 'task.cmdb_ci.location.time_zone':
			return taskGr.cmdb_ci.location.time_zone;
		// The task's location's time zone
		case 'task.location.time_zone':
			return taskGr.location.time_zone;
		// The caller's location's time zone (old and new property values)
		case 'task.caller_id.location.u_time_zone':
		case 'task.caller_id.location.time_zone':
			return (SLATimezone._getCaller(taskGr)).location.time_zone;
		// (add your own ideas here)
		default:
			return null;
	}
};

SLATimezone._getCaller = function(task) {
	var task_type = task.getRecordClassName();

	switch(task_type) {
		case 'incident':
			return task.caller_id;
		case 'sc_request':
			return task.requested_for;
		case 'sc_req_item':
			return task.requested_for ? task.requested_for : task.request.requested_for;
		case 'sc_task':
			return task.request_item.requested_for ? task.request_item.requested_for : task.request_item.request.requested_for;
		case 'change_request':
			return task.requested_by;
		case 'change_task':
			return task.change_request.requested_by;
		case 'kb_submission':
			return task.submitted_by;
		case 'grc_activity':
			return task.requested_by;
		case 'wm_order':
			return task.caller;
		case 'hr_case':
			return task.opened_for;
		case 'hr_case_operations':
			return task.opened_for;
		case 'hr_case_payroll':
			return task.opened_for;
		case 'hr_case_performance':
			return task.opened_for;
		case 'hr_case_talent_management':
			return task.opened_for;
		case 'hr_case_total_rewards':
			return task.opened_for;	
		case 'hr_case_workforce_admin':
			return task.opened_for;  			
		default:
			if (new GlidePluginManager().isActive('com.sn_hr_core')){
				if(sn_hr_core.hr.TABLE_CASE_EXTENSIONS.indexOf(task_type)>-1)
					return task.opened_for;	
			} 
			return task.opened_by;
	}
};

SLATimezone.prototype = {
	initialize : function() {
	},
	
	type:'SLATimezone'
};
```