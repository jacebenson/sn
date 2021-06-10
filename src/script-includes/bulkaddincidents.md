---
title: "BulkAddIncidents"
id: "bulkaddincidents"
---

API Name: global.BulkAddIncidents

```js
var BulkAddIncidents = Class.create();
BulkAddIncidents.prototype = Object.extendsObject(AbstractAjaxProcessor, {

	PARAMS: {
		SYSID: "sysparm_sys_id",
		PARENTTABLE: "sysparm_parent_table",
		TABLE: "sysparm_table",
		VIEW: "sysparm_view",
		NOSTACK: "sysparm_nostack",
		QUERY: "sysparm_query",
		PARENTCOLUMN: "sysparm_parent_column",
		FIXEDQUERY: "sysparm_fixed_query",
		JS: "sysparm_js",
		JSTYPE: "sysparm_js_type",
		SELECTEDTASKS: "sysparm_selected_tasks",
		TYPE: "sysparm_type"
	},

	getURL: function(){
		var sysId = this.getParameter(this.PARAMS.SYSID);
		var pTable = this.getParameter(this.PARAMS.PARENTTABLE);
		var url = new GlideURL("incident_add_records.do");
		var parentColumn = gs.getProperty('com.snc.incident.link_to_task.'+pTable);
		var fixedQuery = "active=true^" + parentColumn + "ISEMPTY";
		url.set(this.PARAMS.SYSID, sysId);
		url.set(this.PARAMS.VIEW, "default");
		url.set(this.PARAMS.NOSTACK, "true");
		url.set(this.PARAMS.QUERY, "ORDERBYDESCsys_created_on");
		url.set(this.PARAMS.TABLE, "incident");
		url.set(this.PARAMS.PARENTCOLUMN, parentColumn);
		url.set(this.PARAMS.FIXEDQUERY, fixedQuery);
		url.set(this.PARAMS.JS, "incident_link_task.js");
		url.set(this.PARAMS.JSTYPE, "file_system");
		return url;
	},

	linkTasks: function(){
		var taskSysId = this.getParameter(this.PARAMS.SYSID);
		var table = this.getParameter(this.PARAMS.TABLE);
		var selectedRecords = this.getParameter(this.PARAMS.SELECTEDTASKS);
		var query = this.getParameter(this.PARAMS.QUERY);
		var parentColumn = this.getParameter(this.PARAMS.PARENTCOLUMN);
		var type = this.getParameter(this.PARAMS.TYPE);

		if (!taskSysId) {
			gs.error("[BulkAddIncidents] Invalid Parameter - sysparm_sys_id is empty or null");
			return;
		}
		if (!table) {
			gs.error("[BulkAddIncidents] Invalid Parameter - sysparm_table is empty or null");
			return;
		}
		if (!parentColumn) {
			gs.error("[BulkAddIncidents] Invalid Parameter - sysparm_parent_column is empty or null");
			return;
		}

		var relatedRecordGr = new GlideRecord(table);
		if (relatedRecordGr.isValid() && relatedRecordGr.canWrite() && relatedRecordGr.getElement(parentColumn).canWrite()) {
			relatedRecordGr.addQuery(parentColumn, 'null');
			if (type == 'add_selected')
				relatedRecordGr.addQuery('sys_id', 'IN', selectedRecords);
			else
				relatedRecordGr.addEncodedQuery(query);
			relatedRecordGr.setValue(parentColumn, taskSysId);
			relatedRecordGr.updateMultiple();
		}
		return;
	},
	
	canShowAddButton : function(parent, current) {
		var field = gs.getProperty('com.snc.incident.link_to_task.' + parent.sys_class_name);
		return parent.active == true && current.isValidField(field);
	},
	
    type: 'BulkAddIncidents'
});
```