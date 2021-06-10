---
title: "TaskSLA"
id: "tasksla"
---

API Name: global.TaskSLA

```js
var TaskSLA = Class.create();

// for requesting State transitions
TaskSLA.STATE_IN_PROGRESS = 'In Progress';
TaskSLA.STATE_PAUSED      = 'Paused';
TaskSLA.STATE_CANCELLED   = 'Cancelled';
TaskSLA.STATE_COMPLETED   = 'Completed';

TaskSLA.prototype = {

	// new TaskSLA(contractSLAgr, taskGR)
	//  -- add a new task_sla GlideRecord, related to the taskGR GlideRecord, based upon the contractSLAgr GlideRecord
	//     (assumes the caller has already made the decision to add it, and is actively preventing
	//     multiple overlapping requests to add the same contract_sla)
	//
	// new TaskSLA(taskSLAid)
	//  -- instantiate a TaskSLA model with an existing task_sla record sys_id, taskSLAid (task_sla.sys_id).
	//
	// new TaskSLA(taskSLAgr)
	//  -- instantiate a TaskSLA model with an existing task_sla GlideRecord, taskSLAgr
	//
	// new TaskSLA()
	//  -- (not sure if this is needed, yet?)
	//

	// sys_properties
	SLA_COMPATIBILITY_BREACH: 'com.snc.sla.compatibility.breach', // stage=='breached' when in_progress/breached, and when complete?
	SLA_CALCULATE_PLANNED_END_TIME_AFTER_BREACH: 'com.snc.sla.calculate_planned_end_time_after_breach',

	SLA_TASK_SLA_LOG: 'com.snc.sla.task_sla.log',
	SLA_TASK_SLA_TIMERS: 'com.snc.sla.task_sla.timers',
	SLA_DATABASE_LOG: 'com.snc.sla.log.destination',

	// internal stage choice values
	STAGE_STARTING:    'starting',
	STAGE_IN_PROGRESS: 'in_progress',
	STAGE_PAUSED:      'paused',
	STAGE_CANCELLED:   'cancelled',
	STAGE_ACHIEVED:    'achieved',
	STAGE_BREACHED:    'breached',
	STAGE_COMPLETED:   'completed',

	initialize : function(aGR, taskGR, deferInsert, params, slaDefGR) {
		this.lu = new GSLog(this.SLA_TASK_SLA_LOG, this.type);
		this.lu.includeTimestamp();
		if (gs.getProperty(this.SLA_DATABASE_LOG,"db") === "node")
			this.lu.disableDatabaseLogs();
		this.slalogging = new TaskSLALogging();
		if (this.lu.atLevel(GSLog.DEBUG))
			this.lu.logDebug('TaskSLA.initialize:\n' + this.slalogging.getBusinessRuleStackMsg());

		this.breachCompat = (gs.getProperty(this.SLA_COMPATIBILITY_BREACH, 'true') === 'true');
		this.calcEndTimeAfterBreach = (gs.getProperty(this.SLA_CALCULATE_PLANNED_END_TIME_AFTER_BREACH, 'true') === 'true');
		this.breakdownsPluginActive = pm.isActive("com.snc.sla.breakdowns");
		this.slaUtil = new SLAUtil();

		// set timers?
		this.timers = (gs.getProperty(this.SLA_TASK_SLA_TIMERS, 'false') === 'true');
		// time the initialization
		if (this.timers)
			this.sw = new GlideStopWatch();

		// Handle the different initialization forms of this Class
		this.starting = false;            // true if the task_sla record hasn't yet been inserted
		this.breachTimerEnabled = true;   // default: creating a breachTrigger is enabled
		this.adjusting = false;           // true if TaskSLAController is adjusting the pause time of a retroactive SLA
		this.dryRun = (params && params.dryRun === true);
		this.calledFromAsync = (params && params.calledFromAsync === true);
		this.slaDefGR = null;
		this.taskGR = null;
		this.taskSLADurationMs = null;

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
		else if (typeof aGR === 'string') {
			this.lu.logDebug('creating TaskSLA from sys_id');
			this.taskSLAgr = new GlideRecord('task_sla');
			this.taskSLAgr.get(aGR);
		}

		// new TaskSLA(taskSLAgr)
		// (an existing task_sla record for a task)
		else if (slaTable.getAbsoluteBase() + '' === 'task_sla') {
			this.taskSLAgr = new GlideRecord(aGR.getTableName());
			if (!this.taskSLAgr.get(aGR.sys_id)) // task_sla record is not (yet) in the database
				this.taskSLAgr = aGR;
		}

		// new TaskSLA(contractSLAgr, taskGR)
		// (creates a new task_sla record associated to the task)
		else if (slaTable.getAbsoluteBase() + '' === 'contract_sla' && taskTable && taskTable.getAbsoluteBase() + '' === 'task') {
			if (this.slaDefGR === null)
				this.slaDefGR = aGR;
			this.taskSLAgr = this._newTaskSLAprepare(aGR, taskGR);
			if (!deferInsert && !this.dryRun) // insert task_sla record immediately (compatible with old callers)
				this.taskSLAgr.insert();
			// else defer Insert - only do it once our controller wants us to
		}

		// if we still haven't got an SLA Definition look it up
		if (this.slaDefGR === null)
			this.slaDefGR = this._getContractSLA();

		this.currentStage = this._getStage();
		this._setBreachedFlag();
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

	// public methods of this Model

	// updateState(newState)
	// -- returns true if this is a valid state, and valid state transition
	updateState: function(newState) {

		if (this.state[this.currentStage] == newState) {
			if (this.lu.atLevel(GSLog.DEBUG))
				this.lu.logDebug('TaskSLA.updateState: no update to do as current state (' + this.state[this.currentStage] + ') and state to update to (' + newState + ') are the same');
			return false;
		}

		if (this.lu.atLevel(GSLog.INFO))
			this.lu.logInfo('TaskSLA.updateState: << ' + this.state[this.currentStage]);
		// things to do when leaving a state
		switch(this.currentStage) {
			case this.STAGE_STARTING:
			// new task_sla starting state
			break;
			case this.STAGE_IN_PROGRESS:
			this._fromInProgress();
			break;
			case this.STAGE_PAUSED:
			this._fromPaused();
			break;
			// (you can't ever leave the terminal states of Cancelled or Complete)
			default:
			if (this.lu.atLevel(GSLog.NOTICE))
				this.lu.logNotice('TaskSLA: unknown state transition from "' + this.state[this.currentStage] + '" to "' + newState + '" requested for task_sla:"' + this.slaDefGR.name + '" [' + this.taskSLAgr.getValue('sys_id') + ']');
			return false;
		}

		if (this.lu.atLevel(GSLog.INFO))
			this.lu.logInfo('TaskSLA.updateState: >> ' + newState);
		// things to do to TaskSLA when entering a state
		switch(newState) {
			case TaskSLA.STATE_IN_PROGRESS:
			this._toInProgress();
			break;
			case TaskSLA.STATE_PAUSED:
			this._toPaused();
			break;
			case TaskSLA.STATE_CANCELLED:
			this._toCancelled();
			break;
			case TaskSLA.STATE_COMPLETED:
			this._toComplete();
			break;
			default:
			// unknown transition
			if (this.lu.atLevel(GSLog.NOTICE))
				this.lu.logNotice('TaskSLA: unknown state transition to "' + newState + '" requested for task_sla:"' + this.slaDefGR.name + '" [' + this.taskSLAgr.getValue('sys_id') + ']');
			return false;
		}

		if (this.adjusting) {
			this.lu.logInfo('TaskSLA.updateState: adjusting pause');
			return false;
		}

		this._commit();

		if (this.breachTimerEnabled && !this.dryRun) {
			this._doWorkflow(newState);
			this._doFlow(newState);
		}

		this.starting = false;
		if (this.timers)
			this.sw.log('Finished TaskSLA (updateState)');
		return true; // valid state transition
	},

	// update Planned End Time without updating pause_duration
	updatePlannedEndTime: function() {
		if (this.currentStage !== this.STAGE_PAUSED)
			return;
		if (this.breachedFlag)
			return;

		var nowGDT = new GlideDateTime();
		// use a task GlideRecord to get a glide_date_time value
		var taskGR = new GlideRecord('task');
		taskGR.initialize();
		taskGR.work_start.setDateNumericValue(nowGDT.getNumericValue());
		this.updateTime = /* GlideDateTime */ this._glideDateTime(taskGR.work_start);

		if (this.lu.atLevel(GSLog.INFO))
			this.lu.logInfo('updatePlannedEndTime: ' + this.updateTime.getDisplayValue());
		if (!this.taskSLAgr.schedule)
			this._recalculateEndTime(this._calculatePD(this.taskSLAgr.pause_time));
		else
			this._recalculateEndTime(this._calculateBPD(this.taskSLAgr.pause_time));
		this._commit();
	},

	// called by "SLA Breach Timer" sys_trigger job
	// (as created by _insertBreachTrigger())
	breachTimerExpired: function(/* optional: glide_date_time */ expireTime) {
		// double-check we haven't been called by a lingering trigger
		// when we might already be complete, cancelled, or paused
		if (!this.taskSLAgr.active || this.currentStage !== this.STAGE_IN_PROGRESS)
			return;

		if (this.lu.atLevel(GSLog.INFO))
			this.lu.logInfo('TaskSLA.breachTimerExpired: from ' + this.state[this.currentStage] + ' at ' + ((typeof(expireTime) !== 'undefined') ? expireTime.getDisplayValue() : 'now'));

		if (new SLAAsyncQueue().isTaskQueued(this.taskSLAgr.getValue("task"))) {
			if (this.lu.atLevel(GSLog.INFO))
				this.lu.logInfo('TaskSLA.breachTimerExpired: ignoring breach timer for Task ' + this.taskSLAgr.task.getDisplayValue() + ' as it has pending records in the SLA Async Queue');
			return;
		}

		// What if we are not percentage >= 100? That could only happen if the breachTimer was set for the wrong time

		var processBreakdowns = this.calledFromAsync && this.breakdownsPluginActive && sn_sla_brkdwn.SLABreakdownProcessor.hasBreakdownDefinitions(this.taskSLAgr.getValue("sla"));
		var previousTaskSLAgr;
		if (processBreakdowns)
			previousTaskSLAgr = this.slaUtil.copyTaskSLA(this.taskSLAgr);

		// although the timer was expected to fire at planned_end_time
		// recalculate on the basis of the current time (which will be on time or later), to get the latest numbers
		if (expireTime && typeof(expireTime) !== 'undefined') {
			// usually set for testing purposes
			this._recalculate(expireTime);
			this.updateTime = expireTime;
		}
		else // recalculate percentage, duration, etc. as of now
			this._recalculate();

		this._setStage(this.STAGE_IN_PROGRESS);
		// the SLA is still running, until something completes it
		this._commit();
		
		// if we're processing asynchronously we need to call process breakdowns as business rule "Process SLA Breakdowns" won't be called
		if (processBreakdowns)
			new sn_sla_brkdwn.SLABreakdownProcessor(this.taskSLAgr, previousTaskSLAgr).processBreakdowns();
	},

	// setBreachTimer(false) to prevent a trigger entry being created
	setBreachTimer: function(enable) {
		this.breachTimerEnabled = enable;
	},

	setRetroactiveAdjusting: function(enable) {
		this.adjusting = enable;
		this.breachTimerEnabled = !enable;
		if (!enable && !this.dryRun) {
			// stopping retroactive adjustments: update db, kick off workflow, and set the breach trigger
			this._commit();

			// We will only start a Flow or a Workflow with Flow taking precedence
			if (this.slaDefGR.flow.nil()) {
				var taskSLAworkflow = new TaskSLAworkflow(this.taskSLAgr, this.slaDefGR);
				taskSLAworkflow.start();
			} else {
				var taskSLAFlow = new TaskSLAFlow(this.taskSLAgr, this.slaDefGR);
				taskSLAFlow.start();
			}

			if (this.currentStage === this.STAGE_IN_PROGRESS)
				this._insertBreachTrigger();
			else {
				this._doWorkflow(this.state[this.currentStage]);
				this._doFlow(this.state[this.currentStage]);
			}
		}
	},

	calculate: function(/* boolean */ skipUpdate, /* optional: GlideDateTime */ nowTime) {
		this._calculate(skipUpdate, nowTime);
	},

	getGlideRecord: function() {
		return this.taskSLAgr;
	},

	getContractSLA: function() {
		return this.slaDefGR;
	},

	getCurrentState: function() {
		return this.state[this.currentStage]; // map to incoming State values
	},

	// set the time at which subsequent updateState() operations will occur
	setUpdateTime: function(/* glide_date_time, GlideDateTime or string "Value" */ updateTime) {
		if (typeof updateTime === 'string') {
			var gDT = new GlideDateTime();
			gDT.setValue(updateTime);
			this.updateTime = gDT;
		}
		else
			this.updateTime = this._glideDateTime(updateTime);

		if (this.lu.atLevel(GSLog.DEBUG))
			this.lu.logDebug('setUpdateTime: updateTime=' + this.updateTime);
	},

	getUpdateTime: function() {
		return this.updateTime;
	},

	///////////////////////////////////////////////////

	// map in_progress -> 'In Progress', etc.
	state: {
		starting:    '(Starting)',
		in_progress: TaskSLA.STATE_IN_PROGRESS,
		paused:      TaskSLA.STATE_PAUSED,
		cancelled:   TaskSLA.STATE_CANCELLED,
		completed:   TaskSLA.STATE_COMPLETED
	},

	// internal methods

	// gets the task_sla stage, handling backwards compatibility
	// maps (compatibility=true) stage: { in_progress, paused, breached, achieved, cancelled }
	//  or  (compatibility=false) stage: no re-mapping
	// returns: { starting, in_progress, paused, complete, cancelled } (all referenced in this.state[])

	_getStage: function() {
		var stage = this.taskSLAgr.getValue('stage');
		if (this.starting) // not yet entered in_progress
			return this.STAGE_STARTING;
		if (stage === this.STAGE_BREACHED) // map the quasi-state of 'breached'
			if (this.taskSLAgr.active)
				return this.STAGE_IN_PROGRESS;
			else
				return this.STAGE_COMPLETED;
		else if (stage === this.STAGE_ACHIEVED)
			return this.STAGE_COMPLETED;
		return stage;
	},

	// update the task_sla stage field, handling backwards compatibility
	// maps stage: { in_progress, paused, complete, cancelled }
	//  to (compatibility=true) stage: { in_progress, paused, breached, achieved, cancelled }
	//  or (compatibility=false) stage: no re-mapping
	_setStage: function(stage) {
		if (this.lu.atLevel(GSLog.DEBUG))
			this.lu.logDebug('_setStage: breachCompat=' + this.breachCompat + '; stage=' + stage);
		if (this.breachCompat) {
			// with the quasi-states of 'breached' and 'achieved'
			if (this.breachedFlag && (stage === this.STAGE_IN_PROGRESS || stage === this.STAGE_COMPLETED))
				this.taskSLAgr.stage = this.STAGE_BREACHED;
			else if (stage === this.STAGE_COMPLETED)
				this.taskSLAgr.stage = this.STAGE_ACHIEVED;
			else
				this.taskSLAgr.stage = stage;
		}
		else
			this.taskSLAgr.stage = stage;
		// keep model in step with updated GlideRecord
		if (this.lu.atLevel(GSLog.DEBUG))
			this.lu.logDebug('_setStage: -> taskSLAgr.stage=' + this.taskSLAgr.stage);
		this.currentStage = stage;
	},

	_commit: function() {
		if (!this.dryRun) {
			if (this.lu.atLevel(GSLog.INFO))
				this.lu.logInfo('commit: [' + this.taskSLAgr.sys_id + '] ' + this.state[this.currentStage] + '(stage:' + this.taskSLAgr.stage + ') starting=' + this.starting + '; breached=' + this.breachedFlag);
			var taskSLAid = this.taskSLAgr.update(); // will insert, if the record doesn't already exist
			if (this.lu.atLevel(GSLog.DEBUG))
				this.lu.logDebug('commit: task_sla [' + taskSLAid + ']');
		}
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
		if (contractSLAgr.retroactive)
			// calculate based upon now, rather than the start_time
			// so that there are actually numbers in the percentage, duration fields, etc.
			this._firstcalculate(this._glideDateTime(taskGR.sys_updated_on));
		else
			this._firstcalculate(this._glideDateTime(gr.start_time));

		gr.original_breach_time = gr.planned_end_time;

		var taskSLAid = gr.sys_id;
		if (this.lu.atLevel(GSLog.INFO))
			this.lu.logInfo('TaskSLA._newTaskSLAprepare: prepared SLA "' + contractSLAgr.name + '" as task_sla: ' + taskSLAid + ' for task:' + taskGR.sys_id + ' with schedule: ' + gr.schedule + '; timezone: ' + gr.timezone + '; start_time=' + this._glideDateTime(gr.start_time));

		return gr;
	},

	_fromInProgress: function() {
		// Log the field values in the Task SLA record
		if (this.lu.atLevel(GSLog.DEBUG))
			this.lu.logDebug('_fromInProgress starts:\n' +
							 this.slalogging.getRecordContentMsg(this.taskSLAgr));

		// if this is actually a "new" task_sla, then we aren't really in this state yet
		// (should not be called)
		if (this.starting)
			return;

		// SLA time has elapsed whilst 'In Progress', so recalculate percentage, duration, etc
		this._recalculate(this.updateTime);
		// Breach Trigger only ever active during 'In Progress'
		this._clearBreachTrigger();

		// Log the field values in the Task SLA record
		if (this.lu.atLevel(GSLog.DEBUG))
			this.lu.logDebug('_fromInProgress ends:\n' +
							 this.slalogging.getRecordContentMsg(this.taskSLAgr));
	},

	_fromPaused: function() {
		// Log the field values in the Task SLA record
		if (this.lu.atLevel(GSLog.DEBUG))
			this.lu.logDebug('_fromPaused starts:\n' +
							 this.slalogging.getRecordContentMsg(this.taskSLAgr));

		// pause_time is when the task_sla entered the Pause state
		var pausedAt = this._glideDateTime(this.taskSLAgr.pause_time);
		// as we've finished this Pause period
		this._updatePauseDuration(pausedAt);
		this.taskSLAgr.pause_time = '';
		// new end time, after returning from pause
		this._recalculateEndTime(this.taskSLAgr.business_pause_duration.dateNumericValue());
		this._recalculate(this.updateTime);

		// Log the field values in the Task SLA record
		if (this.lu.atLevel(GSLog.DEBUG))
			this.lu.logDebug('_fromPaused ends:\n' +
							 this.slalogging.getRecordContentMsg(this.taskSLAgr));
	},

	_toInProgress: function() {
		// Log the field values in the Task SLA record
		if (this.lu.atLevel(GSLog.DEBUG))
			this.lu.logDebug('_toInProgress starts:\n' +
							 this.slalogging.getRecordContentMsg(this.taskSLAgr));

		if (this.currentStage !== this.STAGE_IN_PROGRESS)
			this._setStage(this.STAGE_IN_PROGRESS);
		if (!this.breachedFlag)
			this._insertBreachTrigger();
		// Log the field values in the Task SLA record
		if (this.lu.atLevel(GSLog.DEBUG))
			this.lu.logDebug('_toInProgress ends:\n' +
							 this.slalogging.getRecordContentMsg(this.taskSLAgr));
	},

	_toPaused: function() {
		// Log the field values in the Task SLA record
		if (this.lu.atLevel(GSLog.DEBUG))
			this.lu.logDebug('_toPaused starts:\n' +
							 this.slalogging.getRecordContentMsg(this.taskSLAgr));

		this._setStage(this.STAGE_PAUSED);
		this.taskSLAgr.pause_time = this.updateTime;

		// Log the field values in the Task SLA record
		if (this.lu.atLevel(GSLog.DEBUG))
			this.lu.logDebug('_toPaused ends:\n' +
							 this.slalogging.getRecordContentMsg(this.taskSLAgr));
	},

	_toCancelled: function() {
		// Log the field values in the Task SLA record
		if (this.lu.atLevel(GSLog.DEBUG))
			this.lu.logDebug('_toCancelled starts:\n' +
							 this.slalogging.getRecordContentMsg(this.taskSLAgr));

		this.taskSLAgr.active = false;
		this.taskSLAgr.end_time = this.updateTime;
		this._setStage(this.STAGE_CANCELLED);

		// Log the field values in the Task SLA record
		if (this.lu.atLevel(GSLog.DEBUG))
			this.lu.logDebug('_toCancelled ends:\n' +
							 this.slalogging.getRecordContentMsg(this.taskSLAgr));
	},

	_toComplete: function() {
		// Log the field values in the Task SLA record
		if (this.lu.atLevel(GSLog.DEBUG))
			this.lu.logDebug('_toComplete starts:\n' +
							 this.slalogging.getRecordContentMsg(this.taskSLAgr));

		this.taskSLAgr.active = false;
		this.taskSLAgr.end_time = this.updateTime;
		this._setStage(this.STAGE_COMPLETED);

		// Log the field values in the Task SLA record
		if (this.lu.atLevel(GSLog.DEBUG))
			this.lu.logDebug('_toComplete ends:\n' +
							 this.slalogging.getRecordContentMsg(this.taskSLAgr));
	},

	_doWorkflow: function(newState) {
		// things to do to TaskSLAworkflow when entering a state
		// (these must take place after the task_sla record has been inserted or updated)
		
		if (this.dryRun)
			return;

		var taskSLAworkflow = new TaskSLAworkflow(this.taskSLAgr, this.slaDefGR);
		switch(newState) {
			case TaskSLA.STATE_IN_PROGRESS:
				// Only start a Workflow if we don't have a Flow
				if (this.starting && this.slaDefGR.flow.nil())
					taskSLAworkflow.start();
				else
					taskSLAworkflow.resume();
				break;
			case TaskSLA.STATE_PAUSED:
				taskSLAworkflow.pause();
				break;
			case TaskSLA.STATE_CANCELLED:
			case TaskSLA.STATE_COMPLETED:
				taskSLAworkflow.stop();
				break;
		}
	},

	_doFlow: function(newState) {
		// things to do to TaskSLAFlow when entering a state
		// (these must take place after the task_sla record has been inserted or updated)
		
		if (this.dryRun)
			return;

		var taskSLAFlow = new TaskSLAFlow(this.taskSLAgr, this.slaDefGR);
		if (this.slaDurationMs !== null)
			taskSLAFlow.setSLADuration(this.slaDurationMs);
		switch(newState) {
			case TaskSLA.STATE_IN_PROGRESS:
				if (this.starting)
					taskSLAFlow.start();
				else
					taskSLAFlow.resume();
				break;
			case TaskSLA.STATE_PAUSED:
				taskSLAFlow.pause();
				break;
			case TaskSLA.STATE_CANCELLED:
			case TaskSLA.STATE_COMPLETED:
				taskSLAFlow.cancel();
				break;
		}
	},

	// recalculate duration, percentage, time_left
	_recalculate: function(/* optional: GlideDateTime */ nowTime) {
		if (!this.taskSLAgr.active)
			return;

		this._calculate(/* skipUpdate */ true, nowTime);
	},

	// calculate duration, percentage, time_left for the first time
	// (skips record update, because an insert will come later)
	_firstcalculate: function(/* optional: GlideDateTime */ nowTime) {
		if (!this.taskSLAgr.isNewRecord() || !this.starting)
			return;

		this._calculate(/* skipUpdate */ true, nowTime);
	},

	_calculate: function(/* boolean */ skipUpdate, /* optional: GlideDateTime */ nowTime) {
		if (this.lu.atLevel(GSLog.DEBUG))
			this.lu.logDebug('_calculate: skip Update? ' + skipUpdate + '; ' + ((nowTime && typeof nowTime !== 'undefined') ? nowTime.getDisplayValue() : 'now'));

		SLACalculatorNG.calculateSLA(this.taskSLAgr, skipUpdate, nowTime, this.slaDefGR, this.calledFromAsync);
		if (!skipUpdate)
			this.taskSLAgr.get(this.taskSLAgr.sys_id); // re-fetch values after SLA Calculator does an independent update() on the record

		if (!this.taskSLAgr.percentage || typeof this.taskSLAgr.percentage == 'undefined')
			this.taskSLAgr.percentage = 0;
		// keep model and the (new) breach_flag field in sync with updated percentage numbers
		this._setBreachedFlag();
		if (this.lu.atLevel(GSLog.DEBUG))
			this.lu.logDebug('_calculate: pct=' + this.taskSLAgr.percentage + '; breached? ' + this.breachedFlag);
	},

	// recalculate the new end-time at start, or after a pause
	// pre-req: pause_duration, and business_pause_duration, or totalPauseTimeMS includes the time spent in the pause state so far or just left.
	_recalculateEndTime: function(totalPauseTimeMS) {
		if (this.breachedFlag && !this.calcEndTimeAfterBreach)
			return;

		if (!totalPauseTimeMS)
			totalPauseTimeMS = this.taskSLAgr.business_pause_duration.dateNumericValue();

		var dc = this.slaUtil.getDurationCalculatorForTaskSLA(this.taskSLAgr);

		if (this.slaDefGR.duration_type.nil()) {
			// plain end-time extended by total (business) pause time
			var newDuration = this.slaDefGR.duration.dateNumericValue() + totalPauseTimeMS; // milliseconds
			dc.calcDuration(newDuration / 1000);
		}
		else {
			// scripted "absolute" end_time, does not need to account for pause time.

			// Store the current value of current
			var ocurrent = null;
			if (typeof current !== 'undefined')
				ocurrent = current;

			// Determine whether we want to set current to the "task sla"  or the "table" record associated with the "SLA Definition"
			if (this.slaDefGR.relative_duration_works_on == "SLA record")
				current = this.taskSLAgr;
			else
				current = this.taskSLAgr.task.getRefRecord();

			// Perform calculation using the revised value of current
			dc.calcRelativeDuration(this.slaDefGR.duration_type);

			// After the calculation, reset current back to its old value
			if (ocurrent)
				current = ocurrent;
		}
		this.taskSLAgr.planned_end_time = dc.getEndDateTime();
		this.slaDurationMs = dc.getSeconds() * 1000;
	},

	// update the total pause_duration and business_pause_duration values
	/* the methods "_updatePDField" and "_updateBPDField" are required to workaround a platform  issue
	   described in PRB1270618 where setting the same value twice into a field using "setDateNumericValue"
	   and then calling update() will leave that field unchanged */
	_updatePauseDuration: function(/* glide_date_time */ pausedAt) {
		if (this.lu.atLevel(GSLog.DEBUG))
			this.lu.logDebug('_updatePauseDuration: ' + pausedAt.getDisplayValue());
		this._updatePDField(pausedAt);
		if (!this.taskSLAgr.schedule)
			this.taskSLAgr.business_pause_duration = this.taskSLAgr.pause_duration;
		else
			this._updateBPDField(pausedAt);
	},
	
	_updatePDField: function(pausedAt) {
		var currentPause = this.taskSLAgr.pause_duration.dateNumericValue();
		var newPause = this._calculatePD(pausedAt);
		
		if (currentPause !== newPause)
			this.taskSLAgr.pause_duration.setDateNumericValue(newPause);
	},

	_updateBPDField: function(pausedAt) {
		var currentBusinessPause = this.taskSLAgr.business_pause_duration.dateNumericValue();
		var newBusinessPause = this._calculateBPD(pausedAt);
		
		if (currentBusinessPause !== newBusinessPause)
			this.taskSLAgr.business_pause_duration.setDateNumericValue(newBusinessPause);
	},
	
	// determine new total pause duration
	// returns duration, in milliseconds
	_calculatePD: function(pausedAt) {
		var prevPause = this.taskSLAgr.pause_duration.dateNumericValue();

		var newPause = this._calculateNewPauseDuration(pausedAt, prevPause);
		if (this.lu.atLevel(GSLog.DEBUG))
			this.lu.logDebug('_calculatePD: pausedAt: ' + pausedAt.getDisplayValue() + '; updateTime: ' + this.updateTime.getDisplayValue() + '; newPause ' + newPause);
		return newPause;
	},

	// determine new total business (inside scheduled hours) pause duration
	// returns duration, in milliseconds
	_calculateBPD: function(pausedAt) {
		var prevPause = this.taskSLAgr.business_pause_duration.dateNumericValue();

		var tz = this.slaUtil.getTimezone(this.taskSLAgr);
		var newPause = this._calculateNewPauseDuration(pausedAt, prevPause, this.taskSLAgr.schedule, tz);
		if (this.lu.atLevel(GSLog.DEBUG))
			this.lu.logDebug('_calculateBPD: pausedAt: ' + pausedAt.getDisplayValue() + '; updateTime: ' + this.updateTime.getDisplayValue() + '; newPause ' + newPause);
		return newPause;
	},

	_calculateNewPauseDuration: function(pausedAt, prevPause, schedule, timezone) {
		// an SLA might have been paused before its start time
		// if the current time is before the start_time, the business pause duration remains the same
		var startGDT = new GlideDateTime(this._glideDateTime(this.taskSLAgr.start_time));
		if (this.updateTime.compareTo(startGDT) < 0)
			return prevPause;
		// if pause time is before the start_time, and the start_time has now passed then use it instead
		if (pausedAt.compareTo(startGDT) < 0)
			pausedAt = new GlideDateTime(startGDT);

		var dc = new DurationCalculator();
		if (schedule)
			dc.setSchedule(schedule);
		if (timezone)
			dc.setTimeZone(timezone);
		var newPause = dc.calcScheduleDuration(pausedAt, this.updateTime) * 1000;
		if (prevPause)
			newPause += prevPause;

		return newPause;
	},

	_setBreachedFlag: function() {
		if (gs.getProperty('com.snc.sla.calculation.use_time_left', 'false') == 'false') {
			//Use the standard configuration and use the percentage to work out if breached
			if (this.lu.atLevel(GSLog.DEBUG))
				this.lu.logDebug('_setBreachedFlag (percentage): ' + ((typeof this.taskSLAgr.percentage == 'undefined') ? 'undefined' : this.taskSLAgr.percentage));
			if (this.taskSLAgr.schedule && this.taskSLAgr.business_percentage)
				this.breachedFlag = (this.taskSLAgr.business_percentage >= 100);
			else
				this.breachedFlag = (this.taskSLAgr.percentage >= 100);

			this.taskSLAgr.has_breached = this.breachedFlag;
			this._setStage(this._getStage()); // if compatibility.breached == true, then stage may change to 'breached'
		} else {
			//Use the business time left to work out if the sla is breached
			if (this.lu.atLevel(GSLog.DEBUG))
				this.lu.logDebug('_setBreachedFlag (business time): ' + ((typeof this.taskSLAgr.time_left == 'undefined') ? 'undefined' : this.taskSLAgr.time_left));
			if (this.taskSLAgr.schedule && this.taskSLAgr.business_time_left)
				this.breachedFlag = (this.taskSLAgr.business_time_left.getGlideObject().getNumericValue() <= 0);
			else
				this.breachedFlag = (this.taskSLAgr.time_left.getGlideObject().getNumericValue() <= 0);

			this.taskSLAgr.has_breached = this.breachedFlag;
			this._setStage(this._getStage()); // if compatibility.breached == true, then stage may change to 'breached'
		}
	},

	_getContractSLA: function() {
		if (!this.taskSLAgr)
			return {};

		var slaDefGR = new GlideRecord("contract_sla");
		if (this.taskGR)
			slaDefGR.addDomainQuery(this.taskGR);
		else
			slaDefGR.addDomainQuery(this.taskSLAgr.taskGR.getRefRecord());

		if (!slaDefGR.get(this.taskSLAgr.getValue("sla")))
			return this.taskSLAgr.sla.getRefRecord();
			
		return slaDefGR;
	},

	// sys_trigger RunScriptJob manipulations

	_insertBreachTrigger: function() {
		// don't ever create breach triggers once the SLA is done with (cancelled, or complete: {achieved, breached})
		// nor once we're already breached, or if they've been explicitly disabled
		if (!this.taskSLAgr.active || this.breachedFlag || !this.breachTimerEnabled || this.dryRun)
			return;

		var tGR = new GlideRecord('sys_trigger');
		tGR.name = 'SLA breach timer - ' + (this.taskGR !== null ? this.taskGR.getDisplayValue() : this.taskSLAgr.task.number) + ' - ' + this.slaDefGR.name; // XXX: max length issue?
		tGR.next_action.setDateNumericValue(this.taskSLAgr.planned_end_time.dateNumericValue());
		tGR.document = 'task_sla';
		tGR.document_key = this.taskSLAgr.sys_id;
		tGR.script = "new TaskSLA('" + this.taskSLAgr.sys_id + "').breachTimerExpired();";
		tGR.job_id.setDisplayValue('RunScriptJob');
		tGR.trigger_type = 0;
		tGR.insert();
		if (this.lu.atLevel(GSLog.INFO))
			this.lu.logInfo('TaskSLA._insertBreachTrigger() for ' + this.taskSLAgr.sys_id + ' @end_time=' + this.taskSLAgr.planned_end_time.getDisplayValue());
	},

	_clearBreachTrigger: function() {
		if (!this.breachTimerEnabled || this.dryRun)
			return;

		var tGR = new GlideRecord('sys_trigger');
		tGR.addQuery('document', 'task_sla');
		tGR.addQuery('document_key', this.taskSLAgr.sys_id);
		tGR.addQuery('name', 'STARTSWITH', 'SLA breach timer');
		tGR.query();
		while (tGR.next())
			tGR.deleteRecord();
	},

	// date and time convenience methods

	// given a glide_date_time type GlideElement value, return the underlying GlideDateTime object
	// (if we happen to get a GlideDateTime, return that back. If we get undefined, return back the current time in a GlideDateTime)
	_glideDateTime: function(glide_date_time) {
		if (!glide_date_time)
			return new GlideDateTime();
		if (JSUtil.isJavaObject(glide_date_time) && JSUtil.instance_of(glide_date_time, 'com.glide.glideobject.GlideDateTime'))
			return glide_date_time;

		return new GlideDateTime(glide_date_time.getGlideObject());
	},

	type: 'TaskSLA'
};
```