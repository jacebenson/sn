---
title: "BulkAddChangeRequest"
id: "bulkaddchangerequest"
---

API Name: global.BulkAddChangeRequest

```js
var BulkAddChangeRequest = Class.create();
BulkAddChangeRequest.prototype = Object.extendsObject(AbstractAjaxProcessor, {

	PARAMS: {
		SYSID: "sysparm_sys_id",
		TABLE: "sysparm_table",
		VIEW: "sysparm_view",
		NOSTACK: "sysparm_nostack",
		QUERY: "sysparm_query",
		FIXEDQUERY: "sysparm_fixed_query",
		PARENTCOLUMN: "sysparm_parent_column",
		SELECTEDTASKS: "sysparm_selected_tasks",
		TYPE: "sysparm_type"
	},

	getURL: function(){
		var sysId = this.getParameter(this.PARAMS.SYSID);
		var url = new GlideURL("task_add_change_req.do");
		var fixedQuery = "active=true^parentISEMPTY";
		url.set(this.PARAMS.SYSID, sysId);
		url.set(this.PARAMS.VIEW, "default");
		url.set(this.PARAMS.NOSTACK, "true");
		url.set(this.PARAMS.QUERY, "ORDERBYDESCsys_created_on");
		url.set(this.PARAMS.TABLE, "change_request");
		url.set(this.PARAMS.FIXEDQUERY, fixedQuery);
		return url;
	},

	linkChangeReqToTask: function(){
		var taskSysId = this.getParameter(this.PARAMS.SYSID);
		var table = this.getParameter(this.PARAMS.TABLE);
		var selectedRecords = this.getParameter(this.PARAMS.SELECTEDTASKS);
		var query = this.getParameter(this.PARAMS.QUERY);
		var parentColumn = this.getParameter(this.PARAMS.PARENTCOLUMN);
		var type = this.getParameter(this.PARAMS.TYPE);

		if (!taskSysId) {
			gs.error("[BulkAddChangeRequest] Invalid Parameter - sysparm_sys_id is empty or null");
			return;
		}
		if (!table) {
			gs.error("[BulkAddChangeRequest] Invalid Parameter - sysparm_table is empty or null");
			return;
		}
		if (!parentColumn) {
			gs.error("[BulkAddChangeRequest] Invalid Parameter - sysparm_parent_column is empty or null");
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
	
	
    type: 'BulkAddChangeRequest'
});
```