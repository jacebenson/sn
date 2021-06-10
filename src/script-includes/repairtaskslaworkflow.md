---
title: "RepairTaskSLAWorkflow"
id: "repairtaskslaworkflow"
---

API Name: global.RepairTaskSLAWorkflow

```js
var RepairTaskSLAWorkflow = Class.create();

RepairTaskSLAWorkflow.PROP_OVERRIDE_WORKFLOW = "com.snc.sla.repair.use_repair_workflow";
RepairTaskSLAWorkflow.PROP_WORKFLOW_NAME = "com.snc.sla.repair.workflow";

RepairTaskSLAWorkflow.prototype = Object.extendsObject(TaskSLAworkflow, {
	EVENT_TURN_REPAIR_OFF: "repairModeFalse",
	SLA_ALWAYS_POPULATE_BUSINESS: 'com.snc.sla.always_populate_business_fields',

	initialize: function (taskSLAgr, slaDefGR) {
		TaskSLAworkflow.prototype.initialize.call(this, taskSLAgr, slaDefGR);
		this.alwaysPopulateBusiness = (gs.getProperty(this.SLA_ALWAYS_POPULATE_BUSINESS, 'false') === 'true');
	},

	start: function(/* optional: GlideDateTime */ stopTime) {
		var workflow = this.getWorkflow();
		if (!workflow || !workflow.sys_id) {
			if (this.lu.atLevel(GSLog.INFO))
				this.lu.logInfo("no workflow to start for " + this.slaDefGR.name);
			return;
		}

		if (this.lu.atLevel(GSLog.INFO))
			this.lu.logInfo("start: workflow " + workflow.name + " started for " + this.slaDefGR.name);

		// If the SLA has already breached then unless the appropriate property has been set true don't run the workflow
		if (this.taskSLAgr.has_breached && !this.runForBreached) {
			if (this.lu.atLevel(GSLog.INFO))
				this.lu.logInfo("start: SLA has already breached so workflow will not be started for " + this.slaDefGR.name);
			return;
		}

		var scratchPad = {};
		scratchPad.slaDataJSON = this._getSLADefJSON();
		scratchPad.repairedTaskSLADataJSON = this._getTaskSLAJSON();
		scratchPad.timezoneForSchedule = new SLAUtil().getTimezone(this.taskSLAgr);

		var wfVars = {};
		wfVars.sla_repair_mode = true;
		wfVars.u_sla_repair_mode = true;

		this._startFlow(workflow.sys_id, this.taskSLAgr, wfVars, scratchPad);
		this.taskSLAgr.update();
	},

	turnRepairModeOff: function() {
		var workflow = new Workflow();
		var wf = workflow.getRunningFlows(this.taskSLAgr);
		while (wf.next()) {
			// set the scratchpad to disable repair mode in the whole workflow
			wf.scratchpad.repairMode = 'false';
			wf.update();
			// trigger the event to indicate repair mode has been disabled to running activities
			workflow.broadcastEvent(wf.sys_id, this.EVENT_TURN_REPAIR_OFF);
		}
	},

	/**
     * Checks if the workflow override property is true
     *
     * @returns boolean
     */
	isWorkflowOverride: function() {
		return gs.getProperty(RepairTaskSLAWorkflow.PROP_OVERRIDE_WORKFLOW, "false") == "true";
	},

	/**
     * Gets the correct workflow sys_id for the given task_sla.
     *
     * If the override property is true the workflow defined in the workflow property is returned. If the override property is
     * false the workflow from the SLA Definition is returned.
     *
     * @returns Object { name: name_of_workflow, sys_id: workflow_sys_id }
     */
	getWorkflow: function() {
		var workflow = {
			name: "",
			sys_id: ""
		};

		if (!this.isWorkflowOverride()) {
			if (this.slaDefGR.workflow.nil())
				return null;

			workflow.name = this.slaDefGR.workflow.getDisplayValue();
			workflow.sys_id = this.slaDefGR.workflow + "";

			return workflow;
		}

		var name = gs.getProperty(RepairTaskSLAWorkflow.PROP_WORKFLOW_NAME, null);
		if (!name)
			return null;

		var wfScript = new SNC.WorkflowScriptAPI();

		workflow.name = name;
		workflow.sys_id = wfScript.getWorkflowFromName(name);

		return workflow;
	},

	_getBusinessElapsedMs: function () {
		var elapsed = null;
		if (!this.taskSLAgr || !this.taskSLAgr.isValidRecord())
			return elapsed;

		if (this.taskSLAGr.schedule.nil() && !this.alwaysPopulateBusiness)
			return this.taskSLAgr.duration.dateNumericValue();

		return this.taskSLAgr.business_duration.dateNumericValue();
	},

	_getTaskSLAJSON: function () {
		var taskSLA = {};

		if (!this.taskSLAgr)
			return taskSLA;

		taskSLA = {
			startTime: this.taskSLAgr.getValue("start_time"),
			businessElapsed: Math.floor(this._getBusinessElapsedMs() / 1000)
		};

		return JSON.stringify(taskSLA);
	},

	type: "RepairTaskSLAWorkflow"
});
```