---
title: "ChangeConfigExportUtility"
id: "changeconfigexportutility"
---

API Name: global.ChangeConfigExportUtility

```js
var ChangeConfigExportUtility = Class.create();
ChangeConfigExportUtility.prototype = {
    initialize: function(_gs) {
		this._gs = _gs || gs;
    },

	workerSave: function(toExport, workerName) {
		if (!toExport)
			return null;
		
		if (!workerName)
			workerName = this._gs.getMessage("Exporting Configuration");
		
		var worker = new GlideScriptedHierarchicalWorker();
		worker.setProgressName(workerName);
		worker.setScriptIncludeName(this.type);
		worker.setScriptIncludeMethod("saveMultiple");
		worker.putMethodArg("toExport", toExport);
		worker.putMethodArg("useTracker", true);
		worker.setSource(this.type);
		worker.setBackground(true);
		worker.setCannotCancel(true);
		worker.start();
		
		return worker.getProgressID();
	},
	
	//Save multiple records and/or GlideRecord classes to an update set
	saveMultiple: function(toExport, useTracker) {
		var tracker = null;
		if (useTracker)
			tracker = SNC.GlideExecutionTracker.getLastRunning();
		
		if (!toExport) {
			if (useTracker) {
				tracker.setMaxProgressValue(0);
				tracker.run();
				tracker.complete();
			}
			return {};
		}
		
		if (!Array.isArray(toExport))
			toExport = [toExport];
		
		if (useTracker) {
			var maxProgressValue = 0;
			toExport.forEach(function(gr) {
				maxProgressValue += gr.getRowCount();
			});
			tracker.setMaxProgressValue(maxProgressValue);
			tracker.run();
		}
		
		var complete = true;
		var retVal = {};
		toExport.forEach(function(configGr) {
			var tableName = configGr.getTableName() + "";
			
			if (configGr.getRowCount() === 1 && configGr.isValidRecord()) {
				retVal[tableName] = this.save(configGr);
				if (useTracker)
					tracker.incrementProgressValue(1);
			}
			else {
				retVal[tableName] = true;
				while (configGr.next()) {
					retVal[tableName] = this.save(configGr) && retVal[tableName];
					if (useTracker)
						tracker.incrementProgressValue(1);
				}
			}
			
			complete = complete && retVal[tableName];
		}, this);
		
		if (useTracker)
			if (complete)
				tracker.success();
			else
				tracker.fail(JSON.stringify(retVal));

		return retVal;
	},
	
	// Saves the contents of a GlideRecord to an update set
	save: function(configGr) {
		if (!this.isValidExportTable(configGr.getTableName()) || !configGr.isValidRecord())
			return false;

		return new GlideUpdateManager2().saveRecord(configGr);
	},
	
	isValidExportTable: function(tableName) {
		var WHITELIST = [
			{ "table": "chg_ml_prop", "extensions": true },
			{ "table": "chg_ml_prop_solution", "extensions": true },
			{ "table": "chg_ml_similarity_boosters", "extensions": false }
		];

		var validExports = [];
		WHITELIST.forEach(function(whiteListEl) {
			if (!whiteListEl.extensions) {
				validExports.push(whiteListEl.table);
				return;
			}
			var extensions = new TableUtils(whiteListEl.table).getAllExtensions();
			for (var i = 0; i < extensions.size(); i++)
				validExports.push(extensions.get(i) + "");
		});

		return  validExports.indexOf(tableName + "") !== -1;
	},
	
	// Returns an array of populated GlideRecord objects for export
	// rootTable: The name of the table to export from
	// rootSysId: The sys_id of the record to export
	// related: Related information to export.  An array of strings with the format table.referenceField
	getConfigRecords: function(rootTable, rootSysId, related) {
		if (!new TableUtils(rootTable).tableExists() || !this.isValidExportTable(rootTable) || !rootSysId)
			return [];
		
		var rootGr = new GlideRecord(rootTable);
		if (!rootGr.get(rootSysId))
			return [];
		
		var retVal = [];
		retVal.push(rootGr);
		
		if (related && Array.isArray(related)) {
			related.forEach(function(relatedRef) {
				var refEl = relatedRef.split(".");
				if (refEl.length < 2)
					return;
				
				var relTableName = refEl[0];
				var relFieldName = refEl[1];
				
				var relTu = new TableUtils(relTableName);
				if (!relTu.tableExists() || !this.isValidExportTable(relTableName) || !relTu.isValidField(relFieldName))
					return;

				var relGr = new GlideRecord(relTableName);
				relGr.addQuery(relFieldName, rootSysId);
				relGr.query();
				retVal.push(relGr);
			}, this);
		}
		
		return retVal;
	},
	
    type: 'ChangeConfigExportUtility'
};
```