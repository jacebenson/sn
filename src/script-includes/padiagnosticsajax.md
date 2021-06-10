---
title: "PADiagnosticsAjax"
id: "padiagnosticsajax"
---

API Name: sn_pa_diagnostics.PADiagnosticsAjax

```js
var PADiagnosticsAjax = Class.create();
PADiagnosticsAjax.prototype = Object.extendsObject(global.AbstractAjaxProcessor, {	
	
	/**
	* Checks if user has access to diagonistics
	*  @return boolean
	*/
	isAuthorized: function() {
		return gs.hasRole('sn_pa_diagnostics.pa_diagnostic');
	},
	/**
	 * Start the progress worker
	 *
	 *  @return workerID
	 */
	start: function() {
		if (!this.isAuthorized())
			return 'You do not have permission to execute this script';

		var worker = new GlideScriptedHierarchicalWorker();
		worker.setProgressName(gs.getMessage('Diagnostics Execution'));
		worker.setScriptIncludeName('sn_pa_diagnostics.PADiagnosticsWorker');
		if (this.getParameter('sysparm_ajax_processor_all') === 'true') {
			worker.setScriptIncludeMethod('executeAll');
		} else {
			worker.setScriptIncludeMethod('execute');
			worker.putMethodArg('sysIDs', this.getParameter('sysparm_ajax_processor_sys_id'));
		}
		worker.putMethodArg('table', this.getParameter('sysparm_ajax_processor_table'));
		worker.putMethodArg('id', this.getParameter('sysparm_ajax_processor_record_id'));
		worker.setBackground(true);
		worker.start();
		return worker.getProgressID();
	},

	/**
	 * Cancel the progress worker
	 *
	 * Send the cancel by adding the cancel signal into the tracker
	 * result, so that the diagnostic progress worker will catch it
	 *
	 * @param trackerId
	 */
	cancel: function() {
		if (!this.isAuthorized())
			return 'You do not have permission to execute this script';

		var tracker = new GlideExecutionTracker(this.getParameter('sysparm_trackerId'));
		tracker.updateResult({
			cancel_requested : true
		});
	},

    type: 'PADiagnosticsAjax'
});
```