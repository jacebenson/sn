---
title: "TaskSLAFlowSNC"
id: "taskslaflowsnc"
---

API Name: global.TaskSLAFlowSNC

```js
var TaskSLAFlowSNC = Class.create();

TaskSLAFlowSNC.prototype = {

	// sys_properties
	SLA_FLOW_LOG: 'com.snc.sla.flow.log',
	SLA_FLOW_RUN_FOR_BREACHED: 'com.snc.sla.flow.run_for_breached',
	SLA_DATABASE_LOG: 'com.snc.sla.log.destination',

	initialize : function(taskSLAGr, slaDefGr) {
		this.taskSLAGr = taskSLAGr;
		this.slaDefGr = null;
		this.repairMode = false;
		this.runForBreached = (gs.getProperty(this.SLA_FLOW_RUN_FOR_BREACHED, 'false') == 'true');
		this.slaUtil = new SLAUtil();
		this.slaDurationMs = null;

		if (slaDefGr && slaDefGr.isValidRecord())
			this.slaDefGr = slaDefGr;
		else if (taskSLAGr && taskSLAGr.isValidRecord())
			this.slaDefGr = this.slaUtil.getSLADefFromTaskSLA(taskSLAGr);

		this.lu = new GSLog(this.SLA_FLOW_LOG, this.type);
		this.lu.includeTimestamp();
		if (gs.getProperty(this.SLA_DATABASE_LOG, "db") == "node")
			this.lu.disableDatabaseLogs();

		// if enable logging has been checked on the SLA definition up the log level to "debug"
		if (this.slaDefGr && this.slaDefGr.enable_logging)
			this.lu.setLevel(GSLog.DEBUG);

		if (this.lu.atLevel(GSLog.INFO))
			this.lu.logInfo('initialize: with task_sla ' + taskSLAGr.getUniqueValue());
	},

	setRepairMode: function (trueFalse) {
		this.repairMode = "" + trueFalse === "true";
	},

	setSLADuration: function(slaDurationMs) {
		if (isNaN(slaDurationMs) || slaDurationMs === 0)
			return;
		
		this.slaDurationMs = parseInt(slaDurationMs);
	},
	
	getFlowData: function() {
		var hasFlows = false;
		var hasMultipleFlows = false;
		var flowId = "";

		if (!this.taskSLAGr || !this.taskSLAGr.isValidRecord())
			return {hasFlows: hasFlows, hasMultipleFlows: hasMultipleFlows, flowId: flowId, flowQuery: ""};

		var flowsGr = this._getFlowsByState();		
		if (flowsGr.next()) {
			hasFlows = true;
			if (!flowsGr.hasNext())
				flowId = flowsGr.getUniqueValue();
			else
				hasMultipleFlows = true;
		}
		
		return {hasFlows: hasFlows, hasMultipleFlows: hasMultipleFlows, flowId: flowId, flowQuery: flowsGr.getEncodedQuery()};
	},

	start: function() {
		if (!this.taskSLAGr || !this.taskSLAGr.isValidRecord()) {
			this.lu.logError('start: no Task SLA record supplied');
			return;
		}
		
		if (!this.slaDefGr) {
			this.lu.logError('start: no SLA definition supplied');
			return;
		}

		if (this.slaDefGr.flow.nil()) {
			if (this.lu.atLevel(GSLog.INFO))
				this.lu.logInfo('start: no Flow specified on SLA Definition ' + this.slaDefGr.getDisplayValue());
			return;
		}
		
		if (this.lu.atLevel(GSLog.INFO))
			this.lu.logInfo('start: copy of Flow ' + this.slaDefGr.flow + ' started for ' + this.slaDefGr.name);

		// If the SLA has already breached then unless the appropriate property has been set true don't run the Flow
		if (this.taskSLAGr.has_breached && !this.runForBreached) {
			if (this.lu.atLevel(GSLog.INFO))
				this.lu.logInfo('start: SLA has already breached so Flow will not be started for ' + this.slaDefGr.name);
			return;
		}

		var flowId = this.slaDefGr.getValue("flow");
		var flowInputs = {};
		flowInputs["task_sla_record"] = this.taskSLAGr;
		flowInputs["sla_flow_inputs"] = this._getSLADefFlowInput();
		
		var flowGr = new GlideRecord("sys_hub_flow");
		if (!flowGr.get(flowId)) {
			this.lu.logError('Failed to find a Flow with sys_id: ' + flowId);
			return;
		}
		
		var flowName = flowGr.getValue("sys_scope") + "." + flowGr.getValue("internal_name");
		sn_flow_trigger.FlowTriggerAPI.fireSlaTaskTrigger(flowName, this.taskSLAGr, this._getSLADefFlowInput());
	},

	pause: function() {
		if (!this.taskSLAGr) {
			this.lu.logError('pause: no Task SLA supplied');
			return;
		}
		
		if (this.lu.atLevel(GSLog.INFO))
			this.lu.logInfo('pause: instance of Flow "' + this.slaDefGr.flow + '" paused for ' + this.slaDefGr.name);

		this._sendActionToRunningFlows("pause");
	},

	resume: function() {
		if (!this.taskSLAGr) {
			this.lu.logError('resume: no Task SLA supplied');
			return;
		}

		if (this.lu.atLevel(GSLog.INFO))
			this.lu.logInfo('resume: instance of Flow "' + this.slaDefGr.flow + ' resumed for ' + this.slaDefGr.name);

		this._sendActionToRunningFlows("resume");
	},

	cancel: function() {
		if (!this.taskSLAGr) {
			this.lu.logError('cancel: no Task SLA supplied');
			return;
		}

		var runningFlowsGr = this._getRunningFlows();
		while (runningFlowsGr.next()) {
			if (this.lu.atLevel(GSLog.INFO))
				this.lu.logInfo('cancel: cancelling flow ' + runningFlowsGr.getValue("sys_id") + ' [' + runningFlowsGr.getDisplayValue() + ']');

			sn_fd.FlowAPI.cancel(runningFlowsGr.getValue("sys_id"), "SLA stage is " + this.taskSLAGr.getValue("stage"));
		}
	},

	_getSLADefFlowInput: function() {
		var slaDefFlowInput = {};
		
		if (!this.taskSLAGr)
			return slaDefFlowInput;

		if (this.slaDurationMs === null)
			this.slaDurationMs = this.slaUtil.getSLADurationInMs(this.taskSLAGr, this.slaDefGr);
		
		var slaDurationGDT = new GlideDateTime();
		slaDurationGDT.setNumericValue(this.slaDurationMs);
		
		slaDefFlowInput = {
							name: this.slaDefGr.getValue("name"),
							duration_type: this.slaDefGr.getValue("duration_type"),
							duration: "" + slaDurationGDT,
							relative_duration_works_on: this.slaDefGr.getValue("relative_duration_works_on"),
							is_repair: this.repairMode
						};
		
		return slaDefFlowInput;
	},
	
	_sendActionToRunningFlows: function(action) {
		var flowContextGr = this._getRunningFlows();
		
		while (flowContextGr.next())
			new sn_ph.FDSLATimer(flowContextGr.getUniqueValue())[action]();
	},
	
	_getRunningFlows: function() {
		return this._getFlowsByState(["WAITING","IN_PROGRESS","QUEUED","CONTINUE_SYNC"]);
	},
	
	_getFlowsByState: function(states) {
		if (this.lu.atLevel(GSLog.INFO))
			this.lu.logInfo('_getFlowsByState: called with states = ' + states);

		var flowContextGr = new GlideRecord("sys_flow_context");
		flowContextGr.addQuery("source_table", "task_sla");
		flowContextGr.addQuery("source_record", this.taskSLAGr.getUniqueValue());
		if (states)
			flowContextGr.addQuery("state", states);
		flowContextGr.query();
		
		if (this.lu.atLevel(GSLog.INFO)) {
			this.lu.logInfo('_getFlowsByState: "sys_flow_context" table queried with:\n' + flowContextGr.getEncodedQuery());
			if (!flowContextGr.hasNext())
				this.lu.logInfo('_getFlowsByState: no flows found');
		}

		return flowContextGr;
	},

	type: 'TaskSLAFlowSNC'
};
```