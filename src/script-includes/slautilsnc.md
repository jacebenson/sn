---
title: "SLAUtilSNC"
id: "slautilsnc"
---

API Name: global.SLAUtilSNC

```js
var SLAUtilSNC = Class.create();
SLAUtilSNC.prototype = {

	TABLE_TASK_SLA: 'task_sla',
	TABLE_CMN_SCHEDULE: 'cmn_schedule',
	TABLE_CONTRACT_SLA: 'contract_sla',
	TABLE_SERVICE_OFFERING_SLA: 'service_offering_sla',
	ATTR_STAGE: 'stage',
	ATTR_BUSINESS_PERCENTAGE: 'business_percentage',
	ATTR_BUSINESS_DURATION: 'business_duration',
	ATTR_BUSINESS_TIME_LEFT: 'business_time_left',
	ATTR_BUSINESS_PAUSE_DURATION: 'business_pause_duration',
	ATTR_PERCENTAGE: 'percentage',
	ATTR_DURATION: 'duration',
	ATTR_TIME_LEFT: 'time_left',
	ATTR_PAUSE_DURATION: 'pause_duration',
	ATTR_START_TIME: 'start_time',
	ATTR_HAS_BREACHED: 'has_breached',
	ATTR_PLANNED_END_TIME: 'planned_end_time',
	ATTR_COLLECTION: 'collection',
	ATTR_SERVICE_COMMITMENT: 'service_commitment',
	TABLE_SYS_CHOICE: 'sys_choice',
	FIELD_TYPE_FIELD_NAME: 'field_name',
	FIELD_TYPE_WF: 'workflow',
	ATTR_NAME: 'name',
	ATTR_INACTIVE: 'inactive',
	ATTR_LANGUAGE: 'language',
	ATTR_ELEMENT: 'element',
	ATTR_TASK: 'task',
	DATE_FORMAT_DISPLAY_VALUE_INTERNAL: 'display_value_internal',
	DATE_FORMAT_DISPLAY_VALUE: 'display_value',
	DATE_FORMAT_VALUE: 'value',
	LOG_PROPERTY: "com.snc.sla.util.log",
	SLA_ALWAYS_RUN_RELDUR_SCRIPT_PROPERTY: 'com.snc.sla.calculation.always_run_relative_duration_script',

	initialize: function() {
		this.gru = new GlideRecordUtil();
		this.lu = new GSLog(this.LOG_PROPERTY, this.type);
		this.alwaysRunRelDurScript = (gs.getProperty(this.SLA_ALWAYS_RUN_RELDUR_SCRIPT_PROPERTY, 'false') === 'true');
	},

	getSchedule: function(contractSLAGr, taskGr) {
		var scheduleGR = new GlideRecord(this.TABLE_CMN_SCHEDULE);
		var schSource = contractSLAGr.schedule_source + '';
		var tzSource = contractSLAGr.timezone_source + '';
		var taskSLAGr = new GlideRecord(this.TABLE_TASK_SLA);
		taskSLAGr.initialize();
		taskSLAGr.task = taskGr.sys_id; //do not use getUniqueValue() as dummy records created from audit in SLATimeline will have different value.
		taskSLAGr.sla = contractSLAGr.getUniqueValue();
		var scheduleId = SLASchedule.source(schSource, taskSLAGr, taskGr);
		if (scheduleId)
			scheduleGR.get(scheduleId);

		var tz = scheduleGR.getValue("time_zone");
		if (!tz)
			tz = SLATimezone.source(tzSource, taskSLAGr, taskGr);
		if (!tz)
			tz = gs.getSysTimeZone();

		return new GlideSchedule(scheduleGR.sys_id, tz);
	},

	copyGlideRecord: function(gr) {
		if (!gr || !(gr.sys_id || gr.original_sys_id))
			return null;
		var sysId = gr.original_sys_id || gr.sys_id;
		var copiedGr = new GlideRecord(gr.getRecordClassName());
		copiedGr.initialize();
		copiedGr.setNewGuidValue(sysId);
		var fields = gr.getFields();
		if (sysId) {
			copiedGr.original_sys_id = sysId;
			copiedGr.sys_id = sysId;
		}
		for (var i = 0; i < fields.size(); i++)
			copiedGr.setValue(fields.get(i).getName(), gr.getValue(fields.get(i).getName()));
		for (var field in gr.variables)
			copiedGr.variables[field] = gr.variables[field];
		return copiedGr;
	},

	getChangedFields: function(gr) {
		var changedFields = [];

		if (!gr || !(gr.sys_id || gr.original_sys_id))
			return changedFields;

		var fields = gr.getFields();
		var field;
		for (var i = 0; i < fields.size(); i++) {
			field = fields.get(i);
			if (field.getName() == "variables")
				continue;
			if (field.changes())
				changedFields.push(field);
		}
		return changedFields;
	},

	getChangedVariables: function(gr) {
		var changedVariables = [];

		if (!gr || !(gr.sys_id || gr.original_sys_id))
			return changedVariables;

		if (!gr.isValidField("variables"))
			return changedVariables;

		if (!gr.variables.changes())
			return changedVariables;

		for (var variableName in gr.variables) {
			if (gr.variables[variableName].changes())
				changedVariables.push(variableName);
		}

		return changedVariables;
	},

	grToJsArr: function(gr, checkReadAccess) {
		var arr = [];

		while (gr.next())
			arr.push(this.grToJsObj(gr, checkReadAccess));

		return arr;
	},

	grToJsObj: function(gr, checkReadAccess) {
		var obj = {};
		obj.sys_id = gr.getUniqueValue();
		if (!checkReadAccess || (checkReadAccess && gr.canRead())) {
			var fields = gr.getFields();
			obj.read_allowed = true;
			for (var i = 0; i < fields.size(); i++) {
				var fieldName = fields.get(i).getName();
				obj[fieldName] = {};
				var fieldAccess = !checkReadAccess || (checkReadAccess && gr.getElement(fieldName).canRead());
				obj[fieldName].label = gr.getElement(fieldName).getLabel();
				if (fieldAccess) {
					obj[fieldName].read_allowed = true;
					obj[fieldName].value = gr.getValue(fieldName);
					if (gr.getRecordClassName() == 'contract_sla' && gr[fieldName].getED().getInternalType() == this.FIELD_TYPE_FIELD_NAME) {
						var collectionName = gr.getValue(this.ATTR_COLLECTION);
						if (collectionName && obj[fieldName].value)
							obj[fieldName].display_value = new GlideCompositeElement(obj[fieldName].value, collectionName).getFullLabel();
					} else if (gr[fieldName].getED().getInternalType() == this.FIELD_TYPE_WF) {
						//Workaround to avoid workflow fields wiping out rest of the values.
						//A PRB is being logged with platform for root cause and fix. Refer PRB748550 work notes
						var tempGr = new GlideRecord(gr.getRecordClassName());
						tempGr.initialize();
						tempGr.setValue(fieldName, gr.getValue(fieldName));
						obj[fieldName].display_value = tempGr.getDisplayValue(fieldName);
					} else {
						var ed = gr.getElement(fieldName).getED();
						// skip journal fields
						if (!(ed.isJournal() || ed.isJournalList()))
							obj[fieldName].display_value = gr.getDisplayValue(fieldName);
					}
					if (gr[fieldName] != null && gr[fieldName].getGlideObject() && gr[fieldName]
						.getGlideObject().getDisplayValueInternal()) {
						obj[fieldName].display_value_internal = gr[fieldName].getGlideObject().getDisplayValueInternal();
					}
				} else {
					obj[fieldName].read_allowed = false;
					obj[fieldName].value = undefined;
					obj[fieldName].display_value = gs.getMessage('(restricted)');
				}
			}
			if (!obj.variables)
				obj.variables = {};
			if (gr.variables.canRead()) {
				for (var field in gr.variables) {
					obj.variables[field] = {};
					obj.variables[field].read_allowed = true;
					obj.variables[field].value = gr.variables[field].getValue();
					obj.variables[field].display_value = gr.variables[field].getDisplayValue();
				}
			} else {
				for (var fieldVar in gr.variables) {
					obj.variables[fieldVar] = {};
					obj.variables[fieldVar].read_allowed = false;
					obj.variables[fieldVar].value = undefined;
					obj.variables[fieldVar].display_value = gs.getMessage('(restricted)');
				}
			}
		} else {
			obj.read_allowed = false;
			obj.security_check_fail_message = gs.getMessage('Security constraints restrict read access to this {0}', gr.getRecordClassName());
		}
		return obj;
	},

	getFieldColumnMap: function() {
		var gr = new GlideRecord(this.TABLE_TASK_SLA);
		var displayColumns = {};
		displayColumns[this.ATTR_STAGE] = gr.getElement(this.ATTR_STAGE).getLabel();
		displayColumns[this.ATTR_BUSINESS_PERCENTAGE] = gr.getElement(this.ATTR_BUSINESS_PERCENTAGE).getLabel();
		displayColumns[this.ATTR_BUSINESS_DURATION] = gr.getElement(this.ATTR_BUSINESS_DURATION).getLabel();
		displayColumns[this.ATTR_BUSINESS_TIME_LEFT] = gr.getElement(this.ATTR_BUSINESS_TIME_LEFT).getLabel();
		displayColumns[this.ATTR_BUSINESS_PAUSE_DURATION] = gr.getElement(this.ATTR_BUSINESS_PAUSE_DURATION).getLabel();
		displayColumns[this.ATTR_PERCENTAGE] = gr.getElement(this.ATTR_PERCENTAGE).getLabel();
		displayColumns[this.ATTR_DURATION] = gr.getElement(this.ATTR_DURATION).getLabel();
		displayColumns[this.ATTR_TIME_LEFT] = gr.getElement(this.ATTR_TIME_LEFT).getLabel();
		displayColumns[this.ATTR_PAUSE_DURATION] = gr.getElement(this.ATTR_PAUSE_DURATION).getLabel();
		displayColumns[this.ATTR_START_TIME] = gr.getElement(this.ATTR_START_TIME).getLabel();
		displayColumns[this.ATTR_HAS_BREACHED] = gr.getElement(this.ATTR_HAS_BREACHED).getLabel();
		displayColumns[this.ATTR_PLANNED_END_TIME] = gr.getElement(this.ATTR_PLANNED_END_TIME).getLabel();
		return displayColumns;
	},

	isTaskSlaAttached: function(taskSysId) {
		var gr = new GlideRecord(this.TABLE_TASK_SLA);
		gr.addQuery(this.ATTR_TASK, taskSysId);
		gr.setLimit(1);
		gr.query();
		if (gr.hasNext()) {
			return true;
		}
		return false;
	},

	getSlaStagesMap: function() {
		var stages = [];
		var gr = new GlideRecord(this.TABLE_SYS_CHOICE);
		gr.addQuery(this.ATTR_NAME, this.TABLE_TASK_SLA);
		gr.addQuery(this.ATTR_ELEMENT, this.ATTR_STAGE);
		var qc = gr.addNullQuery(this.ATTR_INACTIVE);
		qc.addOrCondition(this.ATTR_INACTIVE, 'false');
		gr.addQuery(this.ATTR_LANGUAGE, gs.getUser().getLanguage());
		gr.query();
		while (gr.next()) {
			var stage = {};
			stage.label = gr.getValue('label');
			stage.value = gr.getValue('value');
			stages.push(stage);
		}
		return stages;
	},

	getRelatedFieldsFromEncodedQuery: function(table, encodedQuery) {
		var queryString = new GlideQueryString(table, encodedQuery);
		queryString.deserialize();
		var relatedFields = [];
		var queryTerms = queryString.getTerms();
		for (var i = 0; i < queryTerms.size(); i++) {
			if (queryTerms.get(i).getTermField() && relatedFields.indexOf(queryTerms.get(i).getTermField() + '') < 0)
				relatedFields.push(queryTerms.get(i).getTermField() + '');
		}
		return relatedFields;
	},

	populateDateInCommonFormatsAndConversions: function(dateStr, format /*value, display_value, display_value_internal*/ ) {
		if (dateStr && format) {
			var gdt = new GlideDateTime();
			if (format == this.DATE_FORMAT_DISPLAY_VALUE_INTERNAL)
				gdt.setDisplayValueInternal(dateStr);
			else if (format == this.DATE_FORMAT_DISPLAY_VALUE)
				gdt.setDisplayValue(dateStr);
			else if (format == this.DATE_FORMAT_VALUE)
				gdt.setValue(dateStr);
			return {
				value: gdt.getValue(),
				display_value: gdt.getDisplayValue(),
				display_value_internal: gdt.getDisplayValueInternal()
			};
		}
	},

	getGlideStackURL: function(stackName) {
		var stack = gs.getSession().getStack(stackName);
		return {
			url: stack.back()
		};
	},

	setGlideStackURL: function(url, stackName) {
		var stack = gs.getSession().getStack(stackName);
		var stackUrl = stack.push(url);
		return {
			url: stackUrl
		};
	},

	duplicateLastUrlInGlideStack: function(stackName) {
		var stack = gs.getSession().getStack(stackName);
		var stackUrl = stack.push(stack.top());
		return {
			url: stackUrl
		};
	},

	getTopGlideStackURL: function(stackName) {
		var stack = gs.getSession().getStack(stackName);
		return {
			url: stack.top()
		};
	},

	copyContractSLA: function(contractSLAGr) {
		var copyContractSLAGr = new GlideRecord("contract_sla");

		if (!contractSLAGr)
			return copyContractSLAGr;

		var fieldData = {};
		this.gru.populateFromGR(fieldData, contractSLAGr);
		this.gru.mergeToGR(fieldData, copyContractSLAGr);

		return copyContractSLAGr;
	},

	copyTaskSLA: function(taskSLAGr) {
		var copyTaskSLAGr = new GlideRecord("task_sla");

		if (!taskSLAGr || !taskSLAGr.getUniqueValue())
			return copyTaskSLAGr;

		var fieldData = {};
		this.gru.populateFromGR(fieldData, taskSLAGr);
		this.gru.mergeToGR(fieldData, copyTaskSLAGr);

		return copyTaskSLAGr;
	},

	isLegacySLACommitmentsActive: function() {
		var serviceOfferingSLA = GlideTableDescriptor.get(this.TABLE_SERVICE_OFFERING_SLA);
		return serviceOfferingSLA.isValid() && serviceOfferingSLA.getED().isActive();
	},

	isSLACommitmentsActive: function() {
		var contractSLA = GlideTableDescriptor.get(this.TABLE_CONTRACT_SLA);
		return contractSLA.isValid() && contractSLA.isValidField(this.ATTR_SERVICE_COMMITMENT);
	},

	isServiceCommitmentSLA: function(slaGr) {
		if (!slaGr || !slaGr.getUniqueValue())
			return false;

		if (!this.isLegacySLACommitmentsActive() && !this.isSLACommitmentsActive())
			return false;

		if (this.isLegacySLACommitmentsActive() && slaGr.getValue("sys_class_name") === "service_offering_sla")
			return true;

		if (this.isSLACommitmentsActive() && "" + slaGr.service_commitment === "true")
			return true;

		return false;
	},

	getHistoryWalker: function(tableName, sysId, recordLevelSecurity, fieldLevelSecurity, withVariables, walkToFirstUpdate) {
		if (!tableName || !sysId)
			return null;

		var hw;
		try {
			hw = new sn_hw.HistoryWalker(tableName, sysId);
		} catch (e) {
			hw = null;
			if (this.lu.atLevel(GSLog.ERR))
				this.lu.logError("getHistoryWalker: Failed to initialise HistoryWalker: " + e);
		}

		if (!hw)
			return null;

		//Validate boolean inputs
		recordLevelSecurity = "true" === "" + recordLevelSecurity;
		fieldLevelSecurity = "true" === "" + fieldLevelSecurity;
		withVariables = "true" === "" + withVariables;
		walkToFirstUpdate = "true" === "" + walkToFirstUpdate;

		hw.setRecordLevelSecurity(recordLevelSecurity);
		hw.setFieldLevelSecurity(fieldLevelSecurity);
		hw.setWithVariables(withVariables);
		if (walkToFirstUpdate && !hw.walkTo(0)) {
			this.lu.logError("getHistoryWalker: Failed to walk to update 0");
			return null;
		}

		return hw;
	},

	getTimezone: function(taskSLAGr) {
		if (!taskSLAGr)
			return "";
		var timezone = "" + taskSLAGr.schedule.time_zone;
		if (!timezone)
			timezone = taskSLAGr.getValue("timezone");
		if (!timezone)
			timezone = gs.getSysTimeZone();
		return timezone;
	},

	getSLADurationInMs: function(taskSLAGr, slaDefGr, includePause) {
		var slaDurationMs = null;
		if (!taskSLAGr || !taskSLAGr.isValid())
			return slaDurationMs;

		if (!slaDefGr || !slaDefGr.isValid())
			slaDefGr = this.getSLADefFromTaskSLA(taskSLAGr);

		if (slaDefGr === null)
			return slaDurationMs;

		// If it's a user specified duration we can just return that plus pause time if requested
		if (slaDefGr.duration_type.nil()) {
			slaDurationMs = slaDefGr.duration.dateNumericValue();
			if ("" + includePause === "true")
				slaDurationMs += taskSLAGr.business_pause_duration.dateNumericValue();

			return slaDurationMs;
		}

		var durationCalculator = this.getDurationCalculatorForTaskSLA(taskSLAGr);
		if (!this.alwaysRunRelDurScript && taskSLAGr.isValidField("original_breach_time") && !taskSLAGr.original_breach_time.nil())
			durationCalculator.calcScheduleDuration(null, taskSLAGr.original_breach_time.getGlideObject());
		else {
			// Store the current value of the global variable called "current"
			var ocurrent = null;
			if (typeof current !== 'undefined')
				ocurrent = current;

			// Set "current" to point to either the "task_sla" record or the "table" record associated with the "SLA Definition"
			if (slaDefGr.getValue('relative_duration_works_on') === "SLA record")
				current = taskSLAGr;
			else
				current = taskSLAGr.task.getRefRecord();

			// Perform the relative calculation using the revised value of "current"
			dc.calcRelativeDuration(slaDefGr.getValue('duration_type'));

			// Reset "current" to point back to its original value
			if (ocurrent)
				current = ocurrent;
		}

		return durationCalculator.getSeconds() * 1000;
	},

	getSLADefFromTaskSLA: function(taskSLAGr) {
		var slaDefGr = null;
		if (!taskSLAGr || !taskSLAGr.isValid())
			return slaDefGr;

		slaDefGr = new GlideRecord(this.TABLE_CONTRACT_SLA);
		slaDefGr.addQuery("sys_id", taskSLAGr.getValue("sla"));
		if (taskSLAGr.isValidField("sys_domain"))
			slaDefGr.addDomainQuery(taskSLAGr);
		slaDefGr.query();

		if (!slaDefGr.next())
			return null;

		return slaDefGr;
	},

	getDurationCalculatorForTaskSLA: function(taskSLAGr) {
		var durationCalculator = new DurationCalculator();
		if (!taskSLAGr)
			return durationCalculator;

		var tz = this.getTimezone(taskSLAGr);
		if (!taskSLAGr.schedule.nil())
			durationCalculator.setSchedule(taskSLAGr.getValue("schedule"), tz);
		durationCalculator.setStartDateTime(this.getGlideDateTimeObject(taskSLAGr.start_time));

		return durationCalculator;
	},

	getGlideDateTimeObject: function(glide_date_time) {
		if (!glide_date_time)
			return new GlideDateTime();
		if (JSUtil.isJavaObject(glide_date_time) && JSUtil.instance_of(glide_date_time, 'com.glide.glideobject.GlideDateTime'))
			return glide_date_time;

		return new GlideDateTime(glide_date_time.getGlideObject());
	},

	refreshTaskSlasByTask: function(taskSysIds) {
		if (!taskSysIds || !Array.isArray(taskSysIds))
			return;

		if (this.lu.atLevel(GSLog.DEBUG))
			this.lu.debug('[refreshTaskSlasByTask] taskSysIds: ' + taskSysIds.join(','));

		// if a Task has unprocessed records in the "sla_async_queue" then do not call SLACalculatorNG
		var unqueuedTaskSysIds = taskSysIds.filter(function(taskSysId) {
			return !new SLAAsyncQueue().isTaskQueued(taskSysId);
		});

		if (this.lu.atLevel(GSLog.DEBUG))
			this.lu.debug('[refreshTaskSlasByTask] unqueuedTaskSysIds: ' + unqueuedTaskSysIds.join(','));

		var isTwentyElevenEngine = this._gs.getProperty('com.snc.sla.engine.version', '2010') === '2011';

		var taskSlaGr = new GlideRecord('task_sla');
		taskSlaGr.addQuery('task', 'IN', unqueuedTaskSysIds);
		taskSlaGr.addQuery('stage', '!=', 'paused');
		taskSlaGr.addActiveQuery();
		taskSlaGr.query();
		while (taskSlaGr.next()) {
			// Disable running of workflow for recalculation of SLA
			taskSlaGr.setWorkflow(false);
			isTwentyElevenEngine ? SLACalculatorNG.calculateSLA(taskSlaGr) : new SLACalculator().calcAnSLA(taskSlaGr);
			taskSlaGr.setWorkflow(true);
		}
	},

	getScheduleData: function(taskSlaGr) {
		if (!taskSlaGr || !taskSlaGr.getUniqueValue() || !taskSlaGr.sla)
			return null;

		var scheduleSysId = taskSlaGr.getValue('schedule');

		if (!scheduleSysId)
			return null;

		if (this._log.atLevel(global.GSLog.DEBUG))
			this._log.debug('[_getScheduleData] scheduleSysId: ' + scheduleSysId);

		var schedule = new GlideSchedule(scheduleSysId);
		var now = new GlideDateTime();
		var whenNext = new GlideDateTime();
		whenNext.add(schedule.whenNext());

		if (this._log.atLevel(global.GSLog.DEBUG))
			this._log.debug('[_getScheduleData] now: ' + now.getDisplayValue() + ' whenNext: ' + whenNext.getDisplayValue());

		var glideScheduleTimeMap = schedule.getTimeMap(now, whenNext, null);

		if (this._log.atLevel(global.GSLog.DEBUG))
			glideScheduleTimeMap.dumpTimeMapTZ();

		var scheduleData = {};
		scheduleData.timezone = schedule.getTZ().getID();
		scheduleData.in_schedule = schedule.isInSchedule(now);

		var scheduleDateTimeSpan = glideScheduleTimeMap.next();

		if (!scheduleDateTimeSpan) {

			if (this._log.atLevel(global.GSLog.DEBUG))
				this._log.debug('[getScheduleData] scheduleData: ' + JSON.stringify(scheduleData));

			return scheduleData;
		}

		scheduleData.actual_start = {
			value: scheduleDateTimeSpan.getActualStart().getValue(),
			display_value: scheduleDateTimeSpan.getActualStart().getDisplayValue()
		};

		scheduleData.actual_end = {
			value: scheduleDateTimeSpan.getActualEnd().getValue(),
			display_value: scheduleDateTimeSpan.getActualEnd().getDisplayValue()
		};

		scheduleData.start = {
			value: scheduleDateTimeSpan.getStart().getValue(),
			display_value: scheduleDateTimeSpan.getStart().getDisplayValue()
		};

		scheduleData.end = {
			value: scheduleDateTimeSpan.getEnd().getValue(),
			display_value: scheduleDateTimeSpan.getEnd().getDisplayValue()
		};

		if (scheduleData.in_schedule)
			scheduleData.schedule_changes_millis = this._timeLeftMS(scheduleDateTimeSpan.getActualEnd().getMS());
		else
			scheduleData.schedule_changes_millis = this._timeLeftMS(scheduleDateTimeSpan.getActualStart().getMS());

		if (this._log.atLevel(global.GSLog.DEBUG))
			this._log.debug('[getScheduleData] scheduleData: ' + JSON.stringify(scheduleData));

		return scheduleData;
	},

	_timeLeftMS: function(nextTimeMS) {
		if (!nextTimeMS)
			return 0;

		if (this._log.atLevel(global.GSLog.DEBUG))
			this._log.debug('[_timeLeftMS] nextTimeMS: ' + nextTimeMS);

		var nowGDT = new GlideDateTime();
		var nowMS = nowGDT.getNumericValue();
		var timeLeftMS = nextTimeMS - nowMS;

		if (this._log.atLevel(global.GSLog.DEBUG))
			this._log.debug('[_timeLeftMS] timeLeftMS: ' + timeLeftMS);

		return timeLeftMS;
	},

	type: 'SLAUtilSNC'
};
```