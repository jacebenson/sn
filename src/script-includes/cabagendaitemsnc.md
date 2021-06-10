---
title: "CABAgendaItemSNC"
id: "cabagendaitemsnc"
---

API Name: sn_change_cab.CABAgendaItemSNC

```js
var CABAgendaItemSNC = Class.create();
CABAgendaItemSNC.prototype = Object.extendsObject(sn_change_cab.CAB, {
	generateFutureItemNotifications: function() {
		if (!this._gr || !this._gr.getUniqueValue())
			return;
		
		var agendaItemGr = new GlideRecord(CAB.AGENDA_ITEM);
		agendaItemGr.addQuery("cab_meeting", this._gr.cab_meeting);
		agendaItemGr.addQuery("order", ">", this._gr.order);
		agendaItemGr.addQuery("state", "pending");
		agendaItemGr.setLimit(this._gr.cab_meeting.notification_lead_time);
		agendaItemGr.orderBy("order");
		agendaItemGr.query();
		
		while (agendaItemGr.next()) {
			agendaItemGr.notification_sent = true;
			agendaItemGr.update();
		}
	},

	isPending: function() {
		return this._gr.state+"" == "pending";
	},
	
	setPending: function() {
		this._gr.state = "pending";
	},
	
	pending: function() {
		this.setPending();
		this.update();
	},
	
	canDemote: function() {
		if (!this.isInProgress() && !this.isPaused())
			return false;

		return true;
	},
	
	demote: function(elapsedTime, order) {
		this.setPending();
		if (!isNaN(elapsedTime))
			this._gr.elapsed_time = new GlideDuration(elapsedTime);
		if (!isNaN(order))
			this._gr.order = order;
		this.update();
	},
	
	isInProgress: function() {
		return this._gr.state+"" == "in_progress";
	},
	
	setInProgress: function() {
		this._gr.state = "in_progress";
	},
	
	inProgress: function() {
		this.setInProgress();
		this.update();
	},
		
	isPaused: function() {
		return this._gr.state+"" == "paused";
	},
	
	setPause: function(elapsedTime) {
		this._gr.state = "paused";
		if (!isNaN(elapsedTime))
			this._gr.elapsed_time = new GlideDuration(elapsedTime);
	},
	
	pause: function(elapsedTime) {
		this.setPause(elapsedTime);
		this.update();
	},
	
	isComplete: function() {
		return this._gr.state+"" == "complete";
	},
	
	setComplete: function(elapsedTime) {
		this._gr.state = "complete";
		if (!isNaN(elapsedTime))
			this._gr.elapsed_time = new GlideDuration(elapsedTime);
	},
	
	complete: function(elapsedTime) {
		this.setComplete(elapsedTime);
		this.update();
	},
	
	isNoDecision: function() {
		return this._gr.state+"" == "no_decision";
	},
	
	setNoDecision: function(elapsedTime) {
		this._gr.state = "no_decision";
		if (!isNaN(elapsedTime))
			this._gr.elapsed_time = new GlideDuration(elapsedTime);
	},
	
	noDecision: function(elapsedTime) {
		this.setNoDecision(elapsedTime);
		this.update();
	},

	isDecisionPending: function() {
		return this._gr.decision.nil();
	},
	
	isPreApproved: function() {
		return this._gr.decision+"" == "preapproved";
	},
	
	setPreApproved: function() {
		this._gr.decision = "preapproved";
	},
	
	preApproved: function() {
		this.setPreApproved();
		this.update();
	},
	
	isApproved: function() {
		return this._gr.decision+"" == "approved";
	},
	
	setApproved: function() {
		this._gr.decision = "approved";
	},
	
	approve: function() {
		this.setApproved();
		this.update();
	},
	
	isRejected: function() {
		return this._gr.decision+"" == "rejected";
	},
	
	setRejected: function() {
		this._gr.decision = "rejected";
	},
	
	reject: function() {
		this.setRejected();
		this.update();
	},
	
	addDecisionToMeetingNotes: function() {
		var decision = this._gr.state +"" === CAB.AGENDA_STATE.NO_DECISION ?
			this._gr.getDisplayValue("state") : this._gr.getDisplayValue("decision");
	
		var message = "<p>" +
			gs.getMessage("(CAB Automation) - {0} - {1} - {2} - {3} - {4}", [
				this._gr.task.getDisplayValue(),
				decision,
				this._gs.getUserDisplayName(),
				new GlideDateTime().getUserFormattedLocalTime(),
				this._gs.getSession().getTimeZoneName()
			]) +
			"</p>";
		
		var meetingGr = this._gr.cab_meeting.getRefRecord();
		meetingGr.meeting_notes = meetingGr.meeting_notes.nil() ? message : meetingGr.getDisplayValue("meeting_notes") + message;
		meetingGr.update();
	},
	
	refreshAttendeesFromTaskData: function(fieldData) {
		if (!this._gr || !this._gr.getUniqueValue() || !fieldData || (typeof fieldData !== "object"))
			return;

		var fieldNames = Object.keys(fieldData);
		for (var i = 0; i < fieldNames.length; i++) {
			var fieldName = fieldNames[i];
			var fieldValues = fieldData[fieldName];
			if (fieldValues.previousValue)
				this.removeAttendee(fieldValues.previousValue);

			if (fieldValues.currentValue) {
				var attendeeGr = this.addAttendee(fieldValues.currentValue);
				if (attendeeGr && fieldName == "cab_delegate")
					gs.eventQueue("sn_change_cab.change_request.delegate",
								  this._gr,
								  this._gr.task.cab_delegate);
			}
		}
	},
	
	refreshAttendees: function() {
		if (!this._gr || !this._gr.getUniqueValue())
			return;

		var gotPrevious = false;
		if (previous != null && previous.getUniqueValue() == this._gr.getUniqueValue())
			gotPrevious = true;
		
		for (var i = 0; i < CABAgendaItem.TASK_FIELDS_FOR_ATTENDEES.length; i++) {
			var fieldName = CABAgendaItem.TASK_FIELDS_FOR_ATTENDEES[i];

			if (gotPrevious && !previous.task[fieldName].nil())
				this.removeAttendee("" + previous.task[fieldName]);
			if (!this._gr.task[fieldName].nil())
				this.addAttendee("" + this._gr.task[fieldName]);
		}
	},
	
	// Called when an agenda item is deleted
	removeTaskFromAttendees: function() {
		if (!this._gr || !this._gr.getUniqueValue())
			return;

		/* First remove any automatically added attendees if the only agenda item
		   they are attending for is this one */
		var attendeeGr = new GlideRecord(CAB.ATTENDEE);
		attendeeGr.addQuery("cab_meeting", "=", this._gr.cab_meeting);
		attendeeGr.addQuery("reason", CAB.REASON.ATTENDEE);
		attendeeGr.addQuery("attending_for_tasks", "CONTAINS", this._gr.getValue("task"));
		attendeeGr.addQuery("added", "auto");
		attendeeGr.query();
		while (attendeeGr.next()) {
			if (attendeeGr.getValue('attending_for_tasks') === this._gr.getValue("task")) 
				attendeeGr.deleteRecord();
		}
		
		/* Now find amd update any other attendees who have this task listed in their "attending_for_tasks" field */
		attendeeGr.initialize();
		attendeeGr.addQuery("cab_meeting", "=", this._gr.cab_meeting);
		attendeeGr.addQuery("reason", [CAB.REASON.CAB_MANAGER, CAB.REASON.CAB_BOARD, CAB.REASON.ATTENDEE]);
		attendeeGr.addQuery("attending_for_tasks", "CONTAINS", this._gr.getValue("task"));
		attendeeGr.query();
		
		while (attendeeGr.next()) {
			var cabAttendee = new CABAttendee(attendeeGr);
			cabAttendee.updateAttendingForTasks([{"action": "remove", "taskId": this._gr.getValue("task")}]);

			if (cabAttendee.canBeDeleted())
				attendeeGr.deleteRecord();
			else
				cabAttendee.update();
			
		}
	},
	
	removeAttendee: function(userId) {
		if (!this._gr || !this._gr.getUniqueValue())
			return;
		
		if (!userId)
			return;

		var attendeeGr = new GlideRecord(CAB.ATTENDEE);
		attendeeGr.addQuery("cab_meeting", this._gr.cab_meeting);
		attendeeGr.addQuery("attendee", userId);
		attendeeGr.query();

		if (!attendeeGr.next())
			return;
		
		var attendee = new CABAttendee(attendeeGr);
		attendee.updateAttendingForTasks([{"action": "remove", "taskId": this._gr.getValue("task")}]);
		if (attendee.canBeDeleted())
			attendeeGr.deleteRecord();
		else
			attendee.update();
	},
	
	addAttendee: function(userId) {
		if (!this._gr || !this._gr.getUniqueValue())
			return;
		
		if (!userId)
			return;

		var attendeeGr = new GlideRecord(CAB.ATTENDEE);
		attendeeGr.addQuery("cab_meeting", this._gr.cab_meeting);
		attendeeGr.addQuery("attendee", userId);
		attendeeGr.query();
		
		var attendee;
		if (!attendeeGr.next()) {
			attendee = CABAttendee.newAttendee(userId);
			attendee.setValue("cab_meeting", this._gr.cab_meeting);
			attendee.setValue("reason", CAB.REASON.ATTENDEE);
			attendee.setValue("attending_for_tasks", this._gr.getValue("task"));
			attendee.setValue("added", "auto");
			attendee.insertUpdate();
			return attendee.getGlideRecord();
		} else {		
			attendee = new CABAttendee(attendeeGr);
			attendee.updateAttendingForTasks([{"action": "add", "taskId": this._gr.getValue("task")}]);
			if (!attendee.getGlideRecord().attending_for_tasks.changes())
				return;
			
			attendee.update();
			return attendee.getGlideRecord();
		}
	},
		
	updateAttendeesTasks: function(attendeeGr, taskUpdates) {
		if (!attendeeGr || !taskUpdates)
			return;
		
		var cabAttendee = new CABAttendee(attendeeGr);
		cabAttendee.updateAttendingForTasks(taskUpdates);
		if (cabAttendee.canBeDeleted())
			attendeeGr.deleteRecord();
		else
			cabAttendee.update();
	},
	
	// check if an agenda item has auto-added attendee for the meeting.
	hasAutoAddedAttendee: function() {
		var attendeeGr = new GlideRecord(CAB.ATTENDEE);
		attendeeGr.addQuery("cab_meeting", "=", this._gr.cab_meeting);
		attendeeGr.addQuery("reason", CAB.REASON.ATTENDEE);
		attendeeGr.addQuery("attending_for_tasks", "CONTAINS", this._gr.getValue("task"));
		attendeeGr.addQuery("added", "auto");
		attendeeGr.query();
		if (attendeeGr.next()) 
			return true;
		
		return false;
	},
	
	/**
	 * Overloads the base toJS to provide change task information as part of the agneda item
	 *
	 * includeTaskJS: Adds task.record JS to the returned agenda item
	 * includeSPForm: Adds task._form (SPForm model) to the returned agenda item
	 */
	toJS: function(includeTaskJS, includeSPForm) {
		var agendaItemJS = this._toJS(this._gr);

		// If it couldn't be read by the user return nothing.
		if (!agendaItemJS)
			return null;

		//If we're supressing task JS conversion return straight away
		if (!includeTaskJS)
			return agendaItemJS;
		
		if (!this._gr.task.nil()) {
			var cabTask =  new CABChangeRequest(this._gr.task.getRefRecord());
			agendaItemJS.task.record = cabTask.toJS();
			if (includeSPForm)
				agendaItemJS.task._form = cabTask.toSPForm();
		}

		return agendaItemJS;
	},
	
	updateCABDate: function() {
		if (!this._gr || !this._gr.getUniqueValue())
			return;
			
		var taskRecord = this._gr.task;
		var cab_meetingRecord = this._gr.cab_meeting;
		
		if ( taskRecord.nil() || cab_meetingRecord.nil() )
			return;
		
		var changeRequest = new global.ChangeRequest(taskRecord.getRefRecord());		
		var start = cab_meetingRecord.getRefRecord().getValue("start");
		changeRequest.setValue("cab_date",start);
		changeRequest.update();
	},
	
    type: 'CABAgendaItemSNC'
});

CABAgendaItemSNC.newAgendaItem = function(changeRequest) {
	var aIGr = new GlideRecord(sn_change_cab.CAB.AGENDA_ITEM);
	// Check if we have a ChangeRequest or GlideRecord object
	var changeRef = changeRequest;
	if (changeRequest && changeRequest.type=="ChangeRequest")
		changeRef = changeRequest.getGlideRecord();
	
	if (changeRef && typeof changeRef.getRowCount == "function")
		aIGr.task = changeRef.getUniqueValue();

	return new sn_change_cab.CABAgendaItem(aIGr);
};
```