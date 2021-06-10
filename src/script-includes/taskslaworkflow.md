---
title: "TaskSLAworkflow"
id: "taskslaworkflow"
---

API Name: global.TaskSLAworkflow

```js
var TaskSLAworkflow = Class.create();

TaskSLAworkflow.prototype = {

	// sys_properties
	SLA_WORKFLOW_LOG: 'com.snc.sla.workflow.log',
	SLA_WORKFLOW_RUN_FOR_BREACHED: 'com.snc.sla.workflow.run_for_breached',
	SLA_DATABASE_LOG: 'com.snc.sla.log.destination',

	initialize : function(taskSLAgr, slaDefGR) {
		this.runForBreached = (gs.getProperty(this.SLA_WORKFLOW_RUN_FOR_BREACHED, 'false') == 'true');
		this.taskSLAgr = new GlideRecord(taskSLAgr.getTableName());
		this.taskSLAgr.get(taskSLAgr.sys_id);

		if (slaDefGR && slaDefGR.isValidRecord())
			this.slaDefGR = slaDefGR;
		else
			this.slaDefGR = taskSLAgr.sla.getRefRecord();

		this.lu = new GSLog(this.SLA_WORKFLOW_LOG, this.type);
		this.lu.includeTimestamp();
		if (gs.getProperty(this.SLA_DATABASE_LOG, "db") == "node")
			this.lu.disableDatabaseLogs();

		// if enable logging has been checked on the SLA definition up the log level to "debug"
		if (this.slaDefGR && this.slaDefGR.enable_logging)
			this.lu.setLevel(GSLog.DEBUG);

		if (this.lu.atLevel(GSLog.INFO))
			this.lu.logInfo('initialize: with task_sla ' + taskSLAgr.getUniqueValue());
	},

	start: function() {
		if (!this.taskSLAgr || !this.taskSLAgr.isValidRecord()) {
			this.lu.logError('start: no Task SLA record supplied');
			return;
		}
		
		if (!this.slaDefGR) {
			this.lu.logError('start: no SLA definition supplied');
			return;
		}

		if (this.slaDefGR.workflow.nil()) {
			if (this.lu.atLevel(GSLog.INFO))
				this.lu.logInfo('start: no workflow specified on SLA Definition ' + this.slaDefGR.getDisplayValue());
			return;
		}
		
		if (this.lu.atLevel(GSLog.INFO))
			this.lu.logInfo('start: copy of workflow ' + this.slaDefGR.workflow + ' started for ' + this.slaDefGR.name);

		// If the SLA has already breached then unless the appropriate property has been set true don't run the workflow
		if (this.taskSLAgr.has_breached && !this.runForBreached) {
			if (this.lu.atLevel(GSLog.INFO))
				this.lu.logInfo('start: SLA has already breached so workflow will not be started for ' + this.slaDefGR.name);
			return;
		}

		var wfid = this.slaDefGR.workflow + '';

		var startTime = new GlideDateTime(this.taskSLAgr.start_time.getGlideObject());
		var now = new GlideDateTime();
		var msecs = this._truncSeconds(this._calculateRetroAdjust(startTime, now));
		var scratchPad = {};
		scratchPad.slaDataJSON = this._getSLADefJSON();
		scratchPad.timezoneForSchedule = new SLAUtil().getTimezone(this.taskSLAgr);

		// retroactive, if started more than 5 seconds ago (or due to start in the future)
		if (msecs <= 0 || msecs > 5000)
			if (!isNaN(msecs))
				scratchPad.retroactiveSecsLeft = String(Number(msecs) / 1000);

		this._startFlow(wfid, this.taskSLAgr, null, scratchPad);
		this.taskSLAgr.update();
	},

	pause: function() {
		if (!this.slaDefGR) {
			this.lu.logError('pause: no SLA definition supplied');
			return;
		}
		
		if (this.lu.atLevel(GSLog.INFO))
			this.lu.logInfo('pause: copy of workflow ' + this.taskSLAgr.sla.workflow + ' paused for ' + this.taskSLAgr.sla.name);

		var wf = new Workflow().getRunningFlows(this.taskSLAgr);
		while (wf.next())
			new Workflow().broadcastEvent(wf.sys_id, 'pause');
	},

	resume: function() {
		if (!this.slaDefGR) {
			this.lu.logError('resume: no SLA definition supplied');
			return;
		}

		if (this.lu.atLevel(GSLog.INFO))
			this.lu.logInfo('resume: copy of workflow ' + this.slaDefGR.workflow + ' resumed for ' + this.slaDefGR.name);

		var wf = new Workflow().getRunningFlows(this.taskSLAgr);
		while (wf.next())
			new Workflow().broadcastEvent(wf.sys_id, 'resume');
	},

	stop: function() {
		if (!this.slaDefGR) {
			this.lu.logError('stop: no SLA definition supplied');
			return;
		}

		if (this.lu.atLevel(GSLog.INFO))
			this.lu.logInfo('stop: copy of workflow ' + this.slaDefGR.workflow + ' stopped for ' + this.slaDefGR.name);

		var wf = new Workflow();
		wf.cancel(this.taskSLAgr);
	},

	// return the retroactive-start adjustment, in milliseconds.
	_calculateRetroAdjust: function(startTime, now) {
		var pause = this.taskSLAgr.pause_duration.dateNumericValue();
		if (this.taskSLAgr.pause_time) {
			// must be a paused "retroactively starting" SLA, so add on the current period of pause duration (total time, ignoring schedule)
			var dc = new DurationCalculator();
			dc.calcScheduleDuration(this.taskSLAgr.pause_time, now); // pause_time may not be a GlideDateTime, let DurationCalculator work it out
			var extraPause = dc.getTotalSeconds() * 1000;
			pause += extraPause;
			if (this.lu.atLevel(GSLog.DEBUG))
				this.lu.logDebug('extraPause: ' + extraPause);
		}

		// allow for accumulated pause_duration on a retroactively starting SLA
		// by subtracting the pause duration and any current period of pause
		// (result is -ve, if start is in the future. Don't count pause before an SLA starts)
		var msecs = now.getNumericValue() - startTime.getNumericValue();
		if (startTime.compareTo(now) <= 0)
			msecs -= pause;

		if (this.lu.atLevel(GSLog.DEBUG))
			this.lu.logDebug('_calculateRetroAdjust: startTime=' + startTime.getDisplayValueInternal() + '; now=' + now.getDisplayValueInternal() + '; msecs=' + msecs + '; (pause=' + pause + ')');

		return msecs;
	},

	_truncSeconds: function(ms) {
		var ri = 1000;
		return Math.floor(ms/ri)*ri;
	},

	_startFlow: function(workflowId, current, vars, scratchPad) {
		new SNC.WorkflowScriptAPI().startFlow(workflowId, current, vars, scratchPad);
	},

	_getSLADefJSON: function() {
		var slaDef = {};
		
		if (!this.slaDefGR)
			return slaDef;

		slaDef = {
			name: this.slaDefGR.getValue("name"),
			duration_type: "" + this.slaDefGR.duration_type,
			duration: this.slaDefGR.duration.dateNumericValue(),
			relative_duration_works_on: this.slaDefGR.getValue("relative_duration_works_on"),
		};
		
		return JSON.stringify(slaDef);
	},

	type: 'TaskSLAworkflow'
};
```