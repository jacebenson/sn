---
title: "ChangeCheckConflictsSNC"
id: "changecheckconflictssnc"
---

API Name: global.ChangeCheckConflictsSNC

```js
var ChangeRequestInfo = Class.create(); // Prototype defined after ChangeCheckConflictsSNC

var ConflictExecutionTracker = Class.create(); // Prototype defined after ChangeCheckConflictsSNC

var ChangeCheckConflictsSNC = Class.create();

ChangeCheckConflictsSNC.MAINTENANCE_WINDOW = "maintenance";
ChangeCheckConflictsSNC.BLACKOUT_WINDOW = "blackout";
ChangeCheckConflictsSNC.MAINTENANCE_WINDOW_FROM_CHILD = "child_maintenance";
ChangeCheckConflictsSNC.MAINTENANCE_WINDOW_FROM_PARENT = "parent_maintenance";
ChangeCheckConflictsSNC.BLACKOUT_WINDOW_FROM_CHILD = "child_blackout";
ChangeCheckConflictsSNC.BLACKOUT_WINDOW_FROM_PARENT = "parent_blackout";
ChangeCheckConflictsSNC.CI_ALREADY_SCHEDULED = "ci_scheduled";
ChangeCheckConflictsSNC.ASSIGNED_TO_ALREADY_SCHEDULED = "assigned_to_already_scheduled";
ChangeCheckConflictsSNC.PARENTS = "parents";
ChangeCheckConflictsSNC.CHILDREN = "children";
ChangeCheckConflictsSNC.DIRECT = "direct";
ChangeCheckConflictsSNC.TRACKER_NAME = "Conflict Detection";

ChangeCheckConflictsSNC.getBoolPropertyValue = function(pptyName, overridingConfig) {
	if (overridingConfig) {
		var val = overridingConfig[pptyName];
		if (typeof val !== 'undefined')
			return val;
	}
	return String(gs.getProperty(pptyName, defaultVal)) === 'true';
};

ChangeCheckConflictsSNC.allowConflictDetection = function(currentGr, previousGr, config) {
	// Case 1: Invalid Change or Config
	if (!currentGr || !config)
		return false;

	// Case 2: Dates Missing
	if (config.date_range) {
		if (config.date_range.length !== 2)
			return false;
	} else if (currentGr.start_date.nil() || currentGr.end_date.nil())
		return false;

	// Case 3: Basic Mode + Configuration Item
	var mode = String(config.mode);
	var hasItem = !currentGr.cmdb_ci.nil();
	if (mode === 'basic' && hasItem)
		return true;

	// Case 4: Basic Mode + No Configuration Item
	if (mode === 'basic' && !hasItem)
		return false;

	// Case 5: Advanced Mode + Configuration Item
	if (mode === 'advanced' && hasItem)
		return true;

	// Case 6: Advanced Mode + No Configuration Item + No Affected Items
	var taskCiGr = new GlideRecord('task_ci');
	taskCiGr.addQuery('task', currentGr.getUniqueValue());
	taskCiGr.query();
	var affectedItems = taskCiGr.getRowCount();
	if (mode === 'advanced' && !hasItem && affectedItems === 0)
		return false;

	// Case 7: Advanced Mode + No Configuration Item + Single Affected Item that matches deleted Configuration Item
	taskCiGr.next();
	if (previousGr && mode === 'advanced' && !hasItem && affectedItems === 1 && String(taskCiGr.ci_item) === String(previousGr.cmdb_ci))
		return false;

	// Default: Allow Conflict Detection for all other scenarios
	return true;
};

ChangeCheckConflictsSNC.buildAncestorClassInfo = function(baseClass) {
	if (!baseClass)
		baseClass = 'cmdb'; // use 'cmdb' if no baseClass parameter is specified to keep legacy behavior
	var classAncestors = {};
	var gru = new GlideRecordUtil();
	var tableUtils = new TableUtils(baseClass);
	var tables = j2js(tableUtils.getAllExtensions());
	for (var i = 0; i < tables.length; i++)
		classAncestors[tables[i]] = gru.getTables(tables[i]);

	return classAncestors;
};

ChangeCheckConflictsSNC.prototype = {

	initialize: function(sourceRecord, config) {
		this.lu = new GSLog(ChangeCheckConflicts.CHANGE_CONFLICT_LOG, this.type);
		this.lu.includeTimestamp();

		this.collectWindowData = config && config.collect_window_data;
		if (this.collectWindowData)
			this._windowData = {
				maintenance: {},
				blackout: {},
				scheduled: {}
			};

		// Check preconditions for conflict detection are being satisfied
		if (!ChangeCheckConflictsSNC.allowConflictDetection(sourceRecord, undefined, config))
			return;

		// Record what type of collisions need to be checked
		this.bCheckConflictModeAdvanced = String(config.mode) === 'advanced';
		this.bCheckChangeConflictCurrentCI = String(config.include_current_ci) === 'true';
		this.bCheckChangeConflictCurrentWindow = String(config.current_window) === 'true';
		this.bCheckConflictRelatedChildWindow = String(config.include_related_children_window) === 'true';
		this.bChangeConflictRelatedParentWindow = String(config.include_related_parent_window) === 'true';
		this.bCheckConflictBlackout = String(config.include_blackout_window) === 'true';
		this.bCheckConflictRelatedChildBlackout = String(config.include_related_children_blackout) === 'true';
		this.bChangeConflictRelatedParentBlackout = String(config.include_related_parent_blackout) === 'true';
		this.bChangeConflictCIMaintSchedule = String(config.include_ci_maint_sched) === 'true';
		this.bCheckConflictRelatedServices = String(config.include_related_services) === 'true';
		this.bCheckConflictAssignedTo = String(config.include_assigned_to) === 'true';
		this.bShowChangeConflictTimingInfo = String(config.show_timing_info) === 'true';
		this.nChangeConflictDumpCount = config.dump_count || 500;
		this.bFilterCaseSensitive = String(config.filter_is_case_sensitive) === 'true';
		this.bUseComposed = String(config.use_composed) === 'true';
		this.bIdentifyMostCritical = String(config.identify_most_critical) === 'true';
		this.bPopulateImpactedCIs = String(config.populate_impacted_cis) === 'true';
		this.bAllowContiguousChanges = String(config.allow_contiguous_changes) === 'true';
		this.bConsolidatedConflicts = String(config.consolidated_conflicts) === 'true';

		this.dryRun = config.dry_run;
		this.bPartial = String(config.allow_partially_overlapping_windows) === 'true';

		// Generate helpers and initialize state as needed
		this.conflictHandler = new ChangeConflictHandler(this.nChangeConflictDumpCount, this.bConsolidatedConflicts, sourceRecord.getValue("cmdb_ci"));
		if (!this.dryRun)
			this.conflictHandler.deleteConflictsByChangeId(sourceRecord.sys_id);
		this.sourceRecord = sourceRecord;
		this.changeIds = {};
		if (config && config.date_range) {
			this.startDate = config.date_range[0];
			this.endDate = config.date_range[1];
		} else {
			this.startDate = sourceRecord.start_date.getGlideObject();
			this.endDate = sourceRecord.end_date.getGlideObject();
		}
		this.wall_clock_time = parseInt(gs.dateDiff(this.startDate.getDisplayValue(), this.endDate.getDisplayValue(), true));
		this.glideRecordUtil = new GlideRecordUtil();
		this.arrayUtil = new ArrayUtil();
		this.blackouts = config.blackout ? config.blackout : ChangeCollisionHelper.getBlackoutsByDate(this.startDate, this.endDate);
		this.maintenanceSchedules = config.maintenance ? config.maintenance : ChangeCollisionHelper.getConditionalMaintenanceSchedules();
		this.dateInCiMaintenanceWindows = this.buildMaintenanceWindowInfo(); // Pre-calculate which maintenance schedules are within start and end date of current change_request record
		this.ciClassAncestors = config.cmdb_ancestor ? config.cmdb_ancestor : this.buildAncestorClassInfo('cmdb'); // Pre-calculate names of ancestor classes of each of the different cmdb_ci classes
		this.changeClassAncestors = config.change_request_ancestor ? config.change_request_ancestor : this.buildAncestorClassInfo('change_request'); // Pre-calculate names of ancestor classes of each of the different change_request classes
		this.mostCriticalServiceCache = {}; // cache for keeping most critical service of a particular CI
		this.isBusinessServiceCache = {}; // cache for keeping whether a CI is a business service
		this.dateInCiMaintenanceWindowCache = {};

		// Build a list of all the CI sys_ids which need to be checked (Note: this function updates the value of "this.processedCICount")
		this.processedCICount = 0;
		this.processedCIs = this.buildConfigItemInfo();

		if (this.lu.atLevel(GSLog.DEBUG))
			this.lu.logDebug('ProcessedCIs ' + Object.keys(this.processedCIs));

		if (this.bUseComposed)
			if (typeof ChangeCollisionHelper.addQueryDateRange === "undefined") {
				this.lu.logDebug('Composed queries cannot be used because addQueryDateRange() function is not defined in ChangeCollisionHelper');
				this.bUseComposed = false;
			}

		if (this.bUseComposed) {
			this.conflictTypes = this.buildConflictTypes();
			this.windowTypes = this.buildWindowTypes();
		} else
			// Get a list of all change requests which share CIs with the current change_request record
			this.mapCI2CR = this.buildConfigItemToChangeRequestMappings(true);

		// PRB1103073 - "If an affected CI is a child with many parents (or parent with many children), conflict detection can lead to high memory usage"
		//
		// This code ensures that we have the new methods for getting dependents and dependencies. The new code returns a
		// a single GlideRecord to iterate over instead of a discrete GlideRecord per dependent/dependency.
		this.USE_DEPRECATED_DEPENDENT_FUNC = false;
		if (typeof ChangeCollisionHelper.getCIDependants === "undefined")
			this.USE_DEPRECATED_DEPENDENT_FUNC = true;

		this.USE_DEPRECATED_DEPENDENCY_FUNC = false;
		if (typeof ChangeCollisionHelper.getCIDependencies === "undefined")
			this.USE_DEPRECATED_DEPENDENCY_FUNC = true;
	},

	/**
	 * Check for the different type of collisions the caller has requested and record details of them.
	 */
	check: function() {
		if (this.bUseComposed)
			return this._checkComposed();
		return this._checkIterating();
	},

	_checkIterating: function() {
		if (this.lu.atLevel(GSLog.DEBUG))
			this.lu.logDebug('Check Iterating');
		var nFrom = new Date().getTime();
		var nA = 0;
		var nB = 0;
		var nC = 0;
		var nD = 0;
		var nE = 0;
		var nF = 0;
		var x;
		var y;
		var ciGR;

		var tracker = new ConflictExecutionTracker(this.sourceRecord);
		tracker.run();
		tracker.setMaxProgressValue(this.processedCICount * 4);

		x = new Date().getTime();
		if (this.bCheckChangeConflictCurrentCI)
			this.stageA();
		y = new Date().getTime();
		nA += (y - x);

		for ( var i in this.processedCIs) {

			if (tracker.isCancelled())
				break;

			ciGR = this.glideRecordUtil.getGR("cmdb_ci", this.processedCIs[i]);

			tracker.updateDetailMessage(gs.getMessage("Checking {0} for conflicts", [ ciGR.name ]));

			x = new Date().getTime();
			if (this.bCheckChangeConflictCurrentWindow)
				this.stageB(ciGR);
			y = new Date().getTime();
			nB += (y - x);
			tracker.incrementProgressValue();

			x = new Date().getTime();
			if (this.bCheckConflictBlackout)
				this.stageC(ciGR);
			y = new Date().getTime();
			nC += (y - x);
			tracker.incrementProgressValue();

			x = new Date().getTime();
			if (this.bCheckConflictRelatedChildWindow)
				this.stageD(ciGR);
			y = new Date().getTime();
			nD += (y - x);
			tracker.incrementProgressValue();

			x = new Date().getTime();
			if (this.bChangeConflictRelatedParentWindow)
				this.stageE(ciGR);
			y = new Date().getTime();
			nE += (y - x);
			tracker.incrementProgressValue();
		}

		x = new Date().getTime();
		var nSavedConflictCount;
		if (!this.dryRun) {
			nSavedConflictCount = this.conflictHandler.saveConflicts();
			if (!tracker.isCancelled() && this.bPopulateImpactedCIs)
				new ChangeUtils().refreshImpactedServices(this.sourceRecord);
		}
		y = new Date().getTime();
		nF += (y - x);

		if (this.bShowChangeConflictTimingInfo) {
			var nUpto = new Date().getTime();
			var nDiff = (nUpto - nFrom) * 0.001;
			gs.log("-----------------------------------------------------------------------------------");
			gs.log("[DEBUG] Code Took " + nDiff + " secs to process " + this.processedCICount + " CIs and found " + nSavedConflictCount + " conflicts using dump count of " + this.nChangeConflictDumpCount);
			gs.log("[DEBUG] StageA took " + (nA * 0.001) + " secs");
			gs.log("[DEBUG] StageB took " + (nB * 0.001) + " secs");
			gs.log("[DEBUG] StageC took " + (nC * 0.001) + " secs");
			gs.log("[DEBUG] StageD took " + (nD * 0.001) + " secs");
			gs.log("[DEBUG] StageE took " + (nE * 0.001) + " secs");
			gs.log("[DEBUG] StageF took " + (nF * 0.001) + " secs");
			gs.log("-----------------------------------------------------------------------------------");
		}

		tracker.updateDetailMessage(gs.getMessage("The conflict check is complete"));
		tracker.success(gs.getMessage("The conflict check is complete"));

		return nSavedConflictCount;
	},

	_checkComposed: function() {
		if (this.lu.atLevel(GSLog.DEBUG))
			this.lu.logDebug('Check Composed');
		var startTime = new Date().getTime();

		var tracker = new ConflictExecutionTracker(this.sourceRecord);
		this.tracker = tracker;
		tracker.run();
		// progress will be increased in stage 1 and 2, and for each maintenance and blackout schedule
		tracker.setMaxProgressValue(4 + this.maintenanceSchedules.length + this.blackouts.length);

		// start checking
		var stage1Time = new Date().getTime();
		if (this.bCheckChangeConflictCurrentCI && this._increaseProgress(gs.getMessage("Checking already scheduled CIs")))
			this.checkAlreadyScheduledComposed(Object.keys(this.processedCIs), this._getDependencyTypes(true, this.bCheckConflictRelatedChildWindow, this.bChangeConflictRelatedParentWindow), ChangeConflict.CHANGETYPE_ALREADY_SCHEDULED);

		var stage2Time = new Date().getTime();

		if (this.bChangeConflictCIMaintSchedule && this._increaseProgress(gs.getMessage("Checking attached maintenance schedules")))
			this.checkAttachedScheduledComposed(Object.keys(this.processedCIs), this._getDependencyTypes(true, false, false), ChangeConflict.CHANGETYPE_NOT_IN_WINDOW, ChangeCheckConflictsSNC.MAINTENANCE_WINDOW);

		var dependencyTypes = this._getDependencyTypes(this.bCheckChangeConflictCurrentWindow, this.bCheckConflictRelatedChildWindow, this.bChangeConflictRelatedParentWindow);
		var stage3Time = new Date().getTime();
		if (this._increaseProgress(gs.getMessage("Checking maintenance schedules")))
 			this.checkMaintenanceSchedulesComposed(Object.keys(this.processedCIs), dependencyTypes, ChangeConflict.CHANGETYPE_NOT_IN_WINDOW, ChangeCheckConflictsSNC.MAINTENANCE_WINDOW);

		var stage4Time = new Date().getTime();
		if (this._increaseProgress(gs.getMessage("Checking blackout schedules"))){
			dependencyTypes = this._getDependencyTypes(this.bCheckConflictBlackout, this.bCheckConflictRelatedChildBlackout, this.bChangeConflictRelatedParentBlackout);
			this.checkBlackoutSchedulesComposed(Object.keys(this.processedCIs), dependencyTypes, ChangeConflict.CHANGETYPE_BLACKOUT, ChangeCheckConflictsSNC.BLACKOUT_WINDOW);
		}

		var stage5Time = new Date().getTime();
		if (this.bCheckConflictAssignedTo && this._increaseProgress(gs.getMessage("Checking already assigned change requests")))
			this.checkAssignedToAlreadyScheduled(ChangeConflict.CHANGETYPE_ASSIGNED_TO_ALREADY_SCHEDULED);

		this._increaseProgress(gs.getMessage("Saving conflicts data"));

 		var saveTime = new Date().getTime();
		var nSavedConflictCount;
		if (!this.dryRun) {
			if (this.lu.atLevel(GSLog.DEBUG))
				this.lu.logDebug('Saving conflict data');

			nSavedConflictCount = this.conflictHandler.saveConflicts();

			if (!tracker.isCancelled() && this.bPopulateImpactedCIs)
				new ChangeUtils().refreshImpactedServices(this.sourceRecord);
		}

		if (this.bShowChangeConflictTimingInfo) {
			var endTime = new Date().getTime();
			var nDiff = (endTime - startTime) * 0.001;
			gs.log("-----------------------------------------------------------------------------------");
			gs.log("[DEBUG] Code Took " + nDiff + " secs to process " + this.processedCICount + " CIs and found " + nSavedConflictCount + " conflicts using dump count of " + this.nChangeConflictDumpCount);
			gs.log("[DEBUG] checkAlreadyScheduledComposed took " + ((stage2Time - stage1Time) * 0.001) + " secs");
			gs.log("[DEBUG] checkAttachedScheduledComposed took " + ((stage3Time - stage2Time) * 0.001) + " secs");
			gs.log("[DEBUG] checkMaintenanceSchedulesComposed took " + ((stage4Time - stage3Time) * 0.001) + " secs");
			gs.log("[DEBUG] checkBlackoutSchedulesComposed took " + ((stage5Time - stage4Time) * 0.001) + " secs");
			gs.log("[DEBUG] checkAssignedToAlreadyScheduledComposed took " + ((saveTime - stage5Time) * 0.001) + " secs");
			gs.log("[DEBUG] saveConflicts took " + ((endTime - saveTime) * 0.001) + " secs");
			gs.log("-----------------------------------------------------------------------------------");
		}

		this.tracker.updateDetailMessage(gs.getMessage("The conflict check is complete"));
		this.tracker.success(gs.getMessage("The conflict check is complete"));

		return nSavedConflictCount;
	},

	/**
	 * Utility function to easily get dependencyTypes array based on config
	 */
	_getDependencyTypes: function(direct, children, parents) {
		var dependencyTypes = [];
		if (direct)
			dependencyTypes = [ChangeCheckConflictsSNC.DIRECT];
		if (children)
			dependencyTypes.push(ChangeCheckConflictsSNC.CHILDREN);
		if (parents)
			dependencyTypes.push(ChangeCheckConflictsSNC.PARENTS);
		return dependencyTypes;
	},

	/**
	 * Check for the different type of collisions the caller has requested and record details of them.
	 * and update the current change record with conflict status and run.
	 */
	checkAndUpdate: function() {
		var nSavedConflictCount = this.check();

		var conflictLastRun = new GlideDateTime();
        var conflictStatus = nSavedConflictCount ? "Conflict" : "No Conflict";

        // Check that we have the record we need, i.e., the sys_class_name matches the record we read.
        // This ensures GlideRecord doesn't do a reread behind the scenes and prevents PRB from happenign
        var recToUpdate = this.sourceRecord;
        if (this.sourceRecord.getRecordClassName() !== this.sourceRecord.getTableName()){
            recToUpdate = new GlideRecord(this.sourceRecord.getRecordClassName());
            if (!recToUpdate.get(this.sourceRecord.getUniqueValue()))
                recToUpdate = null;
        }

        if (recToUpdate !== null && recToUpdate.isValid()) {
            recToUpdate.setValue("conflict_status", conflictStatus);
            recToUpdate.setValue("conflict_last_run", conflictLastRun);
            recToUpdate.setValue("refresh_conflicts", false);
            recToUpdate.update();
        }

		this.updateConflictDetectionFields(conflictLastRun);

		return nSavedConflictCount;
	},

	stageA: function() {
		this._checkAlreadyScheduled();
	},

	stageB: function(ciGR) {
		this._checkMaintenanceSchedules(ciGR);
	},

	stageC: function(ciGR) {
		this._checkBlackoutSchedules(ciGR);
	},

	stageD: function(ciGR) {
		if (this.USE_DEPRECATED_DEPENDENCY_FUNC) {
			var dependenciesArray = ChangeCollisionHelper.getDependenciesGR(ciGR.sys_id, this.glideRecordUtil);
			for (var i = 0; i < dependenciesArray.length; i++)
				this._checkChildMaintenanceSchedules(ciGR, dependenciesArray[i]);

		} else {
			var dependenciesGR = ChangeCollisionHelper.getCIDependencies(ciGR.sys_id);
			while (dependenciesGR.next())
				this._checkChildMaintenanceSchedules(ciGR, dependenciesGR);
		}
	},

	stageE: function(ciGR) {
		if (this.USE_DEPRECATED_DEPENDENT_FUNC) {
			var dependantsArray = ChangeCollisionHelper.getDependantsGR(ciGR.sys_id, this.glideRecordUtil);
			for (var i = 0; i < dependantsArray.length; i++)
				this._checkParentMaintenanceSchedules(ciGR, dependantsArray[i]);

		} else {
			var dependantsGR = ChangeCollisionHelper.getCIDependants(ciGR.sys_id);
			while (dependantsGR.next())
				this._checkParentMaintenanceSchedules(ciGR, dependantsGR);
		}
	},

	_checkAlreadyScheduled: function() {
		if (this.lu.atLevel(GSLog.DEBUG))
			this.lu.logDebug('_checkAlreadyScheduled');
		for ( var i in this.mapCI2CR)
			if (this.mapCI2CR.hasOwnProperty(i))
				for ( var j in this.mapCI2CR[i])
					if (this.mapCI2CR[i].hasOwnProperty(j))
						this._addConflict(i, ChangeConflict.CHANGETYPE_ALREADY_SCHEDULED, this.mapCI2CR[i][j]);
	},

	_checkMaintenanceSchedules: function(ciGR) {
		if (this.lu.atLevel(GSLog.DEBUG))
			this.lu.logDebug('_checkMaintenanceSchedules: ci=' + ciGR.getUniqueValue());
		var ciMaintenanceWindow = ChangeCollisionHelper.getCiMaintenanceScheduleByGR(ciGR);
		if (!this._isInCIMaintenanceWindow(ciMaintenanceWindow))
			this._addConflict(ciGR.sys_id, ChangeConflict.CHANGETYPE_NOT_IN_WINDOW, ciMaintenanceWindow);
		if (this.collectWindowData && ciMaintenanceWindow)
			this._addWindow(ciGR.sys_id, ChangeCheckConflictsSNC.MAINTENANCE_WINDOW, ciMaintenanceWindow);

		for (var j = 0; j < this.maintenanceSchedules.length; j++) {
			var schedule = this.maintenanceSchedules[j];
			if (this.lu.atLevel(GSLog.DEBUG))
				this.lu.logDebug('_checkMaintenanceSchedules: ci=' + ciGR.getUniqueValue() + '. Checking schedule ' + schedule.name + ' (' + schedule.sys_id + ')');

			if (!this._doesScheduleApplies(schedule, ciGR.sys_class_name)) {
				if (this.lu.atLevel(GSLog.DEBUG))
					this.lu.logDebug('_checkMaintenanceSchedules: ci=' + ciGR.getUniqueValue()
									 + '. Skipped schedule because it does not apply: ' + schedule.name + ' (' + schedule.sys_id + ')');
				continue;
			}

			if (!this.collectWindowData && this.dateInCiMaintenanceWindows[schedule.sys_id]) {
				if (this.lu.atLevel(GSLog.DEBUG))
					this.lu.logDebug('_checkMaintenanceSchedules: ci=' + ciGR.getUniqueValue() + '. Skipped schedule because date is in maintenance window' + schedule.name + ' (' + schedule.sys_id + ')');
				continue;
			}

			if (this._checkConditions(schedule.applies_to, ciGR, schedule.condition)) {
				var ciSysId = this._appliesToChangeRequest(schedule) ? null : ciGR.sys_id;
				this._addConflict(ciSysId, ChangeConflict.CHANGETYPE_NOT_IN_WINDOW, schedule.sys_id);
				if (this.collectWindowData)
					this._addWindow(ciSysId, ChangeCheckConflictsSNC.MAINTENANCE_WINDOW, schedule.sys_id);
			}
		}
	},

	_checkBlackoutSchedules: function(ciGR) {
		if (this.lu.atLevel(GSLog.DEBUG))
			this.lu.logDebug('_checkBlackoutSchedules: ci=' + ciGR.getUniqueValue());
		for (var j = 0; j < this.blackouts.length; j++) {
			var blackout = this.blackouts[j];
			if (this.lu.atLevel(GSLog.DEBUG))
				this.lu.logDebug('_checkBlackoutSchedules: ci=' + ciGR.getUniqueValue() + '. Checking schedule ' + blackout.name + ' (' + blackout.sys_id + ')');

			if (!this._doesScheduleApplies(blackout, ciGR.sys_class_name)) {
				if (this.lu.atLevel(GSLog.DEBUG))
					this.lu.logDebug('_checkBlackoutSchedules: ci=' + ciGR.getUniqueValue()
									 + '. Skipped schedule because it does not apply: ' + schedule.name + ' (' + schedule.sys_id + ')');
				continue;
			}

			if (this._checkConditions(blackout.applies_to, ciGR, blackout.condition)) {
				var ciSysId = this._appliesToChangeRequest(blackout) ? null : ciGR.sys_id;
				this._addConflict(ciSysId, ChangeConflict.CHANGETYPE_BLACKOUT, blackout.sys_id);
				if (this.collectWindowData)
					this._addWindow(ciSysId, ChangeCheckConflictsSNC.BLACKOUT_WINDOW, blackout.sys_id);
			}
		}
	},

	_checkChildMaintenanceSchedules: function(ciGR, dependencyGR) {
		if (this.lu.atLevel(GSLog.DEBUG))
			this.lu.logDebug('_checkChildMaintenanceSchedules: ci=' + ciGR.getUniqueValue() + ', dependency='+dependencyGR.getUniqueValue());
		var ciSysId = ciGR.getUniqueValue();
		var dependencySysId = dependencyGR.getUniqueValue();
		var dependencyClassName = dependencyGR.getRecordClassName();

		if (this.bCheckChangeConflictCurrentCI) {
			var changeRequestConflicts = this._getChangesWithCIs(dependencySysId);
			for ( var key in changeRequestConflicts)
				if (changeRequestConflicts.hasOwnProperty(key))
					this._addConflict(ciSysId, ChangeConflict.CHANGETYPE_CHILD_ALREADY_SCHEDULED, key, dependencySysId);
		}

		var ciMaintenanceWindow = ChangeCollisionHelper.getCiMaintenanceScheduleByGR(dependencyGR);

		if (!this._isInCIMaintenanceWindow(ciMaintenanceWindow))
			this._addConflict(ciSysId, ChangeConflict.CHANGETYPE_CHILD_NOT_IN_WINDOW, ciMaintenanceWindow, dependencySysId);

		if (this.collectWindowData && ciMaintenanceWindow)
			this._addWindow(ciSysId, ChangeCheckConflictsSNC.MAINTENANCE_WINDOW_FROM_CHILD, ciMaintenanceWindow, dependencySysId);

		for (var d = 0; d < this.maintenanceSchedules.length; d++) {
			var schedule = this.maintenanceSchedules[d];
			if (this.lu.atLevel(GSLog.DEBUG))
				this.lu.logDebug('_checkChildMaintenanceSchedules: ci=' + ciGR.getUniqueValue() + ', dependency='+dependencyGR.getUniqueValue()
					+ '. Checking schedule ' + schedule.name + ' (' + schedule.sys_id + ')');

			if (!this._doesScheduleApplies(schedule, dependencyClassName)) {
				if (this.lu.atLevel(GSLog.DEBUG))
					this.lu.logDebug('_checkChildMaintenanceSchedules: ci=' + ciGR.getUniqueValue() + ', dependency='+dependencyGR.getUniqueValue()
									 + '. Skipped schedule because it does not apply: ' + schedule.name + ' (' + schedule.sys_id + ')');
				continue;
			}

			if (!this.collectWindowData && this.dateInCiMaintenanceWindows[schedule.sys_id]) {
				if (this.lu.atLevel(GSLog.DEBUG))
					this.lu.logDebug('_checkChildMaintenanceSchedules: ci=' + ciGR.getUniqueValue() + ', dependency='+dependencyGR.getUniqueValue()
									 + '. Skipped schedule because date is in maintenance window' + schedule.name + ' (' + schedule.sys_id + ')');
				continue;
			}

			//Check if the record class name differs from the record class name then re-read the record as the condition might be class specific
			//As an example: it is possible that the TableName is cmdb_ci but the Record Classname is cmdb_ci_win_server.
			//In this case the schedule condition would fail if it was dependant on cmdb_ci_win_server but the filter would be run against cmdb_ci
			if (!this.USE_DEPRECATED_DEPENDENCY_FUNC && (dependencyGR.getTableName() !== dependencyClassName)) {
				var actualGR = new GlideRecord(dependencyClassName);
				if (actualGR.get(dependencySysId))
					dependencyGR = actualGR;
			}

			if (this._checkConditions(schedule.applies_to, dependencyGR, schedule.condition) && !this._appliesToChangeRequest(schedule)) {
				this._addConflict(ciSysId, ChangeConflict.CHANGETYPE_CHILD_NOT_IN_WINDOW, schedule.sys_id, dependencySysId);
				if (this.collectWindowData)
					this._addWindow(ciSysId, ChangeCheckConflictsSNC.MAINTENANCE_WINDOW_FROM_CHILD, schedule.sys_id, dependencySysId);
			}
		}
	},

	_checkParentMaintenanceSchedules: function(ciGR, dependantGR) {
		if (this.lu.atLevel(GSLog.DEBUG))
			this.lu.logDebug('_checkParentMaintenanceSchedules: ci=' + ciGR.getUniqueValue() + ', dependant='+dependantGR.getUniqueValue());
		var ciSysId = ciGR.getUniqueValue();
		var dependantSysId = dependantGR.getUniqueValue();
		var dependantClassName = dependantGR.getRecordClassName();

		if (this.bCheckChangeConflictCurrentCI) {
			var changeRequestConflicts = this._getChangesWithCIs(dependantSysId);
			for ( var key in changeRequestConflicts)
				if (changeRequestConflicts.hasOwnProperty(key))
					this._addConflict(ciSysId, ChangeConflict.CHANGETYPE_PARENT_ALREADY_SCHEDULED, key, dependantSysId);
		}

		var ciMaintenanceWindow = ChangeCollisionHelper.getCiMaintenanceScheduleByGR(dependantGR);

		if (!this._isInCIMaintenanceWindow(ciMaintenanceWindow))
			this._addConflict(ciSysId, ChangeConflict.CHANGETYPE_PARENT_NOT_IN_WINDOW, ciMaintenanceWindow, dependantSysId);

		if (this.collectWindowData && ciMaintenanceWindow)
			this._addWindow(ciSysId, ChangeCheckConflictsSNC.MAINTENANCE_WINDOW_FROM_PARENT, ciMaintenanceWindow, dependantSysId);

		for (var d = 0; d < this.maintenanceSchedules.length; d++) {
			var schedule = this.maintenanceSchedules[d];
			this.lu.logDebug('_checkParentMaintenanceSchedules: ci=' + ciGR.getUniqueValue() + ', dependant='+dependantGR.getUniqueValue()
							 + '. Checking schedule ' + schedule.name + ' (' + schedule.sys_id + ')');

			if (!this._doesScheduleApplies(schedule, dependantClassName)) {
				if (this.lu.atLevel(GSLog.DEBUG))
					this.lu.logDebug('_checkParentMaintenanceSchedules: ci=' + ciGR.getUniqueValue() + ', dependant='+dependantGR.getUniqueValue()
									 + '. Skipped schedule because it does not apply: ' + schedule.name + ' (' + schedule.sys_id + ')');
				continue;
			}

			if (!this.collectWindowData && this.dateInCiMaintenanceWindows[schedule.sys_id]) {
				if (this.lu.atLevel(GSLog.DEBUG))
					this.lu.logDebug('_checkParentMaintenanceSchedules: ci=' + ciGR.getUniqueValue() + ', dependant='+dependantGR.getUniqueValue()
									 + '. Skipped schedule because date is in maintenance window' + schedule.name + ' (' + schedule.sys_id + ')');
				continue;
			}

			//Check if the record class name differs from the record class name then re-read the record as the condition might be class specific
			//As an example: it is possible that the TableName is cmdb_ci but the Record Classname is cmdb_ci_win_server.
			//In this case the schedule condition would fail if it was dependant on cmdb_ci_win_server but the filter would be run against cmdb_ci
			if (!this.USE_DEPRECATED_DEPENDENCY_FUNC && (dependantGR.getTableName() !== dependantClassName)) {
				var actualGR = new GlideRecord(dependantClassName);
				if (actualGR.get(dependantSysId))
					dependantGR = actualGR;
			}

			if (this._checkConditions(schedule.applies_to, dependantGR, schedule.condition) && !this._appliesToChangeRequest(schedule)) {
				this._addConflict(ciSysId, ChangeConflict.CHANGETYPE_PARENT_NOT_IN_WINDOW, schedule.sys_id, dependantSysId);
				if (this.collectWindowData)
					this._addWindow(ciSysId, ChangeCheckConflictsSNC.MAINTENANCE_WINDOW_FROM_PARENT, schedule.sys_id, dependantSysId);
			}
		}
	},

	/**
	 * checks whether any dependency has been already scheduled in another change for the same period
	 */
	checkAlreadyScheduledComposed: function(processedCIs, dependencyTypes, conflictType) {
		if (this.lu.atLevel(GSLog.DEBUG))
			this.lu.logDebug('checkAlreadyScheduledComposed: dependecyTypes=' + dependencyTypes);

		// query for Affected CIs list of other changes
		var changeId = this.sourceRecord.getUniqueValue();
		this._dependencyQuery('cmdb_task_chg', 'ci_sys_id', processedCIs, dependencyTypes, (function(gr) {
			gr.addQuery('task_task', '!=', changeId);
			gr.addQuery('chg_active', true);
			ChangeCollisionHelper.addQueryDateRange(gr, this.startDate, this.endDate, 'chg_', this.bAllowContiguousChanges);
		}).bind(this), (function(dependencyType, gr, ciSysId) {
			var changeSysId = gr.chg_sys_id + "";
			this._addDependencyConflict(ciSysId, dependencyType, conflictType, changeSysId, gr.ci_sys_id + "");
			if (this.collectWindowData)
				this._addWindow(changeSysId, ChangeCheckConflictsSNC.CI_ALREADY_SCHEDULED, null, null, gr.chg_start_date + "", gr.chg_end_date + "");
		}).bind(this));

		// query for CI attached to other changes
		this._dependencyQuery('change_request', 'cmdb_ci', processedCIs, dependencyTypes, (function(gr) {
			gr.addQuery('sys_id', '!=', changeId);
			gr.addActiveQuery();
			ChangeCollisionHelper.addQueryDateRange(gr, this.startDate, this.endDate, '', this.bAllowContiguousChanges);
		}).bind(this), (function(dependencyType, gr, ciSysId) {
			var changeSysId = gr.getUniqueValue();
			this._addDependencyConflict(ciSysId, dependencyType, conflictType, changeSysId, gr.cmdb_ci +'');
			if (this.collectWindowData)
				this._addWindow(changeSysId, ChangeCheckConflictsSNC.CI_ALREADY_SCHEDULED, null, null, gr.start_date + '', gr.end_date + '');
		}).bind(this));
	},

	checkAssignedToAlreadyScheduled: function(conflictType) {
		if (this.lu.atLevel(GSLog.DEBUG))
			this.lu.logDebug('checkAssignedToAlreadyScheduledComposed: conflictType=' + conflictType);

		if (this.sourceRecord.assigned_to.nil())
			return;

		var gr = new GlideRecord('change_request');
		ChangeCollisionHelper.addQueryDateRange(gr, this.startDate, this.endDate, '', this.bAllowContiguousChanges);
		gr.addQuery('sys_id', '!=', this.sourceRecord.getUniqueValue());
		gr.addQuery('assigned_to', this.sourceRecord.getValue('assigned_to'));
		gr.addActiveQuery();
		gr.query();
		while (gr.next()) {
			var changeSysId = gr.getUniqueValue();
			this._addConflict(null, conflictType, changeSysId);
			if (this.collectWindowData)
				this._addWindow(changeSysId, ChangeCheckConflictsSNC.ASSIGNED_TO_ALREADY_SCHEDULED, null, null, gr.start_date + '', gr.end_date + '');
		}
	},

	/**
	 * checks whether any CI dependency has a maintenance schedule attached, but is out period scheduled for current change
	 */
	checkAttachedScheduledComposed: function(processedCIs, dependencyTypes, conflictType, windowType) {
		if (this.lu.atLevel(GSLog.DEBUG))
			this.lu.logDebug('checkAttachedScheduledComposed: dependecyTypes=' + dependencyTypes);
		this._dependencyQuery('cmdb_ci', 'sys_id', processedCIs, dependencyTypes, (function(gr){
			gr.addQuery('maintenance_schedule', '!=', 'null');
		}).bind(this), (function(dependencyType, gr, ciSysId){
			if (!this._isInCIMaintenanceWindow(gr.maintenance_schedule))
				this._addDependencyConflict(ciSysId, dependencyType, conflictType, gr.maintenance_schedule +"", gr.getUniqueValue());
			if(this.collectWindowData)
				this._addDependencyWindow(ciSysId, dependencyType, windowType, gr.maintenance_schedule +"", gr.getUniqueValue());
		}).bind(this));
	},

	/**
	 * checks whether any maintenance schedule affects any of the dependencies
	 */
	checkMaintenanceSchedulesComposed: function(processedCIs, dependencyTypes, conflictType, windowType) {
		if (this.lu.atLevel(GSLog.DEBUG))
			this.lu.logDebug('checkMaintenanceSchedulesComposed: dependecyTypes=' + dependencyTypes);
		var precallMaintenanceConflictFn = function(schedule, gr) {
			gr.addEncodedQuery(schedule.condition);
		};
		var addMaintenanceConflictFn = function(schedule, dependencyType, gr, ciSysId) {
			if (!this._filterCheckRecord(gr, schedule.condition))
				return;
			this._addDependencyConflict(ciSysId, dependencyType, conflictType, schedule.sys_id, gr.getUniqueValue());
			if (this.collectWindowData)
				this._addDependencyWindow(ciSysId, dependencyType, windowType, schedule.sys_id, gr.getUniqueValue());
		};
		var addMaintenanceWindowFn = function(schedule, dependencyType, gr, ciSysId) {
			if (!this._appliesToRecord(schedule, gr) || !this._filterCheckRecord(gr, schedule.condition))
				return;
			this._addDependencyWindow(ciSysId, dependencyType, windowType, schedule.sys_id, gr.getUniqueValue());
		};

		for (var d = 0; d < this.maintenanceSchedules.length; d++) {
			var schedule = this.maintenanceSchedules[d];
			if (this.lu.atLevel(GSLog.DEBUG))
				this.lu.logDebug('checkMaintenanceSchedulesComposed: Checking maintenance schedule for conflicts: ' + schedule.name + ' (' + schedule.sys_id + ')');
			if (!this._increaseProgress(gs.getMessage("Checking maintenance schedule {0} for conflicts", [ schedule.name ])))
				return;
			// we skip the maintenance schedule if it is within the period of current change
			if (this.dateInCiMaintenanceWindows[schedule.sys_id]) {
				if (this.collectWindowData) {
					if (this._appliesToChangeRequest(schedule)) {
						if (this._checkConditions(schedule.applies_to, this.sourceRecord, schedule.condition))
							this._addWindow(null, windowType, schedule.sys_id);
						this._dependencyQuery('cmdb_ci', 'sys_id', processedCIs, dependencyTypes, null, addMaintenanceWindowFn.bind(this, schedule));
					} else
						this._dependencyQuery(schedule.applies_to, 'sys_id', processedCIs, dependencyTypes, precallMaintenanceConflictFn, addMaintenanceWindowFn.bind(this, schedule));
				}
				if (this.lu.atLevel(GSLog.DEBUG))
					this.lu.logDebug('checkMaintenanceSchedulesComposed: Skipped schedule because date is in maintenance window: ' + schedule.name + ' (' + schedule.sys_id + ')');
				continue;
			}

			if (this._appliesToChangeRequest(schedule)) { // if schedule conditions apply to Change Request
				if (this.lu.atLevel(GSLog.DEBUG))
					this.lu.logDebug('checkMaintenanceSchedulesComposed: Schedule applies to Change Request: ' + schedule.name + ' (' + schedule.sys_id + ')');
				if (this._checkConditions(schedule.applies_to, this.sourceRecord, schedule.condition)) {
					this._addConflict(null, conflictType, schedule.sys_id);
					if (this.collectWindowData)
						this._addWindow(null, windowType, schedule.sys_id);
				}
			} else // if schedule applies to Configuration Item
				// Adds dependencies which match the conditions defined by the maintenance schedule
				this._dependencyQuery(schedule.applies_to, 'sys_id', processedCIs, dependencyTypes, precallMaintenanceConflictFn.bind(this, schedule), addMaintenanceConflictFn.bind(this, schedule));
		}
	},

	/**
	 * checks whether any maintenance schedule affects any of the dependencies
	 */
	checkBlackoutSchedulesComposed: function(processedCIs, dependencyTypes, conflictType, windowType) {
		if (this.lu.atLevel(GSLog.DEBUG))
			this.lu.logDebug('checkBlackoutSchedulesComposed: dependecyTypes=' + dependencyTypes);
		var precallBlackoutConflictFn = function(blackout, gr) {
			gr.addEncodedQuery(blackout.condition);
		};
		var addBlackoutConflictFn = function(blackout, dependencyType, gr, ciSysId) {
			if (!this._filterCheckRecord(gr, blackout.condition))
				return;
			this._addDependencyConflict(ciSysId, dependencyType, conflictType, blackout.sys_id, gr.getUniqueValue());
			if (this.collectWindowData)
				this._addDependencyWindow(ciSysId, dependencyType, windowType, blackout.sys_id, gr.getUniqueValue());
		};

		for (var d = 0; d < this.blackouts.length; d++) {
			var blackout = this.blackouts[d];
			if (this.lu.atLevel(GSLog.DEBUG))
				this.lu.logDebug('checkBlackoutSchedulesComposed: Checking blackout schedule for conflicts: ' + blackout.name + ' (' + blackout.sys_id + ')');
			if (!this._increaseProgress(gs.getMessage("Checking blackout schedule {0} for conflicts", [ blackout.name ])))
				return;
			if (this._appliesToChangeRequest(blackout)) { // if schedule conditions apply to Change Request
				if (this.lu.atLevel(GSLog.DEBUG))
					this.lu.logDebug('checkBlackoutSchedulesComposed: Schedule applies to Change Request: ' + blackout.name + ' (' + blackout.sys_id + ')');
				if (this._checkConditions(blackout.applies_to, this.sourceRecord, blackout.condition)) {
					this._addConflict(null, conflictType, blackout.sys_id);
					if (this.collectWindowData)
						this._addWindow(null, ChangeCheckConflictsSNC.BLACKOUT_WINDOW, blackout.sys_id);
				}
			} else // if schedule applies to Configuration Item
				// Adds dependencies which match the conditions defined by the maintenance schedule
				this._dependencyQuery(blackout.applies_to, 'sys_id', processedCIs, dependencyTypes, precallBlackoutConflictFn.bind(this, blackout), addBlackoutConflictFn.bind(this, blackout));
		}
	},

	/**
	 * Increase the progress of the tracker and update its message.
	 * Return false if operation has been canceled
	 */
	_increaseProgress: function(msg) {
		if (!this.tracker.isTracked())
			return true;

		if (this.tracker.isCancelled())
			return false;

		this.tracker.updateDetailMessage(msg);
		this.tracker.incrementProgressValue();

		return true;
	},

	/**
	 * Checks if the specified CI is a business service
	 */
	_isBusinessService: function(ciSysId) {
		if (!ciSysId)
			return false;
		if (!(ciSysId in this.isBusinessServiceCache)) {
			var ciGR = new GlideRecord('cmdb_ci');
			if (ciGR.get(ciSysId)) {
				var ciTable = ciGR.sys_class_name;
				this.isBusinessServiceCache[ciSysId] = (this.ciClassAncestors[ciTable].indexOf('cmdb_ci_service') !== -1);
			} else
				this.isBusinessServiceCache[ciSysId] = false;
		}
		return this.isBusinessServiceCache[ciSysId];
	},

	_isInCIMaintenanceWindow: function(ciMaintenanceWindow) {
		if (!(ciMaintenanceWindow in this.dateInCiMaintenanceWindowCache))
			this.dateInCiMaintenanceWindowCache[ciMaintenanceWindow] =
				ChangeCollisionHelper.isDateInCiMaintenanceWindows(this.startDate, this.endDate, ciMaintenanceWindow, this.bPartial);

		return this.dateInCiMaintenanceWindowCache[ciMaintenanceWindow];
	},

	/**
	 * Check whether a schedule applies to a change, given the type of configuration item.
	 * Returns true if Applies to table extends "Change Request", or extends the table of the configuration item
	 * @param scheduleAppliesToTable Table defined in the "Applies to" field of the schedule
	 * @param ciTable Configuration Item table
	 */
	_doesScheduleApplies: function(schedule, ciTable) {
		return (this.ciClassAncestors[ciTable].indexOf(schedule.applies_to) !== -1
			|| this._appliesToChangeRequest(schedule));
	},

	_appliesToChangeRequest: function(schedule) {
		return (this.changeClassAncestors[this.sourceRecord.getRecordClassName()].indexOf(schedule.applies_to) !== -1);
	},

	/**
	 * Checks whether the schedule applies to the given GlideRecord.
	 */
	_appliesToRecord: function(schedule, gr) {
		var className = gr.sys_class_name + "";

		if (this.ciClassAncestors[className] && this.ciClassAncestors[className].indexOf(schedule.applies_to) !== -1)
			return true;

		if (this.changeClassAncestors[className] && this.changeClassAncestors[className].indexOf(schedule.applies_to) !== -1)
			return true;

		return false;
	},

	_checkConditions: function(appliesTo, ciGR, condition) {
		if (JSUtil.nil(condition))
			return true;

		var record;
		// if Applies to is change_request (sub)type, we use the current Change Request record, otherwise we use the CI record
		if (this.changeClassAncestors[this.sourceRecord.getRecordClassName()].indexOf(appliesTo) !== -1)
			record = this.sourceRecord;
		else
			record = ciGR;

		return this._filterCheckRecord(record, condition);
	},

	/**
	 * Create and Add a conflict to the conflict handler ciGR is the CI (or affected CI being checked if in advanced mode)
	 * conflictType being added. conflictingElementId can be either a change sys_id or a schedule sys_id relatedCIId. this
	 * parameter will be used if the conflict happens on the CI's child or parent
	 *
	 * @param GlideRecord
	 * @param string
	 * @param int
	 */
	_addConflict: function(ciSysId, conflictType, conflictingElementId, relatedCIId) {

		if (this.lu.atLevel(GSLog.DEBUG))
			this.lu.logDebug('_addConflict: ciSysId='+ciSysId + ', conflictType='+conflictType+', conflictingElementId=' + conflictingElementId + ', relatedCIId='+relatedCIId);

		// Not interested in saving conflict information if it is a dry run
		if (this.dryRun)
			return;

		//we make sure that the current change does not conflict with itself
		if ((this.sourceRecord.getUniqueValue() === String(conflictingElementId))
				&& (conflictType === ChangeConflict.CHANGETYPE_ALREADY_SCHEDULED || ChangeConflict.CHANGETYPE_CHILD_ALREADY_SCHEDULED || ChangeConflict.CHANGETYPE_PARENT_ALREADY_SCHEDULED))
			return;

		var impactedService;
		if (this._isBusinessService(ciSysId))
			impactedService = ciSysId;
		else
			if (this.bIdentifyMostCritical)
				impactedService = this._getMostCriticalService(ciSysId);

		switch (conflictType) {

			case ChangeConflict.CHANGETYPE_ALREADY_SCHEDULED:
			case ChangeConflict.CHANGETYPE_ASSIGNED_TO_ALREADY_SCHEDULED:
				this.conflictHandler.addChangeConflict(new ChangeConflict(ciSysId, this.sourceRecord.getUniqueValue(), conflictType, conflictingElementId, null, null, impactedService));
				this._addConflictingChange(conflictingElementId, ciSysId, conflictType, null, impactedService);
				break;

			case ChangeConflict.CHANGETYPE_NOT_IN_WINDOW:
			case ChangeConflict.CHANGETYPE_BLACKOUT:
				this.conflictHandler.addChangeConflict(new ChangeConflict(ciSysId, this.sourceRecord.getUniqueValue(), conflictType, null, conflictingElementId, null, impactedService));
				break;

			case ChangeConflict.CHANGETYPE_CHILD_ALREADY_SCHEDULED:
			case ChangeConflict.CHANGETYPE_PARENT_ALREADY_SCHEDULED:
				this.conflictHandler.addChangeConflict(new ChangeConflict(ciSysId, this.sourceRecord.getUniqueValue(), conflictType, conflictingElementId, null, relatedCIId, impactedService));
				this._addConflictingChange(conflictingElementId, ciSysId, conflictType, relatedCIId, impactedService);
				break;

			case ChangeConflict.CHANGETYPE_CHILD_NOT_IN_WINDOW:
			case ChangeConflict.CHANGETYPE_PARENT_NOT_IN_WINDOW:
			case ChangeConflict.CHANGETYPE_CHILD_BLACKOUT:
			case ChangeConflict.CHANGETYPE_PARENT_BLACKOUT:
				this.conflictHandler.addChangeConflict(new ChangeConflict(ciSysId, this.sourceRecord.getUniqueValue(), conflictType, null, conflictingElementId, relatedCIId, impactedService));
				break;

			default:
				break;
		}

		if (conflictingElementId)
			this.changeIds[conflictingElementId] = conflictingElementId;
	},

	_addConflictingChange: function (conflictingElementId, ciSysId, conflictType, relatedCIId) {
		var conflictGR = new GlideRecord("conflict");
		conflictGR.addQuery("change", conflictingElementId);
		conflictGR.addQuery("conflicting_change", this.sourceRecord.getUniqueValue());
		conflictGR.addQuery("type", conflictType);
		if (!this.bConsolidatedConflicts) {
			conflictGR.addQuery("configuration_item", ciSysId);
			conflictGR.addQuery("related_configuration_item", relatedCIId);
		}
		conflictGR.setLimit(1);
		conflictGR.query();
		if (conflictGR.hasNext())
			return;
		else
			this.conflictHandler.addChangeConflict(new ChangeConflict(ciSysId, conflictingElementId, conflictType, this.sourceRecord.getUniqueValue(), null, relatedCIId));
	},

	_addWindow: function (ciSysId, windowType, windowElementId, relatedCIId, startDate, endDate) {
		switch (windowType) {
			case ChangeCheckConflictsSNC.MAINTENANCE_WINDOW:
			case ChangeCheckConflictsSNC.MAINTENANCE_WINDOW_FROM_CHILD:
			case ChangeCheckConflictsSNC.MAINTENANCE_WINDOW_FROM_PARENT:
				if (!this._windowData.maintenance[ciSysId])
					this._windowData.maintenance[ciSysId] = [];
				this._windowData.maintenance[ciSysId].push({
					type: windowType,
					scheduleId: windowElementId,
					relatedCiId: relatedCIId
				});
				break;
			case ChangeCheckConflictsSNC.BLACKOUT_WINDOW:
			case ChangeCheckConflictsSNC.BLACKOUT_WINDOW_FROM_CHILD:
			case ChangeCheckConflictsSNC.BLACKOUT_WINDOW_FROM_PARENT:
				if (!this._windowData.blackout[ciSysId])
					this._windowData.blackout[ciSysId] = [];
				this._windowData.blackout[ciSysId].push({
					scheduleId: windowElementId
				});
				break;
			case ChangeCheckConflictsSNC.ASSIGNED_TO_ALREADY_SCHEDULED:
			case ChangeCheckConflictsSNC.CI_ALREADY_SCHEDULED:
				// In this case the ciSysId is a change_request
				if (this._windowData.scheduled[ciSysId])
					break;
				this._windowData.scheduled[ciSysId] = {
					start: startDate,
					end: endDate
				};
				break;
			default:
				break;
		}
	},

	getWindowData: function () {
		if (!this.collectWindowData)
			throw "Window data collection not turned on.";
		return this._windowData;
	},

	updateConflictDetectionFields: function(conflictLastRun) {
		var changeGr = new GlideRecord("change_request");
		changeGr.addActiveQuery();
		var joinQuery = changeGr.addJoinQuery("conflict", "sys_id", "conflicting_change");
		joinQuery.addCondition("change", this.sourceRecord.getUniqueValue());
		changeGr.setValue("conflict_status", "Conflict");
		changeGr.setValue("conflict_last_run", conflictLastRun);
		changeGr.updateMultiple();
	},

	/**
	 * This gets all the changes on the given CI taking place between current change start date and end date, but also all the
	 * changes that have the given CI in their. Affected CI list. Note that all this changes are conflicting changes
	 *
	 * @param int ciId
	 * @returns Array
	 */
	_getChangesWithCIs: function(ciId) {

		// (1) Find sys_ids of all change_requests that share cmdb_ci items in their affected item related lists and that reside within the start and end date of the current change_request
		var affectedCisConflicts = ChangeCollisionHelper.getChangesWithAffectedCi(ciId, this.startDate, this.endDate);

		// (2) Find sys_ids of all change requests that share the same cmdb_ci item as the current change_request and that reside within the start and end date of the current change_request
		var cisConflicts = ChangeCollisionHelper.getChangesWithCi(ciId, this.startDate, this.endDate, this.sourceRecord);

		// (3) Return the union of all the change_request sys_ids which you have found
		var conflicts = {};
		var index;
		for (index = 0; index < affectedCisConflicts.length; ++index)
			conflicts[affectedCisConflicts[index]] = null;
		for (index = 0; index < cisConflicts.length; ++index)
			conflicts[cisConflicts[index]] = null;
		return conflicts;
	},

	_getChangesWithCommonCIs: function(mapCISysIds) {
		var arrArr = [];
		var count = 0;
		var n = 0;
		arrArr[0] = [];
		for ( var strCiSysId in mapCISysIds) {
			if (count > 2000) {
				count = 0;
				n++;
				arrArr[n] = [];
			}
			arrArr[n][count] = strCiSysId;
			count++;
		}

		var affectedCisConflicts = [];
		var cisConflicts = [];
		for (var i = 0; i < arrArr.length; i++) {
			var ids = arrArr[i].join(",");
			var changeRequestGR = new GlideRecord('change_request');
			changeRequestGR.addQuery("JOINchange_request.sys_id=task_ci.task!ci_itemIN" + ids);
			changeRequestGR.addActiveQuery();
			ChangeCollisionHelper.addQueryDateRange(changeRequestGR, this.startDate, this.endDate, '', this.bAllowContiguousChanges);
			changeRequestGR.query();
			while (changeRequestGR.next())
				affectedCisConflicts.push(changeRequestGR.sys_id.toString());

			var changeRequestGR2 = new GlideRecord('change_request');
			changeRequestGR2.addActiveQuery();
			changeRequestGR2.addQuery('cmdb_ci', 'IN', ids);
			if (this.sourceRecord)
				changeRequestGR2.addQuery('sys_id', '!=', this.sourceRecord.getUniqueValue());

			ChangeCollisionHelper.addQueryDateRange(changeRequestGR2, this.startDate, this.endDate, '', this.bAllowContiguousChanges);
			changeRequestGR2.query();
			while (changeRequestGR2.next())
				cisConflicts.push(changeRequestGR2.sys_id.toString());
		}

		var conflicts = {};
		var index;
		for (index = 0; index < affectedCisConflicts.length; ++index)
			conflicts[affectedCisConflicts[index]] = null;
		for (index = 0; index < cisConflicts.length; ++index)
			conflicts[cisConflicts[index]] = null;
		return conflicts;
	},

	getAffectedCisByChangeId: function(changeId) {
		var affectedCiIds = [];
		var affectedCiGR = new GlideRecord('task_ci');
		affectedCiGR.addQuery('task', changeId);
		affectedCiGR.query();

		while (affectedCiGR.next()) {
			var strSysId = affectedCiGR.ci_item.toString();
			affectedCiIds[strSysId] = strSysId;
			this.processedCICount++;
		}
		return affectedCiIds;
	},

	buildMaintenanceWindowInfo: function() {
		var key;
		var dateInCiMaintenanceWindows = {};
		// Window data consists of change_requests, blackout and maintenance schedules
		// It does not store information about conflict, hence this information is not required.
		if (this.collectWindowData)
			return dateInCiMaintenanceWindows;
		for (var index = 0; index < this.maintenanceSchedules.length; index++) {
			key = this.maintenanceSchedules[index].sys_id.toString();
			dateInCiMaintenanceWindows[key] = ChangeCollisionHelper.isDateInCiMaintenanceWindows(this.startDate, this.endDate, key, this.bPartial);
		}
		return dateInCiMaintenanceWindows;
	},

	buildAncestorClassInfo: function(baseClass) {
		return ChangeCheckConflictsSNC.buildAncestorClassInfo(baseClass);
	},

	buildConfigItemInfo: function() {
		var processedCIs = {};
		var strCiSysId = this.sourceRecord.cmdb_ci.toString();
		if (this.bCheckConflictModeAdvanced) {
			// Advanced mode - We add the change request's CI in the Affected CIs List
			if (strCiSysId && !ChangeCollisionHelper.isCiInAffectedCis(strCiSysId, this.sourceRecord.getUniqueValue()))
				ChangeCollisionHelper.addCiToChangeAffectedCis(strCiSysId, this.sourceRecord.getUniqueValue());

			processedCIs = this.getAffectedCisByChangeId(this.sourceRecord.getUniqueValue());
		} else {
			// Basic mode - We check only the change request's CI
			if (strCiSysId){
				processedCIs[strCiSysId] = strCiSysId;
				this.processedCICount = 1;
			}
		}
		return processedCIs;
	},

	buildConfigItemToChangeRequestMappings: function(buildWithChangeIdOnly) {
		var arrChangeRequests = this._getChangesWithCommonCIs(this.processedCIs);
		var mapCI2CR = {};
		for ( var strChangeRequestSysId in arrChangeRequests) {
			if (arrChangeRequests.hasOwnProperty(strChangeRequestSysId)) {
				// The change sys_id is the only information used, don't return the whole change request
				// The boolean is used to support the legacy behaviour of returning a GlideRecord instance
				var changeRequestInfo;
				if (buildWithChangeIdOnly === true)
					changeRequestInfo = strChangeRequestSysId;
				else
					changeRequestInfo = new ChangeRequestInfo(this.glideRecordUtil.getGR("change_request", strChangeRequestSysId));

				var recTaskCi = new GlideRecord("task_ci");
				recTaskCi.addQuery("task", strChangeRequestSysId);
				recTaskCi.query();
				while (recTaskCi.next()) {
					var strCiSysId = recTaskCi.ci_item.toString();
					if (this.processedCIs[strCiSysId]) {
						if (!mapCI2CR[strCiSysId])
							mapCI2CR[strCiSysId] = {};
						mapCI2CR[strCiSysId][strChangeRequestSysId] = changeRequestInfo;
					}
				}
			}
		}
		return mapCI2CR;
	},

	/**
	 * Defines the type of conflicts for each change type
	 */
	buildConflictTypes: function() {
		var conflictTypes = {};
		conflictTypes[ChangeConflict.CHANGETYPE_ALREADY_SCHEDULED] = {};
		conflictTypes[ChangeConflict.CHANGETYPE_ALREADY_SCHEDULED][ChangeCheckConflictsSNC.PARENTS] = ChangeConflict.CHANGETYPE_PARENT_ALREADY_SCHEDULED;
		conflictTypes[ChangeConflict.CHANGETYPE_ALREADY_SCHEDULED][ChangeCheckConflictsSNC.CHILDREN] = ChangeConflict.CHANGETYPE_CHILD_ALREADY_SCHEDULED;

		conflictTypes[ChangeCheckConflictsSNC.ASSIGNED_TO_ALREADY_SCHEDULED] = {};

		conflictTypes[ChangeConflict.CHANGETYPE_NOT_IN_WINDOW] = {};
		conflictTypes[ChangeConflict.CHANGETYPE_NOT_IN_WINDOW][ChangeCheckConflictsSNC.PARENTS] = ChangeConflict.CHANGETYPE_PARENT_NOT_IN_WINDOW;
		conflictTypes[ChangeConflict.CHANGETYPE_NOT_IN_WINDOW][ChangeCheckConflictsSNC.CHILDREN] = ChangeConflict.CHANGETYPE_CHILD_NOT_IN_WINDOW;

		conflictTypes[ChangeConflict.CHANGETYPE_BLACKOUT] = {};
		conflictTypes[ChangeConflict.CHANGETYPE_BLACKOUT][ChangeCheckConflictsSNC.PARENTS] = ChangeConflict.CHANGETYPE_PARENT_BLACKOUT;
		conflictTypes[ChangeConflict.CHANGETYPE_BLACKOUT][ChangeCheckConflictsSNC.CHILDREN] = ChangeConflict.CHANGETYPE_CHILD_BLACKOUT;
		return conflictTypes;
	},

	/**
	 * Defines the type of windows for each window type
	 */
	buildWindowTypes: function() {
		var windowTypes = {};
		windowTypes[ChangeCheckConflictsSNC.MAINTENANCE_WINDOW] = {};
		windowTypes[ChangeCheckConflictsSNC.MAINTENANCE_WINDOW][ChangeCheckConflictsSNC.PARENTS] = ChangeCheckConflictsSNC.MAINTENANCE_WINDOW_FROM_PARENT;
		windowTypes[ChangeCheckConflictsSNC.MAINTENANCE_WINDOW][ChangeCheckConflictsSNC.CHILDREN] = ChangeCheckConflictsSNC.MAINTENANCE_WINDOW_FROM_CHILD;

		windowTypes[ChangeCheckConflictsSNC.BLACKOUT_WINDOW] = {};
		windowTypes[ChangeCheckConflictsSNC.BLACKOUT_WINDOW][ChangeCheckConflictsSNC.PARENTS] = ChangeCheckConflictsSNC.BLACKOUT_WINDOW_FROM_PARENT;
		windowTypes[ChangeCheckConflictsSNC.BLACKOUT_WINDOW][ChangeCheckConflictsSNC.CHILDREN] = ChangeCheckConflictsSNC.BLACKOUT_WINDOW_FROM_CHILD;
		return windowTypes;
	},

	/**
	 * Executes an IN query with the given array of values in the specified table
	 * The query will be 'key IN inValues'. inValues array will be splitted into bunch of 1000, executing a query for each of them
	 * The callback function will be called for each resulting record
	 * precall is called before the query to further customize the query
	 */
	_inQuery: function(table, key, inValues, precall, callback) {
		for (var i=0; i< (inValues.length/1000); i++) {
			var sliced = inValues.slice(i*1000, (i+1)*1000);
			var gr = new GlideRecord(table);
			if (!gr.isValid()) {
				gs.warn(gs.getMessage("Table {0} does not exist. Check maintenance/blackout schedules refer to existing tables", table));
				return;
			}
			if (precall)
				precall(gr);
			gr.addQuery(key, "IN" , sliced);
			gr.query();
			while(gr.next())
				callback(gr);
		}
	},

	/**
	 * Executes queries taking into account CI dependencies.
	 * dependencyTypes array drives which dependencies (direct, parent, children) will be checked
	 * The callback function will be called for each resulting record
	 * precall is called before the query to further customize the query
	 */
	_dependencyQuery: function(table, key, dependants, dependencyTypes, precall, callback) {
		if (JSUtil.nil(table) || !(new GlideRecord(table).isValid())) {
			gs.warn(gs.getMessage("Table {0} does not exist. Check maintenance/blackout schedules refer to existing tables", table));
			return;
		}
		if (this.arrayUtil.contains(dependencyTypes, ChangeCheckConflictsSNC.DIRECT))
			this._inQuery(table, key, dependants, precall, callback.bind(this, ChangeCheckConflictsSNC.DIRECT));
		if (this.arrayUtil.contains(dependencyTypes, ChangeCheckConflictsSNC.PARENTS))
			this._queryRelated(table, key, dependants, 'cmdb_rel_ci', 'child', 'parent', precall, callback.bind(this, ChangeCheckConflictsSNC.PARENTS));
		if (this.arrayUtil.contains(dependencyTypes, ChangeCheckConflictsSNC.CHILDREN))
			this._queryRelated(table, key, dependants, 'cmdb_rel_ci', 'parent', 'child', precall, callback.bind(this, ChangeCheckConflictsSNC.CHILDREN));
 		if (this.bCheckConflictRelatedServices)
			this._queryRelated(table, key, dependants, 'svc_ci_assoc', 'ci_id', 'service_id', precall, callback.bind(this, ChangeCheckConflictsSNC.PARENTS));
	},

	/**
	 * Executes a query to the specified relationship table. Then it uses the _inQuery method to query all the dependencies found at once.
	 * Optionally (if ignoreDependant is false), the relationship table will be queried again to obtain the dependant of each of the
	 * resulting dependencies (those matching the query conditions)
	 * The callback function will be called for each resulting record
	 * precall is called before the query to further customize the query
	 */
	_queryRelated: function(table, key, dependants, tableRel, dependendantKey, dependencyKey, precall, callback, ignoreDependant) {
		if (this.lu.atLevel(GSLog.DEBUG))
			this.lu.logDebug('_queryRelated: table='+ table +', key=' + key + ', dependants=' + dependants + ', tableRel=' + tableRel +
							 ', dependendantKey=' + dependendantKey +', dependendantKey=' + dependencyKey);
		var relatedCallback = function(sliced, gr) {
			if (ignoreDependant)
				callback(gr);
			else {
				var gr2 = new GlideRecord(tableRel);
				gr2.addQuery(dependencyKey, gr.getUniqueValue());
				gr2.addQuery(dependendantKey, 'IN', sliced);
				gr2.query();
				while(gr2.next())
					callback(gr, String(gr2.getValue(dependendantKey)));
			}
		};
		for (var i=0; i< (dependants.length/1000); i++) {
			var sliced = dependants.slice(i*1000, (i+1)*1000);
			var dependencies = [];
			var gr = new GlideAggregate(tableRel);
			gr.addQuery(dependendantKey, 'IN', sliced);
			gr.groupBy(dependencyKey);
			gr.query();
			while(gr.next()) {
				dependencies.push(String(gr.getValue(dependencyKey)));
				if (dependencies.length === 1000) {
					this._inQuery(table, key, dependencies, precall, relatedCallback.bind(this, sliced));
					dependencies = [];
				}
			}
			if (dependencies.length > 0)
				this._inQuery(table, key, dependencies, precall, relatedCallback.bind(this, sliced));
		}
	},

	/**
	 * Gets the most critical business service impacted by a given configuration item.
	 * If more than one services has the same criticality, it returns the first element order alphabetically by name
	 * Returns empty string if no service is impacted by the CI
	 * @param ciSysId sys_id of the configuration item
	 */
	_getMostCriticalService: function(ciSysId) {
		if (!ciSysId)
			return ciSysId;
		if (this.lu.atLevel(GSLog.DEBUG))
			this.lu.logDebug('_getMostCriticalService: ciSysId='+ ciSysId);
		if (! (ciSysId in this.mostCriticalServiceCache)) {
			var serviceId;
			var currentCriticality;
			var currentName;
			this._queryRelated('cmdb_ci_service', 'sys_id', [ciSysId], 'svc_ci_assoc', 'ci_id', 'service_id', (function(gr) {
				gr.orderBy("busines_criticality");
				gr.orderBy("name");
				gr.setLimit(1);
			}).bind(this), (function(gr){
				var criticality = String(gr.getValue('busines_criticality'));
				if (!serviceId ||
					criticality < currentCriticality ||
					(criticality === criticality && String(gr.getValue('name') < currentName))) {
					serviceId = gr.getUniqueValue();
					currentCriticality = criticality;
					currentName = String(gr.getValue('name'));
				}
			}).bind(this), true);
			this.mostCriticalServiceCache[ciSysId] = serviceId? serviceId : "";
			if (this.lu.atLevel(GSLog.DEBUG))
				this.lu.logDebug('_getMostCriticalService: ciSysId='+ ciSysId +' Most Critical service: ' + this.mostCriticalServiceCache[ciSysId]);
		}
		return this.mostCriticalServiceCache[ciSysId];
	},

	_addDependencyWindow: function(ciSysId, dependencyType, windowType, conflictingElementId, conflictingCIId) {
		 if (this.lu.atLevel(GSLog.DEBUG))
			this.lu.logDebug('_addDependencyWindow: Adding window: ' + 'ciSysId=' + ciSysId + ', dependencyType=' + dependencyType +
							 ', windowType='+ windowType +', conflictingElementId='+ conflictingElementId + ', conflictingCIId=' + conflictingCIId);
		if (dependencyType === ChangeCheckConflictsSNC.DIRECT)
			this._addWindow(conflictingCIId, windowType, conflictingElementId);
		else
			this._addWindow(ciSysId,this.windowTypes[windowType][dependencyType], conflictingElementId, conflictingCIId);

	},

	_addDependencyConflict: function(ciSysId, dependencyType, conflictType, conflictingElementId, conflictingCIId) {
		if (this.lu.atLevel(GSLog.DEBUG))
			this.lu.logDebug('_addDependencyConflict: Adding conflict: ' + 'ciSysId=' + ciSysId + ', dependencyType=' + dependencyType +
							 ', conflictType='+ conflictType +', conflictingElementId='+ conflictingElementId + ', conflictingCIId=' + conflictingCIId);
		if (dependencyType === ChangeCheckConflictsSNC.DIRECT)
			this._addConflict(conflictingCIId, conflictType, conflictingElementId);
		// Do not generate a conflict if the ciSysId and conflictingCIId are the same.
		// Likely svc_ci_assoc mapping of "Service CI" to the "Service", which can be the same item.
		else if (ciSysId !== conflictingCIId)
			this._addConflict(ciSysId, this.conflictTypes[conflictType][dependencyType], conflictingElementId, conflictingCIId);
	},

	_filterCheckRecord: function(record, condition) {
		if (JSUtil.nil(condition))
			return true;

		var filter = new GlideFilter(condition, "rule-condition");
		filter.setCaseSensitive(this.bFilterCaseSensitive);
		return filter.match(record, true);
	},

	type: 'ChangeCheckConflictsSNC'
};

ChangeRequestInfo.prototype = {
	initialize: function(changeGR) {
		this.sys_id = changeGR.sys_id.toString();
		this.start_date = changeGR.start_date.toString();
		this.end_date = changeGR.end_date.toString();
		this.sys_class_name = changeGR.sys_class_name.toString();
	}
};

ConflictExecutionTracker.prototype = {
	initialize: function(sourceRecord){
		if (!sourceRecord || !sourceRecord.isValid())
			return;

		this.tracker = SNC.GlideExecutionTracker.getLastRunning();
		if (!this.tracker.getSysID()) {
			this.tracker = null;
			return;
		}

		this.tracker.setSourceTable(sourceRecord.getRecordClassName());
		this.tracker.setSource(sourceRecord.getUniqueValue());
	},

	run: function() {
		if (!this.isTracked())
			return;

		this.tracker.run();
	},

	setMaxProgressValue: function(value) {
		if (!this.isTracked())
			return;

		this.tracker.setMaxProgressValue(value - 0);
	},

	incrementProgressValue: function() {
		if (!this.isTracked())
			return;

		this.tracker.incrementProgressValue();
	},

	updateDetailMessage: function(message) {
		if (!this.isTracked())
			return;

		this.tracker.updateDetailMessage(message || "");
	},

	success: function(message) {
		if (!this.isTracked())
			return;

		this.tracker.success(message || "");
	},

	// We detect a cancellation if percentage complete has hit 100 (GlideExecutionTracker.isCancelled() is not provided unfortunately...)
	isCancelled: function(){
		if (!this.isTracked() || this.tracker.getPercentComplete() !== 100)
			return false;

		var execTrackGR = new GlideRecord("sys_execution_tracker");
		if (!execTrackGR.get(this.tracker.getSysID()))
			return false;

		return execTrackGR.getValue("state") === "4"; // 4 = Cancelled
	},

	isTracked: function() {
		return this.tracker !== null;
	},

	type: "ConflictExecutionTracker"
};
```