---
title: "RepairTaskSLAController"
id: "repairtaskslacontroller"
---

API Name: global.RepairTaskSLAController

```js
var RepairTaskSLAController = Class.create();

RepairTaskSLAController.prototype = Object.extendsObject(TaskSLAController, {
	initialize: function(taskGR, taskType) {
		TaskSLAController.prototype.initialize.call(this, taskGR, taskType);
		this.lu = new GSLog(SLARepair.LOG_PROPERTY, 'RepairTaskSLAController');
		this.lu.includeTimestamp();

		this.slaDefIds = null;
	},

	restrictSLADefinitions: function(slaDefIds) {
		this.slaDefIds = slaDefIds;
	},

	queryTaskSLAs: function() {
		var taskSLAgr = new GlideRecord('task_sla');
		taskSLAgr.addActiveQuery();
		taskSLAgr.addDomainQuery(this.taskGR);
		taskSLAgr.addQuery('task', this.taskGR.sys_id);
		if (this.slaDefIds)
			taskSLAgr.addQuery('sla', this.slaDefIds);
		taskSLAgr.orderBy('sla.sys_id');
		taskSLAgr.query();
		if (this.lu.atLevel(GSLog.DEBUG))
			this.lu.logDebug('queryTaskSLAs: #' + taskSLAgr.getRowCount());
		return taskSLAgr;
	},

	queryContractSLAs: function() {
		var contractSLAgr = new GlideRecord('contract_sla');
		contractSLAgr.addDomainQuery(this.taskGR);
		if (this.slaDefIds)
			contractSLAgr.addQuery('sys_id', this.slaDefIds);
		var taskSLAJoin = contractSLAgr.addJoinQuery('task_sla', 'sys_id', 'sla');
		taskSLAJoin.addCondition('task', this.taskGR.sys_id);
		taskSLAJoin.addCondition('active', true);
		contractSLAgr.orderBy('sys_id');
		return contractSLAgr.query();
	},

	/**
 	* (called after obtaining SelfCleaningMutex: '<<<--Process New SLAs Mutex ' + this.taskGR.sys_id + '-->>>')
 	*
 	* NB. adds to slaGR query, before executing it.
 	*/
	_processNewSLAs_criticalSection: function(slaGR) {
		var newTaskSLA;
		var newTaskSLAs = [];
		this.fieldValuesLogged = false;
		if (this.lu.atLevel(GSLog.INFO))
			this.lu.logInfo('_processNewSLAs_criticalSection: ' + this.taskGR.sys_id);
		var sw;
		if (this.timers)
			sw = new GlideStopWatch();

		// Log the field values in the Task record
		if (this.lu.atLevel(GSLog.DEBUG)) {
			this.lu.logDebug('_processNewSLAs_criticalSection:\n' + this.slalogging.getRecordContentMsg(this.taskGR));
			this.fieldValuesLogged = true;
		}

		// skip any active SLAs already (indirectly) attached to this task -- must be done inside of mutex
		slaGR.addQuery('sys_id', 'NOT IN', this._getSLAsString(this.queryTaskSLAs()));
		slaGR.addDomainQuery(this.taskGR);
		slaGR.query();
		while (slaGR.next()) {
			var oldLogLevel = this.lu.getLevel();
			// if enable logging has been checked on the SLA definition up the log level to "debug"
			if (slaGR.enable_logging) {
				this.lu.setLevel(GSLog.DEBUG);
				if (!this.fieldValuesLogged) {
					this.lu.logDebug('_processNewSLAs_criticalSection:\n' + this.slalogging.getRecordContentMsg(this.taskGR));
					this.fieldValuesLogged = true;
				}
			}

			newTaskSLA = this._checkNewSLA(slaGR);
			if (newTaskSLA)
				newTaskSLAs.push(newTaskSLA);

			this.lu.setLevel(oldLogLevel);
		}

		if (newTaskSLAs.length > 0) {
			this._adjustPauseTime(newTaskSLAs);
			for (var i = 0; i < newTaskSLAs.length; i++) {
				newTaskSLA = newTaskSLAs[i];
				if (newTaskSLA.needsAdjusting && !newTaskSLA.adjusted) {
					newTaskSLA.taskSLA.updateState(TaskSLA.STATE_IN_PROGRESS);
					if (this.breakdownsPluginActive && sn_sla_brkdwn.SLABreakdownProcessor.hasBreakdownDefinitions(newTaskSLA.taskSLA.getGlideRecord().getValue("sla")))
						this._processSLABreakdowns(newTaskSLA.taskSLA.getGlideRecord(), null, "insert");
				}
			}
		}

		if (this.timers)
			sw.log('TaskSLAController._processNewSLAs_criticalSection complete');
	},

	_processNewSLAs: function() {
		this.lu.logInfo('_processNewSLAs');
		var sw;
		if (this.timers)
			sw = new GlideStopWatch();

		var slaGR = this._getSLAsQueryCheckingContracts();

		if (this.slaDefIds)
			slaGR.addQuery('sys_id', this.slaDefIds);

		this.newSLADefIds = [];
		SelfCleaningMutex.enterCriticalSectionRecordInStats(this.MUTEX_NEW + this.taskGR.sys_id, this.MUTEX_NEW, this, this._processNewSLAs_criticalSection, slaGR);
		// TODO: optionally attach work-notes
		if (this.timers)
			sw.log('TaskSLAController: Finished _processNewSLAs part 1');

		// and active Service Offering SLA definitions
		// (TODO: merge this contract_sla query with the previous one, to process all of them in one go)
		if (!this._allowProcessingServiceCommitment())
			return;

		var socGR = new GlideRecord('service_offering_commitment');
		if (!socGR.isValid())
			return;

		var commitmentFieldTest = new GlideRecord('service_commitment');
		if (!commitmentFieldTest.isValidField("sla"))
			return;

		if (this.timers)
			sw = new GlideStopWatch();
		// (using contract_sla GlideRecord to easily avoid
		//  those that are currently active and assigned to the task)
		slaGR.initialize();
		slaGR.addActiveQuery();
		slaGR.addQuery('collection', this.taskGR.getRecordClassName());
		if (this.slaDefIds)
			slaGR.addQuery('sys_id', this.slaDefIds);
		// service_commitment.type='SLA'
		slaGR.addQuery('JOINcontract_sla.sys_id=service_commitment.sla!type=SLA');
		// service_offering_commitment.service_offering=cmdb_ci
		slaGR.addQuery('JOINservice_commitment.sys_id=service_offering_commitment.service_commitment!service_offering=' + this.taskGR.getValue(this.serviceOfferingField));

		SelfCleaningMutex.enterCriticalSectionRecordInStats(this.MUTEX_NEW + this.taskGR.sys_id, this.MUTEX_NEW, this, this._processNewSLAs_criticalSection, slaGR);
		// TODO: optionally attach more work-notes
		if (this.timers)
			sw.log('TaskSLAController: Finished _processNewSLAs part 2');
	},

	/**
 	* Check the Attach Conditions of the specified contract_sla (or service_offering_commitment) definition If
 	* (SLACondition).attach returns true then attach it to this task
 	*
 	* pre-conditions: by this point, we have confirmed that it isn't currently attached to the task, and we have the Mutex for
 	* "Process New SLAs Mutex " + this.taskGR.sys_id) to prevent it being added by another TaskSLAController
 	*/
	_checkNewSLA: function(slaGR) {
		var sw;
		if (this.timers)
			sw = new GlideStopWatch();
		var slac = this._newSLACondition(slaGR, this.taskGR);
		var startMatches = slac.attach();
		if (this.lu.atLevel(GSLog.DEBUG))
			this.lu.logDebug('_checkNewSLA: checking ' + slaGR.name + ', start condition matched=' + startMatches);

		if (!startMatches)
			return null;

		this.newSLADefIds.push(slaGR.getValue('sys_id'));
		if (this.lu.atLevel(GSLog.DEBUG))
			this.lu.logDebug('_checkNewSLA newSLADefIds=[' + this.newSLADefIds.join() + ']');

		/*
		this object will contain properties to indicate if this new Task SLA needs retroactive pause time calculated,
		if the adjust pause was succesful and also the TaskSLA object itself
 			*/
		var newTaskSLA = {
			"needsAdjusting": false,
			"adjusted": false
		};

		var taskSLA;
		// Check if this TaskSLA needs retroactive pause calculation
		if (this._needsAdjustPause(slaGR)) {
			newTaskSLA.needsAdjusting = true;
			newTaskSLA.contractSLAgr = this.slaUtil.copyContractSLA(slaGR);
			taskSLA = new RepairTaskSLA(newTaskSLA.contractSLAgr, this.taskGR, /* deferInsert */ true);
		} else {
			taskSLA = new RepairTaskSLA(slaGR, this.taskGR, /* deferInsert */ true);
			taskSLA.updateState(TaskSLA.STATE_IN_PROGRESS); // adds task_sla record, initiates model state machine, starts notification workflow
			if (this.breakdownsPluginActive && sn_sla_brkdwn.SLABreakdownProcessor.hasBreakdownDefinitions(slaGR.getUniqueValue()))
				this._processSLABreakdowns(taskSLA.getGlideRecord(), null, "insert");
			if (this.lu.atLevel(GSLog.INFO))
				this.lu.logInfo('_checkNewSLA: added SLA "' + slaGR.name + '"');
		}

		// add the TaskSLA object to our exising newTaskSLA object
		newTaskSLA.taskSLA = taskSLA;

		// TODO: work-notes

		if (this.timers)
			sw.log('TaskSLAController: Finished _checkNewSLA');

		return newTaskSLA;
	},

	// (called after obtaining SelfCleaningMutex MUTEX_UPDATE: '<<<--Process Existing SLAs Mutex ' + this.taskGR.sys_id + '-->>>',
	// to prevent simultaneous/overlapping updates of the task_sla records)
	_processExistingSLAs_criticalSection: function(taskSLAgr, contractSLAgr) {
		this.fieldValuesLogged = false;
		if (this.lu.atLevel(GSLog.INFO))
			this.lu.logInfo('_processExistingSLAs_criticalSection: ' + this.taskGR.sys_id);
		var sw;
		if (this.timers)
			sw = new GlideStopWatch();

		// Log the field values in the Task record
		if (this.lu.atLevel(GSLog.DEBUG)) {
			this.lu.logDebug('_processExistingSLAs_criticalSection:\n' + this.slalogging.getRecordContentMsg(this.taskGR));
			this.fieldValuesLogged = true;
		}

		var resetTaskSLAs = [];
		var contractSLA;
		var taskSLA;
		var conditionResults;
		var previousTaskSLAgr;

		while (taskSLAgr.next()) {
			contractSLA = this._getContractSLA(taskSLAgr, contractSLAgr);

			var oldLogLevel = this.lu.getLevel();
			// if enable logging has been checked on the SLA definition up the log level to "debug"
			if (contractSLA.enable_logging) {
				this.lu.setLevel(GSLog.DEBUG);
				if (!this.fieldValuesLogged) {
					this.lu.logDebug('_processExistingSLAs_criticalSection:\n' + this.slalogging.getRecordContentMsg(this.taskGR));
					this.fieldValuesLogged = true;
				}
			}

			taskSLA = this._getTaskSLA(taskSLAgr, contractSLA);
			previousTaskSLAgr = this.slaUtil.copyTaskSLA(taskSLAgr);
			conditionResults = this._checkExistingSLA(taskSLA, contractSLA);

			/* if the condition checking didn't result in a stage change of the Task SLA then just call SLACalculatorNG to update
			   the duration values which could potentially result in "has_breached" changing */
			if (!conditionResults.stageChangedTo) {
				// Stop business rules from running when we do the calculation as we don't want the breakdown data to be automatically generated
 				taskSLA.getGlideRecord().setUseEngines(false);
 				SLACalculatorNG.calculateSLA(taskSLA.getGlideRecord(), false, this.taskGR.sys_updated_on.getGlideObject(), contractSLA, true);
			}

			if (this.breakdownsPluginActive && sn_sla_brkdwn.SLABreakdownProcessor.hasBreakdownDefinitions(taskSLAgr.getValue("sla")))
				this._processSLABreakdowns(taskSLA.getGlideRecord(), previousTaskSLAgr, "update");

			if (this.lu.atLevel(GSLog.DEBUG))
				this.lu.logDebug("Condition results for Task SLA " + contractSLA.getDisplayValue() + " on task " + this.taskGR.getDisplayValue() +
								 ":\n" + JSON.stringify(conditionResults));

			if (conditionResults.stopCancel.reset && !conditionResults.stopCancel.skipResetAction)
				resetTaskSLAs.push(taskSLAgr.getValue('sla'));

			this.lu.setLevel(oldLogLevel);
		}

		if (resetTaskSLAs.length > 0)
			SelfCleaningMutex.enterCriticalSectionRecordInStats(this.MUTEX_NEW + this.taskGR.sys_id, this.MUTEX_NEW,
																this, this._checkNewSLAsFromReset, resetTaskSLAs);

		if (this.timers)
			sw.log('TaskSLAController._processExistingSLAs_criticalSection complete');
	},

	_getTaskSLA: function(taskSLAgr, slaDefGR) {
		return new RepairTaskSLA(taskSLAgr, this.taskGR, null, slaDefGR);
	},

	_checkExistingSLA: function(taskSLA, contractSLA) {
		var sw;
		if (this.timers)
			sw = new GlideStopWatch();

		if (this.lu.atLevel(GSLog.DEBUG))
			this.lu.logDebug('_checkExistingSLA: ' + taskSLA.getGlideRecord().sys_id);
		taskSLA.setTaskGR(this.taskGR);
		taskSLA.setUpdateTime(this.taskGR.sys_updated_on);
		if (this.replayingTask)
			taskSLA.setBreachTimer(false); // disable breach timers on the task_sla, for replay

		var conditionResults = {
			stopCancel: {

			},
			pauseResume: {

			}
		};
		// (stop/cancel takes precedence over pause/unpause also matching in the same update to the task record)
		conditionResults.stopCancel = this._stopCancel(taskSLA, contractSLA);

		if (!conditionResults.stopCancel.conditionMatched)
			conditionResults.pauseResume = this._pauseUnpause(taskSLA, contractSLA);

		conditionResults.stageChangedTo = conditionResults.stopCancel.stageChangedTo || conditionResults.pauseResume.stageChangedTo;

		// TODO: work-notes
		if (this.timers)
			sw.log('TaskSLAController: Finished _checkExistingSLA');

		return conditionResults;
	},

	_runContractSLAs: function() {
		var slaGR = new GlideRecord('contract_sla');
		slaGR.addActiveQuery();
		slaGR.addQuery('collection', this.taskGR.getRecordClassName());
		if (this.slaDefIds)
			slaGR.addQuery('sys_id', this.slaDefIds);
		// contract_rel_contract_sla.contract=this.taskGR.contract
		slaGR.addQuery('JOINcontract_sla.sys_id=contract_rel_contract_sla.contract_sla!contract=' + this.taskGR.contract);
		SelfCleaningMutex.enterCriticalSectionRecordInStats(this.MUTEX_NEW + this.taskGR.sys_id, this.MUTEX_NEW, this, this._processNewSLAs_criticalSection, slaGR);
	},

	_needsAdjustPause: function(slaGR) {
		// nothing to adjust for, as the task can have no previous updates
		if (parseInt(this.taskGR.getValue("sys_mod_count")) === 0)
			return;

		// relative duration SLAs, and those without pause conditions, cannot pause
		if (slaGR.duration_type != '' || !slaGR.pause_condition)
			return false;

		// (shouldn't have been called for a non retroactive pause SLA)
		if (!slaGR.retroactive || !slaGR.retroactive_pause)
			return false;

		return true;
	},

	/**
 	* Generate & replay task history, to adjust pause duration, pause time of retroactive-start SLAs (runs from within the
 	* _processNewSLAs_criticalSection)
 	*/
	_adjustPauseTime: function(slasToAdjust) {
		if (this.lu.atLevel(GSLog.INFO))
			this.lu.logInfo('_adjustPauseTime: Adjusting pause time for retroactive SLAs on ' + this.taskGR.getDisplayValue());
		if (!slasToAdjust || slasToAdjust.length === 0) {
			this.lu.logWarning('There are no SLAs to be adjusted');
			return;
		}
		// work out if the Task record is just being created and if it is we shouldn't adjust pause time
		// "SLARepair" constructs the task GlideRecord with the correct "sys_mod_count"
		if (parseInt(this.taskGR.getValue("sys_mod_count")) === 0) {
			if (this.lu.atLevel(GSLog.DEBUG))
				this.lu.logDebug("_adjustPauseTime: ends - task has sys_mod_count of 0 so there can't be any retroactive pauses");
			// nothing to adjust for, as the task can have no previous updates
			return;
		}

		if (!(new GlideAuditor(this.taskGR.getTableName(), null).auditTable())) {
			if (this.lu.atLevel(GSLog.ERR))
				this.lu.logError('Cannot adjust SLA pause time for a retroactive start - auditing not enabled on ' + this.taskGR.getTableName());
			return;
		}

		if (this.lu.atLevel(GSLog.INFO))
			this.lu.logInfo('_adjustPauseTime: at ' + this.taskGR.getValue("sys_updated_on"));

		var hasRetroSLAs = false;
		for (var i = 0; i < slasToAdjust.length; i++) {
			if (slasToAdjust[i].needsAdjusting) {
				hasRetroSLAs = true;
				break;
			}
		}

		if (!hasRetroSLAs) {
			if (this.lu.atLevel(GSLog.DEBUG))
				this.lu.logDebug("_adjustPauseTime: ends - there are no retroactive Task SLAs requiring retroactive pause time calculation");
			return;
		}

		var hw = this.slaUtil.getHistoryWalker(this.taskGR.getRecordClassName(), this.taskGR.getUniqueValue(),
			/*recordLevelSecurity*/ false, /*fieldLevelSecurity*/ false, /*withVariables*/ true, /*walkToFirstUpdate*/ true);
		if (!hw) {
			this.lu.logError("_adjustPauseTime: failed getting HistoryWalker to initial update");
			return;
		}

		// save a reference to the current task record before we start stepping through the updates
		var originalTaskGR = this.taskGR;

		var currentModCount = this.taskGR.getValue('sys_mod_count');
		var currentUpdatedOn = this.taskGR.sys_updated_on.dateNumericValue();
		var initialUpdateProcessed = false;
		var taskSLA;
		var taskSLAgr;
		var contractSLA;
		var walkedRecordUpdatedOnMs;
		var startTimeMs;

		do {
			this.taskGR = hw.getWalkedRecord();

			// We don't need to process the history for the current update number
			if (this.taskGR.getValue('sys_mod_count') == currentModCount)
				break;

			/* Also make sure we haven't got to an update that is later than where our current task is
			This can happen as SLA Repair replays the updates one by one */
			walkedRecordUpdatedOnMs = this.taskGR.sys_updated_on.dateNumericValue();
			if (walkedRecordUpdatedOnMs > currentUpdatedOn)
				break;

			if (this.lu.atLevel(GSLog.DEBUG))
				this.lu.logDebug('_adjustPauseTime: [' + this.taskGR.getValue('sys_mod_count') + '] history update time: ' + this.taskGR.getValue('sys_updated_on'));
			for (var j = 0; j < slasToAdjust.length; j++) {
				if (!slasToAdjust[j].needsAdjusting)
					continue;

				taskSLA = slasToAdjust[j].taskSLA;
				contractSLA = slasToAdjust[j].contractSLAgr;
				if (!contractSLA)
					contractSLA = taskSLA.getGlideRecord().sla;

				taskSLAgr = taskSLA.getGlideRecord();
				startTimeMs = taskSLAgr.start_time.dateNumericValue();
				if (startTimeMs <= walkedRecordUpdatedOnMs)
					taskSLA.setUpdateTime(this.taskGR.getValue('sys_updated_on'));
				else
					taskSLA.setUpdateTime(taskSLAgr.getValue('start_time'));

				if (!initialUpdateProcessed) {
					slasToAdjust[j].adjusted = true;
					taskSLA.setRetroactiveAdjusting(true);
					taskSLA.updateState(TaskSLA.STATE_IN_PROGRESS);
					taskSLA.starting = false;
				}

				var conditionResults = this._pauseUnpause(taskSLA, contractSLA);

				if (this.lu.atLevel(GSLog.DEBUG)) {
					this.lu.logDebug("Condition Results for Task SLA " + contractSLA.getDisplayValue() + ": " + JSON.stringify(conditionResults));
					this.lu.logDebug("Business elapsed: " + taskSLAgr.business_duration.getDurationValue() + ", Pause duration: " + taskSLAgr.pause_duration.getDurationValue() +
									 ", Pause time: " + taskSLAgr.pause_time.getDisplayValue());
				}
			}
			initialUpdateProcessed = true;
		} while (hw.walkForward());

		for (var k = 0; k < slasToAdjust.length; k++) {
			if (!slasToAdjust[k].adjusted)
				continue;

			taskSLA = slasToAdjust[k].taskSLA;
			contractSLA = slasToAdjust[k].contractSLAgr;
			taskSLA.starting = true;
			taskSLA.setRetroactiveAdjusting(false);
			if (this.breakdownsPluginActive && sn_sla_brkdwn.SLABreakdownProcessor.hasBreakdownDefinitions(taskSLA.getGlideRecord().getValue("sla")))
				this._processSLABreakdowns(taskSLA.getGlideRecord(), null, "insert");
			if (this.lu.atLevel(GSLog.INFO)) {
				taskSLAgr = taskSLA.getGlideRecord();
				this.lu.logInfo('Finished adjusting pause time for retroactive SLA ' + contractSLA.getDisplayValue() + ' on ' + this.taskGR.getDisplayValue() + ': pause_duration=' + taskSLAgr.pause_duration + ', pause_time='
								+ taskSLAgr.pause_time.getDisplayValue());
			}
			if (this.lu.atLevel(GSLog.DEBUG))
				this.lu.logDebug('taskSLA: starting=' + taskSLA.starting);
		}

		// set back to the real task
		this.taskGR = originalTaskGR;

		if (this.lu.atLevel(GSLog.INFO))
			this.lu.logInfo('_adjustPauseTime: Finished adjusting pause time for retroactive SLAs on ' + this.taskGR.getDisplayValue());

		return;
	},

	type: 'RepairTaskSLAController',

	// ** Deprecated ** Below variables/functions are deprecated

	/* Deprecated */ runWorkflow: false,
	/* Deprecated */ setRunWorkflow: function(runWorkflow) {
		this.runWorkflow = runWorkflow;
	}
});
```