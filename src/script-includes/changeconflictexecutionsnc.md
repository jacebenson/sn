---
title: "ChangeConflictExecutionSNC"
id: "changeconflictexecutionsnc"
---

API Name: global.ChangeConflictExecutionSNC

```js
var ChangeConflictExecutionSNC = Class.create();

ChangeConflictExecutionSNC.CHANGE_CONFLICT_EXECUTION_LOG = "change.conflict.execution.log";
ChangeConflictExecutionSNC.CHANGE_CONFLICT_REFRESH_CONFLICTS = "change.conflict.refresh.conflicts";
ChangeConflictExecutionSNC.CHANGE_CONFLICT_CHECK_CONFLICT_LAST_RUN_UPDATED = "change.conflict.check_conflict_last_run_updated";

ChangeConflictExecutionSNC.prototype = {

	initialize: function(_gr, _gs) {
		this._gr = _gr || current;
		this._gs = _gs || gs;

		this.lu = new GSLog(ChangeConflictExecutionSNC.CHANGE_CONFLICT_EXECUTION_LOG, this.type);
		this.lu.includeTimestamp();
	},

	scheduleConflictDetection: function() {
		if (this.lu.atLevel(GSLog.DEBUG))
			this.lu.logDebug("Scheduling conflict detection for " + this._gr.getRecordClassName() + ": " + this._gr.getUniqueValue());

		if (gs.getProperty(ChangeConflictExecutionSNC.CHANGE_CONFLICT_REFRESH_CONFLICTS, "false") !== "true") {
			if (this.lu.atLevel(GSLog.DEBUG))
				this.lu.logDebug("Conflict detection skipped; refresh conflicts disabled");
			return;
		}

		if (!ChangeCheckConflicts.allowConflictDetection(this._gr)) {
			if (this.lu.atLevel(GSLog.DEBUG))
				this.lu.logDebug("Conflict detection skipped; conflict detection not allowed");
			return;
		}

		if (gs.getProperty(ChangeConflictExecutionSNC.CHANGE_CONFLICT_CHECK_CONFLICT_LAST_RUN_UPDATED, "true") === "true" && this._gr.conflict_last_run.changes()) {
			if (this.lu.atLevel(GSLog.DEBUG))
				this.lu.logDebug("Conflict detection skipped; conflict_last_run has been updated");
			return;
		}

		// Latest version of the Change should be used for conflict detection so cancel existing running conflict worker
		this.cancelChangeConflictWorker();

		this.startChangeConflictWorker();
	},

	cancelChangeConflictWorker: function() {
		var trackerGr = new GlideRecord("sys_execution_tracker");
		trackerGr.addQuery("source", this._gr.getUniqueValue());
		trackerGr.addQuery("name", ChangeCheckConflicts.TRACKER_NAME);
		trackerGr.addQuery("state", "1");
		trackerGr.query();

		if (trackerGr.next()) {
			if (this.lu.atLevel(GSLog.DEBUG))
				this.lu.logDebug("Change conflict worker cancelled: " + trackerGr.getUniqueValue());
			SNC.GlideExecutionTracker.getBySysID(trackerGr.getUniqueValue()).cancel(gs.getMessage("The conflict check has been cancelled because the change request it was being run against has been modified"));
		}
	},

	startChangeConflictWorker: function() {
		this._gs.getSession().putClientData('tracker_' + this._gr.getUniqueValue(), '');

		var worker = new GlideScriptedHierarchicalWorker();
		worker.setProgressName(ChangeCheckConflicts.TRACKER_NAME);
		worker.setScriptIncludeName("ChangeConflictWorker");
		worker.setScriptIncludeMethod("start");
		worker.putMethodArg("sysId", this._gr.getUniqueValue());
		worker.putMethodArg("className", this._gr.getRecordClassName());
		worker.setBackground(true);
		worker.start();

		if (this.lu.atLevel(GSLog.DEBUG))
			this.lu.logDebug("Change conflict worker started: " + worker.getProgressID());

		this._gs.getSession().putClientData('tracker_' + this._gr.getUniqueValue(), worker.getProgressID());
	},

	type: 'ChangeConflictExecutionSNC'
};
```