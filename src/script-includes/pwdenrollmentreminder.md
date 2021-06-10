---
title: "pwdEnrollmentReminder"
id: "pwdenrollmentreminder"
---

API Name: global.pwdEnrollmentReminder

```js
var pwdEnrollmentReminder = Class.create();
pwdEnrollmentReminder.prototype = {
	ENROLL_REMINDER_SCHEDULED_JOB_PREFIX: "pwd_enroll_reminder_",
	ENROLL_REMINDER_NOTIFICATION_ID: "4bd2a7250b02030031a567bff6673a76",
	
    initialize: function() {
    },
	
	createOrUpdateScheduleJob: function(process) {
		var schedJobGr = this._findScheduleJob(process.getValue("sys_id"));
		if(!gs.nil(schedJobGr)) {
			this.updateScheduleJob(process, schedJobGr);
		} else {
			if(process.enrollment_reminder && process.active) {
				this.createScheduleJob(process);
			}
		}
	},
		
	createScheduleJob: function(process) {
		var processId = process.getValue("sys_id");
		
		var gr = new GlideRecord("sysauto_script");
		gr.setValue("name", this._getScheduleJobName(processId));
		gr.setValue("active", true);
		
		this._setCommonFields(gr, process);
		
		gr.setValue("conditional", true);
		gr.setValue("condition", this._getScheduleJobCondition(processId));
		gr.setValue("script", this._getScheduleJobScript(processId));
		
		return gr.insert();
	},
	
	canRunScheduleJob: function(processId) {
		var gr = this._findScheduleJob(processId);
		var currentTime = new GlideDateTime();
		var diffSeconds = gs.dateDiff(currentTime, gr.run_start, true);
        if(diffSeconds <= 0) { 
			//run schedule job because current time is on or after start time
			return true;
		}
		return false;
	},
	
	deleteScheduledJob: function(process) {
		//Delete parent and all child scheduled jobs
		var schedJobGr = this._findScheduleJob(process.getValue("sys_id"));
		if(!gs.nil(schedJobGr)){
			schedJobGr.deleteRecord();
			new pwdEnrollmentReminderHelper().deleteChildScheduleJob(process.getValue("sys_id"));
		}
	},
	
	//update active/period/start of schedule job.
	updateScheduleJob: function(process, schJob) {
		var deleteChildScheduledJob = false; 
		
		if(process.enrollment_reminder && process.active) {
			schJob.setValue("active", true);
		} else {
			schJob.setValue("active", false);
			deleteChildScheduledJob = true;
		}
		this._setCommonFields(schJob, process);
		
		schJob.update();
		//if deactivating parent scheduled job, delete any child jobs. 
		if(deleteChildScheduledJob)
			new pwdEnrollmentReminderHelper().deleteChildScheduleJob(process.getValue("sys_id"));
	},
	
	updateEnrollmentReminderEmailTemplate: function(emailTemplateId) {
		var gr = new GlideRecord("sysevent_email_action");
		gr.get(this.ENROLL_REMINDER_NOTIFICATION_ID);
		gr.setValue("template",emailTemplateId);
		gr.update();
	},
	
	_getScheduleJobName: function(processId) {
		return this.ENROLL_REMINDER_SCHEDULED_JOB_PREFIX + processId;
	},
	
	_getScheduleJobScript: function(processId) {
		return "new pwdEnrollmentReminderHelper().sendReminderToNotEnrolledUsersForProcess(\"" + processId + "\");";
	},
	
	_getScheduleJobCondition: function(processId) {
		return "new pwdEnrollmentReminder().canRunScheduleJob(\"" + processId + "\");";
	},
	
	_findScheduleJob : function(processId) {
		var gr = new GlideRecord("sysauto_script");
		if(gr.get("name", this._getScheduleJobName(processId)))
			return gr;
		return null;
	},
		
	_setCommonFields: function(schJobGr, processGr){
		schJobGr.setValue("run_type", processGr.getValue("run_type"));
		if(processGr.getValue("run_type") == "weekly")
			schJobGr.setValue("run_dayofweek", processGr.getValue("run_dayofweek"));
		else
			schJobGr.setValue("run_dayofmonth", processGr.getValue("run_dayofmonth"));
		schJobGr.setValue("run_time", processGr.getValue("run_time"));
		var run_start = schJobGr.getValue("run_start");
		if(gs.nil(run_start))
		   run_start = new GlideDateTime();
		schJobGr.setValue("run_start", run_start);
	},
	
    type: 'pwdEnrollmentReminder'
};

```