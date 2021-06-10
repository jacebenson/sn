---
title: "SLACalculatorNG"
id: "slacalculatorng"
---

API Name: global.SLACalculatorNG

```js
var SLACalculatorNG = Class.create();

// wrapper static methods to recalculate:
// - a range
SLACalculatorNG.calculateSLArange = function(start, end) {
	var lu = new GSLog(SLACalculatorNG.prototype.SLA_DEBUG, 'SLACalculatorNG');
	if (gs.getProperty(SLACalculatorNG.prototype.SLA_DATABASE_LOG, "db") === "node")
		lu.disableDatabaseLogs();
	lu.includeTimestamp();
	lu.logInfo('calculateSLArange: starting');

	// Array to hold the sys_id of each Task SLA we want to calculate
	var taskSlaIds = [];

	// Query for all task slas that are active, not paused, are under the max percentage, and have less time left than specified
	var maxPercent = gs.getProperty(SLACalculatorNG.prototype.SLA_CALC_PERCENTAGE, '');

	var taskSlaGr = new GlideRecord('task_sla');
	taskSlaGr.addActiveQuery();
	if (start)
		taskSlaGr.addQuery('planned_end_time', '>', start);
	if (end)
		taskSlaGr.addQuery('planned_end_time', '<', end);
	taskSlaGr.addNullQuery('pause_time');
	if (maxPercent != '')
		taskSlaGr.addQuery('percentage', '<=', maxPercent).addOrCondition('percentage', '');
	taskSlaGr.query();
	while (taskSlaGr.next())
		taskSlaIds.push('' + taskSlaGr.sys_id);

	lu.logInfo('calculateSLArange: ' + taskSlaIds.length + ' Task SLA records found to update');

	var sc = SLACalculatorNG.newSLACalculator();

	taskSlaGr = new GlideRecord("task_sla");
	for (var i = 0; i < taskSlaIds.length; i++)
		if (taskSlaGr.get(taskSlaIds[i])) {
			// if this Task has records in the "sla_async_queue" then do not process the calculation script for this Task SLA
			if (new SLAAsyncQueue().isTaskQueued(taskSlaGr.getValue("task")))
				continue;

			var oldLogLevel = sc.lu.getLevel();
			// if enable logging has been checked on the SLA definition up the log level to "debug"
			if (taskSlaGr.sla.enable_logging) {
				lu.setLevel(GSLog.DEBUG);
				sc.lu.setLevel(GSLog.DEBUG);
			}

			if (taskSlaGr.pause_time || !taskSlaGr.active) {
				lu.logInfo("calculateSLArange: Task SLA with sys_id " + taskSlaGr.getUniqueValue() + " has been paused or has become inactive since we started - skipping");
				continue;
			}
			sc.loadTaskSLA(taskSlaGr);
			sc.calcTaskSLAs();
			sc.updateTaskSLAs();

			lu.setLevel(oldLogLevel);
			sc.lu.setLevel(oldLogLevel);
		}

	lu.logInfo('calculateSLArange: finished');
};

// - a specific SLA, at an optional specific time
SLACalculatorNG.calculateSLA = function(task_sla, /* boolean */ skipUpdate, /* optional: glide_date_time */ nowTime, /* optional */ slaDefGR, /* optional */ ignoreBreakdowns) {
	var lu = new GSLog(SLACalculatorNG.prototype.SLA_DEBUG, 'SLACalculatorNG');
	var nowGDT = new GlideDateTime();
	if (gs.getProperty(SLACalculatorNG.prototype.SLA_DATABASE_LOG, "db") === "node")
		lu.disableDatabaseLogs();
	lu.includeTimestamp();
	lu.logInfo('calculateSLA: starting at ' + nowGDT.getDisplayValue());

	if (!task_sla.pause_time.nil()) {
		lu.logInfo("calculateSLA: task_sla has a pause time so no calculation performed");
		return;
	}

	// if enable logging has been checked on the SLA definition up the log level to "debug"
	var slaDebug = false;
	if (slaDefGR && slaDefGR.isValidRecord())
		slaDebug = slaDefGR.enable_logging;
	else if (task_sla && task_sla.isValidRecord())
		slaDebug = task_sla.sla.enable_logging;

	var sc = SLACalculatorNG.newSLACalculator();
	if (slaDebug)
		sc.lu.setLevel(GSLog.DEBUG);

	if (nowTime != undefined)
		sc.setNow(nowTime);

	if (slaDefGR)
		sc.setSLADefGR(slaDefGR);

	if (ignoreBreakdowns + "" === "true")
		sc.setProcessBreakdowns(false);
		
	sc.loadTaskSLA(task_sla);
	sc.calcTaskSLAs();
	sc.updateTaskSLAs(task_sla, skipUpdate);

	lu.logInfo('calculateSLA: finished');
};

// - all SLAs
SLACalculatorNG.calculateAll = function() {
	var lu = new GSLog(SLACalculatorNG.prototype.SLA_DEBUG, 'SLACalculatorNG');
	if (gs.getProperty(SLACalculatorNG.prototype.SLA_DATABASE_LOG, "db") === "node")
		lu.disableDatabaseLogs();
	lu.includeTimestamp();

	var sc = SLACalculatorNG.newSLACalculator();
	lu.logInfo('calculateAll: starting at ' + sc.nowGDT.getDisplayValue());
	sc.loadAllTaskSLAs();
	sc.calcTaskSLAs();
	sc.updateTaskSLAs();

	this.lu.logInfo('calculateAll: finished');
};

// return the appropriate SLA Calculator
SLACalculatorNG.newSLACalculator = function() {
	if (gs.getProperty(SLACalculatorNG.SLA_ENGINE_VERSION) === '2011')
		return new SLACalculatorNG();
	// in case SLACalculator has been locally customised prior to 2011 engine
	return new SLACalculator();
};

// constants
SLACalculatorNG.SLA_ENGINE_VERSION = 'com.snc.sla.engine.version';

SLACalculatorNG.prototype = {

	// Pulls limited functionality from TaskSLA into a sandboxed object
	_TaskSLASandbox: function(slaGr) {
		// Properties
		this.breachCompat = (gs.getProperty(TaskSLA.prototype.SLA_COMPATIBILITY_BREACH, 'true') === 'true');

		// internal stage choice values from  TaskSLA
		this.STAGE_STARTING = TaskSLA.prototype.STAGE_STARTING;
		this.STAGE_IN_PROGRESS = TaskSLA.prototype.STAGE_IN_PROGRESS;
		this.STAGE_PAUSED = TaskSLA.prototype.STAGE_PAUSED;
		this.STAGE_CANCELLED = TaskSLA.prototype.STAGE_CANCELLED;
		this.STAGE_ACHIEVED = TaskSLA.prototype.STAGE_ACHIEVED;
		this.STAGE_BREACHED = TaskSLA.prototype.STAGE_BREACHED;
		this.STAGE_COMPLETED = TaskSLA.prototype.STAGE_COMPLETED;

		// The task sla glide record.
		this.taskSLAgr = slaGr;

		this._setBreachedFlag = TaskSLA.prototype._setBreachedFlag;
		this._setStage = TaskSLA.prototype._setStage;
		this._getStage = TaskSLA.prototype._getStage;
	},

	// sys_properties
	SLA_DEBUG: 'com.snc.sla.calculatorng.log',
	SLA_ALWAYS_POPULATE_BUSINESS: 'com.snc.sla.always_populate_business_fields',
	SLA_ALWAYS_RUN_RELDUR_SCRIPT: 'com.snc.sla.calculation.always_run_relative_duration_script',
	SLA_TIMERS: 'com.snc.sla.timers',
	SLA_CALC_PERCENTAGE: 'com.snc.sla.calculation.percentage',
	SLA_DATABASE_LOG: 'com.snc.sla.log.destination',

	initialize: function() {
		this.lu = new GSLog(this.SLA_DEBUG, this.type);
		if (gs.getProperty(this.SLA_DATABASE_LOG, "db") === "node")
			this.lu.disableDatabaseLogs();
		this.lu.includeTimestamp();
		this.alwaysPopulateBusiness = (gs.getProperty(this.SLA_ALWAYS_POPULATE_BUSINESS, 'false') === 'true');
		this.alwaysRunRelDurScript = (gs.getProperty(this.SLA_ALWAYS_RUN_RELDUR_SCRIPT, 'false') === 'true');
		this.timers = (gs.getProperty(this.SLA_TIMERS, 'false') === 'true');
		delete this.taskSLAsbySchedule;
		this.taskSLAsbySchedule = {};
		this.nowGDT = new GlideDateTime();
		this.nowMS = this._truncSeconds(this.nowGDT.getNumericValue());

		// Objects to store instances of Glideschedule and DurationCalculator
		// - provides performance improvements when multiple Task SLA records are being calculated
		this.schedules = {};
		this.durationCalculators = {};
		this.slaDefGR = null;
		this.slaUtil = new SLAUtil();
		this.breakdownsPluginActive = pm.isActive("com.snc.sla.breakdowns");
		this.processBreakdowns = true;
		this.slaAsyncUtils = new SLAAsyncUtils();
	},

	setNow: function(gdt) {
		if (JSUtil.instance_of(gdt.getGlideObject(), "com.glide.glideobject.GlideDateTime"))
			// glide_date_time (GlideElement)
			this.nowMS = this._truncSeconds(gdt.dateNumericValue());
		else
			// GlideDateTime
			this.nowMS = this._truncSeconds(gdt.getNumericValue());
		this.nowGDT.setNumericValue(this.nowMS);
	},

	_truncSeconds: function(ms) {
		var ri = 1000;
		return Math.floor(ms/ri)*ri;
	},

	loadAllTaskSLAs: function() {
		var sw;
		if (this.timers) {
			sw = new GlideStopWatch();
			this.lu.logInfo('Begin loadAllTaskSLAs');
		}

		// Query for all task slas that are active, not paused, and under the max percentage
		var maxPercent = gs.getProperty(this.SLA_CALC_PERCENTAGE,'');

		var sla = new GlideRecord('task_sla');
		sla.addActiveQuery();
		sla.addNullQuery('pause_time');
		if (maxPercent != '')
			sla.addQuery('percentage', '<=', maxPercent).addOrCondition('percentage', '');
		sla.query();
		while (sla.next())
			this._createTaskSLA(sla);

		if (this.lu.debugOn()) {
			this.printTaskSLAs();
			this.printTaskSLASchedules();
		}
		if (this.timers)
			sw.log('Finished loadAllTaskSLAs');
	},

	loadSomeTaskSLAs: function(plannedEndStart, plannedEndEnd) {
		var sw;
		if (this.timers) {
			sw = new GlideStopWatch();
			this.lu.logInfo('Begin loadSomeTaskSLAs');
		}
		// Query for all task slas that are active, not paused, are under the max percentage, and have less time left than specified
		var maxPercent = gs.getProperty(this.SLA_CALC_PERCENTAGE,'');

		var sla = new GlideRecord('task_sla');
		sla.addActiveQuery();
		if (plannedEndStart != undefined)
			sla.addQuery('planned_end_time', '>', plannedEndStart);
		if (plannedEndEnd != undefined)
			sla.addQuery('planned_end_time', '<', plannedEndEnd);
		sla.addNullQuery('pause_time');
		if (maxPercent != '')
			sla.addQuery('percentage', '<=', maxPercent).addOrCondition('percentage', '');
		sla.query();
		while (sla.next())
			this._createTaskSLA(sla);

		if (this.lu.debugOn()) {
			this.printTaskSLAs();
			this.printTaskSLASchedules();
		}
		if (this.timers)
			sw.log('Finished loadSomeTaskSLAs');
	},

	loadTaskSLA: function(slaGR) {
		delete this.taskSLAsbySchedule;
		this.taskSLAsbySchedule = {};
		this._createTaskSLA(slaGR);
	},

	setSLADefGR: function (slaDefGR) {
		if (!slaDefGR || !slaDefGR.sys_id || slaDefGR.sys_id.nil())
			return;
		
		this.slaDefGR = slaDefGR;
	},

	setProcessBreakdowns: function (trueOrFalse) {
		this.processBreakdowns = trueOrFalse + "" === "true";
	},

	_createTaskSLA: function(sla) {
		var slaDefGR;
		if (this.slaDefGR)
			slaDefGR = this.slaDefGR;
		else
			slaDefGR = sla.sla.getRefRecord();

		var newTaskSLA = {};
		newTaskSLA.sys_id = sla.getUniqueValue();
		if (this.lu.atLevel(GSLog.DEBUG))
			this.lu.logDebug('_createTaskSLA: for task_sla ' + sla.sys_id + '; schedule ' + sla.schedule);

		var tz = this.slaUtil.getTimezone(sla);
		newTaskSLA.timezone = tz;

		var key = '';
		// Store the newTaskSLA object by its schedule/timezone combination (or the empty string, if none) in the schedules object
		newTaskSLA.schedule = '';
		if (JSUtil.notNil(sla.schedule) && sla.schedule.getRefRecord().isValidRecord()) { // defend against non-existent referenced schedules
			if (this.lu.atLevel(GSLog.DEBUG))
				this.lu.logDebug('_createTaskSLA: adding schedule ' + sla.schedule + '');
			newTaskSLA.schedule = sla.schedule + '';
			key = newTaskSLA.schedule + newTaskSLA.timezone;
		}
		if (!this.taskSLAsbySchedule[key])
			this.taskSLAsbySchedule[key] = [];
		this.taskSLAsbySchedule[key].push(newTaskSLA);

		newTaskSLA.start_time       = sla.start_time.dateNumericValue();
		newTaskSLA.pause_duration   = sla.pause_duration.dateNumericValue();
		newTaskSLA.pause_time       = sla.pause_time.dateNumericValue();
		// task_sla business_pause_duration always has a value
		newTaskSLA.business_pause_duration = sla.business_pause_duration.dateNumericValue();

		// the SLA definition's duration
		newTaskSLA.sla_duration = slaDefGR.duration.dateNumericValue();
		// what planned_end_time would be, if it were updated past the breach
		var dc = this._newDurationCalculator(sla, newTaskSLA.sla_duration + newTaskSLA.business_pause_duration, slaDefGR);
		newTaskSLA.derived_end_time = dc.getEndDateTime().getNumericValue();

		// if this is a relative duration we need to set our sla duration to the time between start_time and planned_end_time
		if (!JSUtil.nil(slaDefGR.duration_type))
			newTaskSLA.sla_duration = dc.getSeconds() * 1000;

		if (this.lu.atLevel(GSLog.DEBUG))
			this.lu.logDebug('_createTaskSLA: derived_end_time=' + dc.getEndDateTime());

		if (this.lu.debugOn()) {
			newTaskSLA.contract_sla_name = slaDefGR.getValue('name');
			newTaskSLA.task_number = sla.task.getRefRecord().getValue('number');
		}
	},

	calcTaskSLAs: function() {
		var sw;
		if (this.timers) {
			sw = new GlideStopWatch();
			this.lu.logInfo('Begin calcTaskSLAs');
		}

		// calculate all the task_sla records, as accumulated in this.taskSLAsbySchedule
		for (var key in this.taskSLAsbySchedule) {
			if (this.lu.atLevel(GSLog.DEBUG))
				this.lu.logDebug('calcTaskSLAs: calculating task_sla records ' + ((key=='') ? 'without' : 'WITH' ) + ' schedules');

			for (var i=0; i < this.taskSLAsbySchedule[key].length; i++) {
				var taskSLA = this.taskSLAsbySchedule[key][i];
				if (this.lu.atLevel(GSLog.DEBUG))
					this.lu.logDebug('calcTaskSLAs: contract_sla = ' + taskSLA.contract_sla_name + ' [' + taskSLA.schedule + ']');
				this._calcTaskSLA(taskSLA);
			}
		}

		if (this.timers)
			sw.log('Finished calcTaskSLAs');
	},

	_newDurationCalculator: function(sla, milliseconds, slaDefGR) {
		var dc;
		var tz = this.slaUtil.getTimezone(sla);
		var schedule = gs.nil(sla.schedule) ? "" : sla.schedule;
		var dcKey = schedule + tz;
		if (schedule) {
			if (this.durationCalculators[dcKey])
				dc = this.durationCalculators[dcKey];
			else {
				dc = new DurationCalculator();
				dc.setSchedule(sla.schedule, tz);
				this.durationCalculators[dcKey] = dc;
			}
		} else
			dc = new DurationCalculator();

		dc.setStartDateTime(sla.getValue('start_time'));
		if (slaDefGR.duration_type == '')
			dc.calcDuration(milliseconds / 1000);
		else {
			if (!this.alwaysRunRelDurScript && sla.isValidField("original_breach_time") && !sla.original_breach_time.nil())
				dc.calcScheduleDuration(null, sla.original_breach_time.getGlideObject());
			else {
				// Store the current value of the global variable called "current"
				var ocurrent = null;
				if (typeof current !== 'undefined')
					ocurrent = current;

				// Set "current" to point to either the "task_sla" record or the "table" record associated with the "SLA Definition"
				if (slaDefGR.getValue('relative_duration_works_on') === "SLA record")
					current = sla;
				else
					current = sla.task.getRefRecord();

				// Perform the relative calculation using the revised value of "current"
				dc.calcRelativeDuration(slaDefGR.getValue('duration_type'));

				// Reset "current" to point back to its original value
				if (ocurrent)
					current = ocurrent;
			}
		}
		return dc;
	},

	// NB. currentSLA is not a GlideRecord
	_calcTaskSLA: function(currentSLA) {
		//Set all the needed variables
		var nowMS = this.nowMS;
		var elapsedTimeMS = Math.max(0, (nowMS - currentSLA.start_time)); // future work_start
		var timeLeftMS = currentSLA.derived_end_time - nowMS; // -ve, if current time is after derived_end_time

		if (this.lu.atLevel(GSLog.DEBUG))
			this.lu.logDebug('nowMS=' + nowMS + '; start_time=' + currentSLA.start_time + '; derived_end_time=' + currentSLA.derived_end_time);

		var pauseTimeMS = 0;
		if (currentSLA.pause_duration > 0)
			//Add on pause time so far
			pauseTimeMS += currentSLA.pause_duration;

		// Calculate the actual field values
		// Actual elapsed time, Actual elapsed percentage, Actual time left
		currentSLA.elapsed = Math.max(0,(elapsedTimeMS - pauseTimeMS));
		//currentSLA.percentage = ((currentSLA.elapsed / (currentSLA.elapsed + timeLeftMS)) * 100).toFixed('2');

		//Check to see if percentage would be negative (case where pause time is greater than difference between start and breach time)
		//If it is negative then revert to working out total elapsed time over business time
		if ((currentSLA.derived_end_time - currentSLA.start_time) < currentSLA.pause_duration)
			currentSLA.percentage = ((currentSLA.elapsed / (currentSLA.derived_end_time - currentSLA.start_time - currentSLA.business_pause_duration)) * 100).toFixed('2');
		else
			currentSLA.percentage = ((currentSLA.elapsed / (currentSLA.derived_end_time - currentSLA.start_time - currentSLA.pause_duration)) * 100).toFixed('2');

		currentSLA.time_left = (timeLeftMS > 0) ? timeLeftMS : 0; // store 0 if no time remains

		// Calculate the business field values (if needed)
		var busElapsedTimeMS;
		var businessPauseTimeMS = 0;
		if (JSUtil.notNil(currentSLA.schedule)) {
			if (this.lu.atLevel(GSLog.DEBUG))
				this.lu.logDebug('_calcTaskSLA: calculating [' + currentSLA.contract_sla_name + '] with schedule [' + currentSLA.schedule + ']');

			var schedule;
			var scheduleKey = currentSLA.schedule + currentSLA.timezone;
			if (this.schedules[scheduleKey])
				schedule = this.schedules[scheduleKey];
			else {
				schedule = new GlideSchedule(currentSLA.schedule, currentSLA.timezone);
				this.schedules[scheduleKey] = schedule;
			}

			if (currentSLA.business_pause_duration != 0)
				//Add on pause time so far
				businessPauseTimeMS += currentSLA.business_pause_duration;
			// GlideDateTime() objects required for the Schedule-based calculations
			var startGDT = this._newGDT(currentSLA.start_time);
			var derivedEndGDT = this._newGDT(currentSLA.derived_end_time);
			// (interim calculation values)
			busElapsedTimeMS = this._getScheduleDurationTime(startGDT, this.nowGDT, schedule);

			// Business elapsed time, Business elapsed percentage, Business time left
			currentSLA.business_elapsed = Math.max(0, (busElapsedTimeMS - businessPauseTimeMS));
			currentSLA.business_percentage = ((currentSLA.business_elapsed / currentSLA.sla_duration) * 100).toFixed('2');
			currentSLA.business_time_left = (timeLeftMS > 0) ? this._getScheduleDurationTime(this.nowGDT, derivedEndGDT, schedule) : 0;
		} else {
			if (this.alwaysPopulateBusiness) {
				currentSLA.business_elapsed = currentSLA.elapsed;
				currentSLA.business_percentage = currentSLA.percentage;
				currentSLA.business_time_left = currentSLA.time_left;
			}
		}

		// (debug: display all the calculation values)
		if (this.lu.debugOn()) {
			// Setup duration display values
			var elapsedTimeDisplay = new GlideDuration(elapsedTimeMS).getDurationValue();
			var totalTimeDisplay = new GlideDuration(currentSLA.elapsed).getDurationValue();
			var timeLeftDisplay = new GlideDuration(timeLeftMS).getDurationValue();
			var pauseTimeDisplay = new GlideDuration(pauseTimeMS).getDurationValue();

			var businessElapsedTimeDisplay = new GlideDuration(busElapsedTimeMS).getDurationValue();
			var businessTotalTimeDisplay = new GlideDuration(currentSLA.sla_duration).getDurationValue();
			var businessTimeLeftDisplay = new GlideDuration(currentSLA.business_time_left).getDurationValue();
			var businessPauseTimeDisplay = new GlideDuration(businessPauseTimeMS).getDurationValue();

			gs.print('---- Calculation for SLA [' + currentSLA.contract_sla_name + ' for task ' + currentSLA.task_number + ']  complete ----');
			gs.print('---- Pre calculated values (for use in calculations later) in milliseconds:');
			gs.print(' > Now: ' + nowMS + '; ' + this.nowGDT.getDisplayValue());

			gs.print(' > Elapsed time (SLA start to now): ' + elapsedTimeMS + ' (' + elapsedTimeDisplay + ')');
			gs.print(' > Elapsed SLA time (subtracting pause): ' + currentSLA.elapsed + ' (' + totalTimeDisplay + ')');
			gs.print(' > Time Left (SLA derived end to now): ' + timeLeftMS + ' (' + timeLeftDisplay + ')');
			gs.print(' > Total pause time: ' + pauseTimeMS + ' (' + pauseTimeDisplay + ')');
			gs.print(' > Total business pause time: ' + businessPauseTimeMS + ' (' + businessPauseTimeDisplay + ')');
			gs.print(' > Schedule time from SLA start to now: ' + busElapsedTimeMS + ' (' + businessElapsedTimeDisplay + ')');
			gs.print(' > Schedule time from SLA definition: ' + currentSLA.sla_duration + ' (' + businessTotalTimeDisplay + ')');
			gs.print('----------------------------------------------------------');
			gs.print('---- Calculated SLA field values in milliseconds:');
			gs.print(' > Actual elapsed time (SLA start to now, minus pause time): ' + currentSLA.elapsed);
			gs.print(' > Actual elapsed percentage (Actual elapsed time / (Actual elapsed + Time left)) * 100: ' + currentSLA.percentage);
			gs.print(' > Actual time left (1. The time from SLA derived end to now, or 2. Zero, if no time is left): ' + currentSLA.time_left);
			gs.print(' > Business elapsed time (Schedule time from SLA start to now, minus pause time): ' + currentSLA.business_elapsed);
			gs.print(' > Business elapsed percentage (Business elapsed time / Schedule duration) * 100: ' + currentSLA.business_percentage);
			gs.print(' > Business time left (1. Schedule time from SLA derived end to now, or 2. Zero, if no time is left): ' + currentSLA.business_time_left + ' (' + businessTimeLeftDisplay + ')');
		}

	},

	// get the taskSLA object matching the task_sla GlideRecord
	_getTaskSLA: function(tslaGR) {
		var key = '';
		var tz = this.slaUtil.getTimezone(tslaGR);

		if (JSUtil.notNil(tslaGR.schedule) && tslaGR.schedule.getRefRecord().isValidRecord())
			key = '' + tslaGR.schedule + tz;

		for (var i=0, tsla = (this.taskSLAsbySchedule[key][i]); i<this.taskSLAsbySchedule[key].length; i++)
			if (tsla.sys_id == tslaGR.sys_id)
				return tsla;
	},

	_newGDT: function(numericValue) {
		var gdto = new GlideDateTime();
		gdto.setNumericValue(numericValue);
		return gdto;
	},

	// number of seconds contained within the schedule, between fromGDT and toGDT
	_getScheduleDurationTime: function(fromGDT, toGDT, scheduleObject) {
		var ttime = scheduleObject.duration(fromGDT, toGDT);
		if (this.lu.atLevel(GSLog.DEBUG))
			this.lu.logDebug('_getScheduleDurationTime: ' + fromGDT.getDisplayValue() + ', ' + toGDT.getDisplayValue() + ', ' + scheduleObject.getName());
		return (ttime.getNumericValue());
	},

	printTaskSLAs: function() {
		gs.print('Printing SLAs ...');
		// Iterate through SLA objects, grouped by schedule
		for (var key in this.taskSLAsbySchedule) {
			if (key == '')
				gs.print('task_sla records without schedules');
			else
				gs.print('task_sla records WITH schedules');

			for (var i=0; i < this.taskSLAsbySchedule[key].length; i++) {
				var taskSLA = this.taskSLAsbySchedule[key][i];
				gs.print('SLA - contract_sla = ' + taskSLA.contract_sla_name + ' for task ' + taskSLA.task_number);
			}
		}
	},

	printTaskSLASchedules: function() {
		gs.print('Printing Schedules ...');
		for (var key in this.taskSLAsbySchedule) {
			if (key == '')
				continue;

			var taskSLA = this.taskSLAsbySchedule[key][0];
			gs.print('Schedule - ' + taskSLA.schedule);
		}
	},

	printTaskSLA: function(currentSLA) {
		gs.print('---- Printing properties for SLA [' + currentSLA.contract_sla_name + ' for task ' + currentSLA.task_number + '] ----');
		for (var prop in currentSLA) {
			gs.print(' > ' + prop + ': ' + currentSLA[prop]);
		}
	},

	updateTaskSLAs: function(/* optional: GlideRecord */ tslaGR, /* optional: boolean */ skipUpdate) {
		var sw;
		if (this.timers) {
			sw = new GlideStopWatch();
			this.lu.logInfo('Begin updateTaskSLAs');
		}

		if (JSUtil.notNil(tslaGR)) {
			var key = '';
			var tz = this.slaUtil.getTimezone(tslaGR);
			// update a single, existing task_sla GlideRecord, with the single taskSLA object
			if (JSUtil.notNil(tslaGR.schedule) && tslaGR.schedule.getRefRecord().isValidRecord())
				key = '' + tslaGR.schedule + tz;
			var sla = (this.taskSLAsbySchedule[key][0]);
			this._updateTaskSLArecord(tslaGR, sla, skipUpdate);
		}
		else
			this._updateMultipleTaskSLArecords();

		if (this.timers)
			sw.log('Finished updateTaskSLAs');
	},

	_updateMultipleTaskSLArecords: function(/* optional: boolean */ skipUpdate) {
		// Update individual SLAs
		var updateCount = 0;
		// build a total list of task_sla records, for the glide query
		var taskSLAArray = [];
		var taskSLAs = {};
		for (var key in this.taskSLAsbySchedule)
			for (var i=0; i < this.taskSLAsbySchedule[key].length; i++) {
				var sys_id = this.taskSLAsbySchedule[key][i].sys_id;
				taskSLAs[sys_id] = this.taskSLAsbySchedule[key][i];
				taskSLAArray.push(sys_id);
			}

		if (taskSLAArray.length == 0)
			return;

		var gr = new GlideRecord('task_sla');
		gr.addQuery('sys_id', taskSLAArray);
		gr.query();
		while (gr.next()) {
			var sla = taskSLAs[gr.sys_id];
			this._updateTaskSLArecord(gr, sla, skipUpdate);
			updateCount++;
		}

		if (this.lu.atLevel(GSLog.DEBUG))
			this.lu.logDebug('Updated ' + updateCount + ' SLAs.');
	},

	/* update values in one single task_sla record
	
	   The extra if conditions when setting a duration field are required to workaround a platform issue
	   described in PRB1270618 where setting the same value twice into a field using "setDateNumericValue"
	   and then calling update() will leave that field unchanged
	*/
	_updateTaskSLArecord: function(gr, sla, /* optional: boolean */ skipUpdate) {
		var updateRecord = (typeof skipUpdate == 'undefined') ? true : !skipUpdate;

		/* if we're processing SLAs asynchronously and there are unprocessed records in the async queue for this task
		   do not update the Task SLA as we could incorrectly set "has_breached" and calculate incorrect breakdown values */
		if (updateRecord && new SLAAsyncQueue().isTaskQueued(gr.getValue("task"), null, ["ready", "queued"])) {
			if (this.lu.atLevel(GSLog.INFO))
				this.lu.logInfo('SLACalculatorNG._updateTaskSLArecord: skipping calculations for Task SLAs on Task ' + this.taskSLAgr.task.getDisplayValue() +
								' as it has pending records in the SLA Async Queue');
			return;
		}

		/* if we're running async and this Task SLA has breakdowns then call breakdown processing as the
		   "Process SLA Breakdowns" business rule will not be called
		   "Calc SLAs on Display" does "setWorkflow(false)" before calling SLACalculatorNG so running sync or
		   async we will not update the breakdown data, so we process breakdowns if !gr.isWorkflow (workflow set to false) */
		var processBreakdowns = this.processBreakdowns && this.breakdownsPluginActive && (this.slaAsyncUtils.isAsyncProcessingActive() || !gr.isWorkflow()) &&
			sn_sla_brkdwn.SLABreakdownProcessor.hasBreakdownDefinitions(gr.getValue("sla"));

		// if we're updating the record construct as "previous" GlideRecord object which is needed for SLA Breakdowns
		var previousTaskSLAGr;
		if (updateRecord && processBreakdowns)
			previousTaskSLAGr = this.slaUtil.copyTaskSLA(gr);

		//Set actual values in the record
		if (gr.duration.dateNumericValue() !== sla.elapsed || gr.duration.nil())
			gr.duration.setDateNumericValue(sla.elapsed);
		gr.percentage = sla.percentage;
		if (gr.time_left.dateNumericValue() !== sla.time_left || gr.time_left.nil())
			gr.time_left.setDateNumericValue(sla.time_left);
		//Set business values
		if (JSUtil.notNil(sla.schedule) || this.alwaysPopulateBusiness ) {
			if (gr.business_duration.dateNumericValue() !== sla.business_elapsed || gr.business_duration.nil())
				gr.business_duration.setDateNumericValue(sla.business_elapsed);
			gr.business_percentage = sla.business_percentage;
			if (gr.business_time_left.dateNumericValue() !== sla.business_time_left || gr.business_time_left.nil())
				gr.business_time_left.setDateNumericValue(sla.business_time_left);
		}
		if (this.lu.atLevel(GSLog.DEBUG))
			this.lu.logDebug('_updateTaskSLArecord: ' + sla.task_number + ' percentage=' + gr.percentage + '; bp=' + gr.business_percentage);

		//Run the sandboxed code from TaskSLA
		var tslas = new this._TaskSLASandbox(gr);
		tslas._setBreachedFlag();

		if (updateRecord) {
			gr.update();
			if (processBreakdowns) {
				var breakdownProcessor = new sn_sla_brkdwn.SLABreakdownProcessor(gr, previousTaskSLAGr);
				breakdownProcessor.setUpdateTime(this.nowGDT);
				breakdownProcessor.processBreakdowns();
			}
		}
	},

	SLA_API_2011: true,

	type: 'SLACalculatorNG'
};
```