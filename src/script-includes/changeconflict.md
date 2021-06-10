---
title: "ChangeConflict"
id: "changeconflict"
---

API Name: global.ChangeConflict

```js
var ChangeConflict = Class.create();

// Change Conflict types
// (sys_choice_conflict_type)
ChangeConflict.CHANGETYPE_ALREADY_SCHEDULED             = 'ci_already_scheduled';
ChangeConflict.CHANGETYPE_NOT_IN_WINDOW                 = 'not_in_maintenance_window';
ChangeConflict.CHANGETYPE_BLACKOUT                      = 'blackout';
ChangeConflict.CHANGETYPE_CHILD_ALREADY_SCHEDULED       = 'child_ci_already_scheduled';
ChangeConflict.CHANGETYPE_CHILD_NOT_IN_WINDOW           = 'child_not_in_maintenance_window';
ChangeConflict.CHANGETYPE_CHILD_BLACKOUT                = 'child_blackout';
ChangeConflict.CHANGETYPE_PARENT_ALREADY_SCHEDULED      = 'parent_ci_already_scheduled';
ChangeConflict.CHANGETYPE_PARENT_NOT_IN_WINDOW          = 'parent_not_in_maintenance_window';
ChangeConflict.CHANGETYPE_PARENT_BLACKOUT               = 'parent_blackout';
ChangeConflict.CHANGETYPE_ASSIGNED_TO_ALREADY_SCHEDULED = 'assigned_to_already_scheduled';

ChangeConflict.prototype = {
	
	initialize: function(configurationItemId, changeId, ctype, conflictingChangeId, scheduleId, relatedCi, impactedService) {
		this.configurationItemId = configurationItemId;
		this.changeId = changeId;
		this.ctype = ctype;
		this.conflictingChangeId = conflictingChangeId;
		this.scheduleId = scheduleId;
		this.relatedCi = relatedCi;
		this.impactedService = impactedService;
	},
	
	toString: function() {
		return "\rCI               : " + this.configurationItemId +
		"\rService          : " + this.impactedService +
		"\rChange           : " + this.changeId +
		"\rConflict         : " + this.conflictingChangeId +
		"\rRelatedCi        : " + this.relatedCi +
		"\rSchedule         : " + this.scheduleId;
	}
};

```