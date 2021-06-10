---
title: "RepairTaskSLA"
id: "repairtasksla"
---

API Name: global.RepairTaskSLA

```js
var RepairTaskSLA = Class.create();

RepairTaskSLA.prototype = Object.extendsObject(TaskSLA, {
	initialize: function(aGR, taskGR, deferInsert, slaDefGR) {
		this.lu = new GSLog(this.SLA_TASK_SLA_LOG, this.type);
		this.lu.includeTimestamp();
		this.slaUtil = new SLAUtil();
		if (gs.getProperty(this.SLA_DATABASE_LOG, "db") == "node")
			this.lu.disableDatabaseLogs();
		this.slalogging = new TaskSLALogging();
		if (this.lu.atLevel(GSLog.DEBUG))
			this.lu.logDebug('TaskSLA.initialize:\n' + this.slalogging.getBusinessRuleStackMsg());

		this.breachCompat = (gs.getProperty(this.SLA_COMPATIBILITY_BREACH, 'true') == 'true');
		this.calcEndTimeAfterBreach = (gs.getProperty(this.SLA_CALCULATE_PLANNED_END_TIME_AFTER_BREACH, 'true') == 'true');

		// set timers?
		this.timers = (gs.getProperty(this.SLA_TASK_SLA_TIMERS, 'false') == 'true');
		// time the initialization
		if (this.timers)
			this.sw = new GlideStopWatch();

		// Handle the different initialization forms of this Class
		this.starting = false; // true if the task_sla record hasn't yet been inserted
		this.breachTimerEnabled = true; // default: creating a breachTrigger is enabled
		this.adjusting = false; // true if TaskSLAController is adjusting the pause time of a retroactive SLA
		this.slaDefGR = null;
		this.taskGR = null;

		var taskTable;
		var slaTable = new TableUtils(aGR.getRecordClassName());
		if (taskGR) {
			taskTable = new TableUtils(taskGR.getRecordClassName());
			if (!taskGR.sys_id.nil())
				this.taskGR = taskGR;
		}

		// if we've been supplied an SLA Definition use it
		if (slaDefGR && slaDefGR.isValidRecord())
			this.slaDefGR = slaDefGR;

		// Class instance variables:
		// - this.taskSLAgr    - the associated task_sla GlideRecord
		// - this.currentStage - current stage of the Task SLA instance
		// - this.starting     - true if the Task SLA instance has just been created
		// - this.updateTime   - last time (GlideDateTime) of update to the associated Task record
		// - this.breachedFlag - has this SLA breached?
		// (and for debugging and test purposes)
		// - this.timers       -- are stopwatch timers enabled?
		// - this.breachTimerEnabled  -- should the breach-timer trigger be created?

		// new TaskSLA()
		if (!aGR) {
			// create a blank one?
		}

		// new TaskSLA(taskSLAid)
		// (an existing task_sla sys_id)
		else if (typeof aGR == 'string') {
			this.lu.logDebug('creating TaskSLA from sys_id');
			this.taskSLAgr = new GlideRecord('task_sla');
			this.taskSLAgr.get(aGR);
		}

		// new TaskSLA(taskSLAgr)
		// (an existing task_sla record for a task)
		else if (slaTable.getAbsoluteBase() == 'task_sla') {
			this.taskSLAgr = new GlideRecord(aGR.getTableName());
			if (!this.taskSLAgr.get(aGR.sys_id))
				// task_sla record is not (yet) in the database
				this.taskSLAgr = aGR;
		}

		// new TaskSLA(contractSLAgr, taskGR)
		// (creates a new task_sla record associated to the task)
		else if (slaTable.getAbsoluteBase() == 'contract_sla' && taskTable && taskTable.getAbsoluteBase() == 'task') {
			if (this.slaDefGR === null)
				this.slaDefGR = aGR;
			this.taskSLAgr = this._newTaskSLAprepare(aGR, taskGR);
			if (!deferInsert) {
				// insert task_sla record immediately (compatible with old callers)
				this.taskSLAgr.setWorkflow(false);
				this.taskSLAgr.insert();
			}
			// else defer Insert - only do it once our controller wants us to
		}

		// if we still haven't got an SLA Definition look it up
		if (this.slaDefGR === null)
			this.slaDefGR = this._getContractSLA();

		this.currentStage = this._getStage();
		this._setBreachedFlag(); // this.breachedFlag;
		// default: use the time of last update to the Task record
		this.updateTime = this._glideDateTime(this.taskGR !== null ? this.taskGR.sys_updated_on : this.taskSLAgr.task.sys_updated_on);

		// if enable logging has been checked on the SLA definition up the log level to "debug"
		if (this.slaDefGR && this.slaDefGR.enable_logging)
			this.lu.setLevel(GSLog.DEBUG);

		if (this.lu.atLevel(GSLog.INFO))
			this.lu.logInfo('TaskSLA.initialize() for ' + this.taskSLAgr.sys_id + ' at ' + this.updateTime.getDisplayValue());
		if (this.timers) {
			this.sw.log('Finished TaskSLA initialization');
			this.sw = new GlideStopWatch();
		}
	},

	setRetroactiveAdjusting: function(enable) {
		this.adjusting = enable;
		this.breachTimerEnabled = !enable;
		if (!enable) // stopping retroactive adjustments: update db
			this._commit();
	},

	// Make sure the doWorkflow function is invoked only once, at the end of the repairing process
	// (after all the historical updates of the parent task have been processed)
	doWorkflow: function() {
		if (!this.taskSLAgr) {
			if (this.lu.atLevel(GSLog.WARNING))
				this.lu.logWarning('doWorkflow: task_sla gr not initialized, workflow cannot be processed');
			return;
		}

		if(this.lu.atLevel(GSLog.DEBUG))
			this.lu.logDebug('doWorkflow: Going to process workflow for task_sla [' + this.taskSLAgr.getUniqueValue() + ']');

		var taskSLAWorkflow = new RepairTaskSLAWorkflow(this.taskSLAgr, this.slaDefGR);
		var taskSLAState = this.getCurrentState();

		if(taskSLAState === TaskSLA.STATE_COMPLETED || taskSLAState === TaskSLA.STATE_CANCELLED)
			taskSLAWorkflow.start(this._glideDateTime(this.taskSLAgr.end_time));
		else
			taskSLAWorkflow.start(this._glideDateTime(this.taskSLAgr.sys_updated_on));

		switch(taskSLAState) {
			case TaskSLA.STATE_PAUSED:
				taskSLAWorkflow.pause();
				break;
			case TaskSLA.STATE_CANCELLED:
			case TaskSLA.STATE_COMPLETED:
				taskSLAWorkflow.stop();
				break;
		}

		taskSLAWorkflow.turnRepairModeOff();
	},

	// Make sure the doWorkflow function is invoked only once, at the end of the repairing process
	// (after all the historical updates of the parent task have been processed)
	doFlow: function() {
		if (!this.taskSLAgr) {
			if (this.lu.atLevel(GSLog.WARNING))
				this.lu.logWarning('doFlow: task_sla gr not initialized, Flow cannot be processed');
			return;
		}

		if(this.lu.atLevel(GSLog.DEBUG))
			this.lu.logDebug('doFlow: Going to process Flow for task_sla [' + this.taskSLAgr.getUniqueValue() + ']');

		var taskSLAFlow = new TaskSLAFlow(this.taskSLAgr, this.slaDefGR);
		taskSLAFlow.setRepairMode(true);
		taskSLAFlow.start();
		
		var taskSLAState = this.getCurrentState();
		switch(taskSLAState) {
			case TaskSLA.STATE_PAUSED:
				taskSLAFlow.pause();
				break;
			case TaskSLA.STATE_CANCELLED:
			case TaskSLA.STATE_COMPLETED:
				taskSLAFlow.cancel();
				break;
		}
	},

	setTaskGR: function(taskGR) {
		this.taskGR = taskGR;
	},

	_getTaskSLA: function() {
		return this.taskSLAgr;
	},

	_newTaskSLAprepare: function(contractSLAgr, taskGR) {
		this.starting = true;
		if (this.lu.atLevel(GSLog.DEBUG))
			this.lu.logDebug('_newTaskSLAprepare: contract_sla=' + contractSLAgr.sys_id + '; task=' + taskGR.sys_id);

		// insert a new task_sla for this task, based upon the specified contract_sla
		var gr = new GlideRecord('task_sla');
		gr.newRecord();
		gr.setNewGuid(); // for SLACalculatorNG(), via _calculate()
		this.taskSLAgr = gr;
		gr.task = taskGR.sys_id;
		gr.task.getRefRecord();
		gr.sla = contractSLAgr.sys_id;
		gr.sla.setRefRecord(contractSLAgr);

		var schSource = contractSLAgr.schedule_source + ''; // default value: 'sla_definition', others: 'no_schedule' or 'task_field'
		var tzSource = contractSLAgr.timezone_source + '';  // default value: 'task.caller_id.time_zone', others: various.. see SLATimezone.source()
		if (this.lu.atLevel(GSLog.DEBUG))
			this.lu.logDebug('_newTaskSLAprepare: schedule source: ' + schSource + '; timezone source: ' + tzSource);
		var scheduleId = SLASchedule.source(schSource, gr, taskGR);
		// If we got a Schedule from somewhere based on the settings in the SLA definition
		// put it in the new task_sla record
		if (scheduleId) {
			var scheduleGR = new GlideRecord('cmn_schedule');
			scheduleGR.get(scheduleId);
			gr.schedule = scheduleGR.sys_id;
			gr.schedule.setRefRecord(scheduleGR);
		}
		gr.timezone = SLATimezone.source(tzSource, gr, taskGR);  // i.e. gr.task.caller_id.time_zone
		if (!gr.timezone)
			// explicitly use the system timezone, if an empty/NULL value was returned above
			gr.timezone = gs.getSysTimeZone();

		// fill out the start_time:
		// default behaviour        - starting time is last update time of associated task
		// retroactive set_start_to - (a task field specified in contractSLAgr.set_start_to) e.g. 'approval_set', 'sys_created_on'
		// NB. here we use task.sys_updated_on, rather than this.updateTime, because it isn't yet initialized (no associated task!)
		var startTime = (contractSLAgr.retroactive) ? taskGR[contractSLAgr.getValue('set_start_to')] : taskGR.sys_updated_on;
		if (startTime)
			gr.start_time = startTime;
		else
			gr.start_time = taskGR.sys_updated_on;

		// a retroactive start SLA should have its pause_duration, pause_time, end_time calculated based upon task events prior to its real start
		// (TaskSLAController is in charge of making this happen)
		this._recalculateEndTime();
		if (contractSLAgr.retroactive) {
			this._firstcalculate(this._glideDateTime(taskGR.sys_updated_on));
		} else
			this._firstcalculate(this._glideDateTime(gr.start_time));

		gr.original_breach_time = gr.planned_end_time;

		var taskSLAid = gr.sys_id;
		if (this.lu.atLevel(GSLog.INFO))
			this.lu.logInfo('TaskSLA._newTaskSLAprepare: prepared SLA "' + contractSLAgr.name + '" as task_sla: ' + taskSLAid + ' for task:' + taskGR.sys_id + ' with schedule: ' + gr.schedule + '; timezone: ' + gr.timezone + '; start_time=' + this._glideDateTime(gr.start_time));

		return gr;
	},

	_toInProgress: function() {
		// Log the field values in the Task SLA record
		if (this.lu.atLevel(GSLog.DEBUG))
			this.lu.logDebug('_toInProgress starts:\n' + this.slalogging.getRecordContentMsg(this.taskSLAgr));

		if (this.currentStage != this.STAGE_IN_PROGRESS)
			this._setStage(this.STAGE_IN_PROGRESS);

		// Log the field values in the Task SLA record
		if (this.lu.atLevel(GSLog.DEBUG))
			this.lu.logDebug('_toInProgress ends:\n' + this.slalogging.getRecordContentMsg(this.taskSLAgr));
	},

	_commit: function() {
		if (this.lu.atLevel(GSLog.INFO))
			this.lu.logInfo('commit: [' + this.taskSLAgr.sys_id + '] ' + this.state[this.currentStage] + '(stage:' + this.taskSLAgr.stage + ') starting=' + this.starting + '; breached=' + this.breachedFlag);

		if (this.taskSLAgr.isNewRecord()) {
			if (this.taskGR && !this.taskGR.sys_domain.nil())
				this.taskSLAgr.sys_domain = this.taskGR.sys_domain;
			else if (this.taskSLAgr && !this.taskSLAgr.task.sys_domain.nil())
				this.taskSLAgr.sys_domain = this.taskSLAgr.task.sys_domain;
		}

		this.taskSLAgr.setWorkflow(false);
		var taskSLAid = this.taskSLAgr.update(); // will insert, if the record doesn't already exist
		if (this.lu.atLevel(GSLog.DEBUG))
			this.lu.logDebug('commit: task_sla [' + taskSLAid + ']');
	},

	// recalculate the new end-time at start, or after a pause
	// pre-req: pause_duration, and business_pause_duration, or totalPauseTimeMS includes the time spent in the pause state so far or just left.
	_recalculateEndTime: function(totalPauseTimeMS) {
		if (this.breachedFlag && !this.calcEndTimeAfterBreach)
			return;

		if (!totalPauseTimeMS)
			totalPauseTimeMS = this.taskSLAgr.business_pause_duration.dateNumericValue();

		var dc = new DurationCalculator();
		var tz = this.slaUtil.getTimezone(this.taskSLAgr);

		if (this.taskSLAgr.schedule)
			dc.setSchedule(this.taskSLAgr.schedule, tz);
		dc.setStartDateTime(this._glideDateTime(this.taskSLAgr.start_time)); // this can be set via retroactive start
		if (this.taskSLAgr.sla.duration_type == '') {
			// plain end-time extended by total (business) pause time
			var newDuration = this.taskSLAgr.sla.duration.dateNumericValue() + totalPauseTimeMS; // milliseconds
			dc.calcDuration(newDuration / 1000);
		}
		else {
			// scripted "absolute" end_time, does not need to account for pause time.

			// Store the current value of current
			var ocurrent = null;
			if (typeof current !== 'undefined')
				ocurrent = current;

			/* Determine whether we want to set current to the "task sla"  or the "table" record associated with the "SLA Definition"
			   but if we've got our own "this.taskGR" use that above everything else as this is the "walked" copy of the Task */
			if (this.taskSLAgr.sla.relative_duration_works_on == "SLA record") {
				this.taskSLAgr.task.setRefRecord(this.taskGR);
				current = this.taskSLAgr;
			} else if (this.taskGR)
				current = this.taskGR;
			else
				current = this.taskSLAgr.task.getRefRecord();

			// Perform calculation using the revised value of current
			dc.calcRelativeDuration(this.taskSLAgr.sla.duration_type);

			// After the calculation, reset current back to its old value
			if (ocurrent)
				current = ocurrent;
		}
		this.taskSLAgr.planned_end_time = dc.getEndDateTime();
	},

	// Overriding parent TaskSLA function in order to NOT process the workflow for each State change when repairing
	// Workflow for RepairTaskSLA is handled in doWorkflow
	_doWorkflow: function() {
		return;
	},
	
	// Overriding parent TaskSLA function in order to NOT process the Flow for each State change when repairing
	// Flow for RepairTaskSLA is handled in doFlow
	_doFlow: function() {
		return;
	},

	type: 'RepairTaskSLA',

	// ** Deprecated ** Below variables/functions are deprecated

	/* Deprecated */ runWorkflow: false,
	/* Deprecated */ setRunWorkflow: function(runWorkflow) {
		this.runWorkflow = runWorkflow;
	}
});
```