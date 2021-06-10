---
title: "CMDBDuplicateTaskUtils"
id: "cmdbduplicatetaskutils"
---

API Name: global.CMDBDuplicateTaskUtils

```js
var CMDBDuplicateTaskUtils = Class.create();
CMDBDuplicateTaskUtils.prototype = {
	initialize: function() {
		this.cmdbCiTable = "cmdb_ci";
		this.duplicateAuditResultTable = 'duplicate_audit_result';
		this.duplicateTaskTable = 'reconcile_duplicate_task';
		this.failureLabel = "Failed to create Remediate Duplicate Task. ";
		this.successLabel = "Successfully created Remediate Duplicate Task.";
	},
	
	// Create Remediate Duplicate Task for given list of duplicate sysIds
	createDuplicateTask : function(duplicateSysIds) {
		if (GlideStringUtil.nil(duplicateSysIds)) {
			gs.info(gs.getMessage("Failed to create Remediate Duplicate Task. Invalid input."));
			return null;
		}
		
		var sysIDs = duplicateSysIds.split(",");
		// validate sysId is valid cmdb_ci and not present in any open de-duplicate tasks
		for(var i=0; i < sysIDs.length; i++) {
			sysIDs[i] = sysIDs[i].trim();
			if(!this.isValidCmdbCi(sysIDs[i])) {
				gs.info(gs.getMessage("Failed to create Remediate Duplicate Task. Following sysId is not a valid sysId in cmdb_ci table: {0}", sysIDs[i]));
				return null;
			}
			
			if(!this.hasNoOpenDuplicateTasks(sysIDs[i])) {
				gs.info(gs.getMessage("Failed to create Remediate Duplicate Task. Following sysId is already part of an open Remediate Duplicate Task: {0}", sysIDs[i]));
				return null;
			}
		}
		
		// Create Remediate Duplicate Task
		var taskGr = new GlideRecord(this.duplicateTaskTable);
		taskGr.initialize();
		taskGr.setValue('short_description', 'Manually found duplicate records');
		var taskId = taskGr.insert();
		for(var j=0; j < sysIDs.length; j++) {
			// Create duplicate audit results
			var grR = new GlideRecord(this.duplicateAuditResultTable);
			grR.initialize();
			grR.setValue("table", this.cmdbCiTable);
			grR.setValue("duplicate_ci", sysIDs[j]);
			grR.setValue("duplicate_id", sysIDs[j]);
			grR.setValue("follow_on_task", taskId);
			grR.update();
		}
		
		return taskId;
	},
	
	// Check if sysId is a valid cmdb_ci 	
	isValidCmdbCi : function(sysId) {
		var gr = new GlideRecord("cmdb_ci");
		return gr.get(sysId);
	},
	
    // Check if sysId already exist in open de-duplicate task
	hasNoOpenDuplicateTasks : function(sysId) {
		var gr = new GlideRecord(this.duplicateAuditResultTable);
		gr.addQuery("duplicate_id", sysId);
		gr.query();
		while(gr.next()) {
			var activeTask = gr.follow_on_task.active;
			if (activeTask)
				return false;
		}
		return true;
	},
	
	type: 'CMDBDuplicateTaskUtils'
};
```