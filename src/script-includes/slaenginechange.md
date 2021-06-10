---
title: "SLAEngineChange"
id: "slaenginechange"
---

API Name: global.SLAEngineChange

```js
var SLAEngineChange = Class.create();

SLAEngineChange.TASK_SLA_BRS_2010 = {'4b9920260a0a0b300044289ce10a441c': 'Run SLA calculation',
									'51845c470a0a0b300030cf1951a65266': 'Stop Workflow',
									'898b8a110a0a0bb700713c7b94daa734': 'Pause Workflow',
									'898bfc810a0a0bb700420d390c5f2580': 'Resume Workflow',
									'a8a00aedc0a80a160094253cd2b507ad': 'Pause SLA',
									'a8a11573c0a80a16001afe23146e4666': 'Resume SLA',
									'd956ec230a0003a4008b5f36ef0ec9af': 'Start Workflow',
									'eb45f7cd46d2d66a006fba84943e6e43': 'Cancel trigger',
									'ebd09ef14bd15d7a00ad42f66a380e72': 'Set planned end time'};

SLAEngineChange.switchTo2010 = function() {
	// enable the 'old' business rules on 'task_sla'
	var gr = new GlideRecord('sys_script');
	gr.addQuery('collection', 'task_sla');
	gr.addQuery('sys_id', Object.keys(SLAEngineChange.TASK_SLA_BRS_2010));
	gr.query();
	while (gr.next()) {
		gr.active = true;
		gr.update();
	}
	// enable the 'old' "Process SLAs" business rule on 'task'
	gr.initialize();
	gr.addQuery('name', 'Process SLAs');
	gr.addQuery('collection', 'task');
	gr.query();
	while (gr.next())
		if (!gr.active) {
		gr.active = true;
		gr.update();
	}
	// disable the 'SLA Condition Rules' module, it is not pertinent to the 2010 engine
	gr = new GlideRecord('sys_app_module');
	gr.addQuery('sys_id', 'ecef838d0a0a2cbb4d89f42ad0d32bdc');
	gr.addQuery('name', 'sla_condition_class');
	gr.addQuery('title', 'SLA Condition Rules');
	gr.addActiveQuery();
	gr.query();
	while (gr.next()) {
		gr.active = false;
		gr.update();
	}
	// flip any SLA breach triggers
	SLAEngineChange._convertTriggersTo2010();
	// Breach compatibility must be off, for 2010 SLA Engine (this executes SLABreachChange.updateBreachedCompatOn())
	SLAProperties.setBreachCompat(true);
	SLAProperties.updatePropertiesModules("2010");
	SLARepairProperties.enabledFlagChanged("false");
	new SLABreakdownUtils().setBreakdownModulesVisible(false);
};

SLAEngineChange.switchTo2011 = function() {
	// disable the 'old' business rules on 'task_sla'
	var gr = new GlideRecord('sys_script');
	gr.addQuery('collection', 'task_sla');
	gr.addQuery('sys_id', Object.keys(SLAEngineChange.TASK_SLA_BRS_2010));
	gr.query();
	while (gr.next()) {
		gr.active = false;
		gr.update();
	}
	// disable the 'old' "Process SLAs" business rule on 'task'
	gr.initialize();
	gr.addQuery('name', 'Process SLAs');
	gr.addQuery('collection', 'task');
	gr.query();
	while (gr.next())
		if (gr.active) {
		gr.active = false;
		gr.update();
	}
	// enable the 'SLA Condition Rules' module, if it hasn't been touched
	gr = new GlideRecord('sys_app_module');
	gr.addQuery('sys_id', 'ecef838d0a0a2cbb4d89f42ad0d32bdc');
	gr.addQuery('name', 'sla_condition_class');
	gr.addQuery('title', 'SLA Condition Rules');
	gr.addInactiveQuery();
	gr.query();
	while (gr.next()) {
		gr.active = true;
		gr.update();
	}
	// flip any SLA breach triggers
	SLAEngineChange._convertTriggersTo2011();
	// update any existing active breached SLAs has_breached flag (not set by 2010 SLA Engine)
	SLABreachChange.setBreachedFlagOnActive();
	SLAProperties.updatePropertiesModules("2011");
	SLARepairProperties.enabledFlagChanged(gs.getProperty(SLARepairProperties.PROP_ENABLED));
	new SLABreakdownUtils().setBreakdownModulesVisible(true);
};

SLAEngineChange.checkSLAcalc2011 = function() {
	// Verify that we have a valid version of SLACalculatorNG for the 2011 engine
	if (SLACalculatorNG.prototype.SLA_API_2011)
		return true;

	current.setAbortAction(true);
	current.parent.setError('SLACalculatorNG not available');
	gs.addErrorMessage(gs.getMessage('The \'SLACalculatorNG\' Script Include for the 2011 engine was not available. Please contact Support'));
	return false;
};

SLAEngineChange._convertTriggersTo2011 = function() {
	var st = new GlideRecord('sys_trigger');
	st.addQuery('document', 'task_sla');
	st.addQuery('trigger_type', '0');
	st.addQuery('name', 'STARTSWITH', 'SLA breach timer - ');
	st.addQuery('script', 'STARTSWITH', 'var sla = new GlideRecord');
	st.query();
	while (st.next()) {
		st.script = "new TaskSLA('" + st.document_key + "').breachTimerExpired();";
		st.update();
	}
};

SLAEngineChange._convertTriggersTo2010 = function() {
	var st = new GlideRecord('sys_trigger');
	st.addQuery('document', 'task_sla');
	st.addQuery('trigger_type', '0');
	st.addQuery('name', 'STARTSWITH', 'SLA breach timer - ');
	st.addQuery('script', 'STARTSWITH', 'new TaskSLA');
	st.query();
	while (st.next()) {
		st.script = "var sla = new GlideRecord('task_sla'); sla.addQuery('sys_id', '" + st.document_key + "'); sla.query(); if (sla.next()) { sla.stage = 'breached'; sla.update();}";
		st.update();
	}
};

SLAEngineChange.prototype = {
	initialize : function() {
	},

	type: 'SLAEngineChange'
};

/* Deprecated */
SLAEngineChange.SLA_BREAKDOWN_BR_IDS = ['3f10c16e3b201300ff014180e2efc45f', '683d77fb57520300491dac11ac94f94f'];

```