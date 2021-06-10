---
title: "ChangeConflictAPI"
id: "changeconflictapi"
---

API Name: global.ChangeConflictAPI

```js
var ChangeConflictAPI = Class.create();
ChangeConflictAPI.prototype = {

	CHANGE_CONFLICT_ROLE: "change.conflict.role",

	initialize: function(gr) {
		this._log = new GSLog(ChangeCheckConflicts.CHANGE_CONFLICT_LOG, this.type);

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.logDebug("[initialize]");

		this._gr = gr;
	},

	/**
	 * Cancels and running detection progress jobs and starts a new one
	 */
	startConflictDetection: function() {
		if (!this._gr)
			return null;

		//Check that the user can Check Conflicts
		if (!this._canCheckConflict())
			return gs.getMessage("Insufficient access to start conflict detection");

		//check if there is an existing conflict and cancel the tracker.
		this.cancelConflictDetection();

		//Create tracker record for conflict detection
		var worker = new GlideScriptedHierarchicalWorker();
		worker.setProgressName(ChangeCheckConflicts.TRACKER_NAME);
		worker.setScriptIncludeName("ChangeConflictWorker");
		worker.setScriptIncludeMethod("start");
		worker.putMethodArg("sysId", this._gr.getUniqueValue());
		worker.setSourceTable(this._gr.getRecordClassName());
		worker.setSource(this._gr.getUniqueValue());
		worker.setBackground(true);
		worker.start();

		return worker.getProgressID();
	},

	/**
	 * Cancels any running detection progress jobs
	 */
	cancelConflictDetection: function() {
		if (!this._gr)
			return false;

		//Check that the user can Check Conflicts
		if (!this._canCheckConflict())
			return false;

		// Find the id of any existing trackers running for this change
		var trackerGr = new GlideRecordSecure("sys_execution_tracker");
		trackerGr.addQuery("source", this._gr.getUniqueValue());
		trackerGr.addQuery("name", ChangeCheckConflicts.TRACKER_NAME);
		trackerGr.addQuery("state", "IN", "0,1");
		trackerGr.orderByDesc('sys_created_on');
		trackerGr.query();

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.logDebug("[cancelConflictDetection] " + trackerGr.getEncodedQuery());

		if (trackerGr.next()) {
			var execTracker = new SNC.GlideExecutionTracker(trackerGr.getUniqueValue());
			execTracker.cancel(gs.getMessage("Conflict detection has been cancelled"));
			return true;
		}

		return false;
	},

	/**
	 * Retrieves number of conflict records for this change
	 */
	getConflictCount: function() {
		if (!this._gr || !this._gr.canRead())
			return 0;

		var conflictCount = new GlideAggregate('conflict');
		conflictCount.addQuery('change', this._gr.getUniqueValue());
		conflictCount.addAggregate('COUNT');
		conflictCount.query();

		var conflict = 0;
		if (conflictCount.next())
			conflict = conflictCount.getAggregate('COUNT');

		return conflict;
	},

	/**
	 * Retrieves conflict records for this change
	 */
	getConflicts: function() {
		if (!this._gr || !this._gr.canRead())
			return null;

		var conflictGR = new GlideRecordSecure('conflict');
		conflictGR.addQuery('change', this._gr.getUniqueValue());
		conflictGR.query();

		return conflictGR;
	},

	/**
	 * Retrieves a progress record for this change
	 */
	getProgressRecord: function() {
		if (!this._gr || !this._gr.canRead())
			return null;

		var trackerGr = new GlideRecordSecure("sys_execution_tracker");
		trackerGr.addQuery("source", this._gr.getUniqueValue());
		trackerGr.addQuery("name", ChangeCheckConflicts.TRACKER_NAME);
		trackerGr.orderByDesc("sys_created_on");
		trackerGr.query();

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.logDebug("[getProgressRecord] " + trackerGr.getEncodedQuery());

		if (trackerGr.next())
			return trackerGr;

		return;
	},

	_canCheckConflict: function() {
		return gs.hasRole(gs.getProperty(this.CHANGE_CONFLICT_ROLE));
	},

	type: 'ChangeConflictAPI'
};
```