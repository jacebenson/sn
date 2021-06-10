---
title: "ChangeConfigExportUtilityAjax"
id: "changeconfigexportutilityajax"
---

API Name: global.ChangeConfigExportUtilityAjax

```js
var ChangeConfigExportUtilityAjax = Class.create();
ChangeConfigExportUtilityAjax.prototype = Object.extendsObject(AbstractAjaxProcessor, {
    process: function() {
		var table = this.getParameter("sysparm_ajax_processor_root_table");
		var sysId = this.getParameter("sysparm_ajax_processor_root_sys_id");
		var relatedStr = this.getParameter("sysparm_ajax_processor_related");
		
		var related = [];
		if (relatedStr)
			related = relatedStr.split(",");

		var cceu = ChangeConfigExportUtility();
		return cceu.workerSave(cceu.getConfigRecords(table, sysId, related));
    },

    type: 'ChangeConfigExportUtilityAjax'
});
```