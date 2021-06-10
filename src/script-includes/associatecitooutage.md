---
title: "AssociateCIToOutage"
id: "associatecitooutage"
---

API Name: global.AssociateCIToOutage

```js
var AssociateCIToOutage = Class.create();
AssociateCIToOutage.prototype = Object.extendsObject(AbstractAjaxProcessor, {
	SESSION_KEY: 'com.snc.change_request.AssociateCIToOutage.ci_user_filter',

	ajaxFunction_getURL: function(){
		var outageId = this.getParameter("sysparm_id");
		var addToTable = this.getParameter("sysparm_add_to");
		return this._getURL(outageId, addToTable);
	},

	_getURL: function(outageId, addToTable){
		this.removeUserFilter();

		var latestClassAdded = "";
		var parentClass = "cmdb_ci";

		// latestClassAdded logic
		// 1. if there are ci's, get the latest class of the ci
		// 2. default the latest class to parent class
		latestClassAdded = this.getLatestClass(outageId);
		if (!latestClassAdded)
			latestClassAdded = parentClass;
		var url = new GlideURL("outage_add_affected_cis.do");
		url.set("sysparm_crSysId", outageId);
		url.set("sysparm_view", "associate_ci");
		url.set("sysparm_add_to", addToTable);
		url.set("sysparm_stack", "no");
		url.set("sysparm_table", latestClassAdded);
		url.set("sysparm_parent_class", parentClass);
		return url;
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
		var addToTable = this.getParameter("sysparm_add_to_table");
		var listTableName = this.getParameter("sysparm_tableName");
		var selCIsList = this.getParameter("sysparm_selCIs");
		var selCIs = selCIsList.split(",");
		for (var i=0; i<selCIs.length; i++) {
			if (selCIs[i]) {
				var existingCI = new GlideRecordSecure(addToTable);
				existingCI.addQuery("JOINcmdb_ci_outage.sys_id=cmdb_outage_ci_mtom.outage");
				existingCI.addQuery("ci_item", selCIs[i]);
				existingCI.addQuery("outage", id);
				existingCI.query();

				if (!existingCI.hasNext()) {
					var affectedCI = new GlideRecordSecure(addToTable);
					affectedCI.initialize();
					affectedCI.outage = id;
					affectedCI.ci_item = selCIs[i];
					affectedCI.insert();
				}
			}
		}
		return gs.getMessage("Added selected configuration items successfully to the outage.");
	},

	getLatestClass: function(outageId){
		var affectedCiGR = new GlideRecordSecure("cmdb_outage_ci_mtom");
		affectedCiGR.addQuery("JOINcmdb_ci_outage.sys_id=cmdb_outage_ci_mtom.outage");
		affectedCiGR.addQuery("outage", outageId);
		affectedCiGR.orderByDesc("sys_updated_on");
		affectedCiGR.setLimit(1);
		affectedCiGR.query();
		if (affectedCiGR.next())
			return affectedCiGR.ci_item.sys_class_name;
		return "";
	},

	addAll: function() {
		var id = this.getParameter("sysparm_id");
		var query = this.getParameter("sysparm_query");
		var addToTable = this.getParameter("sysparm_add_to_table");
		var listTableName = this.getParameter("sysparm_tableName");

		var result = [];
		var existingCI = new GlideRecordSecure(addToTable);
			existingCI.addQuery("JOINcmdb_ci_outage.sys_id=cmdb_outage_ci_mtom.outage");
		
		existingCI.addQuery("outage", id);
		existingCI.query();
		while (existingCI.next()) {
				result.push(existingCI.ci_item.sys_id);
			
		}

		var affectedCiGR = new GlideRecordSecure(listTableName);
		var finalQuery = query;
		affectedCiGR.addEncodedQuery(finalQuery);
		affectedCiGR.addQuery("sys_id" , "NOT IN", result.join());
		affectedCiGR.query();
		while (affectedCiGR.next()) {
			var affectedCI = new GlideRecordSecure(addToTable);
			affectedCI.initialize();
			affectedCI.outage = id;
				affectedCI.ci_item = affectedCiGR.sys_id;
			affectedCI.insert();
		}
		return gs.getMessage("Added {0} configuration items successfully to the outage.", affectedCiGR.getRowCount());
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

	type: "AssociateCIToOutage"
});
```