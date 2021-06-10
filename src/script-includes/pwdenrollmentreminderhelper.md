---
title: "pwdEnrollmentReminderHelper"
id: "pwdenrollmentreminderhelper"
---

API Name: global.pwdEnrollmentReminderHelper

```js
var pwdEnrollmentReminderHelper = Class.create();
pwdEnrollmentReminderHelper.prototype = {
	ENROLL_REMINDER_CHILD_SCHEDULED_JOB_PREFIX: "pwd_",
	EMAIL_BATCH_SIZE_PROPERTY: "password_reset.enrollment_reminder.email_batch_size",
	EMAIL_BATCH_EXECUTION_DELAY: 900, //child schedule jobs will be scheduled to run 15 mins after current time
	TO_EMAIL_ADDRESS: "do-not-reply@servicenow.com",
	SYS_TRIGGER_JOB_ID: "81c92ce9c0a8016400e5f0d2f784ea78",
	
	initialize: function() {
	},
	
	sendReminderToNotEnrolledUsersForProcess: function(processId) {
		var limit = GlidePropertiesDB.get(this.EMAIL_BATCH_SIZE_PROPERTY);
		var currentTime = new GlideDateTime();
		this._createRunOnceChildScheduledJob(0, limit, processId, currentTime);
	},
	
	sendReminderInBatch: function(start, limit, processId) {
		var process = this._getProcessGr(processId);
		if(gs.nil(process)) {
			gs.info("Process not found");
			return false;
		}
		if(process.apply_to_all_users) {
			this.processAllUsers(start, limit, process);
		} else {
			this.processUsersFromGroup(start, limit, process);
		}
	},
		
	processAllUsers: function(start, limit, process) {
		var userIds = [];
		var users = this.getUsersInBatch(start, limit);
		if(!gs.nil(users)) {
			do {
				var userId = users.getValue("sys_id");
				if(this.getEnrollmentStatusForProcess(userId, process))
					continue;
				userIds.push(userId);
			} while(users.next());

			var newStart = start+limit;
			this.sendNotificationAndSetUpNextBatch(userIds, newStart, start, limit, process.sys_id);
		}
	},
	
	processUsersFromGroup: function(start, limit, process) {
		var userIds = [];
		var users = this.getUserListFromGroupsInBatch(start, limit, process);
		if(!gs.nil(users)) {
			do {
				var userId = users.getValue("user") + '';
				if(this.getEnrollmentStatusForProcess(userId, process))
					continue;
				userIds.push(userId);
			} while(users.next());
			//start for new batch.. 
			// Last index is included in GlideAggregate query that's why new start is start + limit + 1 instead start + limit. 
			var newStart = start + limit + 1;
			this.sendNotificationAndSetUpNextBatch(userIds, newStart, start, limit, process.sys_id);
		}
	},
	
	sendNotificationAndSetUpNextBatch: function(userIds, newStart, start, limit, processId) {
		if(userIds.length) {
			var procGr = this._getProcessGr(processId);
			var toRecipients = procGr.getValue("sender_alias");
			if(gs.nil(toRecipients)) 
				toRecipients = this.TO_EMAIL_ADDRESS;
			gs.eventQueue("pwd.enrollment_reminder.trigger", null, toRecipients, userIds.join(","));
		}

		var currentTime = new GlideDateTime();
		currentTime.addSeconds(this.EMAIL_BATCH_EXECUTION_DELAY);
		//create new child job for next batch of users
		this._createRunOnceChildScheduledJob(newStart, limit, processId, currentTime);
	},
			
	getUserListFromGroupsInBatch: function(start, limit, process) {
		var userGroups = [];
		var end = start + limit;
		
		var gr = new GlideRecord("pwd_map_proc_to_group");
		gr.addQuery("process", process.getValue("sys_id"));
		gr.query();
		while(gr.next()) {
			userGroups.push(gr.getValue("user_group"));
		}
		var userGrpMemGr = new GlideAggregate("sys_user_grmember");
		userGrpMemGr.addQuery("group", "IN", userGroups.join());
		userGrpMemGr.addQuery("user.active", true);
		userGrpMemGr.addQuery("user.notification", 2);
		userGrpMemGr.addNotNullQuery("user.email");
		userGrpMemGr.addAggregate('COUNT(DISTINCT', 'user');
        userGrpMemGr.orderBy("user.sys_created_on");
		userGrpMemGr.groupBy('user');
		userGrpMemGr.chooseWindow(start, end, true);
		userGrpMemGr.query();
		if(userGrpMemGr.next())
			return userGrpMemGr;
		return null;
	},
	
	getUsersInBatch: function(start, limit) {
		var end = start + limit;
		var gr = new GlideRecord("sys_user");
		gr.addActiveQuery();
		gr.addQuery("notification", 2); //notification is enabled
		gr.addNotNullQuery("email");
		gr.chooseWindow(start, end, true);
		gr.orderBy("sys_created_on");
		gr.query();
		if(gr.next())
			return gr;
		return null;
	},
			
	getEnrollmentStatusForProcess: function(userId, process) {

		var verificationsEnrolled = 0;
		var minimumVers =  process.getValue("min_verifications");
		//Check if user is enrolled in all mandatory verifications
		var result = this.getUserEnrollmentstatusForMandatoryVerifications(userId, process);
		if(!result.enrolled){
			return false;
		}

		verificationsEnrolled = result.enrolledVerificationCount;
		if(verificationsEnrolled >= minimumVers)
			return true;

		result = this.getUserEnrollmentstatusForNonMandatoryVerifications(userId, process, false);
		verificationsEnrolled = verificationsEnrolled + result.enrolledVerificationCount;
		if(verificationsEnrolled >= minimumVers)
			return true;

		return false;
	},
			
	getUserEnrollmentstatusForMandatoryVerifications: function(userId, process) {
		return this.getUserEnrollmentStatusForVerifications(userId, process, true);
	},

	getUserEnrollmentstatusForNonMandatoryVerifications: function(userId, process) {
		return this.getUserEnrollmentStatusForVerifications(userId, process, false);
	},

	getUserEnrollmentStatusForVerifications: function(userId, process, mandatory) {
		var result = {enrolled: false, enrolledVerificationCount:0 };
		var verificationIds = new SNC.PwdProcessManager().getProcessVerificationIdsByMandatoryFlag(process.getValue("sys_id"), mandatory);
		var versArr = [];
		for (var i = 0; i != verificationIds.size(); ++i)
			versArr.push(verificationIds.get(i));
		
		var pwdEnrollmentMgr = new SNC.PwdEnrollmentManager();
		for (var j  = 0; j < versArr.length; j++) {
			if(pwdEnrollmentMgr.isUserEnrolledByVerificationId(userId, versArr[j]))
				result.enrolledVerificationCount++;
		}
		result.enrolled =  result.enrolledVerificationCount == versArr.length;
		return result;
	},
	
	_getProcessGr : function(processId) {
		var gr = new GlideRecord("pwd_process");
		if(gr.get(processId))
			return gr;
		return null;
	},

	_createRunOnceChildScheduledJob: function(start, limit, processId, startTime) {
		var gr = new GlideRecord("sys_trigger");
		gr.setValue("name", this._getChildScheduleJobName(processId, start));
		gr.setValue("trigger_type", "0"); // run once
		gr.setValue("state", "0"); // ready
		gr.setValue("next_action", startTime);
		gr.setValue("script", this._getChildScheduleJobScript(start, limit, processId));
		gr.setValue("job_id", this.SYS_TRIGGER_JOB_ID);
		return gr.insert();
	},
	
	_getChildScheduleJobScript: function(start, limit, processId) {
		return "new pwdEnrollmentReminderHelper().sendReminderInBatch("+ start +", " + limit + ", \'" + processId + "\');";
	},
	
	_getChildScheduleJobName: function(processId, start) {
		return this.ENROLL_REMINDER_CHILD_SCHEDULED_JOB_PREFIX + processId + "_" + start;
	},
	
	deleteChildScheduleJob: function(processId){
		var gr = new GlideRecord("sys_trigger");
		gr.addQuery("name", "STARTSWITH" , this.ENROLL_REMINDER_CHILD_SCHEDULED_JOB_PREFIX + processId);
		gr.query();
		if(gr.next())
			gr.deleteRecord();
	},
	
	type: 'pwdEnrollmentReminderHelper'
};
```