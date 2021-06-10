---
title: "FindRelevantAcls"
id: "findrelevantacls"
---

API Name: global.FindRelevantAcls

```js
var FindRelevantAcls = Class.create();

FindRelevantAcls.prototype = Object.extendsObject(AbstractAjaxProcessor, {

	process : function() {
		var identifier = this.getParameter("sysparm_identifier");
		var operationID = this.getParameter("sysparm_operationID");
		var resourceID = this.getParameter("sysparm_resourceID");

		var originalIdentifier = this.getParameter("sysparm_original_identifier");
		var originalOperationID = this.getParameter("sysparm_original_operationID");
		var originalResourceID = this.getParameter("sysparm_original_resourceID");		
		var aclSysID = this.getParameter("sysparm_sysID");
		var enableArchiveACLs = GlideProperties.getBoolean("glide.security.enable_archive_table_acls", false);

		var allPlans = {};
		allPlans.enableArchiveACLs = enableArchiveACLs;
		var plan = GlideContextualSecurityManager.getRelatedACLs(identifier, operationID, resourceID);

		//cannot put the returned object directly as it is in JSON format and here we have javascript array
		var json = new JSON();
		var originalPlan;

		if (GlideStringUtil.notNil(originalIdentifier) && GlideStringUtil.notNil(originalOperationID) && GlideStringUtil.notNil(originalResourceID)) {
			if(GlideStringUtil.notNil(aclSysID)){
				originalPlan = GlideContextualSecurityManager.getRelatedACLs(aclSysID);
			}
			else{
				originalPlan = GlideContextualSecurityManager.getRelatedACLs(originalIdentifier, originalOperationID, originalResourceID);
			}
			allPlans['original'] = json.decode(originalPlan);
		}

		allPlans['current'] = json.decode(plan);

		// For archive tables include current and original plans for the underlying archived table
		if (GlideArchiveTable.isArchive(identifier) && enableArchiveACLs) {
			allPlans['currentArchived'] = json.decode(
				GlideContextualSecurityManager.getRelatedACLs(GlideArchiveTable.getArchivedTableName(identifier), operationID, resourceID));
		}
		if (originalIdentifier && GlideArchiveTable.isArchive(originalIdentifier) && enableArchiveACLs) {
			allPlans['originalArchived'] = json.decode(
				GlideContextualSecurityManager.getRelatedACLs(GlideArchiveTable.getArchivedTableName(originalIdentifier), operationID, resourceID));
		}

		return json.encode(allPlans);
	},

    type: 'FindRelevantAcls'
});
```