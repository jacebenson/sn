---
title: "ChangeConflictHandlerSNC"
id: "changeconflicthandlersnc"
---

API Name: global.ChangeConflictHandlerSNC

```js
var ChangeConflictHandlerSNC = Class.create();

ChangeConflictHandlerSNC.CONFLICT = "conflict";
ChangeConflictHandlerSNC.HAS_BEEN_HANDLED = "hasBeenHandled";
ChangeConflictHandlerSNC.CHANGE_CONFLICT_HANDLER_LOG = "change.conflict.handler.log";

ChangeConflictHandlerSNC.prototype = {

	initialize: function (dumpCount, consolidatedConflicts, sourceRecordCISysId) {
		this.changeConflictContainer = {};
		this.addedcount = 0;			// current count of conflicts held in this class
		this.savedCount = 0;			// total change conflict records by this class
		this.dumpCount = dumpCount;		// how many conflict records to collect before writing them out to database
		this.consolidatedConflicts = typeof consolidatedConflicts !== "undefined" ? consolidatedConflicts : false; //Reduce the number of conflicts that are generated
		this.sourceRecordCISysId = sourceRecordCISysId || ""; // Configuration item set in the cmdb_ci field of the source record, used when consolidating conflicts
		this.lu = new GSLog(ChangeConflictHandler.CHANGE_CONFLICT_HANDLER_LOG, this.type);
		this.lu.includeTimestamp();
	},

	addChangeConflict: function(changeConflict) {
		var strChangeConflict = changeConflict.toString();
		if (this.changeConflictContainer[strChangeConflict] != ChangeConflictHandler.HAS_BEEN_HANDLED) {
			this.changeConflictContainer[strChangeConflict] = changeConflict;
			++this.addedcount;
		}

		// Do not use batch insert if we are consolidating conflicts and only if we have reached the dumpCount.
		if (!this.consolidatedConflicts && this.addedcount == this.dumpCount)
			this.saveConflicts();
	},

	getConflicts: function() {
		return this.changeConflictContainer;
	},

	/**
	 * Insert all of the derived conflicts
	 */
	saveConflicts: function () {
		if (this.consolidatedConflicts) {
			this._saveConsolidatedConflicts();
			return this.savedCount;
		}

		var conflictsMapper = new GlideRecord(ChangeConflictHandler.CONFLICT);
		var key = null;

		for (key in this.changeConflictContainer) {
			var currentChangeConflict = this.changeConflictContainer[key];
			if (currentChangeConflict != ChangeConflictHandler.HAS_BEEN_HANDLED) {
				conflictsMapper.initialize();
				conflictsMapper.configuration_item = currentChangeConflict.configurationItemId;
				conflictsMapper.change = currentChangeConflict.changeId;
				conflictsMapper.type = currentChangeConflict.ctype;
				conflictsMapper.conflicting_change = currentChangeConflict.conflictingChangeId;
				conflictsMapper.related_configuration_item = currentChangeConflict.relatedCi;
				conflictsMapper.schedule = currentChangeConflict.scheduleId;
				conflictsMapper.impacted_service = currentChangeConflict.impactedService;
				conflictsMapper.insert();
				this.savedCount++;
			}
		}

		for (key in this.changeConflictContainer)
			this.changeConflictContainer[key] = ChangeConflictHandler.HAS_BEEN_HANDLED;
		this.addedcount = 0;

		return this.savedCount;
	},

	deleteConflictsByChangeId: function(changeId) {
		var conflictsMapper = new GlideRecord(ChangeConflictHandler.CONFLICT);
		conflictsMapper.addQuery('change', changeId);
		conflictsMapper.deleteMultiple();
	},

	_saveConsolidatedConflicts: function () {
		var conflictTypes = new ChangeCheckConflicts().buildConflictTypes();

		// Object will be used to track each occurence of a conflict type mapped to a source; each unique schedule or conflicting change.
		var conflicts = this._prepareConsolidatedConflictTracker(conflictTypes);
		if (this.lu.atLevel(GSLog.DEBUG))
			this.lu.logDebug("conflicts prepared: " + JSON.stringify(conflicts, 3,3,3));

		// Populate the 'conflicts' object with the rows we need to insert
		Object.keys(this.changeConflictContainer).forEach(function(conflictKey) {
			var currentChangeConflict = this.changeConflictContainer[conflictKey];
			if (currentChangeConflict != ChangeConflictHandler.HAS_BEEN_HANDLED) {
				var itemSysId = currentChangeConflict[conflicts[currentChangeConflict.ctype].source];
				if (this.lu.atLevel(GSLog.DEBUG))
					this.lu.logDebug("Conflict source: " + conflicts[currentChangeConflict.ctype].source + ", itemSysId: " + itemSysId);
				// Not registered this conflict for the itemSysId (change or schedule) or it is for the cmdb_ci referenced by the source, we should capture this conflict instead
				if (!conflicts[currentChangeConflict.ctype].items[itemSysId] || (this.sourceRecordCISysId && this.sourceRecordCISysId === currentChangeConflict.configurationItemId)) {
					conflicts[currentChangeConflict.ctype].items[itemSysId] = {
						configuration_item: currentChangeConflict.configurationItemId,
						change: currentChangeConflict.changeId,
						type: currentChangeConflict.ctype,
						conflicting_change: currentChangeConflict.conflictingChangeId,
						related_configuration_item: currentChangeConflict.relatedCi,
						schedule: currentChangeConflict.scheduleId,
						impacted_service: currentChangeConflict.impactedService
					};
				}
				// Need to ensure this counter is incremented for each considered conflict
				this.savedCount++;
			}
		}, this);

		if (this.lu.atLevel(GSLog.DEBUG))
			this.lu.logDebug("conflicts populated: " + JSON.stringify(conflicts, 3,3,3));

		// Save consolidated conflicts
		var conflictGR = new GlideRecord(ChangeConflictHandler.CONFLICT);
		Object.keys(conflicts).forEach(function(type) {
			Object.keys(conflicts[type].items).forEach(function(item) {
				this._insertConflict(conflictGR, conflicts[type].items[item]);
			}, this);
		}, this);
	},

	_prepareConsolidatedConflictTracker: function(conflictTypes) {
		var conflicts = {};

		Object.keys(conflictTypes).forEach(function(conflictType) {
			// conflictField (source) will be used to derive the conflicting change or schedule that will identify the conflict
			var conflictField = conflictType.indexOf("already_scheduled") !== -1 ? "conflictingChangeId" : "scheduleId";
			conflicts[conflictType] = {
				source: conflictField,
				items: {}
			};
			// Define the relations specific to this type; Parent, Child, etc.
			Object.keys(conflictTypes[conflictType]).forEach(function(relation) {
				conflicts[conflictTypes[conflictType][relation]] = {
					source: conflictField,
					items: {}
				};
			});
		});

		return conflicts;
	},

	_insertConflict: function(conflictGR, conflict) {
		conflictGR.initialize();
		Object.keys(conflict).forEach(function(element) {
			conflictGR[element] = conflict[element];
		});
		conflictGR.insert();
	},

	type: "ChangeConflictHandlerSNC"
};

```