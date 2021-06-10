---
title: "ChangeCheckConflicts"
id: "changecheckconflicts"
---

API Name: global.ChangeCheckConflicts

```js
var ChangeCheckConflicts = Class.create();

// System properties
ChangeCheckConflicts.CHANGE_CONFLICT_MODE = "change.conflict.mode";
ChangeCheckConflicts.CHANGE_CONFLICT_CURRENTCI = "change.conflict.currentci";
ChangeCheckConflicts.CHANGE_CONFLICT_CURRENTWINDOW = "change.conflict.currentwindow";
ChangeCheckConflicts.CHANGE_CONFLICT_RELATEDCHILDWINDOW = "change.conflict.relatedchildwindow";
ChangeCheckConflicts.CHANGE_CONFLICT_RELATEDPARENTWINDOW = "change.conflict.relatedparentwindow";
ChangeCheckConflicts.CHANGE_CONFLICT_BLACKOUT = "change.conflict.blackout";
ChangeCheckConflicts.CHANGE_CONFLICT_RELATEDCHILDBLACKOUT = "change.conflict.relatedchildblackout";
ChangeCheckConflicts.CHANGE_CONFLICT_RELATEDPARENTBLACKOUT = "change.conflict.relatedparentblackout";
ChangeCheckConflicts.CHANGE_CONFLICT_CI_MAINT_SCHED = "change.conflict.ci_maint_sched";
ChangeCheckConflicts.CHANGE_CONFLICT_RELATEDSERVICES = "change.conflict.relatedservices";
ChangeCheckConflicts.CHANGE_CONFLICT_ASSIGNED_TO = "change.conflict.assigned_to";
ChangeCheckConflicts.CHANGE_CONFLICT_SHOW_TIMING_INFO = "change.conflict.show.timing.info";
ChangeCheckConflicts.CHANGE_CONFLICT_DUMP_COUNT = "change.conflict.dump.count";
ChangeCheckConflicts.CHANGE_CONFLICT_FILTER_CASE_SENSITIVE = "change.conflict.filter.case_sensitive";
ChangeCheckConflicts.CHANGE_CONFLICT_USE_COMPOSED = "change.conflict.usecomposed";
ChangeCheckConflicts.CHANGE_CONFLICT_IDENTIFY_MOST_CRITICAL = "change.conflict.identifymostcritical";
ChangeCheckConflicts.CHANGE_CONFLICT_POPULATE_IMPACTED_CIS = "change.conflict.populateimpactedcis";
ChangeCheckConflicts.CHANGE_CONFLICT_ALLOW_CONTIGUOUS_CHANGES = "change.conflict.allow_contiguous_changes";
ChangeCheckConflicts.CHANGE_CONFLICT_CONSOLIDATED_CONFLICTS = "change.conflict.consolidated_conflicts";
ChangeCheckConflicts.CHANGE_CONFLICT_LOG = "change.conflict.log";
ChangeCheckConflicts.TRACKER_NAME = ChangeCheckConflictsSNC.TRACKER_NAME;

ChangeCheckConflicts.getConfig = function (config) {
	if (!config)
			config = {};
	if (!('mode' in config))
			config.mode = gs.getProperty(ChangeCheckConflicts.CHANGE_CONFLICT_MODE);
	if (!('include_current_ci' in config))
		config.include_current_ci = String(gs.getProperty(ChangeCheckConflicts.CHANGE_CONFLICT_CURRENTCI)) === 'true';
	if (!('current_window' in config))
		config.current_window = String(gs.getProperty(ChangeCheckConflicts.CHANGE_CONFLICT_CURRENTWINDOW)) === 'true';
	if (!('include_related_children_window' in config))
		config.include_related_children_window = String(gs.getProperty(ChangeCheckConflicts.CHANGE_CONFLICT_RELATEDCHILDWINDOW)) === 'true';
	if (!('include_related_parent_window' in config))
		config.include_related_parent_window = String(gs.getProperty(ChangeCheckConflicts.CHANGE_CONFLICT_RELATEDPARENTWINDOW)) === 'true';
	if (!('include_blackout_window' in config))
		config.include_blackout_window = String(gs.getProperty(ChangeCheckConflicts.CHANGE_CONFLICT_BLACKOUT)) === 'true';
	if (!('include_related_children_blackout' in config))
		config.include_related_children_blackout = String(gs.getProperty(ChangeCheckConflicts.CHANGE_CONFLICT_RELATEDCHILDBLACKOUT)) === 'true';
	if (!('include_related_parent_blackout' in config))
		config.include_related_parent_blackout = String(gs.getProperty(ChangeCheckConflicts.CHANGE_CONFLICT_RELATEDPARENTBLACKOUT)) === 'true';
	if (!('include_ci_maint_sched' in config))
		config.include_ci_maint_sched = String(gs.getProperty(ChangeCheckConflicts.CHANGE_CONFLICT_CI_MAINT_SCHED)) === 'true';
	if (!('include_related_services' in config))
		config.include_related_services = String(gs.getProperty(ChangeCheckConflicts.CHANGE_CONFLICT_RELATEDSERVICES)) === 'true';
	if (!('include_assigned_to' in config))
		config.include_assigned_to = String(gs.getProperty(ChangeCheckConflicts.CHANGE_CONFLICT_ASSIGNED_TO)) === 'true';
	if (!('show_timing_info' in config))
		config.show_timing_info = String(gs.getProperty(ChangeCheckConflicts.CHANGE_CONFLICT_SHOW_TIMING_INFO)) === 'true';
	if (!('dump_count' in config))
		config.dump_count = parseInt(gs.getProperty(ChangeCheckConflicts.CHANGE_CONFLICT_DUMP_COUNT, "500"));
	if (!('filter_is_case_sensitive' in config))
		config.filter_is_case_sensitive = String(gs.getProperty(ChangeCheckConflicts.CHANGE_CONFLICT_FILTER_CASE_SENSITIVE)) === 'true';
	if (!('use_composed' in config))
		config.use_composed = String(gs.getProperty(ChangeCheckConflicts.CHANGE_CONFLICT_USE_COMPOSED)) === 'true';
	if (!('identify_most_critical' in config))
		config.identify_most_critical = String(gs.getProperty(ChangeCheckConflicts.CHANGE_CONFLICT_IDENTIFY_MOST_CRITICAL)) === 'true';
	if (!('populate_impacted_cis' in config))
		config.populate_impacted_cis = String(gs.getProperty(ChangeCheckConflicts.CHANGE_CONFLICT_POPULATE_IMPACTED_CIS)) === 'true';
	if (!('allow_contiguous_changes' in config))
		config.allow_contiguous_changes = String(gs.getProperty(ChangeCheckConflicts.CHANGE_CONFLICT_ALLOW_CONTIGUOUS_CHANGES)) === "true";
	if (!('consolidated_conflicts' in config))
		config.consolidated_conflicts = String(gs.getProperty(ChangeCheckConflicts.CHANGE_CONFLICT_CONSOLIDATED_CONFLICTS)) === "true";
	return config;
};

// This is no longer used by this script and exists only for backward compatibility
ChangeCheckConflicts.allowConflictDetection = function(currentGr, previousGr) {
	return ChangeCheckConflictsSNC.allowConflictDetection(currentGr, previousGr, ChangeCheckConflicts.getConfig());
};

ChangeCheckConflicts.buildAncestorClassInfo = ChangeCheckConflictsSNC.buildAncestorClassInfo;

ChangeCheckConflicts.prototype = Object.extendsObject(ChangeCheckConflictsSNC, {

    initialize: function(current, config) {
		ChangeCheckConflictsSNC.prototype.initialize.call(this, current, ChangeCheckConflicts.getConfig(config));
    },

	type: 'ChangeCheckConflicts'

});
```