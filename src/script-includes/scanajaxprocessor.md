---
title: "ScanAjaxProcessor"
id: "scanajaxprocessor"
---

API Name: global.ScanAjaxProcessor

```js
var ScanAjaxProcessor = Class.create();
ScanAjaxProcessor.prototype = Object.extendsObject(AbstractAjaxProcessor, {
	executeTestScan: function() {
		var scan = new sn_instance_scan.ScanInstance();
		var workerId = scan.triggerTestScan(this.getParameter("sysparm_sys_id"), this.getParameter("sysparm_table_name"));

		return workerId;
	},

    executePointScan: function() {
		var scan = new sn_instance_scan.ScanInstance();
		var workerId = scan.triggerPointScan(this.getParameter("sysparm_table_name"), this.getParameter("sysparm_sys_id"));

		return workerId;
	},

    executeSuiteScan: function() {
		var scan = new sn_instance_scan.ScanInstance();
		var workerId = scan.triggerSuiteScan(this.getParameter("sysparm_sys_id"));

		return workerId;
	},

	executeUpdateSetScan: function() {
		var scan = new sn_instance_scan.ScanInstance();
		var workerId = scan.triggerUpdateSetScan(this.getParameter("sysparm_sys_id"));

		return workerId;
	},

	executeAppScan: function() {
		var scopeId = this.getParameter("sysparm_scope_id");
		var scopeRecord = new GlideRecord("sys_scope");
		scopeRecord.get(scopeId);

		if (!scopeRecord.isValidRecord()) {
			gs.addErrorMessage("Failed to find scope record with ID: " + scopeId);
			return;
		}

		var scan = new sn_instance_scan.ScanInstance();
		return scan.triggerAppScan(scopeRecord);
	},

	executeFullScan: function() {
		var count = new GlideAggregate('scan_check');
		count.addQuery('active','true');
		count.addCondition('type', 'full_scan');
		count.addAggregate('COUNT');
		count.query();

		if(count.next() && count.getAggregate('COUNT') <= 0)
			return '';

		var scan = new sn_instance_scan.ScanInstance();
		var workerId = scan.triggerFullScan();

		return workerId;
	},

    type: 'ScanAjaxProcessor'
});
```