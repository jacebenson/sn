---
title: "TaskSLAController"
id: "taskslacontroller"
---

API Name: global.TaskSLAController

```js
var TaskSLAController = Class.create();

TaskSLAController.prototype = {

	// sys_properties
	SLA_TASK_SLA_CONTROLLER_LOG: 'com.snc.sla.task_sla_controller.log',
	SLA_TASK_SLA_CONTROLLER_TIMERS: 'com.snc.sla.task_sla_controller.timers',
	SLA_TASK_SLA_DEFAULT_CONDITIONCLASS: 'com.snc.sla.default_conditionclass',
	SLA_DATABASE_LOG: 'com.snc.sla.log.destination',
	SLA_SERVICE_OFFERING: 'com.snc.service.offering.field',
	SLA_GET_TASK_FROM_DB: 'com.snc.sla.get_task_from_db',
	// constants
	BASE_CONDITIONCLASSNAME: 'SLAConditionBase',
	RESET_ACTION_CANCEL: 'cancel',
	RESET_ACTION_COMPLETE: 'complete',

	initialize : function(taskGR, taskType, modCount) {
		this.taskSysId = null;
		this.taskClass = null;
		this.taskLatestModCount = -1;
		this.taskGR = null;
		this.taskHistoryWalker = null;
		this.calledFromAsync = false;
		this.asyncTaskWalked = false;
		this.asyncModCount = null;
		this.gScheduleRecordId = null;
		this.getTaskFromDB = false;
		this.taskWalked = false;

		if (taskGR) {
			if (!taskType)
				// normal initialization
				this.taskGR = taskGR;
			else {
				// entry point for Async sys_trigger execution
				// (taskGR is a sys_id, and taskType is its sys_class)
				this.taskGR = this._getTask(taskType, taskGR);
				this.calledFromAsync = true;
			}
		}

		// trace, debug, logging
		this.timers = (gs.getProperty(this.SLA_TASK_SLA_CONTROLLER_TIMERS, 'false') == 'true');
		this.lu = new GSLog(this.SLA_TASK_SLA_CONTROLLER_LOG, 'TaskSLAController');
		this.lu.includeTimestamp();

		if (this.lu.atLevel(GSLog.DEBUG))
			this.lu.logDebug('initialize: for Task ' + (this.taskGR !== null ? this.taskGR.getDisplayValue() : ""));
		
		this.slaAsyncUtils = new SLAAsyncUtils();
		this.slaAsyncQueue = new SLAAsyncQueue();
		this.runningAsync = this.slaAsyncUtils.isAsyncProcessingActive();

		if (this.taskGR !== null) {
			this.taskClass = this.taskGR.getRecordClassName();
			this.taskSysId = this.taskGR.getValue('sys_id');
			this.taskLatestModCount = parseInt(this.taskGR.getValue('sys_mod_count'), 10);

			/* If we're not running asynchronously check if our Task's type is in the system property that forces
			certain task types to be fetched from the database instead of using "current" */
			this.getTaskFromDBTables = gs.getProperty(this.SLA_GET_TASK_FROM_DB, '').split(",");
			if (this.lu.atLevel(GSLog.DEBUG))
				this.lu.logDebug('initialize: getTaskFromDBTables=' + this.getTaskFromDBTables);
			this.getTaskFromDB = this.runningAsync === false && this.getTaskFromDBTables.indexOf(this.taskClass) >= 0;
			if (this.lu.atLevel(GSLog.DEBUG))
				this.lu.logDebug('initialize: getTaskFromDB=' + this.getTaskFromDB);
			
			if (this.getTaskFromDB)
				this.taskGR = this._getTask(this.taskClass, this.taskSysId);

			if (this.calledFromAsync) {
				this.asyncModCount = isNaN(modCount) ? this.taskLatestModCount : parseInt(modCount, 10);
				if (typeof g_schedule_record !== "undefined" && g_schedule_record.sys_id)
					this.gScheduleRecordId = g_schedule_record.sys_id;
			}
		}

		// SLAConditionClass default override
		this.SLADefaultConditionClassName = gs.getProperty(this.SLA_TASK_SLA_DEFAULT_CONDITIONCLASS, 'SLAConditionBase');
		// for TaskSLAreplay
		this.replayingTask = false;
		//Default Service Offering field
		this.serviceOfferingField = gs.getProperty(this.SLA_SERVICE_OFFERING, 'cmdb_ci');
		if (gs.getProperty(this.SLA_DATABASE_LOG, "db") == "node")
			this.lu.disableDatabaseLogs();
		this.newSLADefIds = [];
		if (this.lu.atLevel(GSLog.DEBUG))
			this.lu.logDebug('newSLADefIds initialized to length=' + this.newSLADefIds.length);
		this.slalogging = new TaskSLALogging();
		this.slaContractUtil = new SLAContractUtil();
		this.slaUtil = new SLAUtil();
		this.breakdownsPluginActive = pm.isActive("com.snc.sla.breakdowns");
		this.domainsPluginActive = pm.isActive("com.glide.domain");
	},

	// run TaskSLAController once with the task's current state
	run: function() {
		if (this.runningAsync) {
			this._queueAsync();

			if (this.lu.atLevel(GSLog.INFO) && this.slaAsyncUtils.isSLAAsyncOverride())
				this.lu.logInfo("run: SLA Async override enabled so update number " + this.taskLatestModCount + " of " + this.taskGR.sys_meta.label + " " + 
								this.taskGR.getDisplayValue() + " will be processed asynchronously");

			return;
		}

		if (this.slaAsyncQueue.isTaskQueued(this.taskSysId)) {
			if (this.lu.atLevel(GSLog.INFO))
				this.lu.logInfo("run: there are unprocessed records in the SLA Async queue for " + this.taskGR.sys_meta.label + " " + 
								this.taskGR.getDisplayValue() + " so this update (" + this.taskLatestModCount + ") will be processed asynchronously");
			this._queueAsync();
			return;
		}

		this.runNow();
	},

	// run once synchronously, even if the property says otherwise
	runSync: function() {
		this.runningAsync = false;
		this.runNow();
	},

	// also called when running from asynchronous job
	runNow: function() {
		if (this.taskGR === null || !this.taskSysId || !this.taskClass) {
			this.lu.logWarn('runNow: no Task supplied so TaskSLAController cannot continue');
			return;
		}

		var sw;
		if (this.timers)
			sw = new GlideStopWatch();
		if (this.lu.atLevel(GSLog.INFO))
			this.lu.logInfo('runNow: starting now (sys_updated=' + this.taskGR.sys_updated_on.getDisplayValue() + ')');
		if (this.lu.atLevel(GSLog.DEBUG)) {
			this.lu.logDebug('runNow: ' + this.slalogging.getBusinessRuleStackMsg());
			this.lu.logDebug('runNow: previous and current values\n' + this.slalogging.getRecordContentMsg(previous, '"previous"') + '\n' + this.slalogging.getRecordContentMsg(current, '"current"'));
		}

		var currentDomain = null;
		if (this.domainsPluginActive)
			currentDomain = gs.getSession().getCurrentDomainID();

		try {
			if (this.calledFromAsync) {
				this.slaAsyncUtils.setSLAAsyncProcessing(true);
				if (this.domainsPluginActive && !this.taskGR.sys_domain.nil())
					gs.getSession().setDomainID(this.taskGR.getValue("sys_domain"));
			}

			this._processNewSLAs();
			this._processExistingSLAs();
		} catch (e) {
			if (this.lu.atLevel(GSLog.ERROR))
				this.logError("runNow: error occurred during SLA processing of task " + this.taskGR.getDisplayValue() + "\n" + e);
		} finally {
			if (this.calledFromAsync) {
				this.slaAsyncUtils.setSLAAsyncProcessing(false);
				if (this.domainsPluginActive)
					gs.getSession().setDomainID(currentDomain);
			}
		}
	
		if (this.lu.atLevel(GSLog.INFO))
			this.lu.logInfo('runNow: finished');

		if (this.timers)
			sw.log('TaskSLAController.runNow complete');
	},

	setTaskGR: function(taskGR) {
		this.taskGR = taskGR;
	},

	getTaskGR: function() {
		return this.taskGR;
	},

	setReplaying: function(enable) {
		this.replayingTask = enable;
	},

	// Enable Stopwatch timers
	// (used for profiling performance)
	setTimers: function(enable) {
		this.timers = enable;
	},

	// return GlideRecord result set of task's active task_sla records
	queryTaskSLAs: function() {
		var taskSLAgr = new GlideRecord('task_sla');
		taskSLAgr.addActiveQuery();
		taskSLAgr.addDomainQuery(this.taskGR);
		taskSLAgr.addQuery('task', this.taskGR.sys_id);
		taskSLAgr.orderBy('sla.sys_id');
		taskSLAgr.query();
		if (this.lu.atLevel(GSLog.DEBUG))
			this.lu.logDebug('queryTaskSLAs: #' + taskSLAgr.getRowCount());
		return taskSLAgr;
	},

	queryContractSLAs: function() {
		var contractSLAgr = new GlideRecord('contract_sla');
		contractSLAgr.addDomainQuery(this.taskGR);
		var taskSLAJoin = contractSLAgr.addJoinQuery('task_sla', 'sys_id', 'sla');
		taskSLAJoin.addCondition('task', this.taskGR.sys_id);
		taskSLAJoin.addCondition('active', true);
		contractSLAgr.orderBy('sys_id');
		contractSLAgr.query();

		return contractSLAgr;
	},

	/////////////////////////////

	// mutex names
	MUTEX_NEW: 'Process New SLAs Mutex ',
	MUTEX_UPDATE: 'Process Existing SLAs Mutex ',

	// internal methods

	_queueAsync: function() {
		var taskSLAGr = this.queryTaskSLAs();
		
		if (!(new SLACacheManager().hasDefinitionForRecord(this.taskGR)) && !taskSLAGr.hasNext()) {
			if (this.lu.atLevel(GSLog.INFO))
				this.lu.logInfo('_queueAsync: no active SLA definitions or active Task SLAs defined for this Task - ' + this.taskClass + ":" + this.taskSysId);
			return;
		}
		
		this.slaAsyncQueue.queueTask(this.taskGR);
	},

	_processNewSLAs: function() {
		if (this.lu.atLevel(GSLog.INFO))
			this.lu.logInfo('_processNewSLAs');

		if (!(new SLACacheManager().hasDefinitionForRecord(this.taskGR))) {
			if (this.lu.atLevel(GSLog.INFO))
				this.lu.logInfo('_processNewSLAs: no active SLA definitions defined for this Task - ' + this.taskClass + ":" + this.taskSysId);
			return;
		}

		// if we've been called from a "sys_trigger" record because SLA processing is running asynchronously
		// then we use HistoryWalker to get the Task record at the current update number so we've got the
		// "changes" information for each field
		if (this.calledFromAsync)
			this._walkTaskForAsync();

		var sw;
		if (this.timers)
			sw = new GlideStopWatch();

		var slaGR = this._getSLAsQueryCheckingContracts();

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
		// service_commitment.type='SLA'
		slaGR.addQuery('JOINcontract_sla.sys_id=service_commitment.sla!type=SLA');
		// service_offering_commitment.service_offering=cmdb_ci
		slaGR.addQuery('JOINservice_commitment.sys_id=service_offering_commitment.service_commitment!service_offering=' + this.taskGR.getValue(this.serviceOfferingField));

		SelfCleaningMutex.enterCriticalSectionRecordInStats(this.MUTEX_NEW + this.taskGR.sys_id, this.MUTEX_NEW, this, this._processNewSLAs_criticalSection, slaGR);
		// TODO: optionally attach more work-notes
		if (this.timers)
			sw.log('TaskSLAController: Finished _processNewSLAs part 2');
	},

	// (called after obtaining SelfCleaningMutex: '<<<--Process New SLAs Mutex ' + this.taskGR.sys_id + '-->>>')
	// NB. adds to slaGR query, before executing it.
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
				var taskSLAgr = newTaskSLA.taskSLA.getGlideRecord();
				if (newTaskSLA.needsAdjusting && !newTaskSLA.adjusted)
					newTaskSLA.taskSLA.updateState(TaskSLA.STATE_IN_PROGRESS);
				// if currently processing asynchronously we need to call breakdown processing as this is not handled by business rule "Process SLA Breakdowns"
				if (this.calledFromAsync && this.breakdownsPluginActive && sn_sla_brkdwn.SLABreakdownProcessor.hasBreakdownDefinitions(taskSLAgr.getValue("sla")))
					this._processSLABreakdowns(taskSLAgr, null, "insert");
			}
		}

		if (this.timers)
			sw.log('TaskSLAController._processNewSLAs_criticalSection complete');
	},

	// Gets the SLA definitions to process taking the contracts into account
	_getSLAsQueryCheckingContracts: function() {
		var collection = this.taskGR.getRecordClassName();
		// if contract is not active for this table, we process all SLAs
		if (this.slaContractUtil.ignoreContract(collection))
			return this.slaContractUtil.getAllSLAsQuery(collection);
		
		var contractGR = this.taskGR.contract;
		// if the task has a contract attached we process the SLAs linked to the contract and, if enabled, the non-contractual SLAs
		
		function isExtension(baseTable, extensionTable) {
			var tu = new TableUtils(baseTable);
			var tabArrLst = tu.getTableExtensions();
			return tabArrLst.contains(extensionTable);
		}

		var contractGr = null;
		var isASTService = false;
		var isASTContract = false;
		
		var hasContract = !this.taskGR.contract.nil();
		if (hasContract) {
			contractGr = this.taskGR.contract.getRefRecord();
			var className = contractGr.getRecordClassName() + "";
			isASTService = className === "ast_service";
			isASTContract = className === "ast_contract";
			if (!isASTService && !isASTContract) // Check for ast_service extensions
				isASTService = isExtension("ast_service", className);
			if (!isASTService && !isASTContract) // Check for ast_contract extensions not in ast_service tree
				isASTContract = isExtension("ast_contract", className);
		}
		
		var processContract = false;
		// Original behaviour.  If it has a contract as it's an ast_service (or extension) record, process the contract
		if (hasContract && isASTService)
			processContract = true;
		
		// New behaviour.  If it's an ast_contract (or extension which isn't in the ast_service branch)
		// check the attach_sla field on the contract model
		if (!processContract && hasContract && isASTContract)
			if (!contractGr.contract_model.nil() && contractGr.contract_model.attach_sla + "" === "true")
				processContract = true;
		
		if (processContract) {
			var includeNonContractual = this.slaContractUtil.processNonContractualSLAs(contractGR);
			var slaGR = this.slaContractUtil.getContractualSLAs(contractGR, collection, includeNonContractual);
			return slaGR;
		}

		// if the task doesn't have a contract, we process non-contractual (but only if the contract table property doesn't exist to preserve legacy behavior)
		if (!this.slaContractUtil.hasContractProperty())
			return this.slaContractUtil.getNonContractualSLAs(collection);

		// if nothing of the above matches, return an empty query
		var emptySlaGR = new GlideRecord('contract_sla');
		emptySlaGR.setLimit(0);
		return emptySlaGR;
	},
	
	_allowProcessingServiceCommitment: function() {
		var collection = this.taskGR.getRecordClassName();
		// if contract does not allow to process non-contractual SLAs, Service Offering SLAs are not processed either
		return this.slaContractUtil.ignoreContract(collection)
		|| (!this.taskGR.contract && !this.slaContractUtil.hasContractProperty())
		|| this.slaContractUtil.processNonContractualSLAs(this.taskGR.contract);
	},

	/*
	Check the Attach Conditions of the specified contract_sla (or service_offering_commitment) definition
	If (SLACondition).attach returns true then attach it to this task

	pre-conditions: by this point, we have confirmed that it isn't currently attached to the task,
	and we have the Mutex for "Process New SLAs Mutex " + this.taskGR.sys_id) to prevent it being added by another TaskSLAController
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

		// this object will contain properties to indicate if this new Task SLA needs retroactive pause time calculated,
		// if the adjust pause was succesful and also the TaskSLA object itself
		var newTaskSLA = {
			"needsAdjusting": false,
			"adjusted": false
		};

		var taskSLA;
		// Check if this TaskSLA needs retroactive pause calculation...
		if (this._needsAdjustPause(slaGR)) {
			/* If retroactive pause calculation is required we need to create a copy of the "contract_sla" record
			   so we have a copy to pass as an argument when creating the TaskSLA object.
			   We can't just use "slaGR" as this is changing as we next through it */
			newTaskSLA.needsAdjusting = true;
			newTaskSLA.contractSLAgr = this.slaUtil.copyContractSLA(slaGR);
			taskSLA = new TaskSLA(newTaskSLA.contractSLAgr, this.taskGR, /* deferInsert */ true, {calledFromAsync: this.calledFromAsync});
		} else {
			// If there's no retroactive pause calculation we can just go ahead and create the Task SLA
			taskSLA = new TaskSLA(slaGR, this.taskGR, /* deferInsert */ true, {calledFromAsync: this.calledFromAsync});
			taskSLA.updateState(TaskSLA.STATE_IN_PROGRESS); // adds task_sla record, initiates model state machine, starts notification workflow
			if (this.lu.atLevel(GSLog.INFO))
				this.lu.logInfo('_checkNewSLA: added SLA "' + slaGR.name + '"');
		}

		// add the TaskSLA object to our exising newTaskSLA object
		newTaskSLA.taskSLA = taskSLA;

		if (this.timers)
			sw.log('TaskSLAController: Finished _checkNewSLA');

		return newTaskSLA;
	},

	_checkNewSLAsFromReset: function(resetSLAs) {
		this._checkNewSLAsForDefs(resetSLAs);
	},

	_checkNewSLAsForDefs: function(slaDefIds) {
		if (!slaDefIds || slaDefIds.length == 0)
			return null;

		var slaGR = new GlideRecord('contract_sla');
		slaGR.addActiveQuery();
		slaGR.addQuery('sys_id', slaDefIds);
		slaGR.addDomainQuery(this.taskGR);
		slaGR.query();

		var newTaskSLAs = [];
		var newTaskSLADefIds = [];
		var newTaskSLA;
		while (slaGR.next()) {
			newTaskSLA = this._checkNewSLA(slaGR);
			if (!newTaskSLA)
				continue;
			if (!newTaskSLA.contractSLAgr)
				newTaskSLA.contractSLAgr = this.slaUtil.copyContractSLA(slaGR);
			if (newTaskSLA) {
				newTaskSLAs.push(newTaskSLA);
				newTaskSLADefIds.push(slaGR.getValue('sys_id'));
			}
		}

		// Perform the retroactive pause adjustment for the ones that need it
		if (newTaskSLAs.length > 0) {
			this._adjustPauseTime(newTaskSLAs);
			for (var i = 0; i < newTaskSLAs.length; i++) {
				newTaskSLA = newTaskSLAs[i];
				var taskSLAgr = newTaskSLA.taskSLA.getGlideRecord();
				var previousTaskSLAgr;
				// if currently processing asynchronously we need to call breakdown processing as this is not handled by business rule "Process SLA Breakdowns"
				var processBreakdowns = this.calledFromAsync && this.breakdownsPluginActive && sn_sla_brkdwn.SLABreakdownProcessor.hasBreakdownDefinitions(taskSLAgr.getValue("sla"));
				if (newTaskSLA.needsAdjusting && !newTaskSLA.adjusted)
					newTaskSLA.taskSLA.updateState(TaskSLA.STATE_IN_PROGRESS);
				if (processBreakdowns) {
					previousTaskSLAgr = this.slaUtil.copyTaskSLA(taskSLAgr);
					this._processSLABreakdowns(taskSLAgr, null, "insert");
				}

				// and just in case it should need to transition to Paused state immediately upon creation
				// make sure the "updateTime" is correct as it may not be if we've been doing a retroactive calculation
				newTaskSLA.taskSLA.setUpdateTime(this.taskGR.sys_updated_on);
				var conditionResults = this._pauseUnpause(newTaskSLA.taskSLA, newTaskSLA.contractSLAgr);
				if (processBreakdowns && conditionResults.stageChangedTo)
					this._processSLABreakdowns(taskSLAgr, null, "insert");
			}
		}

		return newTaskSLADefIds;
	},

	// process all of a task's active, attached task_sla records
	_processExistingSLAs: function() {
		this.lu.logInfo('_processExistingSLAs');

		// Get the current set of active Task SLAs for this record
		var taskSLAgr = this.queryTaskSLAs();
		if (!taskSLAgr.hasNext()) {
			if (this.lu.atLevel(GSLog.INFO))
				this.lu.logInfo('_processExistingSLAs: no active Task SLAs found for Task - ' + this.taskClass + ":" + this.taskSysId);
			return;
		}
		var contractSLAgr = null;
		if (GlidePluginManager.isActive("com.glide.domain"))
			contractSLAgr = this.queryContractSLAs();

		SelfCleaningMutex.enterCriticalSectionRecordInStats(this.MUTEX_UPDATE + this.taskGR.sys_id, this.MUTEX_UPDATE, this, this._processExistingSLAs_criticalSection, taskSLAgr, contractSLAgr);
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

		// if we've been called from a "sys_trigger" record because SLA processing is running asynchronously
		// then we use HistoryWalker to get the Task record at the current update number so we've got the
		// "changes" information for each field
		if (this.calledFromAsync)
			this._walkTaskForAsync();

		// Log the field values in the Task record
		if (this.lu.atLevel(GSLog.DEBUG)) {
			this.lu.logDebug('_processExistingSLAs_criticalSection:\n' + this.slalogging.getRecordContentMsg(this.taskGR));
			this.fieldValuesLogged = true;
		}

		var resetTaskSLAs = [];
		var contractSLA;
		var taskSLA;
		var conditionResults;
		var previousTaskSLAGr;

		while (taskSLAgr.next()) {
			var hasBreakdowns = this.breakdownsPluginActive && sn_sla_brkdwn.SLABreakdownProcessor.hasBreakdownDefinitions(taskSLAgr.getValue("sla"));

			// if we need to process breakdowns that create our own "previous" copy of the Task SLA record
			if (hasBreakdowns)
				previousTaskSLAGr = this.slaUtil.copyTaskSLA(taskSLAgr);

			contractSLA = this._getContractSLA(taskSLAgr, contractSLAgr);
			if (this.getTaskFromDB) {
				var slaConditionClass = this._newSLACondition(contractSLA);
				if (typeof slaConditionClass.hasAdvancedConditions !== "function" || slaConditionClass.hasAdvancedConditions()) {
					if (this.lu.atLevel(GSLog.DEBUG))
						this.lu.logDebug("_processExistingSLAs_criticalSection: getTaskFromDB is true and SLA Definition \"" + contractSLA.getDisplayValue() + "\" has advanced conditions");
					this._walkTaskToLatest();
				}
			}

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
			conditionResults = this._checkExistingSLA(taskSLA, contractSLA);
			if (this.lu.atLevel(GSLog.DEBUG))
				this.lu.logDebug("Condition results for Task SLA " + contractSLA.getDisplayValue() + " on task " + this.taskGR.number +
								":\n" + JSON.stringify(conditionResults));

			if (conditionResults.stopCancel.reset)
				resetTaskSLAs.push(taskSLAgr.getValue('sla'));
			
			// SLA Breakdown processing
			if (hasBreakdowns) {
				/* if we're running synchronously and the stage hasn't changed on the Task SLA and it's not one we've just created
				   then call breakdown processing in case a breakdown field on the Task has changed */
				if ((!this.calledFromAsync && !conditionResults.stageChangedTo && this.newSLADefIds.indexOf(taskSLAgr.getValue("sla") < 0))
					||
					(this.calledFromAsync && (this.newSLADefIds.indexOf(taskSLAgr.getValue("sla") < 0) || conditionResults.stageChangedTo)))
					this._processSLABreakdowns(taskSLA.getGlideRecord(), previousTaskSLAGr, "update");
			}

			/* if we're running asynchronously but nothing changed on the Task SLA for this update and there are no records in the 
			   async queue for this task then call SLACalculator to make sure all the values are up to date including "has_breached" */
			if (this.calledFromAsync && !conditionResults.stageChangedTo && taskSLA.getCurrentState() === TaskSLA.STATE_IN_PROGRESS &&
				!(this.slaAsyncQueue.isTaskQueued(taskSLAgr.getValue("task"), null, ["ready", "queued"])))
				SLACalculatorNG.calculateSLA(taskSLA.getGlideRecord(), false, new GlideDateTime(), taskSLA.getContractSLA());

			this.lu.setLevel(oldLogLevel);
		}

		if (resetTaskSLAs.length > 0)
			SelfCleaningMutex.enterCriticalSectionRecordInStats(this.MUTEX_NEW + this.taskGR.sys_id, this.MUTEX_NEW,
				this, this._checkNewSLAsFromReset, resetTaskSLAs);

		if (this.timers)
			sw.log('TaskSLAController._processExistingSLAs_criticalSection complete');
	},

	_getTaskSLA: function(taskSLAgr, slaDefGR) {
		return new TaskSLA(taskSLAgr, this.taskGR, null, {calledFromAsync: this.calledFromAsync}, slaDefGR);
	},

	_processSLABreakdowns: function(currentTaskSLAGr, previousTaskSLAGr, operationOverride) {
		var gru = new GlideRecordUtil();
		var fields1 = {};
		var fields2 = {};
		if (previousTaskSLAGr)
			gru.populateFromGR(fields1, previousTaskSLAGr);
		gru.populateFromGR(fields2, currentTaskSLAGr);
		
		var breakdownProcessor = new sn_sla_brkdwn.SLABreakdownProcessor(currentTaskSLAGr, previousTaskSLAGr);
		if (operationOverride)
			breakdownProcessor.setTaskSLAOperationOverride(operationOverride);
		breakdownProcessor.setTaskGr(this.taskGR);
		breakdownProcessor.setUpdateTime(this.taskGR.sys_updated_on);
		breakdownProcessor.processBreakdowns();
	},

	_checkExistingSLA: function(taskSLA, contractSLA) {
		var sw;
		if (this.timers)
			sw = new GlideStopWatch();

		if (this.lu.atLevel(GSLog.DEBUG))
			this.lu.logDebug('_checkExistingSLA: ' + taskSLA.getGlideRecord().sys_id);

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

	_pauseUnpause: function(taskSLA, contractSLA) {
		var conditionResults = {};

		var taskSLAgr = taskSLA.getGlideRecord();

		if (!contractSLA)
			contractSLA = taskSLAgr.sla;

		if (this.lu.atLevel(GSLog.DEBUG))
			this.lu.logDebug('_pauseUnpause: task = ' + this.taskGR.getValue("number") + ", sla = " + contractSLA.getDisplayValue());

		// a "relative-duration" SLA cannot pause, whatever conditions might be in the SLA Definition record
		if (contractSLA.duration_type != '')
			return conditionResults;

		var slac = this._newSLACondition(contractSLA, this.taskGR, taskSLAgr);
		conditionResults.pause = slac.pause();
		conditionResults.resume = slac.resume();
		conditionResults.conditionMatched = conditionResults.pause || conditionResults.resume;

		if (this.lu.atLevel(GSLog.DEBUG)) {
			this.lu.logDebug('_pauseUnpause: current SLA state=' + taskSLA.getCurrentState() + ', pause condition matched=' + conditionResults.pause);
			this.lu.logDebug('_pauseUnpause: current SLA state=' + taskSLA.getCurrentState() + ', resume condition matched=' + conditionResults.resume);
		}

		if (taskSLA.getCurrentState() == TaskSLA.STATE_IN_PROGRESS && conditionResults.pause && !conditionResults.resume) {
			if (this.lu.atLevel(GSLog.DEBUG))
				this.lu.logDebug('_pauseUnpause: Pausing SLA ' + taskSLAgr.getUniqueValue());
			conditionResults.stageChangedTo = TaskSLA.STATE_PAUSED;
			taskSLA.updateState(TaskSLA.STATE_PAUSED);
		}
		else if (taskSLA.getCurrentState() == TaskSLA.STATE_PAUSED && !conditionResults.pause && conditionResults.resume) {
			if (this.lu.atLevel(GSLog.DEBUG))
				this.lu.logDebug('_pauseUnpause: Resuming SLA ' + taskSLAgr.getUniqueValue());
			conditionResults.stageChangedTo = TaskSLA.STATE_IN_PROGRESS;
			taskSLA.updateState(TaskSLA.STATE_IN_PROGRESS);
		}

		return conditionResults;
	},

	_stopCancel: function(taskSLA, contractSLA) {
		var conditionResults = {
			conditionMatched: true
		};

		var taskSLAgr = taskSLA.getGlideRecord();

		if (!contractSLA)
			contractSLA = taskSLAgr.sla;

		if (this.lu.atLevel(GSLog.DEBUG))
			this.lu.logDebug('_stopCancel: task = ' + this.taskGR.getValue("number") + ", sla = " + contractSLA.getDisplayValue());
		var slac = this._newSLACondition(contractSLA, this.taskGR, taskSLAgr);

		conditionResults.complete = slac.complete();
		conditionResults.reset = slac.reattach(this.newSLADefIds);

		if (this.lu.atLevel(GSLog.DEBUG)) {
			this.lu.logDebug('_stopCancel: current SLA state=' + taskSLA.getCurrentState() + ', stop condition matched=' + conditionResults.complete);
			this.lu.logDebug('_stopCancel: current SLA state=' + taskSLA.getCurrentState() + ', reset condition matched=' + conditionResults.reset);
		}

		if (conditionResults.complete) {
			taskSLA.updateState(TaskSLA.STATE_COMPLETED);
			conditionResults.stageChangedTo = TaskSLA.STATE_COMPLETED;
			return conditionResults; // state was changed
		}

		// Re-evaluate conditions for this specific taskSLA,
		//      to allow a 'Complete and reapply' mode of operation
		if (conditionResults.reset) {
			var resetExistingSLATo = contractSLA.reset_action == this.RESET_ACTION_CANCEL ? TaskSLA.STATE_CANCELLED : TaskSLA.STATE_COMPLETED;
			taskSLA.updateState(resetExistingSLATo);
			conditionResults.stageChangedTo = resetExistingSLATo;
			taskSLA.isReset = true; //flag to detect reset in the taskSLA object
			return conditionResults; // state was changed
		} else {
			conditionResults.cancel = slac.cancel();
			if (this.lu.atLevel(GSLog.DEBUG))
				this.lu.logDebug('_stopCancel: ' + taskSLA.getCurrentState() + ', cancel condition matched=' + conditionResults.cancel);
			if (conditionResults.cancel) {
				taskSLA.updateState(TaskSLA.STATE_CANCELLED);
				conditionResults.stageChangedTo = TaskSLA.STATE_CANCELLED;
				return conditionResults; // state was changed
			}
		}

		conditionResults.conditionMatched = false;
		return conditionResults;
	},

	// method to assist overriding the SLA Condition class
	// -- returns a new SLAConditionClass object
	_newSLACondition: function(slaGR, taskGR, taskSLAgr) {
		// Use the same class, as default, during any one instance of the TaskSLAController
		if (!this._outerScope)
			this._outerScope = JSUtil.getGlobal();
		if (!this._SLADefaultConditionClass) {
			this._SLADefaultConditionClass = this._outerScope[this.SLADefaultConditionClassName];
			// check that this._SLADefaultConditionClass is defined, and looks valid as an SLA Condition Class
			if (!this._isValidSLAConditionClass(this._SLADefaultConditionClass)) {
				if (this.lu.atLevel(GSLog.WARNING))
					this.lu.logWarning('Invalid SLA Default Condition Class: ' + this.SLADefaultConditionClassName + ', using ' + this.BASE_CONDITIONCLASSNAME);
				this._SLADefaultConditionClass = this._outerScope[this.BASE_CONDITIONCLASSNAME];
				this.SLADefaultConditionClassName = this.BASE_CONDITIONCLASSNAME;
			}
		}

		var slaConditionClass = this._SLADefaultConditionClass;
		// if the SLA Definition references a specific Condition Class then use that
		// (as long as it looks valid)
		if (JSUtil.notNil(slaGR.condition_class) && slaGR.condition_class.active) {
			slaConditionClass = this._outerScope[slaGR.condition_class.class_name.name];

			if (!this._isValidSLAConditionClass(slaConditionClass)) {
				if (this.lu.atLevel(GSLog.WARNING))
					this.lu.logWarning('Invalid SLA Condition Class: ' + slaGR.condition_class.class_name.name + ', using ' + this.SLADefaultConditionClassName);
				slaConditionClass = this._SLADefaultConditionClass;
			}
		}

		var sco = new slaConditionClass(slaGR, taskGR, taskSLAgr);
		if (this.lu.atLevel(GSLog.INFO))
			this.lu.logInfo('_newSLACondition: using ' + sco.type);
		return sco;
	},

	// does klass look valid as an SLAConditionClass?
	_isValidSLAConditionClass: function(klass) {
		if (typeof klass == 'undefined')
			return false;

		var conditionMethods = ['attach', 'pause', 'complete', 'reattach', 'cancel'];
		for (var i = 0; i < conditionMethods.length; i++)
			if (typeof klass.prototype[conditionMethods[i]] == 'undefined')
			return false;
		return true;
	},

	// methods to manipulate the task's associated task_sla and contract_sla records.

	_getContractSLA: function(taskSLAgr, contractSLAgr) {
		if (!taskSLAgr || !taskSLAgr.isValidRecord())
			return null;

		/* if domains isn't active then we won't have contractSLAgr and can just use "getRefRecord"
		   to get the SLA Definition */
		if (!this.domainsPluginActive)
			return taskSLAgr.sla.getRefRecord();

		/* if we haven't got a "contractSLAgr" for some reason fall back to returning the GlideElement
		   for the SLA Definition from the "task_sla" record - then SLAConditionBase will take care of 
		   fetching the SLA Definition from the DB */
		if (!contractSLAgr || !contractSLAgr.isValid())
			return taskSLAgr.sla;

		/* Otherwise get the next record from "contractSLAgr" which should match the "sla" value in the 
		   "taskSLAgr" as they should be in synch with each other */

		// if "contractSLAgr" is already the correct record then use it
		if (taskSLAgr.getValue('sla') === contractSLAgr.getUniqueValue())
			return contractSLAgr;

		// if we don't have any more records, again fall back to the "sla" element in taskSLAgr
		if (!contractSLAgr.next())
			return taskSLAgr.sla;

		/* finally just check the 2 record sets are in synch in terms of the SLA definition and if not
		   use the "sla" GlideElement */
		if (taskSLAgr.getValue('sla') !== contractSLAgr.getUniqueValue())
			return taskSLAgr.sla;

		// If we've got to here we've got the correct SLA Definition
		return contractSLAgr;
	},

	// return comma-separated list of contract_sla sys_ids, given GlideRecord result set from taskSLAgr.query()
	// suitable for 'sys_idIN' or 'sys_idNOT IN' queries
	_getSLAsString: function(taskSLAgr) {
		var slaList = [];
		//taskSLAgr.query();
		while (taskSLAgr.next())
			slaList.push(taskSLAgr.getValue("sla"));
		var queryString = slaList.join(',');
		return queryString;
	},

	_needsAdjustPause: function(slaGR) {
		// nothing to adjust for, as the task can have no previous updates
		if (this.taskGR.operation() === 'insert')
			return;

		// relative duration SLAs, and those without pause conditions, cannot pause
		if (slaGR.duration_type != '' || !slaGR.pause_condition)
			return false;

		// (shouldn't have been called for a non retroactive pause SLA)
		if (!slaGR.retroactive || !slaGR.retroactive_pause)
			return false;

		return true;
	},

	// generate & replay task history, to adjust pause duration, pause time of retroactive-start SLAs
	// (runs from within the _processNewSLAs_criticalSection)
	_adjustPauseTime: function(slasToAdjust) {
		if (this.lu.atLevel(GSLog.INFO))
			this.lu.logInfo('_adjustPauseTime: Adjusting pause time for retroactive SLAs on ' + this.taskGR.number);
		if (!slasToAdjust || slasToAdjust.length === 0) {
			this.lu.logWarning('There are no SLAs to be adjusted');
			return;
		}

		// nothing to adjust for, as the task can have no previous updates
		if (this.taskGR.operation() === 'insert') {
			if (this.lu.atLevel(GSLog.DEBUG))
				this.lu.logDebug("_adjustPauseTime: ends - task is being inserted so there can't be any retroactive pauses");
			return;
		}

		if (this.taskGR.isNewRecord()) {
			this.lu.logWarning('Cannot adjust SLA pause time on a new task record');
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

		var hw = this.slaUtil.getHistoryWalker(this.taskGR.getRecordClassName(), this.taskGR.getValue('sys_id'),
			/*recordLevelSecurity*/ false, /*fieldLevelSecurity*/ false, /*withVariables*/ false, /*walkToFirstUpdate*/ true);
		if (!hw) {
			this.lu.logError("_adjustPauseTime: failed getting HistoryWalker to initial update");
			return;
		}

		// save a reference to the current task record before we start stepping through the updates
		var originalTaskGR = this.taskGR;

		var initialUpdateProcessed = false;
		var taskSLA;
		var taskSLAgr;
		var contractSLA;
		var walkedRecordUpdatedOnMs;
		var startTimeMs;

		var currentModCount = this.taskGR.getValue('sys_mod_count');
		do {
			this.taskGR = hw.getWalkedRecord();
			if (this.taskGR.getValue('sys_mod_count') == currentModCount)
				break;

			walkedRecordUpdatedOnMs = this.taskGR.sys_updated_on.dateNumericValue();

			if (this.lu.atLevel(GSLog.DEBUG))
				this.lu.logDebug('_adjustPauseTime: [' + this.taskGR.getValue('sys_mod_count') + '] history update time: ' + this.taskGR.getValue('sys_updated_on'));

			for (var j = 0; j < slasToAdjust.length; j++) {
				if (!slasToAdjust[j].needsAdjusting)
					continue;

				taskSLA = slasToAdjust[j].taskSLA;
				contractSLA = slasToAdjust[j].contractSLAgr;
				if (!contractSLA)
					contractSLA = taskSLA.getGlideRecord().sla;

				if (!initialUpdateProcessed) {
					slasToAdjust[j].adjusted = true;
					taskSLA.setRetroactiveAdjusting(true);
					taskSLA.updateState(TaskSLA.STATE_IN_PROGRESS);
					taskSLA.starting = false;
				}

				taskSLAgr = taskSLA.getGlideRecord();
				startTimeMs = taskSLAgr.start_time.dateNumericValue();
				if (startTimeMs <= walkedRecordUpdatedOnMs)
					taskSLA.setUpdateTime(this.taskGR.getValue('sys_updated_on'));
				else
					taskSLA.setUpdateTime(taskSLAgr.getValue('start_time'));

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
			if (!contractSLA)
				contractSLA = taskSLA.getGlideRecord().sla;

			//If current taskSLA stage is In Progress then keep the duration fields up to date with now timesamp
			if(taskSLA.getCurrentState() === TaskSLA.STATE_IN_PROGRESS)
				taskSLA.calculate(true, new GlideDateTime());

			taskSLA.starting = true;
			taskSLA.setRetroactiveAdjusting(false);
			if (this.lu.atLevel(GSLog.INFO)) {
				taskSLAgr = taskSLA.getGlideRecord();
				this.lu.logInfo('Finished adjusting pause time for retroactive SLA ' + contractSLA.name + ' on ' + this.taskGR.getDisplayValue() + ': pause_duration=' + taskSLAgr.pause_duration + ', pause_time='
				+ taskSLAgr.pause_time.getDisplayValue());
			}
			if (this.lu.atLevel(GSLog.DEBUG))
				this.lu.logDebug('taskSLA: starting=' + taskSLA.starting);
		}

		// set back to the real task
		this.taskGR = originalTaskGR;

		return;
	},

	_walkTaskToUpdate: function(updateNumber) {
		if (this.lu.atLevel(GSLog.INFO))
			this.lu.logInfo("_walkTaskToUpdate: update number: " + updateNumber);

		if (isNaN(updateNumber)) {
			if (this.lu.atLevel(GSLog.ERR))
				this.lu.logError("_walkTaskToUpdate: invalid update number requested: " + updateNumber);
			return false;
		}

		if (!this.taskHistoryWalker) {
			this.taskHistoryWalker = this.slaUtil.getHistoryWalker(this.taskGR.getRecordClassName(), this.taskGR.getValue('sys_id'),
			/*recordLevelSecurity*/ false, /*fieldLevelSecurity*/ false, /*withVariables*/ false, /*walkToFirstUpdate*/ false);
			if (!this.taskHistoryWalker) {
				if (this.lu.atLevel(GSLog.ERR))
					this.lu.logError("_walkTaskToUpdate: failed to get HistoryWalker");
				return false;
			}
		}

		if (!this.taskHistoryWalker.walkTo(parseInt(updateNumber, 10)))
			return false;

		this.taskGR = this.taskHistoryWalker.getWalkedRecord();

		if (this.lu.atLevel(GSLog.DEBUG))
			this.lu.logDebug("_walkTaskToUpdate: " + this.taskGR.sys_meta.label + " " + this.taskGR.getDisplayValue() + " walked to update number " + this.taskGR.getValue("sys_mod_count"));

		return true;
	},

	_walkTaskForAsync: function() {
		// if we've already walked the Task to the latest update no need to do it again
		if (this.asyncTaskWalked)
			return;
		
		if (this._walkTaskToUpdate(this.asyncModCount))
			this.asyncTaskWalked = true;
	},

	_walkTaskToLatest: function() {
		// if we've already walked the Task to the latest update no need to do it again
		if (this.taskWalked)
			return;
		
		if (this._walkTaskToUpdate(this.taskLatestModCount))
			this.taskWalked = true;
	},

	_getTask: function(taskType, taskSysId) {
		if (this.lu.atLevel(GSLog.INFO))
			this.lu.logInfo("_getTask: called with taskType=" + taskType + ", taskSysId=" + taskSysId);

		if (!taskType || !taskSysId) {
			if (this.lu.atLevel(GSLog.ERR))
				this.lu.logError("_getTask: either task type or sys_id where not provided");

			return null;
		}

		if (!GlideTableDescriptor.isValid(taskType)) {
			if (this.lu.atLevel(GSLog.ERR))
				this.lu.logError("_getTask: invalid task type requested \"" + taskType + "\"");

			return null;
		}

		// Try and retrieve the Task from the supplied task table
		var taskGR = new GlideRecord(taskType);
		if (taskGR.get(taskSysId))
			return taskGR;

		// If we didn't find it log a warning...
		if (this.lu.atLevel(GSLog.WARNING))
			this.lu.logWarning("_getTask: failed to retrieve record from table \"" + taskType + " with sys_id \"" + taskSysId + "\"");

		/* ... and then see if a Task with this sys_id exists as it may exist but in a different task extension
			because "sys_class_name" has changed */
		taskGR = new GlideRecord("task");
		if (!taskGR.get(taskSysId)) {
			this.lu.logError("_getTask: Task record with sys_id " + taskSysId + " does not exist");
			return null;
		}
		
		// If we've managed to find a Task then we expect it to have a different Task Type so fetch the record from that table 
		var taskTypeInDB = taskGR.getValue("sys_class_name");
		if (this.lu.atLevel(GSLog.WARNING))
			this.lu.logWarning("_getTask: expected Task type is \"" + taskType + "\" but actual is \"" + taskTypeInDB +
								".  Task will be fetched from \"" + taskTypeInDB + "\"");

		taskGR = new GlideRecord(taskTypeInDB);
		if (taskGR.get(taskSysId))
			return taskGR;
		else {
			if (this.lu.atLevel(GSLog.ERR))
				this.lu.logError("_getTask: failed to retrieve record from table \"" + taskTypeInDB + " with sys_id \"" + taskSysId + "\"");

			return null;
		}
	},

	type: 'TaskSLAController'
};
```