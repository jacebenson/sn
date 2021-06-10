---
title: "SLABreakdownProcessorSNC"
id: "slabreakdownprocessorsnc"
---

API Name: sn_sla_brkdwn.SLABreakdownProcessorSNC

```js
var SLABreakdownProcessorSNC = Class.create();
SLABreakdownProcessorSNC.prototype = {
	SLA_BREAKDOWN_PROCESSOR_LOG: 'com.snc.sla.breakdown_processor.log',

    initialize: function(currentTaskSLAGr, previousTaskSLAGr) {
		this.start = new GlideDateTime();
		this.currentTaskSLAGr = currentTaskSLAGr;
		this.previousTaskSLAGr = previousTaskSLAGr;
		this.slaGr = this._getSLADefinitionGr();
		this.taskGr = null;
		this.durationCalculator = null;
		this.breakdownDefinitionsData = null;
		this.updateTime = null;
		this.slaDurationMS = 0;
		this.retroactive = false;
		this.taskSLAChanged = false;
		this.operationOverride = "";

		this.lu = new global.GSLog(this.SLA_BREAKDOWN_PROCESSOR_LOG, this.type);
		this.lu.includeTimestamp();
		this.slalogging = new global.TaskSLALogging();
    },

	processBreakdowns: function() {
		var timingStart;

		if (this.lu.atLevel(global.GSLog.INFO)) {
			this.lu.logInfo("processBreakdowns: starts");
			timingStart = new GlideDateTime();
		}

		if (!this.currentTaskSLAGr || !this.currentTaskSLAGr.getUniqueValue()) {
			this.lu.logError("processBreakdowns: failed to process breakdowns - Task SLA record was not supplied");
			if (this.lu.atLevel(global.GSLog.INFO))
				this._logProcessingTime(timingStart);
			return;
		}

		if (!this.slaGr || !this.slaGr.isValidRecord()) {
			this.lu.logError("processBreakdowns: failed to process breakdowns - SLA Definition not found for sys_id=" + this.currentTaskSLAGr.sla + ", Task SLA sys_id=" + this.currentTaskSLAGr.getUniqueValue());
			if (this.lu.atLevel(global.GSLog.INFO))
				this._logProcessingTime(timingStart);
			return;
		}

		// First get the breakdown definitions linked to this SLA's definition
		this.breakdownDefinitionsData = this._getBreakdownDefinitionsData();
		var breakdownDefinitionIds = Object.keys(this.breakdownDefinitionsData);
		if (breakdownDefinitionIds.length === 0) {
			if (this.lu.atLevel(global.GSLog.DEBUG))
				this.lu.logDebug("processBreakdowns: no breakdown definitions are linked to this SLA");
			this._logProcessingTime(timingStart);
			return;
		}

		// if a Task record hasn't been set get it from the database
		if (this.taskGr === null)
			this.taskGr = this._getTaskGr();

		// if we don't have an update time derive it from the combination of the Task and previous/current Task SLA
		if (this.updateTime === null)
			this.updateTime = this._deriveUpdateTime();

		if (!this.taskGr || !this.taskGr.getUniqueValue()) {
			this.lu.logError("processBreakdowns: failed to process breakdowns - Task not found for SLA " + this.currentTaskSLAGr.sla.getDisplayValue() + " : " + this.currentTaskSLAGr.getUniqueValue());
			if (this.lu.atLevel(global.GSLog.INFO))
				this._logProcessingTime(timingStart);
			return;
		}

		if (this.lu.atLevel(global.GSLog.DEBUG)) {
			this.lu.logDebug("processBreakdowns: processing breakdown for SLA " + this.currentTaskSLAGr.sla.getDisplayValue() + "(" + this.currentTaskSLAGr.getUniqueValue() + ")" +
							 "on Task " + this.taskGr.getDisplayValue() + "\n");
			this.lu.logDebug("processBreakdowns: taskGr:\n" +
							 this.slalogging.getRecordContentMsg(this.taskGr) + "\n");
			this.lu.logDebug("processBreakdowns: previousTaskSLAGr:\n" +
							 this.slalogging.getRecordContentMsg(this.previousTaskSLAGr) + "\n");
			this.lu.logDebug("processBreakdowns: currentTaskSLAGr:\n" +
							 this.slalogging.getRecordContentMsg(this.currentTaskSLAGr) + "\n");	
			this.lu.logDebug("processBreakdowns: breakdown definitions data retrieved for this SLA - \n " + JSON.stringify(this.breakdownDefinitionsData));
		}

		this.slaDurationMS = this._getSLADurationMS();
		this.retroactive = this._isRetroactive();
		this.breached = this._isBreached();
		this.breachedNow = this._changesToBreached();
		this.updateTimeMS = this.getUpdateTime().getNumericValue();

		if (this.lu.atLevel(global.GSLog.DEBUG)) {
			this.lu.logDebug("processBreakdowns:\n" + 
							 "slaDurationMS = " + this._getSLADurationMS() + " (" + new GlideDuration(this.slaDurationMS).getDurationValue() + ")\n" +
							 "retroactive = " + this.retroactive + "\n" +
							 "breached = " + this.breached + "\n" +
							 "breachedNow = " + this.breachedNow + "\n" +
							 "updateTime = " + this.updateTime);
		}

		/* if this is a new Task SLA the creation of the breakdown records is straightforward as
		   we just need to insert 1 or 2 (if the SLA is retroactive) records based on the current values
		   in the Task SLA - no calculations needed */
		if (this._isNewSLA()) {
			this._processNewTaskSLA();
			if (this.lu.atLevel(global.GSLog.INFO))
				this._logProcessingTime(timingStart);

			return;
		}

		/* Otherwise we need to perform the appropriate updates on existing active breakdown records
		   and if necessary create a new one */

		// Just double check this is an active Task SLA - if it isn't get out
		if (!this._isTaskSLAActive()) {
			if (this.lu.atLevel(global.GSLog.DEBUG))
				this.lu.logDebug("processBreakdowns: this is an update to an inactive Task SLA so no processing is required");
			this._logProcessingTime(timingStart);
			return;
		}

		/* Check if fields that affect the breakdowns have changed on the Task SLA
		   - even if this is false it doesn't mean we have no work as the breakdown
		   values may have changed */
		this.taskSLAChanged = this._isTaskSLAChanged();

		for (var i = 0, n = breakdownDefinitionIds.length; i < n; i++)
			this._processActiveBreakdown(breakdownDefinitionIds[i]);

		this._logProcessingTime(timingStart);		
	},

	setUpdateTime: function(dateTime) {
		if (!dateTime)
			return;

		// if argument is a GlideDateTime just use it
		if (dateTime instanceof GlideDateTime) {
			this.updateTime = new GlideDateTime(dateTime);
			return;
		}

		/* otherwise treat what we've been passed as a string and use it to create a new GlideDateTime
		   this will work if it'sa GlideElement as well */
		this.updateTime = new GlideDateTime(dateTime + "");
	},

	getUpdateTime: function() {
		return this.updateTime;
	},

	setTaskSLAOperationOverride: function(operation) {
		if (!operation)
			return;

		this.operationOverride = operation + "";
	},

	getTaskSLAOperationOverride: function() {
		return this.operationOverride;
	},

	setTaskGr: function(taskGr) {
		if (!taskGr)
			return;

		this.taskGr = taskGr;
	},

	_processActiveBreakdown: function(breakdownDefinitionId) {
		if (!breakdownDefinitionId)
			return;

		var activeBreakdownGr = this._getActiveBreakdownByDefinitionId(breakdownDefinitionId);
		if (!activeBreakdownGr || !activeBreakdownGr.isValidRecord()) {
			this.lu.logError("_processActiveBreakdown: failed to retrieve active breakdown record for breakdown definition id=" + breakdownDefinitionId);
			return;
		}

		var newBreakdownNeeded = this._isNewBreakdownNeeded(breakdownDefinitionId, activeBreakdownGr);

		if (!this.taskSLAChanged && !newBreakdownNeeded.result) {
			if (this.lu.atLevel(global.GSLog.DEBUG))
				this.lu.logDebug("_processActiveBreakdown: no processing required for breakdown definition id=" + breakdownDefinitionId +
								 "\n   No changes to Task SLA and breakdown values have not changed:\n   " +
								JSON.stringify(newBreakdownNeeded));
			return;
		}

		var breakdownValues = {};
		breakdownValues.duration = activeBreakdownGr.duration.dateNumericValue();
		breakdownValues.business_duration = activeBreakdownGr.business_duration.dateNumericValue();
		breakdownValues.pause_duration = activeBreakdownGr.pause_duration.dateNumericValue();
		breakdownValues.business_pause_duration = activeBreakdownGr.business_pause_duration.dateNumericValue();

		if (this.lu.atLevel(global.GSLog.DEBUG))
			this.lu.logDebug("_processActiveBreakdown: current durations in active breakdown:\n" + JSON.stringify(breakdownValues));

		var lastUpdateTime = new GlideDateTime(activeBreakdownGr.last_updated + "");

		/* if a value that impacts the duration breakdown records has changed on the Task SLA
		   then we need to update the active breakdown record */
		if (this.taskSLAChanged) {
			if (this.lu.atLevel(global.GSLog.DEBUG))
				this.lu.logDebug("_processActiveBreakdown: task SLA has been updated:\n" + 
								 "_isPaused() = " + this._isPaused() + 
								 ", _changesToPaused() = " + this._changesToPaused() + 
								 ", _changesFromPause() = " + this._changesFromPaused());

			// if we've left paused or the numbers have changed but we've stayed in progress update the duration fields
			if (this._changesToPaused() || (!this._isPaused() && !this._changesFromPaused())) {
				// if we're changing to Paused we need to set the pause time unless we're creating a new breakdown
				if (this._changesToPaused() && !newBreakdownNeeded.result)
					breakdownValues.pause_time = this.currentTaskSLAGr.pause_time.dateNumericValue();
				// and update the duration fields
				this._updateDurationFields(breakdownValues, lastUpdateTime);
			} if (this._changesFromPaused()) {
				// if we're changing from paused then we need to update the pause duration fields and clear out pause time
				breakdownValues.pause_time = "";
				this._updatePauseDurationFields(breakdownValues, lastUpdateTime);
			}
		} else if (newBreakdownNeeded.result) {
			/* if we need a new breakdown record then we need to update the values in the existing breakdown record before we
			   shut it down and create a new one */
			if (this.lu.atLevel(global.GSLog.DEBUG))
				this.lu.logDebug("_processActiveBreakdown: breakdown values have changed so new breakdown is needed, active breakdown lastUpdated = " +
								 activeBreakdownGr.last_updated + ", and _isPaused() = " + this._isPaused());

			// if the SLA is not paused then just update the duration fields before this breakdown is ended
			if (!this._isPaused())
				this._updateDurationFields(breakdownValues, lastUpdateTime);
			else {
				// otherwise we need to clear out the pause time and update the pause duration fields
				breakdownValues.pause_time = "";
				this._updatePauseDurationFields(breakdownValues, lastUpdateTime);
			}
		}

		if (this.lu.atLevel(global.GSLog.DEBUG))
			this.lu.logDebug("_processActiveBreakdown: durations in active breakdown after calculation:\n" + JSON.stringify(breakdownValues));

		if (this._changesToBreached())
			breakdownValues.breached = true;

		if (newBreakdownNeeded.result || this._changesToInactive()) {	
			breakdownValues.active = false;
			breakdownValues.end = this.updateTimeMS;
		}

		breakdownValues.last_updated = this.updateTimeMS;
		this._setBreakdownValues(activeBreakdownGr, breakdownValues);
		activeBreakdownGr.update();

		if (newBreakdownNeeded.result && this._isTaskSLAActive() && !this._changesToInactive())
			this._createBreakdownRecord(breakdownDefinitionId);
	},

	_updateDurationFields: function(breakdownValues, lastUpdateTime) {
		var lastUpdateTimeMS = lastUpdateTime.getNumericValue();

		breakdownValues.duration += this.updateTimeMS - lastUpdateTimeMS;
		if (this._hasSchedule())
			breakdownValues.business_duration += this._calcDuration(lastUpdateTime, this.updateTime);
		else
			breakdownValues.business_duration += this.updateTimeMS - lastUpdateTimeMS;
	},

	_updatePauseDurationFields: function(breakdownValues, lastUpdateTime) {
		var lastUpdateTimeMS = lastUpdateTime.getNumericValue();

		breakdownValues.pause_duration += this.updateTimeMS - lastUpdateTimeMS;
		if (this._hasSchedule())
			breakdownValues.business_pause_duration += this._calcDuration(lastUpdateTime, this.updateTime);
		else
			breakdownValues.business_pause_duration += this.updateTimeMS - lastUpdateTimeMS;
	},

	_processNewTaskSLA: function() {
		var breakdownValues;
		var breakdownDefinitionIds = Object.keys(this.breakdownDefinitionsData);
		for (var i = 0, n = breakdownDefinitionIds.length; i < n; i++) {
			if (this.retroactive) {
				var startTime = new GlideDateTime(this.currentTaskSLAGr.start_time + "");
				if (this.updateTime.after(startTime)) {
					breakdownValues = this._calculateRetroactiveBreakdownValues();
					this._createBreakdownRecord(breakdownDefinitionIds[i], breakdownValues);
				}
			}

			breakdownValues = this._calculateFirstBreakdownValues();
			this._createBreakdownRecord(breakdownDefinitionIds[i], breakdownValues);
		}			
	},

	_calculateFirstBreakdownValues: function() {
		var breakdownValues = {};
		if (!this.retroactive)
			breakdownValues.start = this.currentTaskSLAGr.start_time.dateNumericValue();
		if (!this._isPaused())
			breakdownValues.pause_time = this.currentTaskSLAGr.pause_time.dateNumericValue();
		breakdownValues.duration = this.retroactive ? 0 : this.currentTaskSLAGr.duration.dateNumericValue();
		breakdownValues.business_duration = this.retroactive ? 0 : this.currentTaskSLAGr.business_duration.dateNumericValue();
		breakdownValues.pause_duration = this.retroactive ? 0 : this.currentTaskSLAGr.pause_duration.dateNumericValue();
		breakdownValues.business_pause_duration = this.retroactive ? 0 : this.currentTaskSLAGr.business_pause_duration.dateNumericValue();
		breakdownValues.breached = this.retroactive ? false : this.breached;
		/* if we've already breached then this can only be due to retroactive time so we can mark this period
		   as post_breach as we have the retroactive period representing when we actually breached */
		if (this.breached)
			breakdownValues.post_breach = true;

		if (this.lu.atLevel(global.GSLog.DEBUG))
			this.lu.logDebug("_calculateFirstBreakdownValues: creating first (non-retroactive) period with values;\n" + JSON.stringify(breakdownValues));

		return breakdownValues;
	},	

	_calculateRetroactiveBreakdownValues: function() {
		var breakdownValues = {};
		breakdownValues.start = this.currentTaskSLAGr.start_time.dateNumericValue();
		breakdownValues.end = this.updateTimeMS;
		breakdownValues.duration = this.currentTaskSLAGr.duration.dateNumericValue();
		breakdownValues.business_duration = this.currentTaskSLAGr.business_duration.dateNumericValue();
		breakdownValues.pause_duration = this.currentTaskSLAGr.pause_duration.dateNumericValue();
		breakdownValues.business_pause_duration = this.currentTaskSLAGr.business_pause_duration.dateNumericValue();
		breakdownValues.breached = this.breached;
		breakdownValues.retroactive = true;
		breakdownValues.active = false;

		if (this.lu.atLevel(global.GSLog.DEBUG))
			this.lu.logDebug("_calculateRetroactiveBreakdownValues: creating retroactive period with values:\n" + JSON.stringify(breakdownValues));

		return breakdownValues;
	},

	_createBreakdownRecord: function(breakdownDefinitionId, breakdownValues) {
		if (!breakdownDefinitionId)
			return;

		var breakdownDefinition = this.breakdownDefinitionsData[breakdownDefinitionId];
		if (!breakdownDefinition)
			return;

		var breakdownFields = breakdownDefinition.breakdownFields;

		var breakdownGr = new GlideRecord(breakdownDefinition.breakdownTable);
		breakdownGr.setValue(SLABreakdown.SLA_BREAKDOWN_DEFINITION, breakdownDefinitionId);
		breakdownGr.setValue("task", this.taskGr.getUniqueValue());
		breakdownGr.setValue("task_sla", this.currentTaskSLAGr.getUniqueValue());
		if (!breakdownValues || !breakdownValues.hasOwnProperty("start"))
			breakdownGr.start.setDateNumericValue(this.updateTimeMS);
		if (this._isPaused() && (!breakdownValues || !breakdownValues.hasOwnProperty("pause_time")))
			breakdownGr.pause_time.setDateNumericValue(this.updateTimeMS);
		if (!breakdownValues || !breakdownValues.hasOwnProperty("last_updated"))
			breakdownGr.last_updated.setDateNumericValue(this.updateTimeMS);
		// if we've breached and not during this period then set post_breach true
		if (this.breached && !this._changesToBreached())
			breakdownGr.post_breach = true;

		breakdownFields.forEach(function(breakdownField) {
			breakdownGr.setValue(breakdownField.breakdownFieldName, this.taskGr.getValue(breakdownField.sourceFieldName));
		}, this);

		if (breakdownValues)
			this._setBreakdownValues(breakdownGr, breakdownValues);

		breakdownGr.insert();
	},

	_setBreakdownValues: function(breakdownGr, breakdownValues) {
		if (!breakdownGr || !(breakdownGr instanceof GlideRecord))
			return;

		if (breakdownValues.hasOwnProperty("duration"))
			breakdownGr.duration.setDateNumericValue(breakdownValues.duration);

		if (breakdownValues.hasOwnProperty("business_duration")) {
			breakdownGr.business_duration.setDateNumericValue(breakdownValues.business_duration);
			breakdownGr.sla_duration_percentage = (breakdownValues.business_duration / this.slaDurationMS) * 100;
		}

		if (breakdownValues.hasOwnProperty("pause_duration"))
			breakdownGr.pause_duration.setDateNumericValue(breakdownValues.pause_duration);

		if (breakdownValues.hasOwnProperty("business_pause_duration"))
			breakdownGr.business_pause_duration.setDateNumericValue(breakdownValues.business_pause_duration);

		if (breakdownValues.hasOwnProperty("start"))
			breakdownGr.start.setDateNumericValue(breakdownValues.start);

		// "pause_time" is a special case as we may be setting it empty so we need to check for this and handle appropriately
		if (breakdownValues.hasOwnProperty("pause_time")) {
			if (breakdownValues.pause_time)
				breakdownGr.pause_time.setDateNumericValue(breakdownValues.pause_time);
			else
				breakdownGr.setValue("pause_time", "");
		}

		if (breakdownValues.hasOwnProperty("end"))
			breakdownGr.end.setDateNumericValue(breakdownValues.end);

		if (breakdownValues.hasOwnProperty("last_updated"))
			breakdownGr.last_updated.setDateNumericValue(breakdownValues.last_updated);

		if (breakdownValues.breached === true)
			breakdownGr.breached = true;

		if (breakdownValues.retroactive === true)
			breakdownGr.retroactive = true;

		if (breakdownValues.post_breach === true)
			breakdownGr.post_breach = true;

		if (breakdownValues.active === false)
			breakdownGr.active = false;
	},

	_isUpdateFromTask: function() {
		/* if we don't have a previousTaskSLAGr it's because there was an update to the Task that didn't
		   cause any change to this Task SLA */
		if (this.previousTaskSLAGr === null)
			return true;

		// Otherwise see if there's been a change to the stage of the Task SLA
		return this.currentTaskSLAGr.getValue("stage") !== this.previousTaskSLAGr.getValue("stage");
	},

	_isNewSLA: function() {
		if (!this.operationOverride) {
			if (this.lu.atLevel(global.GSLog.DEBUG))
				this.lu.logDebug("_isNewSLA: record operation = " + this.currentTaskSLAGr.operation() + ", result = " + (this.currentTaskSLAGr.operation() === "insert"));
			return this.currentTaskSLAGr.operation() === "insert";
		}

		if (this.lu.atLevel(global.GSLog.DEBUG))
			this.lu.logDebug("_isNewSLA: operationOverride is set, operationOverride = " + this.operationOverride + ", result = " + (this.operationOverride === "insert"));

		return this.operationOverride === "insert";
	},

	_hasSchedule: function() {
		if (this.lu.atLevel(global.GSLog.DEBUG))
			this.lu.logDebug("_hasSchedule: schedule = " + (this.currentTaskSLAGr.schedule.nil() ? "<No schedule>" : this.currentTaskSLAGr.schedule.getDisplayValue()));

		return !this.currentTaskSLAGr.schedule.nil();
	},

	_isRetroactive: function() {
		return this.slaGr.retroactive.toString() === "true";
	},

	_isPaused: function() {
		return !this.currentTaskSLAGr.pause_time.nil();
	},

	_changesToPaused: function() {
		if (this.previousTaskSLAGr === null)
			return false;

		return this._isPaused() && this.previousTaskSLAGr.pause_time.nil();
	},

	_changesFromPaused: function() {
		if (this.previousTaskSLAGr === null)
			return false;

		return !this._isPaused() && !this.previousTaskSLAGr.pause_time.nil();
	},

	_isBreached: function() {
		return this.currentTaskSLAGr.has_breached.toString() === "true";
	},

	_changesToBreached: function() {
		if (this.previousTaskSLAGr === null)
			return false;

		return this.previousTaskSLAGr.has_breached.toString() === "false" && this._isBreached();		
	},

	_changesToInactive: function() {
		if (this.previousTaskSLAGr === null)
			return false;

		if (this.lu.atLevel(global.GSLog.DEBUG))
			this.lu.logDebug("_changesToInactive: previous active = " + (this.previousTaskSLAGr.active.toString() === "true") +
							 ",  current active = " + (this.currentTaskSLAGr.active.toString() === "false") + ", result = " +
							(this.previousTaskSLAGr.active.toString() === "true" && this.currentTaskSLAGr.active.toString() === "false"));

		return this.previousTaskSLAGr.active.toString() === "true" && this.currentTaskSLAGr.active.toString() === "false";
	},

	_isTaskSLAActive: function() {
		/* If we don't have a previous version of the Task SLA then processing is occurring because the
		   the task was updated so we can just test the active field in the current Task SLA */
		if (this.previousTaskSLAGr === null)
			return this.currentTaskSLAGr.active.toString() === "true";

		/* Otherwise make sure the active is false in previous and current and then we know this was triggered
		   by an update to an inactive Task SLA which we don't need to process */
		return !(this.previousTaskSLAGr.active.toString() === "false" && this.currentTaskSLAGr.active.toString() === "false");
	},

	_isTaskSLAChanged: function() {
		/* If we don't have a previous version of the Task SLA then processing is occurring because the
		   the task was updated and we need to see if our breakdown values have changed */
		if (this.previousTaskSLAGr === null)
			return false;

		var fieldsToCheck = ["duration", "pause_duration", "stage", "has_breached"];
		for (var i = 0, n = fieldsToCheck.length; i < n; i++) {
			if (this.currentTaskSLAGr.getValue(fieldsToCheck[i]) !== this.previousTaskSLAGr.getValue(fieldsToCheck[i]))
				return true;
		}

		return false;
	},

	_isNewBreakdownNeeded: function(breakdownDefinitionId, currentBreakdownGr) {
		var breakdownNeeded = {result: false, fieldValues: []};
		if (!breakdownDefinitionId) {
			this.lu.logError("_isNewBreakdownNeeded: no breakdown definition id supplied");
			return breakdownNeeded;
		}

		if (!currentBreakdownGr || !(currentBreakdownGr instanceof GlideRecord)) {
			this.lu.logError("_isNewBreakdownNeeded: no current breakdown record supplied");
			return breakdownNeeded;
		}

		var breakdownData = this.breakdownDefinitionsData[breakdownDefinitionId];
		if (!breakdownData) {
			this.lu.logWarn("_isNewBreakdownNeeded: no breakdown definition data found for id=" + breakdownDefinitionId);
			return breakdownNeeded;
		}

		var breakdownFields = breakdownData.breakdownFields;
		if (!breakdownFields || breakdownFields.length === 0) {
			this.lu.logWarn("_isNewBreakdownNeeded: no breakdown fields in the breakdown definition data: " + JSON.stringify(breakdownData));
			return breakdownNeeded;
		}

		var breakdownField;
		var taskValue;
		var breakdownValue;
		var fieldData;

		for (var i = 0, n = breakdownFields.length; i < n; i++) {
			breakdownField = breakdownFields[i];
			taskValue = this.taskGr.getValue(breakdownField.sourceFieldName);
			breakdownValue = currentBreakdownGr.getValue(breakdownField.breakdownFieldName);

			fieldData = {sourceField: breakdownField.sourceFieldName,
						 sourceValue: taskValue,
						 breakdownField: breakdownField.breakdownFieldName,
						 breakdownValue: breakdownValue,
						 changed: false};

			if (taskValue !== breakdownValue) {
				breakdownNeeded.result = true;
				fieldData.changed = true;
			}

			breakdownNeeded.fieldValues.push(fieldData);
		}

		if (this.lu.atLevel(global.GSLog.DEBUG))
			this.lu.logDebug("_isNewBreakdownNeeded: " + JSON.stringify(breakdownNeeded));

		return breakdownNeeded;
	},

	_getBreakdownDefinitionsData: function() {
		return new global.SLACacheManager().getBreakdownDefinitionsForSLA(this.slaGr.getUniqueValue());
	},

	_getActiveBreakdownByDefinitionId: function(breakdownDefinitionId) {
		var breakdownData = this.breakdownDefinitionsData[breakdownDefinitionId];
		if (!breakdownData || !breakdownData.breakdownTable)
			return null;

		var breakdownGr = new GlideRecord(breakdownData.breakdownTable);
		breakdownGr.addActiveQuery();
		breakdownGr.addQuery(SLABreakdown.SLA_BREAKDOWN_DEFINITION, breakdownDefinitionId);
		breakdownGr.addQuery("task_sla", this.currentTaskSLAGr.getUniqueValue());
		breakdownGr.orderBy("sys_created_on");
		breakdownGr.query();
		breakdownGr.next();

		return breakdownGr;
	},

	_getSLADefinitionGr: function() {
		return new global.SLABreakdownUtils().getSLADefinitionFromTaskSLA(this.currentTaskSLAGr);
	},

	_getTaskGr: function() {
		if (!this.slaGr || !(this.slaGr.isValidRecord()))
			return null;

		return new global.SLABreakdownUtils().getTaskFromTaskSLA(this.currentTaskSLAGr, this.slaGr.getValue("collection"));
	},

	_deriveUpdateTime: function() {
		/* if the update to this Task SLA was triggered by an update to the Task use it's
		   update time */
		if (this._isUpdateFromTask() && this.taskGr instanceof GlideRecord)
			return new GlideDateTime(this.taskGr.sys_updated_on + "");

		/* Otherwise something other than an update to the Task (via TaskSLAController) has updated the
		   Task SLA so we can just use its own update time */
		return new GlideDateTime(this.currentTaskSLAGr.sys_updated_on + "");
	},

	_getSLADurationMS: function() {
		if (this.slaGr.duration_type.nil())
			return this.slaGr.duration.dateNumericValue();

		var originalBreachTime;
		if (!this.currentTaskSLAGr.original_breach_time.nil())
			originalBreachTime = new GlideDateTime(this.currentTaskSLAGr.original_breach_time + "");
		else
			originalBreachTime = this._getSLARelativeDurationEndTime();

		return this._calcDuration(new GlideDateTime(this.currentTaskSLAGr.start_time + ""), originalBreachTime);
	},

	_getSLARelativeDurationEndTime: function() {
		// Save current
		var ocurrent = null;
		if (typeof current !== 'undefined')
			ocurrent = current;

		// Determine whether we want to set current to the "task sla"  or the "table" record associated with the "SLA Definition"
		if (this.sla.getValue("relative_duration_works_on") === "SLA record")
			current = this.currentTaskSLAGr;
		else
			current = this.taskGr;

		var dc = this._getDurationCalculator();
		// Perform relative duration calculation
		try {
			dc.calcRelativeDuration(this.sla.getValue("duration_type"));
		} catch(err) {
			this.lu.logError("_getSLARelativeDurationMS: error while calculating relative duration\n\n" + err);
		} finally {
			// Reset current back to its old value
			if (ocurrent)
				current = ocurrent;
		}

		return dc.getEndDateTime();
	},

	_calcDuration: function(startGdt, endGdt) {
		var durationCalculator = this._getDurationCalculator();
		return durationCalculator.calcScheduleDuration(startGdt, endGdt) * 1000;
	},

	_getDurationCalculator: function() {
		if (this.durationCalculator === null)
			this.durationCalculator = new global.SLABreakdownUtils().getDurationCalculatorForSLA(this.currentTaskSLAGr);

		return this.durationCalculator;
	},

	_getDateTimeWithoutMSecs: function(gdt) {
		if (!gdt)
			return;

		if (!(gdt instanceof GlideDateTime))
			return;

		var newGdt = new GlideDateTime(gdt);
		var msecs = newGdt.getNumericValue() % 1000;
		newGdt.subtract(msecs);

		return newGdt;
	},

	_logProcessingTime: function(startTime) {
		if (!this.lu.atLevel(global.GSLog.INFO))
			return;

		this.lu.logInfo("processBreakdowns: ends - processing time = " + this._getMSBetweenDates(startTime, new GlideDateTime()) + "ms");
	},

	_getMSBetweenDates: function(startTime, endTime) {
		if (!startTime || !(startTime instanceof GlideDateTime) ||
			!endTime || !(endTime instanceof GlideDateTime))
			return 0;

		return endTime.getNumericValue() - startTime.getNumericValue();
	},

    type: 'SLABreakdownProcessorSNC'
};

SLABreakdownProcessorSNC.hasBreakdownDefinitions = function(slaId) {
	var breakdownDefinitions = new global.SLACacheManager().getBreakdownDefinitionsForSLA(slaId);
	if (!breakdownDefinitions)
		return false;
	
	return Object.keys(breakdownDefinitions).length > 0;
};
```