---
title: "GetUIPolicyTable"
id: "getuipolicytable"
---

API Name: global.GetUIPolicyTable

```js
var GetUIPolicyTable = Class.create();
GetUIPolicyTable.prototype = Object.extendsObject(AbstractAjaxProcessor, {
	getUIPolicyTableName: function() {
		var uiPolicyId = this.getParameter('sysparm_ui_policy_id');
		var uiPolicyGR = new GlideRecord('sys_sg_ui_policy');
		uiPolicyGR.get(uiPolicyId);
		if(!uiPolicyGR.isValidRecord()) {
			gs.error("Invalid ui policy id");
			var errorMessage = gs.getMessage("Invalid ui policy id");
			gs.addErrorMessage(errorMessage);
			return "";
		}
		
		return uiPolicyGR.table;
	},
    type: 'GetUIPolicyTable'
});
```