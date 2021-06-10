---
title: "SLARepair"
id: "slarepair"
---

API Name: global.SLARepair

```js
/**
 * Repairs SLAs
 * 
 * Repair - Erase all in-flight SLA data (for the given filter) and create SLA records from scratch based on task history and SLA
 * definitions
 * 
 */
var SLARepair = Class.create();

SLARepair.RECREATE = "recreate";
SLARepair.SLA = "task_sla";
SLARepair.SLA_DEF = "contract_sla";
SLARepair.TASK = "task";
SLARepair.ENABLED_PROPERTY = "com.snc.sla.repair.enabled";
SLARepair.LOG_PROPERTY = "com.snc.sla.repair.log";
SLARepair.AUDIT_PROPERTY = "com.snc.sla.repair.audit";
SLARepair.PREVIEW_PROPERTY = "com.snc.sla.repair.preview";
SLARepair.EVENT_REPAIR_COMPLETE = "sla.repair_complete";
SLARepair.SLA_DATABASE_LOG = "com.snc.sla.log.destination";

SLARepair.COUNT = "count";
SLARepair.AUDIT_ON = "audit_on";
SLARepair.UNAUDITED_FIELDS = "unaudited_fields";
SLARepair.IGNORE_UNAUDITED = {
    "sys_tags": true
};

SLARepair.prototype = {
    initialize: function() {
        this.repairAction = null;
        this.sourceTable = null;
        this.baseTable = null;
        this.encodedQuery = "";
        this.functionName = "";
        this.auditingEnabled = (gs.getProperty(SLARepair.AUDIT_PROPERTY, 'true') != 'false');
        this.validateOnly = false;
        this.runWorkflow = true;
        this.runFlow = true;
		this.slaUtil = new SLAUtil();
		this.breakdownsPluginActive = pm.isActive("com.snc.sla.breakdowns");

        this.filterTerms = [];
        this.taskIds = [];
		this.slaDefTables = this._getSlaDefTables();

        this.lu = new GSLog(SLARepair.LOG_PROPERTY, "SLARepair");
        if (gs.getProperty(SLARepair.SLA_DATABASE_LOG, "db") == "node")
            this.lu.disableDatabaseLogs();

        this.slaAudit = null; //Object to create Audit entries
        this.response = new SLARepair.Response();

        this.recordsFound = 0;
        this.processedRecords = 0;
		this.currentUser = gs.getUserID();
    },

    /**
     * Enables/disables auditing for this SLARepair
     * 
     * @param onOrOff - Boolean
     * 
     * @returns 'this' to allow chaining
     */
    setAuditEnabled: function(onOrOff) {
        this.auditingEnabled = JSUtil.toBoolean(onOrOff);
        return this;
    },

    /**
     * Sets the SLARepair to only validate an action, not perform the action. Once this is set you can call any of the repair
     * methods to check if the request will be actioned. When set true only validity information will be returned from any of
     * these methods.
     * 
     * @param onOrOff - Boolean
     * 
     * @returns 'this' to allow chaining
     */
    setValidateOnly: function(onOrOff) {
        this.validateOnly = JSUtil.toBoolean(onOrOff);
        return this;
    },

	/**
      * Sets SLARepair to run/not run workflow when repairing SLAs.
      *
      * @param onOrOff - Boolean
      */
	setRunWorkflow: function(runWorkflow) {
		this.runWorkflow = runWorkflow;
	},

    /**
      * Sets SLARepair to run/not run Flow when repairing SLAs.
      *
      * @param onOrOff - Boolean
      */
	setRunFlow: function(runFlow) {
		this.runFlow = runFlow;
	},

    /**
     * Repairs SLA records from scratch based on sys id and tables name removing current data and creating new task_sla records.
     * 
     * @param sysId - String sys id
     * @param sourceTable - String table name (task or extension of task, contract_sla, task_sla)
     * @param currentUser - String sys_id of the user to use for audit records (Optional)
     * 
     * @returns an SLARepair.Response object (see EOF)
     */
    repairBySysId: function(sysId, sourceTable, currentUser) {
        if (currentUser)
			this.currentUser = currentUser;

        this.repairAction = SLARepair.RECREATE;
        this._bySysId(sysId, sourceTable);
        return this.response;
    },

    /**
     * Repairs SLA records from scratch based on a filter and table name removing current data and creating new task_sla records.
     * 
     * @param filter - String encoded query
     * @param sourceTable - String table name (task or extension of task, contract_sla, task_sla)
     * @param currentUser - String sys_id of the user to use for audit records (Optional)
     * 
     * @returns an SLARepair.Response object (see EOF)
     */
    repairByFilter: function(filter, sourceTable, currentUser) {
        if (currentUser)
			this.currentUser = currentUser;

        this.repairAction = SLARepair.RECREATE;
        this._byFilter(filter, sourceTable);
        return this.response;
    },

    /**
     * Repairs SLA records from scratch based on the provided GlideRecord removing current data and creating new task_sla records.
     * 
     * @param params gr - GlideRecord (task or extension of task, contract_sla, task_sla)
     * 
     * @returns an SLARepair.Response object (see EOF)
     */
    repairByGlideRecord: function(gr) {
        this.repairAction = SLARepair.RECREATE;
        this._byGlideRecord(gr);
        return this.response;
    },

	 /**
     * Repairs SLA records from scratch based on the provided Offline Update records 
     * 
     * @param params sysIds - Array or comma-separated String of sys_id's of the records in the Offline Update [sla_offline_update] table
     * 
     * @returns an SLARepair.Response object (see EOF)
     */
	repairByOfflineUpdate: function(sysIds) {
		this.repairAction = SLARepair.RECREATE;
		var documentObj = {};
		var tableName;

		var gr = new GlideRecord(SLAOfflineUpdateSNC.SLA_OFFLINE_UPDATE);

		if (!JSUtil.nil(sysIds))
			gr.addQuery('sys_id', 'IN', sysIds);

		gr.addQuery('state', 'ready');

		gr.query();
		while (gr.next()) {
			tableName = gr.getValue('document_table');
			if (!documentObj.hasOwnProperty(tableName))
				documentObj[tableName] = [];
			documentObj[tableName].push(gr.getValue('document_id'));
		}
		this._byDocumentId(documentObj);
		return this.response;
	},

	_byDocumentId: function(documentObj) {
		this.functionName = this._getFunctionName("ByDocumentId");
		if (JSUtil.typeOf(documentObj) !== 'object') {
			this._addErrorMessage('{0}: No valid document object supplied', this.functionName);
			this._logErrors();
			return;
		}

		this._preRepairForDocumentId(documentObj);
		this._trackAndRepair(this._repairFromDocumentId, documentObj);
	},

	_bySysId: function(sysId, sourceTable) {
        this.functionName = this._getFunctionName("BySysId");
        if (!sysId) {
            this._addErrorMessage("{0}: No sysId value supplied", this.functionName);
            this._logErrors();
            return;
        }

        var sysIdType = JSUtil.typeOf(sysId);
        if (sysIdType != "string" && sysIdType != "array") {
            this._addErrorMessage("{0}: Invalid sysId value supplied - '{1}'", [ this.functionName, JSUtil.typeOf(sysId) ]);
            this._logErrors();
            return;
        }

        this._byFilter("sys_idIN" + sysId, sourceTable);
    },

    _byGlideRecord: function(gr) {
        this.functionName = this._getFunctionName("ByGlideRecord");
        if (!gr || !(gr instanceof GlideRecord)) {
            this._addErrorMessage("{0}: Invalid GlideRecord value supplied - '{1}'", [ this.functionName, JSUtil.typeOf(gr) ]);
            return;
        }

        var sysIds = [];
        var gr2 = new GlideRecord(gr.getRecordClassName());
        gr2.addEncodedQuery(gr.getEncodedQuery());
        gr2.query();
        while (gr2.next())
            sysIds.push(gr2.getUniqueValue());

        this._byFilter("sys_idIN" + sysIds, gr.getRecordClassName());
    },

    _byFilter: function(filter, sourceTable) {
        this.sourceTable = sourceTable;
        this.encodedQuery = filter;
        this.filterTerms.length = 0;

        if (!this._isValidSource())
            return;

        this.functionName = this._getFunctionName("ByFilter");

        if (JSUtil.typeOf(filter) != "string") {
            this._addErrorMessage("{0}: Invalid filter supplied - '{1}'", [ this.functionName, JSUtil.typeOf(filter) ]);
            this._logErrors();
            return;
        }

		var repairFrom;

		// apply appropriate filter to task_sla record based on the filter we've been passed
        // and the source table
        switch (this.baseTable) {
            case SLARepair.TASK:
                this.taskIds.length = 0;
                var taskGr = new GlideRecord(this.sourceTable);
                taskGr.addEncodedQuery(filter);
				taskGr.addQuery("sys_class_name", "IN", this.slaDefTables);
                taskGr.query();
				
                while (taskGr.next())
                    this.taskIds.push(taskGr.getValue("sys_id"));

                if (this.taskIds.length == 0) {
                    this._addErrorMessage("{0}: No matching Tasks found", this.functionName);
                    return;
                }

                this.filterTerms.push({
                    type: "field",
                    fieldName: "task",
                    fieldData: this.taskIds
                });

				repairFrom = this._repairFromTask;
                break;

			case SLARepair.SLA:
                this.filterTerms.push({
                    type: "encodedQuery",
                    queryString: filter
                });
				repairFrom = this._repairFromTaskSLA;
                break;

			case SLARepair.SLA_DEF:
                var slaDefIds = [];
                var slaDefGr = new GlideRecord(this.sourceTable);
                slaDefGr.addEncodedQuery(filter);
                slaDefGr.query();
                while (slaDefGr.next())
                    slaDefIds.push(slaDefGr.getValue("sys_id"));
                if (slaDefIds.length == 0) {
                    this._addErrorMessage("{0}: No matching SLA Definitions found", this.functionName);
                    return;
                }
                this.filterTerms.push({
                    type: "field",
                    fieldName: "sla",
                    fieldData: slaDefIds
                });
				repairFrom = this._repairFromSLADef;
                break;
        }

        this._preRepair();
		this._trackAndRepair(repairFrom, null);
    },

	_trackAndRepair: function(repairFromFunction, param) {
		if (this.validateOnly)
            return;
		this.tracker = SNC.GlideExecutionTracker.getLastRunning();
		this.slaAudit = new SLARepairLog(this.repairAction, this.currentUser, gs.nowNoTZ());
		this.slaAudit.setTrackerId(this.tracker.getSysID());
		this.slaAudit.startLog();
		this.response.audit_record_id = this.slaAudit.getLogSysId();

		try {
			// Set the execution trcker's source to our log header and kick it off
			this.tracker.setSourceTable(SLARepairLog.LOG_TABLE);
			this.tracker.setSource(this.slaAudit.getLogSysId());
			this.tracker.run();
			if (JSUtil.typeOf(repairFromFunction) === "function")
				repairFromFunction.call(this, param);
		} finally {
			this.tracker.updateDetailMessage(gs.getMessage("The repair is complete"));
			this.tracker.success(gs.getMessage("The repair is complete"));
			this.slaAudit.finishLog();
		}
	},

    _repairFromTask: function() {
        if (this.taskIds.length == 0) {
            this._addInfoMessage("{0}: 0 Task records found to repair Task SLAs for", this.functionName);
            this.lu.logNotice("0 Task records found to repair Task SLAs for");
            return;
        }

        this.tracker.setMaxProgressValue(this.taskIds.length);

        var taskGr = new GlideRecord(this.sourceTable);
        for (var i = 0; i < this.taskIds.length; i++) {
            if (taskGr.get(this.taskIds[i])) {
                this._repairTaskSLAs(taskGr);
                this.tracker.updateDetailMessage(gs.getMessage("Processing {0}", taskGr.number));
            }

            this.tracker.incrementProgressValue();
        }
    },

    _repairFromSLADef: function() {
        if (this.taskTables.length == 0) {
            this._addInfoMessage("{0}: 0 Task records found to repair Task SLAs for", this.functionName);
            this.lu.logNotice("0 Task records found to repair Task SLAs for");
            return;
        }

        var total = 0;
		var taskGr;
        for (var i = 0; i < this.taskTables.length; i++) {
            taskGr = new GlideRecord(this.taskTables[i]);
            taskGr.query();
            total += taskGr.getRowCount();
        }

        this.tracker.setMaxProgressValue(total);

        for (var j = 0; j < this.taskTables.length; j++) {
            taskGr = new GlideRecord(this.taskTables[j]);
            taskGr.query();

            while (taskGr.next()) {
                this._repairTaskSLAs(taskGr, this.slaDefs);
                this.tracker.updateDetailMessage(gs.getMessage("Processing {0}", taskGr.number));
                this.tracker.incrementProgressValue();
            }
        }
    },

    _repairFromTaskSLA: function() {
        // if we've found 0 records to process and our base table is not "task"
        // report it and finish
        if (this.response.count == 0) {
            this._addInfoMessage("{0}: 0 records found to repair", this.functionName);
            this.lu.logNotice("0 Task SLA records found to process");
            return;
        }
        var taskSlaGr = new GlideAggregate(SLARepair.SLA);
        this._addFilterTerms(taskSlaGr);
        taskSlaGr.addQuery("task.sys_class_name", "!=", "");
        taskSlaGr.groupBy("task");
        taskSlaGr.groupBy("sla");
        taskSlaGr.query();
        if (!taskSlaGr.next()) {
            this._addInfoMessage("{0}: 0 records found to repair", this.functionName);
            this.lu.logNotice("0 Task SLA records found to process");
            return;
        }

        this.tracker.setMaxProgressValue(taskSlaGr.getRowCount());

        var slaDefIds = [];
        var currentTaskGr = taskSlaGr.task.getRefRecord();
        if (this.baseTable != SLARepair.TASK)
            slaDefIds.push(taskSlaGr.getValue("sla"));
        do {
            this.tracker.incrementProgressValue();

            if (taskSlaGr.getValue("task") != currentTaskGr.getUniqueValue() || !taskSlaGr.hasNext()) {
                if (!currentTaskGr.isValidRecord()) {
                    if (this.lu.atLevel(GSLog.ERR))
						this.lu.logError("Task does not exist: " + currentTaskGr.getUniqueValue());
                    continue;
                }

				// if we don't have any more records and the current task hasn't changed add the current sla definition in for processing
				if (taskSlaGr.getValue("task") == currentTaskGr.getUniqueValue() && !taskSlaGr.hasNext())
					slaDefIds.push(taskSlaGr.getValue("sla"));

                this.tracker.updateDetailMessage(gs.getMessage("Processing SLA for {0}", currentTaskGr.number));
                this._repairTaskSLAs(currentTaskGr, slaDefIds);

				// if we don't have any more records and current task has changed we need to call repair for this last one
				if (taskSlaGr.getValue("task") != currentTaskGr.getUniqueValue() && !taskSlaGr.hasNext()) {
					slaDefIds.push(taskSlaGr.getValue("sla"));
					currentTaskGr = taskSlaGr.task.getRefRecord();
					this.tracker.updateDetailMessage(gs.getMessage("Processing SLA for {0}", currentTaskGr.number));
					this._repairTaskSLAs(currentTaskGr, slaDefIds);
				} else {
					currentTaskGr = taskSlaGr.task.getRefRecord();
					slaDefIds = [taskSlaGr.getValue("sla")];
				}
            } else
				slaDefIds.push(taskSlaGr.getValue("sla"));
        } while (taskSlaGr.next());

        if (this.lu.atLevel(GSLog.NOTICE))
			this.lu.logNotice("Repair task_sla count = " + taskSlaGr.getRowCount());
    },

	_repairFromDocumentId: function(tasks) {
		if (this.response.count === 0) {
			this._addInfoMessage("_repairFromDocumentId: 0 Task records found to repair Task SLAs for");
			this.lu.logNotice('0 Task records found to repair Task SLAs for');
			return;
		}

		this.tracker.setMaxProgressValue(this.response.count);

		var sysIds;
		var tableNameArray = Object.keys(tasks);
		var tableName;

		for (var i = 0; i < tableNameArray.length; i++) {
			tableName = tableNameArray[i];
			var taskGr = new GlideRecord(tableName);
			sysIds = tasks[tableName];
			for (var j = 0; j < sysIds.length; j++) {
				if (taskGr.get(sysIds[j])) {
					this._repairTaskSLAs(taskGr);
					this.tracker.updateDetailMessage(gs.getMessage("Processing {0}", taskGr.number));
				}
				this.tracker.incrementProgressValue();
			}
		}
	},

	_preRepair: function() {
        if (this.repairAction == SLARepair.RECREATE && this.baseTable == SLARepair.TASK)
            this._preRepairForTask();
        else if (this.repairAction == SLARepair.RECREATE && this.baseTable == SLARepair.SLA_DEF)
            this._preRepairForSLADef();
        else
            this._preRepairForTaskSLA();
    },

    _preRepairForTask: function() {
        var taskAg = new GlideAggregate(this.sourceTable);
        if (!JSUtil.nil(this.encodedQuery))
            taskAg.addEncodedQuery(this.encodedQuery);
		taskAg.addQuery("sys_class_name", "IN", this.slaDefTables);
        taskAg.addAggregate("COUNT", "sys_id");
        taskAg.groupBy("sys_class_name");
        taskAg.query();

        this.response.count = 0;

        while (taskAg.next()) {
            var tableName = taskAg.sys_class_name + "";

            var tableInfo = {
                table: tableName,
                label: GlideMetaData.getTableLabel(tableName)
            };

            if (this._isTableAudited(tableName)) {
                tableInfo[SLARepair.AUDIT_ON] = true;
                var unauditedFields = this._getNoAuditFields(tableName);
                if (unauditedFields.length > 0)
                    tableInfo[SLARepair.UNAUDITED_FIELDS] = unauditedFields;

                this.response.count += taskAg.getAggregate("COUNT", "sys_id") - 0;
            }

            this.response.audit_info[tableName] = tableInfo;
        }
    },

    _preRepairForSLADef: function() {
        var slaDefGr = new GlideRecord(this.sourceTable);
        if (!JSUtil.nil(this.encodedQuery))
            slaDefGr.addEncodedQuery(this.encodedQuery);
        slaDefGr.addQuery("active", true);
        slaDefGr.query();

        var slaCnt = {};

        // Populate a unique list of tables with all the definitions for each table
        while (slaDefGr.next()) {
            if (JSUtil.nil(slaDefGr.collection))
                continue;

            var collection = slaDefGr.collection + "";
            if (!slaCnt[collection]) {
                slaCnt[collection] = {
                    count: 0,
                    definitionIds: []
                };
            }

            slaCnt[collection].count++;
            slaCnt[collection].definitionIds.push(slaDefGr.getUniqueValue());
        }

        this.taskTables = [];
        this.slaDefs = [];
        var slaTot = 0;
        for ( var tableName in slaCnt) {
            var tableInfo = {
                table: tableName,
                label: GlideMetaData.getTableLabel(tableName)
            };

            if (this._isTableAudited(tableName)) {
                tableInfo[SLARepair.AUDIT_ON] = true;
                var unauditedFields = this._getNoAuditFields(tableName);
                if (unauditedFields.length > 0)
                    tableInfo[SLARepair.UNAUDITED_FIELDS] = unauditedFields;

                slaTot = slaTot + slaCnt[tableName].count;

                this.taskTables.push(tableName);
                this.slaDefs = this.slaDefs.concat(slaCnt[tableName].definitionIds);
            }

            this.response.audit_info[tableName] = tableInfo;
        }

        var taskAg = new GlideAggregate(SLARepair.TASK);
        taskAg.addQuery("sys_class_name", this.taskTables);
        taskAg.addAggregate("COUNT", "sys_id");
        taskAg.query();

        this.response.count = taskAg.getTotal("COUNT", "sys_id") * slaTot;
    },

    _preRepairForTaskSLA: function() {
        var taskSlaGr = new GlideAggregate(SLARepair.SLA);
        this._addFilterTerms(taskSlaGr);
        taskSlaGr.addAggregate("COUNT", "task.sys_class_name");
        taskSlaGr.addQuery("task.sys_class_name", "!=", "");
        taskSlaGr.groupBy("task.sys_class_name");
        taskSlaGr.query();

        while (taskSlaGr.next()) {
            var tableName = taskSlaGr.getValue("task.sys_class_name");
            var tableInfo = {
                table: tableName,
                label: GlideMetaData.getTableLabel(tableName)
            };

            if (this._isTableAudited(tableName)) {
                tableInfo[SLARepair.AUDIT_ON] = true;
                var unauditedFields = this._getNoAuditFields(tableName);
                if (unauditedFields.length > 0)
                    tableInfo[SLARepair.UNAUDITED_FIELDS] = unauditedFields;

                this.response.count += taskSlaGr.getAggregate("COUNT", "task.sys_class_name") - 0;
            }

            this.response.audit_info[tableName] = tableInfo;
        }
    },

	_preRepairForDocumentId: function(documentObj) {
		var taskAg;
		var sysIds;
		var count = 0;
		var i;
		var tableName;
		var tableNameArray = Object.keys(documentObj);

		for (i = 0; i < tableNameArray.length; i++) {
			tableName = tableNameArray[i];
			this.sourceTable = tableName;
			if (!this._isValidSource())
				return;

			sysIds = documentObj[tableName];
			if (!Array.isArray(sysIds)) {
				this._addErrorMessage("SLARepair: Invalid document object supplied - Expecting an object of arrays but received a '{0}'", JSUtil.typeOf(sysIds));
				this._logErrors();
				return;
			}

			taskAg = new GlideAggregate(tableName);
			taskAg.addAggregate('COUNT');
			taskAg.addQuery('sys_id', sysIds);
			taskAg.query();
			while (taskAg.next()) {
				count += taskAg.getAggregate('COUNT') - 0;
			}
		}

		if (count === 0) {
			this._addErrorMessage("SLARepair: No matching Tasks found to repair, make sure SLA Definition exists");
			this._logErrors();
			return;
		}

		this.response.count = count;

		for (i =0; i < tableNameArray.length; i++) {
			tableName = tableNameArray[i];
			var tableInfo = {
				table: tableName,
				label: GlideMetaData.getTableLabel(tableName)
			};
			if (this._isTableAudited(tableName)) {
				tableInfo[SLARepair.AUDIT_ON] = true;
				var unauditedFields = this._getNoAuditFields(tableName);
				if (unauditedFields.length > 0)
					tableInfo[SLARepair.UNAUDITED_FIELDS] = unauditedFields;
			}
			this.response.audit_info[tableName] = tableInfo;
		}
	},

	// -------------------------------- Validation functions --------------------------------
    _isValidSource: function() {
        this._clearMessages();
        if (!this.sourceTable)
            this._addErrorMessage("SLARepair: No source table provided");
        else {
            this.baseTable = "" + GlideDBObjectManager.getAbsoluteBase(this.sourceTable);
            if (this.baseTable != SLARepair.TASK && this.baseTable != SLARepair.SLA && this.baseTable != SLARepair.SLA_DEF) {
                this.baseTable = null;
                this._addErrorMessage("SLARepair: Invalid source table: {0}", this.sourceTable);
            }
        }
        if (!this.repairAction)
            this._addErrorMessage("SLARepair: No action provided - it must be \"repair\"");
        else if (this.repairAction != "recreate")
            this._addErrorMessage("SLARepair: Invalid action: {0} - it must be \"repair\"", this.repairAction);

        if (this.response.err_msg.length > 0) {
            this._logErrors();
            return false;
        }
        return true;
    },

    // -------------------------------- Logging functions --------------------------------
    _logErrors: function() {
		if (this.lu.atLevel(GSLog.ERR))
			for (var i = 0; i < this.response.err_msg.length; i++)
				this.lu.logError(this.response.err_msg[i]);
    },

    _addInfoMessage: function(infoMsg, params) {
        if (!infoMsg)
            return;
        this.response.info_msg.push(gs.getMessage(infoMsg, params));
		if (this.slaAudit)
			this.slaAudit.logInfoMessage(infoMsg);
    },

    _addErrorMessage: function(errorMsg, params) {
        if (!errorMsg)
            return;
        this.response.err_msg.push(gs.getMessage(errorMsg, params));
		if (this.slaAudit)
			this.slaAudit.logErrorMessage(errorMsg);
    },

    _clearMessages: function() {
        this.response.info_msg.length = 0;
        this.response.err_msg.length = 0;
    },

    _getFunctionName: function(callingFunction) {
        var functionName = "SLARepair." + this.repairAction;
        if (callingFunction)
            functionName += callingFunction;
        return functionName;
    },

    // -------------------------------- Logging functions --------------------------------
    // -------------------------------- Repair functions --------------------------------
    _addFilterTerms: function(taskSlaGr) {
        if (!taskSlaGr || !((taskSlaGr instanceof GlideRecord) || (taskSlaGr instanceof GlideAggregate)))
            return;
        for (var i = 0; i < this.filterTerms.length; i++) {
            var filterTerm = this.filterTerms[i];
            if (filterTerm.type == "encodedQuery" && filterTerm.queryString)
                taskSlaGr.addEncodedQuery(filterTerm.queryString);
            else if (filterTerm.type == "field") {
                if (taskSlaGr.isValidField(filterTerm.fieldName) && filterTerm.fieldData)
                    taskSlaGr.addQuery(filterTerm.fieldName, filterTerm.fieldData);
            }
        }
    },

    _repairTaskSLAs: function(taskGr, slaDefIds) {
        if (!taskGr || !taskGr.sys_id)
            return;

		/* if the Task we're about to repair Task SLAs for has records in the "sla_async_queue" then it cannot be repaired so log a warning message */
		if (new SLAAsyncQueue().isTaskQueued(taskGr.getUniqueValue())) {
			 this.slaAudit.logWarningMessage("Task SLAs for " + taskGr.getClassDisplayValue() + " " + taskGr.getDisplayValue() +
											 " cannot be repaired as there are unprocessed records in the SLA Async Queue for this task");
			return;
		}

		var slaOfflineUpdate = new SLAOfflineUpdate(taskGr);
		var isOfflineUpdate = slaOfflineUpdate.hasQueuedOfflineUpdate();
		if (isOfflineUpdate) {
			slaOfflineUpdate.setProcessing();
			this.slaAudit.setOfflineUpdate(true);
		} else
			this.slaAudit.setOfflineUpdate(this._isOfflineFieldInHistory(taskGr));

		// Create a HistoryWalker instance and walk the Task record to it's created values i.e. update 0
        var hw = this.slaUtil.getHistoryWalker(taskGr.getRecordClassName(), taskGr.getValue('sys_id'),
			/*recordLevelSecurity*/ false, /*fieldLevelSecurity*/ false, /*withVariables*/ true, /*walkToFirstUpdate*/ true);

		if (!hw) {
			this.lu.logError("_repairTaskSLAs: failed getting HistoryWalker to initial update");
			return;
		}

        var walkedTaskGr = hw.getWalkedRecord();

        var controller = new RepairTaskSLAController(walkedTaskGr);
        if (slaDefIds)
            controller.restrictSLADefinitions(slaDefIds);

        var beforeCounter = {};
        var auditTaskSlaGr = new GlideRecord(SLARepair.SLA);
        auditTaskSlaGr.addQuery("task", taskGr.sys_id);
        if (slaDefIds)
            auditTaskSlaGr.addQuery("sla", slaDefIds);
        auditTaskSlaGr.query();
		var slaDefId = '';
        while (auditTaskSlaGr.next()) {
            if (this.auditingEnabled)
                this.slaAudit.createBeforeEntry(auditTaskSlaGr);

            // Keep a counter of the how many SLAs (per Definition) we had before repairing
            slaDefId = auditTaskSlaGr.sla + "";
            if (!beforeCounter[slaDefId])
                beforeCounter[slaDefId] = 0;

            beforeCounter[slaDefId]++;
        }

        this._deleteExistingSLAs(taskGr, slaDefIds);

		do {
			walkedTaskGr = hw.getWalkedRecord();

			/* Check if the domain has changed on the Task
			   If it has we need to mimic what business rule "Domain - Cascade Domain - Task" does
			   and update the Task SLAs and associated workflow records to the new domain 
			   before performing SLA processing for this update to the Task */
			if (walkedTaskGr.sys_domain.changes() && hw.getUpdateNumber() > 0)
				this._updateDomainOnTaskSLAs(walkedTaskGr);

			controller.setTaskGR(walkedTaskGr);
			controller.runNow();
		} while (hw.walkForward());

		var taskSlaGr = new GlideRecord("task_sla");
        taskSlaGr.addQuery("task", taskGr.sys_id);
        if (slaDefIds)
            taskSlaGr.addQuery("sla", slaDefIds);
        taskSlaGr.query();

        while (taskSlaGr.next()) {
            /**
             * Work out how many SLAs have been created and updated.
             * 
             * If beforeCounter doesn't have an property for the current Definition we create.
             * 
             * If beforeCounter has a property for the current Definition we update. When we get to zero we remove so any
             * subsequent checks will create.
             * 
             * Deletes are calculated by what we have left after removing all the updates.
             * 
             */
            slaDefId = taskSlaGr.sla + "";
            if (!beforeCounter[slaDefId]) {
                this.slaAudit.incrementCreated();
            } else {
                if (beforeCounter[slaDefId] > 0) {
                    this.slaAudit.incrementUpdated();
                    beforeCounter[slaDefId]--;

                    if (beforeCounter[slaDefId] == 0)
                        delete beforeCounter[slaDefId];
                }
            }

			var taskSLA = new RepairTaskSLA(taskSlaGr);
			var slaDefGr = taskSLA.getContractSLA();

			if (!taskSlaGr.active) {
				if (this.runWorkflow && slaDefGr.flow.nil())
					taskSLA.doWorkflow();
				else if (this.runFlow)
					taskSLA.doFlow();
                if (this.auditingEnabled)
                    this.slaAudit.createAfterEntry(taskSlaGr);
                continue;
            }

			var slaRecalculated = false;
			if (this.runWorkflow && slaDefGr.flow.nil()) {
				taskSLA.calculate();
				slaRecalculated = true;
				taskSLA.doWorkflow();
			} else if (this.runFlow) {
				taskSLA.calculate();
				slaRecalculated = true;
				taskSLA.doFlow();
			}

            if (taskSlaGr.getValue("stage") == "in_progress") {
                if (!slaRecalculated) //calculate if it's not been done already for processing the flow or workflow
					taskSLA.calculate();
				taskSLA._commit();

                if (this.auditingEnabled)
                    this.slaAudit.createAfterEntry(taskSLA._getTaskSLA());

                if (!taskSLA.breachedFlag)
                    taskSLA._insertBreachTrigger();
            } else {
                if (this.auditingEnabled)
                    this.slaAudit.createAfterEntry(taskSlaGr);
            }

        }

		if (isOfflineUpdate)
			slaOfflineUpdate.remove();
        // Increment the number of deleted Task SLAs
        for (var slaDefinitionId in beforeCounter)
            if (beforeCounter[slaDefinitionId] != 0)
                this.slaAudit.incrementDeleted(beforeCounter[slaDefinitionId]);
    },

	_isOfflineFieldInHistory: function(taskGr) {
		var offlineFieldName = SLAOfflineUpdateSNC.getOfflineFieldName(taskGr.getRecordClassName());
		if (JSUtil.nil(offlineFieldName))
			return false;

		var ghs = new GlideHistorySet(taskGr);
		var hsSysId = ghs.generate();
		var historyLineGr = new GlideRecord('sys_history_line');
		historyLineGr.addQuery('set', hsSysId);
		historyLineGr.addQuery('field', offlineFieldName);
		historyLineGr.query();
		return historyLineGr.hasNext();
	},

	_isTableAudited: function(tableName) {
        if (!tableName)
            return false;
        var gr = new GlideRecord(tableName);
        if (!gr.isValid())
            return false;

        return new GlideAuditor(tableName, null).auditTable();
    },

    _getNoAuditFields: function(tableName) {
        var noAuditFields = [];
        var gr = new GlideRecord(tableName);
        if (!gr.isValid())
            return noAuditFields;
        var elements = gr.getElements();

        for (var i = 0; i < elements.size(); i++) {
            var element = elements.get(i);
            if (element.hasAttribute("no_audit")) {
                var fieldName = element.getName();
                if (!SLARepair.IGNORE_UNAUDITED[fieldName])
                    noAuditFields.push(elements.get(i).getName());
            }
        }
        return noAuditFields;
    },
	
	_getSlaDefTables: function() {
		var slaDefGr = new GlideAggregate(SLARepair.SLA_DEF);
		slaDefGr.addActiveQuery();
		slaDefGr.groupBy("collection");
		slaDefGr.query();
		
		var slaDefTables = [];
		while(slaDefGr.next())
			slaDefTables.push(slaDefGr.getValue("collection"));
		
		return slaDefTables;
	},

	_deleteExistingSLAs: function(taskGr, slaDefIds) {
        if (!taskGr || !taskGr.sys_id)
            return false;
        var taskSlaGr = new GlideRecord('task_sla');
        taskSlaGr.addQuery('task', taskGr.sys_id);
        if (slaDefIds)
            taskSlaGr.addQuery('sla', slaDefIds);
        taskSlaGr.query();

        var taskSlaIds = [];
        while (taskSlaGr.next()) {
            taskSlaIds.push(taskSlaGr.sys_id);
            this.workflow.cancel(taskSlaGr);
            taskSlaGr.deleteRecord();
        }
        if (taskSlaIds.length == 0)
            return null;

        var triggerGr = new GlideRecord('sys_trigger');
        triggerGr.addQuery('document', 'task_sla');
        triggerGr.addQuery('document_key', taskSlaIds);
        triggerGr.addQuery('name', 'STARTSWITH', 'SLA breach timer');
        triggerGr.deleteMultiple();
    },
	
	_updateDomainOnTaskSLAs: function(taskGr) {
		if (!taskGr.getUniqueValue() || !taskGr.isValidField('sys_domain'))
			return;
		
		var taskSlaGr = new GlideRecord('task_sla');
		taskSlaGr.setWorkflow(false);
		taskSlaGr.addQuery("task", taskGr.getUniqueValue());
		taskSlaGr.query();
		
		var isSlaDomained = taskSlaGr.isValidField("sys_domain");
		
		while (taskSlaGr.next()) {
			if (isSlaDomained) {
				taskSlaGr.sys_domain = taskGr.sys_domain;
				taskSlaGr.update();
			}
			
			// Update any Workflow context associated with this Task SLA
			var wfc = new GlideRecord('wf_context');
			wfc.addQuery('id', taskSlaGr.sys_id);
			wfc.query();
			while (wfc.next()) {
				wfc.sys_domain = taskGr.sys_domain;
				wfc.update();

				// ...and also the wf_executing and wf_history records on the wf_context
				var wfe =  new GlideMultipleUpdate('wf_executing');
				wfe.addQuery('context', wfc.sys_id);
				wfe.setValue('sys_domain', taskGr.sys_domain);
				wfe.execute();

				var wfh =  new GlideMultipleUpdate('wf_history');
				wfh.addQuery('context', wfc.sys_id);
				wfh.setValue('sys_domain', taskGr.sys_domain);
				wfh.execute();
			}
		}
	},

    type: "SLARepair",
};

/**
 * Response object for an SLARepair request
 * 
 * <pre>
 * structure
 * {
 *      count: Integer - number of affected records
 *      err_msg: String Array - Localised error messages
 *      info_msg: String Array - Localised info messages
 *      warn_msg: String Array - Localised warning messages
 *      audit_info: Object - Table and field auditing information key is table name
 *      {
 *          tableName: Object - Details of auditing on each affected table
 *          {
 *              table: String - Name of the table
 *              audit_on: Boolean - true if audit is turned on for this table
 *              unaudited_fields: String Array - A list of the fields on the table which are not audited
 *          }
 *      }
 *      audit_record_id: String sys id of the audit info record.  Not returned when validateOnly is set true.
 * }
 * </pre>
 */
SLARepair.Response = Class.create();

SLARepair.Response.prototype = {
    initialize: function() {
        this.count = 0;
        this.info_msg = [];
        this.err_msg = [];
        this.audit_info = {};
        this.audit_record_id = "";
    },
    type: "SLARepair.Response"
};
```