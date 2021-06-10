---
title: "CABRuntimeStateSNC"
id: "cabruntimestatesnc"
---

API Name: sn_change_cab.CABRuntimeStateSNC

```js
var CABRuntimeStateSNC = Class.create();

/**
 * Get the meeting status for the meeting sys id provided
 * Will create a new meeting status if one doesn't exist.
 */
CABRuntimeStateSNC.get = function(meetingSysId) {
	if (!meetingSysId)
		return;
	
	var runtimeStateGr = new GlideRecord(CAB.RUNTIME_STATE);
	runtimeStateGr.addQuery(CAB.MEETING, meetingSysId);
	runtimeStateGr.query();
	
	// If we have a runtime state
	if (runtimeStateGr.hasNext()) {
		runtimeStateGr.next();
		return new CABRuntimeState(runtimeStateGr);
	}	
	
	// Create a new one if one doesn't exist.
	// Check if the meeting exists
	var meeting = new GlideRecord(CAB.MEETING);
	if (!meeting.get(meetingSysId))
		return;
	
	var runtimeState = new CABRuntimeState(runtimeStateGr);
	
	runtimeState.setValue(CAB.MEETING, meetingSysId);
	if (!runtimeState.insert()) {
		// Problem inserting, try lookup again.
	}
	
	return runtimeState;
};

CABRuntimeStateSNC.hasRuntimeState = function(meetingSysId) {

	var runtimeStateGr = new GlideRecord(CAB.RUNTIME_STATE);
	runtimeStateGr.addQuery(CAB.MEETING, meetingSysId);
	runtimeStateGr.query();
	return runtimeStateGr.hasNext();
};

CABRuntimeStateSNC.prototype = Object.extendsObject(CAB, {
	startMeeting: function() {
		var cabMeeting = new CABMeeting(this._gr.cab_meeting.getRefRecord());
		if (!cabMeeting.isInProgress())
			cabMeeting.inProgress();
	},

	endMeeting: function() {
		// close current agenda item in case it remains pending
		if (!this._gr.current_agenda_item.nil()) {
			var cai = new CABAgendaItem(this._gr.current_agenda_item.getRefRecord());
			var noDecision = cai.isDecisionPending();
			this._closeCurrentAgendaItem(noDecision);
		}

		var cabMeeting = new CABMeeting(this._gr.cab_meeting.getRefRecord());
		if (cabMeeting.isInProgress())
			cabMeeting.complete();
		
		this.clearCurrentAgendaItem();
	},
	
	setAgendaUpdated: function() {
		this._gr.agenda_update_at = new GlideDateTime();
	},
	
	agendaUpdated: function() {
		this.setAgendaUpdated();
		this.update();
	},
	
	setCurrentAgendaItem: function(agendaItemSysId) {
		this._gr.current_agenda_item = agendaItemSysId;
		this._gr.current_agenda_item_start = new GlideDateTime();
	},

	hasCurrentAgendaItem: function() {
		return (this._gr.current_agenda_item + "") ? true : false;
	},

	setTimerState: function(timerState) {
		this._gr.timer_state = timerState;
	},
	
	clearCurrentAgendaItem: function() {
		this._gr.current_agenda_item = "";
		this._gr.current_agenda_item_start = "";
		this.update();
	},
	
	pauseCurrentAgendaItem: function() {
		if (this._gr.current_agenda_item.nil())
			return;
		
		var elapsedTime = this._getCurrentItemElapsed();
		var currCABAgendaItem = new CABAgendaItem(this._gr.current_agenda_item.getRefRecord());
		currCABAgendaItem.pause(elapsedTime);
		
		this.update();
	},
	
	resumeCurrentAgendaItem: function() {
		if (this._gr.current_agenda_item.nil())
			return;
		
		// Refresh the timer start time.
		this._gr.current_agenda_item_start = new GlideDateTime();
		this.update();
		
		var currCABAgendaItem = new CABAgendaItem(this._gr.current_agenda_item.getRefRecord());
		currCABAgendaItem.inProgress();
	},
	
	nextAgendaItem: function(agendaItemSysId, noDecision) {
		this._closeCurrentAgendaItem(noDecision);
		this._replaceCurrentAgendaItem(agendaItemSysId);
	},

	/**
	 * Demote the current agenda item by setting the state to pending, then replace the current agenda item to be the next one
	 */
	demoteCurrentAgendaItem: function(nextAgendaItemSysId) {
		var isCurrentAgendaItemDemoted = this._demoteCurrentAgendaItem();
		if (isCurrentAgendaItemDemoted)
			this._replaceCurrentAgendaItem(nextAgendaItemSysId);
	},

	_demoteCurrentAgendaItem: function() {
		if (this._gr.current_agenda_item.nil())
			return false;

		if (this._gr.cab_meeting.nil())
			return false;

		var cabMeeting = new CABMeeting(this._gr.cab_meeting.getRefRecord());
		if (cabMeeting.getAgendaItemCount() === 0)
			return false;

		var cabAgendaItem = new CABAgendaItem(this._gr.current_agenda_item.getRefRecord());
		if (!cabAgendaItem.canDemote())
			return false;

		var elapsedTime = this._getCurrentItemElapsed();
		var order = cabMeeting.getLastPendingAgendaItemOrder() + 100;
		cabAgendaItem.demote(elapsedTime, order);
		return true;
	},

	_closeCurrentAgendaItem: function(noDecision) {
		if (!this._gr.current_agenda_item.nil()) {
			var elapsedTime;
			// Only set elapsed time if we're going moving from an In Progress agenda item.
			if (this._gr.current_agenda_item.state == "in_progress")
				elapsedTime = this._getCurrentItemElapsed();

			var cai = new CABAgendaItem(this._gr.current_agenda_item.getRefRecord());
			if (noDecision)
				cai.noDecision(elapsedTime);
			else {
				if (!cai.isPreApproved() && !cai.isRejected())
					cai.setApproved();
				cai.complete(elapsedTime);
			}
		}
	},

	_replaceCurrentAgendaItem: function(agendaItemSysId)  {
		var aiGr = new GlideRecord(CAB.AGENDA_ITEM);
		if (typeof agendaItemSysId === 'undefined' || !aiGr.get(agendaItemSysId)) {
			this.clearCurrentAgendaItem();
			return;
		}

		var cabAgendaItem = new CABAgendaItem(aiGr);
		cabAgendaItem.inProgress();
		this.setCurrentAgendaItem(aiGr.getUniqueValue());
		this.update();
	},

	/**
	 * Gets the total elapsed time of the item adding it's current elapsed time and
	 * the difference between now and it's last start time.
	 */
	_getCurrentItemElapsed: function() {
		if (this._gr.current_agenda_item_start.nil())
			return 0;

		var elapsedTime = new GlideDateTime(this._gr.current_agenda_item.elapsed_time);
		elapsedTime = elapsedTime.getNumericValue();

		var now = new GlideDateTime();
		now = now.getNumericValue();

		var then = this._gr.current_agenda_item_start.dateNumericValue();
		
		return elapsedTime + now - then;
	},

	setHost : function(id){
		this._gr.setValue('host', id);
		this._gr.update();
	},

	getHost : function(){
		return this._gr.getValue('host');
	},

    type: 'CABRuntimeStateSNC'
});
```