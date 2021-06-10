---
title: "RecipientListUploadAJAXProcessor"
id: "recipientlistuploadajaxprocessor"
---

API Name: sn_publications.RecipientListUploadAJAXProcessor

```js
var RecipientListUploadAJAXProcessor = Class.create();
RecipientListUploadAJAXProcessor.prototype = Object.extendsObject(global.AbstractAjaxProcessor, {

    /**
     * Start the Scripted Hierarchical Worker if one does not already exist
     */
    start: function() {

		var entityType = this.getParameter("sysparm_ajax_processor_entity_type");
		var recList = this.getParameter("sysparm_ajax_processor_entity_list");
		var totalRecords = this.getParameter("sysparm_ajax_processor_entity_record_count");
		
        var worker = new GlideScriptedHierarchicalWorker();
        worker.setProgressName(gs.getMessage("Uploading file"));
        worker.setScriptIncludeName("sn_publications.RecipientListUploadProcessor");
		worker.setScriptIncludeMethod("trackValidateUploadProgress");
		worker.putMethodArg("totalRecords", totalRecords+"");
        worker.setBackground(true);
        worker.start();
		return worker.getProgressID();
    },
    
    type: 'RecipientListUploadAJAXProcessor'
});
```