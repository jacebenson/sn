---
title: "ChangeCollisionHelper"
id: "changecollisionhelper"
---

API Name: global.ChangeCollisionHelper

```js
var ChangeCollisionHelper = Class.create();

ChangeCollisionHelper.getCiById = function(cIId) {

	var glideRecordUtil = new GlideRecordUtil();
	return glideRecordUtil.getGR("cmdb_ci", cIId);

};

ChangeCollisionHelper.getConditionalMaintenanceSchedules = function() {

	var maintenanceSchedules = [];

	var scheduleGR = new GlideRecord('cmn_schedule_maintenance');
	scheduleGR.addNotNullQuery('applies_to');
	scheduleGR.query();
	while(scheduleGR.next())
		maintenanceSchedules.push({sys_id : scheduleGR.sys_id.toString(),
			condition : scheduleGR.condition.toString(),
			name : scheduleGR.name.toString(),
			applies_to : scheduleGR.applies_to.toString()}
		);

	return maintenanceSchedules;
};

/**
 * Checks if the time span defined by startDate and endDate falls wholly/partially in the
 * CI's maintenance window
 *
 * @param configuration item's sys_id
 * @param startDate
 * @param endDate
 * @param bPartial (optional) default is false. When true checks partial overlap instead of whole.
 * @return boolean
 */
ChangeCollisionHelper.isDateInCiMaintenanceWindows = function(startDate, endDate, maintenanceWindow, bPartial) {
	// Create new GlideDateTime equal to endDate so if manipulated the change will not persist
	var workingEndDate = new GlideDateTime(endDate);

	if (startDate.equals(workingEndDate))
		workingEndDate.add(1000);

	var sched = new GlideSchedule(maintenanceWindow);

	// check maintenance window is valid
	if (!sched.isValid())
		return true;

	// check maintenance window
	var duration;
	var rollingStartDate = new GlideDateTime();
	var rollingEndDate = new GlideDateTime(startDate);
	do {
		rollingStartDate.setGlideDateTime(rollingEndDate);
		rollingEndDate.addYearsLocalTime(1);
		if (rollingEndDate.after(workingEndDate))
			rollingEndDate.setValue(workingEndDate);
		// does schedule overlap itself within (startDate, workingEndDate) range?
		duration = sched.duration(rollingStartDate, rollingEndDate);
	} while(duration.getNumericValue() === 0 && rollingEndDate.before(workingEndDate));

	var schedule_time = parseInt(duration.getNumericValue() / 1000);
	if (bPartial) {
		if (schedule_time === 0)
			return false;
		return true;
	}

	var wall_clock_time = parseInt(gs.dateDiff(startDate.getDisplayValue(), workingEndDate.getDisplayValue(), true));
	if (wall_clock_time !== schedule_time)
		return false;

	// Default Case: Assume date is within maintenance window for all other cases
	return true;
};

ChangeCollisionHelper.getCiMaintenanceSchedule = function(ci) {
	var maintenanceSchedule = null;
	var g = new GlideRecord('cmn_schedule');
	g.addQuery("JOINcmn_schedule.sys_id=cmdb_ci.maintenance_schedule!sys_id=" + ci);
	g.query();
	if (g.next())
		maintenanceSchedule = g.sys_id.toString();
	return maintenanceSchedule;
};

ChangeCollisionHelper.getCiMaintenanceScheduleByGR = function(ciGR) {
	return ciGR.maintenance_schedule + "";
};

/**
 * Gets any blackout that overlap the period defined by startDate and endDate
 *
 * @param startDate
 * @param endDate
 * @return Array(blackoutId:stringSpan)
 */
ChangeCollisionHelper.getBlackoutsByDate = function(startDate, endDate) {
	// Create new GlideDateTime equal to endDate so if manipulated the change will not persist
	var workingEndDate = new GlideDateTime(endDate);

	if (startDate.equals(workingEndDate))
		workingEndDate.add(1000);

	var blackoutList = [];
	var scheduleGR = new GlideRecord('cmn_schedule_blackout');
	scheduleGR.addQuery('type', 'blackout');
	scheduleGR.query();
	while (scheduleGR.next()) {
		var scheduleId = scheduleGR.sys_id.toString();
		var sched = new GlideSchedule(scheduleId);

		var duration;
		var rollingStartDate = new GlideDateTime();
		var rollingEndDate = new GlideDateTime(startDate);
		do {
			rollingStartDate.setGlideDateTime(rollingEndDate);
			rollingEndDate.addYearsLocalTime(1);
			if (rollingEndDate.after(workingEndDate))
				rollingEndDate.setValue(workingEndDate);
			// does schedule overlap itself within (startDate, workingEndDate) range?
			duration = sched.duration(rollingStartDate, rollingEndDate);
		} while(duration.getNumericValue() === 0 && rollingEndDate.before(workingEndDate));

		if (duration.getNumericValue() > 0){
			// caller expects Schedule IDs but does not use value
			blackoutList.push({sys_id:scheduleGR.sys_id.toString(),
			condition:scheduleGR.condition.toString(),
			name: scheduleGR.name.toString(),
			applies_to: scheduleGR.applies_to.toString()}
			);
		}
	}
	return blackoutList;
};

/**
 * Get changes scheduled in the timespan (defined by startDate and endDate) that
 * have the given CI in their affected CIs List
 *
 * @param CI's sys_id
 * @param startDate
 * @param endDate
 *
 * @return Array changeIds
 */
ChangeCollisionHelper.getChangesWithAffectedCi = function(ci, startDate, endDate) {
	var changeIds = [];

	var changeRequestGR = new GlideRecord('change_request');
	changeRequestGR.addActiveQuery();
	changeRequestGR.addQuery("JOINchange_request.sys_id=task_ci.task!ci_item=" + ci);
	ChangeCollisionHelper.addQueryDateRange(changeRequestGR, startDate, endDate);
	changeRequestGR.query();

	while (changeRequestGR.next())
		changeIds.push(changeRequestGR.sys_id.toString());
	return changeIds;
};

/**
 * Get the changes that are in the timespan (startDate, endDate) and that are
 * link to the given ci ci Ci's sys_id startDate endDate excludeCR (optional) -
 * change_request record to exclude from search
 *
 * @return Array changeIds
 */
ChangeCollisionHelper.getChangesWithCi = function(ci, startDate, endDate, excludeCR) {
	var changeIds = [];

	var changeRequestGR = new GlideRecord('change_request');
	changeRequestGR.addActiveQuery();
	changeRequestGR.addQuery('cmdb_ci', ci);
	if (excludeCR)
		changeRequestGR.addQuery('sys_id', '!=', excludeCR.sys_id);
	ChangeCollisionHelper.addQueryDateRange(changeRequestGR, startDate, endDate);
	changeRequestGR.query();

	while (changeRequestGR.next())
		changeIds.push(changeRequestGR.sys_id.toString());
	return changeIds;
};

/**
 * Gets the affected CI Ids for the given change
 *
 * @param changeId
 * @return array
 */
ChangeCollisionHelper.getAffectedCisByChangeId = function(changeId) {
	var affectedCiIds = [];
	var affectedCiGR = new GlideRecord('task_ci');
	affectedCiGR.addQuery('JOINtask.sys_id=task_ci.task');
	affectedCiGR.addQuery('task', changeId);
	affectedCiGR.query();

	while (affectedCiGR.next())
		affectedCiIds.push(affectedCiGR.ci_item.toString());
	return affectedCiIds;
};

/**
 * Get impacted services due to the conflicts identified in the change.
 * It gets (an array of sys_ids containing) all the services which depends on any of the conflicting CIs
 */
ChangeCollisionHelper.getImpactedServicesByChangeId = function(changeId) {
	var services = [];
	var arrayUtil = new ArrayUtil();

	// gets dependency services
	var gr = new GlideAggregate('svc_ci_assoc');
	var grSQ = gr.addJoinQuery('conflict', 'ci_id', 'configuration_item');
	grSQ.addCondition('change', changeId);
	gr.groupBy('service_id');
	gr.query();
	while(gr.next())
		services.push(gr.service_id + "");

	// gets the Business Services directly impacted
	gr = new GlideRecord('cmdb_ci_service');
	grSQ = gr.addJoinQuery('conflict', 'sys_id', 'configuration_item');
	grSQ.addCondition('change', changeId);
	gr.query();

	while(gr.next())
		services.push(gr.sys_id + "");

	return arrayUtil.unique(services);
};

/**
 * Add CI to the change's affected CI list
 */
ChangeCollisionHelper.addCiToChangeAffectedCis = function(ci, changeId) {
	var affectedCiGR = new GlideRecord('task_ci');
	affectedCiGR.task = changeId;
	affectedCiGR.ci_item = ci;
	affectedCiGR.insert();
};

/**
 * check if an ci is already in the change's affected CIs list
 */
ChangeCollisionHelper.isCiInAffectedCis = function(ci, changeId) {
	var affectedCiGR = new GlideRecord('task_ci');
	affectedCiGR.addQuery('ci_item', ci);
	affectedCiGR.addQuery('task', changeId);
	affectedCiGR.query();

	return (affectedCiGR.next());
};

/**
 * Get all the CIs that depend on the given CI
 *
 * return an Array of CI sys_ids (as strings)
 */
ChangeCollisionHelper.getDependants = function(ci, returnGlideRecords) {
	var dependents = [];
	var cc = new GlideRecord('cmdb_rel_ci');
	cc.addQuery('child', ci);
	cc.query();

	if (returnGlideRecords)
		return cc.hasNext() ? cc : false;
	else {
		while (cc.next())
			dependents.push(cc.parent.toString());

		return dependents;
	}
};

/**
 * Get all the CIs that the given CI depends on
 *
 * return an Array of CI sys_ids (as strings)
 */
ChangeCollisionHelper.getDependencies = function(ci, returnGlideRecords) {
	var dependencies = [];
	var cc = new GlideRecord('cmdb_rel_ci');
	cc.addQuery('parent', ci);
	cc.query();

	if (returnGlideRecords)
		return cc.hasNext() ? cc : false;
	else {
		while (cc.next())
			dependencies.push(cc.child.toString());

		return dependencies;
	}
};

/**
 * allowContiguousChanges boolean
 *
 * Add query conditions for
 * start_date >= startDate and start_date <= endDate
 * end_date >= startDate and end_date <= endDate
 * end_date >= endDate and start_date <= startDate
 *
 * If allowContiguousChanges is true it will not check for
 * start_date = endDate or end_date = startDate.
 */
ChangeCollisionHelper.addQueryDateRange = function(gr, startDate, endDate, tablePrefix, allowContiguousChanges) {
	if (!tablePrefix)
		tablePrefix = '';
	var queryCondition = gr.addQuery(tablePrefix+'start_date', '9999-12-31 23:59:59');

	var startDateQueryCondition = queryCondition.addOrCondition(tablePrefix+'start_date', '>=', startDate);
	startDateQueryCondition.addCondition(tablePrefix+'start_date', allowContiguousChanges ? '<' : '<=', endDate);

	var endDateQueryCondition = queryCondition.addOrCondition(tablePrefix+'end_date', allowContiguousChanges ? '>' : '>=', startDate);
	endDateQueryCondition.addCondition(tablePrefix+'end_date', '<=', endDate);

	var overallQueryCondition = queryCondition.addOrCondition(tablePrefix+'end_date', '>=', endDate);
	overallQueryCondition.addCondition(tablePrefix+'start_date', '<=', startDate);
};

/**
 * @deprecated -- use ChangeCollisionHelper.getCIDependencies instead
 *
 * Get all the CI GlideRecords that the given CI depends on
 *
 * return an Array of CI GlideRecords
 */
ChangeCollisionHelper.getDependenciesGR = function(ciSysId, glideRecordUtil) {
	var dependencies = [];
	var cc = new GlideRecord('cmdb_rel_ci');
	cc.addQuery('parent', ciSysId);
	cc.query();

	var dependency;
	while (cc.next()) {
		dependency = glideRecordUtil.getGR("cmdb_ci", cc.child);
		if (dependency)
			dependencies.push(dependency);
	}

	return dependencies;
};

/**
 * Get all the CI GlideRecords that the given CI depends on
 *
 * return GlideRecord
 */
ChangeCollisionHelper.getCIDependencies = function(ciSysId) {
	var dependenciesGR = new GlideRecord("cmdb_ci");
	dependenciesGR.addQuery("JOINcmdb_ci.sys_id=cmdb_rel_ci.child!parent=" + ciSysId);
	dependenciesGR.query();
	return dependenciesGR;
};

/**
 * @deprecated -- use ChangeCollisionHelper.getCIDependants instead
 *
 * Get all the CI GlideRecords that depend on the given CI
 *
 * return an Array of CI GlideRecords
 */
ChangeCollisionHelper.getDependantsGR = function(ciSysId, glideRecordUtil) {
	var dependents = [];
	var cc = new GlideRecord('cmdb_rel_ci');
	cc.addQuery('child', ciSysId);
	cc.query();

	var dependent;
	while (cc.next()) {
		dependent = glideRecordUtil.getGR("cmdb_ci", cc.parent);
		if (dependent)
			dependents.push(dependent);
	}
	return dependents;

};

/**
 * Get all the CI GlideRecords that depend on the given CI
 *
 * return GlideRecord
 */
ChangeCollisionHelper.getCIDependants = function(ciSysId) {
	var dependentsGR = new GlideRecord("cmdb_ci");
	dependentsGR.addQuery("JOINcmdb_ci.sys_id=cmdb_rel_ci.parent!child=" + ciSysId);
	dependentsGR.query();
	return dependentsGR;
};
```