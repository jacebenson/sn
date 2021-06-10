---
title: "GetScreenDataItemTable"
id: "getscreendataitemtable"
---

API Name: global.GetScreenDataItemTable

```js
var GetScreenDataItemTable = Class.create();
GetScreenDataItemTable.prototype = Object.extendsObject(AbstractAjaxProcessor, {
	getTableName: function() {
		var screenId = this.getParameter('sysparm_screen_id');
		if (!screenId)
			return "";

		var screenGR = new GlideRecord("sys_sg_screen");
		screenGR.get(screenId);
		if(!screenGR.isValidRecord()) {
			gs.error("Invalid screen: " + screenId);
			var errorMessage = gs.getMessage("Screen not found");
			gs.addErrorMessage(errorMessage);
			return "";
		}
		
		if (screenGR.ref_sys_sg_details_screen.table)
			return screenGR.ref_sys_sg_details_screen.table;
		else if(screenGR.data_item)
			return screenGR.data_item.table;
		else if(screenGR.parent.table)
			return screenGR.parent.table;
		else
			return screenGR.parent.data_item.table;
	},
    type: 'GetScreenDataItemTable'
});
```