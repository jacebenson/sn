---
title: "AJAXRollbackWorker"
id: "ajaxrollbackworker"
---

API Name: global.AJAXRollbackWorker

```js
var AJAXRollbackWorker = Class.create();
AJAXRollbackWorker.prototype = Object.extendsObject(AbstractAjaxProcessor, {

	start: function() {
		// Setup background worker
		var worker = new GlideRollbackWorker();
		worker.setRollbackContextID(this.getParameter('sysparm_ajax_processor_context_id'));
		worker.setAuditDeleteID(this.getParameter('sysparm_ajax_processor_audit_delete_id'));
		worker.setDeleteRecoveryID(this.getParameter('sysparm_ajax_processor_delete_recovery_id'));
		worker.setProgressName("Executing Rollback");

		// Start worker in the background
		worker.setBackground(true);
		worker.start();
		
		// Return worker progress ID to caller
		var progressId = worker.getProgressID();
		return progressId;	
	},
	
    type: 'AJAXRollbackWorker'
});
```