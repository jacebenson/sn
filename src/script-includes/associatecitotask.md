---
title: "AssociateCIToTask"
id: "associatecitotask"
---

API Name: global.AssociateCIToTask

```js
var AssociateCIToTask = Class.create();
AssociateCIToTask.prototype = Object.extendsObject(AbstractAjaxProcessor, {
	SESSION_KEY: 'com.snc.change_request.AssociateCIToTask.ci_user_filter',

	ajaxFunction_getURL: function(){
		var chgReqId = this.getParameter("sysparm_id");
		var addToTable = this.getParameter("sysparm_add_to") + "";
		return this._getURL(chgReqId, addToTable);
	},

	_getURL: function(chgReqId, addToTable){
		this.removeUserFilter();

		var latestClassAdded;
		var parentClass = "";
		var principalClassFilter = "";
		// latestClassAdded logic
		// 1. if there are ci's, get the latest class of the ci
		// 2. default the latest class to parent class
		if (addToTable === "task_ci") {
			principalClassFilter = this.getPrincipalClassFilter(chgReqId);
			if (!principalClassFilter)
				latestClassAdded = this.getLatestClass(chgReqId);
			parentClass = this.getParentClass(chgReqId);
			if (!latestClassAdded)
				latestClassAdded = parentClass;
		}
		else if (addToTable === "task_service_offering")
			latestClassAdded = "service_offering";
		else
			latestClassAdded = "cmdb_ci";

		var serviceOfferingFilter = (addToTable === "task_service_offering") ? "" : "sys_class_name!=service_offering";

		var fixedQuery = serviceOfferingFilter;
		if (principalClassFilter.length > 0)
			fixedQuery += '^' + principalClassFilter;

		var url = new GlideURL("task_add_affected_cis.do");
		url.set("sysparm_crSysId", chgReqId);
		url.set("sysparm_view", "associate_ci");
		url.set("sysparm_add_to", addToTable);
		url.set("sysparm_stack", "no");
		url.set("sysparm_table", latestClassAdded);
		url.set("sysparm_parent_class", parentClass);
		url.set("sysparm_fixed_query", fixedQuery);
		return url;
	},

	/*
 	* If "Best Practice - Bulk CI Changes" plugin is active and task type is change_requests
 	*     parent class = ci_class populated on the change_request
 	*     if --None- is selected for ci_class, then cmdb_ci is returned
 	* else
 	*     parent class = cmdb_ci
 	**/
	getParentClass: function(chgReqId) {
		if (GlidePluginManager.isActive("com.snc.bestpractice.bulkchange")) {
			var chgReqGR = new GlideRecordSecure("change_request");
			if (chgReqGR.get(chgReqId) && chgReqGR.ci_class)
				return chgReqGR.ci_class;
		}
		return "cmdb_ci";
	},

	getPrincipalClassFilter: function(chgReqId) {
		if (!chgReqId)
			return;
		var taskGr = new GlideRecord("task");
		taskGr.get(chgReqId);
		if (!taskGr.isValidRecord()) {
			gs.error("Invalid task record sys-id passed");
			return;
		}
		return new TaskUtils().getPCFilterEvaluated(taskGr.sys_class_name + '');
	},
	storeUserFilter: function(){
		var filter;
		filter = this.getParameter("sysparm_filter_query");
		gs.getSession().putClientData(this.SESSION_KEY, filter);
		return;
	},

	removeUserFilter: function(){
		gs.getSession().clearClientData(this.SESSION_KEY);
		return;
	},

	addSelected: function() {
		var id = this.getParameter("sysparm_id");
		var addToTable = this.getParameter("sysparm_add_to_table") + "";
		var selCIsList = this.getParameter("sysparm_selCIs");

		var selCIs = selCIsList.split(",");
		for (var i = 0; i < selCIs.length; i++) {
			if (selCIs[i]) {
				var existingCI = new GlideRecordSecure(addToTable);
				if ("task_ci" === addToTable)
					existingCI.addQuery("ci_item", selCIs[i]);
				else if ("task_service_offering" === addToTable)
					existingCI.addQuery("service_offering", selCIs[i]);		
				else
					existingCI.addQuery("cmdb_ci_service", selCIs[i]);

				existingCI.addQuery("task", id);
				existingCI.query();

				if (!existingCI.hasNext()) {
					var affectedCI = new GlideRecordSecure(addToTable);
					affectedCI.initialize();
					affectedCI.task = id;

					if ("task_ci" === addToTable)
						affectedCI.ci_item = selCIs[i];
					else if ("task_service_offering" === addToTable)
						affectedCI.service_offering = selCIs[i];
					else
						affectedCI.cmdb_ci_service = selCIs[i];

					affectedCI.insert();
				}
			}
		}
		return gs.getMessage("Added selected configuration items successfully to the change request.");
	},

	getLatestClass: function(chgReqId){
		var affectedCiGR = new GlideRecordSecure("task_ci");
		affectedCiGR.addQuery("task", chgReqId);
		affectedCiGR.orderByDesc("sys_updated_on");
		affectedCiGR.setLimit(1);
		affectedCiGR.query();
		if (affectedCiGR.next())
			return affectedCiGR.ci_item.sys_class_name;
		return "";
	},

	addAll: function() {
		var id = this.getParameter("sysparm_id");
		var fixedQuery = this.getParameter("sysparm_fixed_query");
		var query = this.getParameter("sysparm_query");
		var addToTable = this.getParameter("sysparm_add_to_table") + "";
		var listTableName = this.getParameter("sysparm_tableName");

		var result = [];
		var existingCI = new GlideRecordSecure(addToTable);
		existingCI.addQuery("task", id);
		existingCI.query();
		while (existingCI.next()) {
			if ("task_ci" === addToTable)
				result.push(existingCI.ci_item.sys_id);
			else if ("task_service_offering" === addToTable)
				result.push(existingCI.service_offering.sys_id);
			else
				result.push(existingCI.cmdb_ci_service.sys_id);
		}

		var affectedCiGR = new GlideRecordSecure(listTableName);
		affectedCiGR.addEncodedQuery(fixedQuery);
		affectedCiGR.addEncodedQuery(query);
		affectedCiGR.addQuery("sys_id", "NOT IN", result.join());
		affectedCiGR.query();
		while (affectedCiGR.next()) {
			var affectedCI = new GlideRecordSecure(addToTable);
			affectedCI.initialize();
			affectedCI.task = id;
			if ("task_ci" === addToTable)
				affectedCI.ci_item = affectedCiGR.sys_id;
			else if ("task_service_offering" === addToTable)
				affectedCI.service_offering = affectedCiGR.sys_id;
			else
				affectedCI.cmdb_ci_service = affectedCiGR.sys_id;
			affectedCI.insert();
		}
		return gs.getMessage("Added {0} configuration items successfully to the change request.", affectedCiGR.getRowCount());
	},

	getTotalNumberOfItems: function() {
		var query = this.getParameter("sysparm_query");
		var listTableName = this.getParameter("sysparm_table");
		var affectedCiGR = new GlideAggregate(listTableName);

		if (!affectedCiGR.canRead())
			return 0;

		affectedCiGR.addEncodedQuery(query);
		affectedCiGR.addAggregate('COUNT');
		affectedCiGR.query();
		if (affectedCiGR.next())
		   return affectedCiGR.getAggregate('COUNT') - 0;
		return 0;
	},

	isPublic: function() {
		return false;
	},

	type: "AssociateCIToTask"
});
```