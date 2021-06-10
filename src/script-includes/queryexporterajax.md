---
title: "QueryExporterAjax"
id: "queryexporterajax"
---

API Name: global.QueryExporterAjax

```js
var QueryExporterAjax = Class.create();

QueryExporterAjax.prototype = Object.extendsObject(AbstractAjaxProcessor, {
	process: function() {
        var CANCEL_EXPORT_PROCESS = "cancelExport";
        var QUERY_BASIC_EXPORT = "basic_export";

		var func = this.getParameter("sysparm_ajax_processor_function");
		var trackerId = this.getParameter("sysparm_ajax_processor_tracker_id");
        var queryList = this.getParameter("sysparm_ajax_processor_query_list");

		if (func == CANCEL_EXPORT_PROCESS)
			return this.sendCancelSignal(trackerId);

		if (func == QUERY_BASIC_EXPORT)
			return this.startQueryBasicExport(queryList);

	},

	startQueryBasicExport: function(queryList) {

        return this._startQueryExport(GlideSysMessage.format("Exporting queries"),'exportQueryBasic',queryList);
	},

    _startQueryExport: function(progressName, functionToExecute, queryList) {
        // Setup and start the progress worker
		var worker = new GlideScriptedHierarchicalWorker();
		worker.setProgressName(progressName);
		worker.setScriptIncludeName('QueryExporter');
		worker.setScriptIncludeMethod(functionToExecute);
        worker.putMethodArg('queryList', queryList);
		worker.setBackground(true);
		worker.setCannotCancel(true);
		worker.start();
		return worker.getProgressID();
    },

    completeExport: function(exportUpdateSetId) {
        CMDBUpdateSetPublisher.deleteUpdateSet(exportUpdateSetId);
    },

	// send the cancel by adding the cancel signal into the query export tracker
	// result, so that the update set progress worker will catch it
	sendCancelSignal: function(trackerId) {
		var tracker = SNC.GlideExecutionTracker.getBySysID(trackerId);
		tracker.updateMessage("Canceling query export process...");
		result = {'export_cancel_requested': 'true'};
		tracker.updateResult(result);
		return;
	},

	type: "QueryExporterAjax"

});

```