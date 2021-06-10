---
title: "CloneConstants"
id: "cloneconstants"
---

API Name: global.CloneConstants

```js
var CloneConstants = { 
	cloneOptions: {
		DEFAULT_MAX_CLONE_DURATION: "3M"
	},

	status: {
		CLONE_STATUS_DRAFT: "Draft",
		CLONE_STATUS_SCHEDULED: "Scheduled",
		CLONE_STATUS_REQUESTED: "Requested",
		CLONE_STATUS_HOLD: "Hold"
	},

	cancelOptions: {
		CANCEL_OPTION_INCORRECT_TARGET: "I chose an incorrect target instance",
		CANCEL_OPTION_LATEST_BACKUP: "I need a different backup",
		CANCEL_OPTION_OTHER: "Other"
	},

	rollbackOptions: {
		ROLLBACK_OPTION_CORRUPTED_INSTANCE: "Target instance was corrupted",
		ROLLBACK_OPTION_LOST_DATA: "I Lost My Data",
		ROLLBACK_OPTION_OTHER: "Other"
	}
};
```