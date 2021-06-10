---
title: "BaseUpgradeLogAPI"
id: "baseupgradelogapi"
---

API Name: global.BaseUpgradeLogAPI

```js
var BaseUpgradeLogAPI = Class.create();
BaseUpgradeLogAPI.prototype = Object.extendsObject(AbstractAjaxProcessor, {
	
	getUpgradedRecord: function(fileName) {
		var tableName = new SNC.BaseUpgradeLog().getTableName(fileName);
		if (!tableName)
			return null;
		
		var sysId = new SNC.BaseUpgradeLog().getSysId(fileName, tableName);
		if (!sysId)
			return null;
		
		var gr = new GlideRecord(tableName);
		if (gr.get(sysId))
			return gr;

		return null;
	},
	
	getBaseRecord: function(sysId, tableName) {
		var copiedFromColumn = new SNC.BaseUpgradeLog().getCopiedFromColumn(tableName);
		if (copiedFromColumn == null)
			return null;

		var gr = new GlideRecord(tableName);
		if (!gr.get(sysId))
			return null;

		var baseSysId = gr.getValue(copiedFromColumn);
		if (!baseSysId)
			return null;

		gr = new GlideRecord(tableName);
		if (!gr.get(baseSysId))
			return null;

		return gr;
	},
	
	isMergeAllowed: function (current) {
		var tableName = new SNC.BaseUpgradeLog().getTableName(current.file_name);
		var whitelist = ["sys_atf_test"];
		return whitelist.indexOf(tableName)!=-1;
	},

	revertToBase: function(sys_id) {
		// upgrade history log sys_id
		if (typeof sys_id === "undefined")
			sys_id = this.getParameter('sysparm_sys_id');

		var response = new SNC.BaseUpgradeLog().revertToBase(sys_id);
		var uiNotification = new UINotification();
		if ("success" == response)
			uiNotification.setText(gs.getMessage("Successfully reverted to the Base Record"));
		else {
			uiNotification = new UINotification("error");
			uiNotification.setText("<span style='font-color:red;'>" + gs.getMessage(response) + "</span>");
		}
		uiNotification.send();
	},
	
    type: 'BaseUpgradeLogAPI',
});
```