---
title: "AJAXRotationSynchronizeWorker"
id: "ajaxrotationsynchronizeworker"
---

API Name: global.AJAXRotationSynchronizeWorker

```js
var AJAXRotationSynchronizeWorker = Class.create();
AJAXRotationSynchronizeWorker.prototype = Object.extendsObject(AbstractAjaxProcessor, {
	
	start: function() {
		// Setup background worker
		var worker = new GlideRotationSynchronizeWorker();
		worker.setTableName(this.getParameter("sysparm_ajax_processor_table_name"));
		worker.setProgressName("Executing Synchronize Shards");

		// Start worker in the background
		worker.setBackground(true);
		worker.start();
		
		// Return worker progress ID to caller
		var progressId = worker.getProgressID();
		return progressId;	
	},
	
    type: 'AJAXRotationSynchronizeWorker'
});
```