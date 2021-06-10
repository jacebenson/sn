---
title: "SLAWorkflowDuration"
id: "slaworkflowduration"
---

API Name: global.SLAWorkflowDuration

```js
var SLAWorkflowDuration = Class.create();
SLAWorkflowDuration.prototype = Object.extendsObject(WorkflowDuration, {

	initialize: function() {
		WorkflowDuration.prototype.initialize.call(this);
	},

	/**
 	* Get the end date/time set by a call to 'calculate'
 	* (returns a GlideDateTime object)
 	*/
	getEndDateTime: function() {
		return this.endDateTime;
	},

   /**
    * calculate the number of seconds, and the due date
    *
    * record - the record that contains the fields specified in the class comment above
    */
   calculate: function(/*GlideRecord*/record) {
      this.record = record;
      this._getSchedule();
      this._getTimeZone();
      this.endDateTime = "";
      
      this.lu.logDebug('calculate: timer_type=' + this._getValue('timer_type') + '; modifier=' + this._getValue('modifier'));
      
      var secs = 0;
      switch (this._getValue('timer_type')) {
         case 'relative_duration':
			 secs = this._getSecondsFromRelativeDuration();

			 // if timer duration needs modification
			 if (this._getValue('modifier')) {
				secs = this._modifySeconds(secs);
				this.endDateTime = "";
			 }
			 break;
         
		 case 'duration':
			secs = parseInt(this._getValue('field'), 10);
			if (isNaN(secs))
				secs = 0;
			if (this._getValue('modifier'))
				secs = this._modifySeconds(secs);
			break;
			
         case 'field':
			 secs = this._getSecondsFromField();
			 break;
         
         case 'script':
			 secs = this._getSecondsFromScript();
			 break;
         
         default:
			 secs = this._getSecondsFromDuration();
      }
      
      this.seconds = secs;
      if (!this.endDateTime) {
         this.endDateTime = new GlideDateTime(this.startDateTime);
         this.endDateTime.addSeconds(this.seconds);
      }
      // if not already set by _getSecondsFrom*()
      this.lu.logDebug('calculate: this.endDateTime=' + this.endDateTime.getDisplayValueInternal() + ' (start: ' + this.startDateTime.getDisplayValueInternal() + '); ' + this.seconds);
      if (!this.totalSeconds)
         this.totalSeconds = this._totalSeconds(this.startDateTime, this.endDateTime);

   },

   	/**
 	* add the number of seconds to the specified start date/time
 	*  potentially using the workflow-specified schedule
 	*  (NB. relative duration uses a schedule to determine business days, but doesn't use it for duration
 	*    unless property 'com.glideapp.workflow.duration.relative_uses_schedule' is set to "true")
 	*
 	* record - as per calculate()
 	* retrieve end time with getEndDateTime();
 	*/
	addSeconds: function(/* GlideRecord */ record, seconds) {
		this.record = record;
		this._getSchedule();
		this._getTimeZone();

		var dc = new DurationCalculator();
		if (this.schedule && this._getValue('timer_type') != 'relative_duration' || this._useScheduleForRelative)
			dc.setSchedule(this.schedule, this.timezone);
		dc.setStartDateTime(this.startDateTime);
		dc.calcDuration(seconds);
		this.seconds = seconds;
		this.totalSeconds = dc.getTotalSeconds();
		this.endDateTime = dc.getEndDateTime();
	},

	/**
 	* Get the seconds based on a relative duration calculation
 	*/
	_getSecondsFromRelativeDuration: function() {
		var dur = new DurationCalculator();
		dur.setSchedule(this.schedule, this.timezone);
		dur.setStartDateTime(this.startDateTime);
		this._setCurrent();
		dur.calcRelativeDuration(this._getValue('relative_duration'));
		this._unsetCurrent();
		this.endDateTime = dur.getEndDateTime();
		if (this.lu.atLevel(GSLog.DEBUG))
			this.lu.logDebug('_getSecondsFromRelativeDuration: start=' + this.startDateTime.getValue() + '; end=' + this.endDateTime.getValue() + '; totalSeconds=' + dur.getTotalSeconds() + '; seconds=' + dur.getSeconds() + ' [' + this._useScheduleForRelative + ']');
		if (this._useScheduleForRelative)
			return dur.getSeconds();
		return dur.getTotalSeconds();
	},

	_setCurrent: function() {
		this.ocurrent = null;
		if (current && current.getTableName() == "task_sla" && current.task && current.sla && current.sla.relative_duration_works_on == "Task record") {
			this.ocurrent = current;
			current = current.task.getRefRecord();
		}
	},

	_unsetCurrent: function() {
		if (this.ocurrent)
			current = this.ocurrent;
	},

	type: 'SLAWorkflowDuration'
});
```