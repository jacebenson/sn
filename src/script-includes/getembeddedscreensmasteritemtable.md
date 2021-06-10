---
title: "GetEmbeddedScreensMasterItemTable"
id: "getembeddedscreensmasteritemtable"
---

API Name: global.GetEmbeddedScreensMasterItemTable

```js
var GetEmbeddedScreensMasterItemTable = Class.create();
GetEmbeddedScreensMasterItemTable.prototype = Object.extendsObject(AbstractAjaxProcessor, {
	getMasterItemTableName: function() {
		var embeddedScreenId = this.getParameter('sysparm_embedded_screen_id');
		var embeddedScreenGR = new GlideRecord('sys_sg_screen');
		embeddedScreenGR.get(embeddedScreenId);
		if(!embeddedScreenGR.isValidRecord()) {
			gs.error("Invalid embedded screen id");
			var errorMessage = gs.getMessage("Invalid embedded screen id");
			gs.addErrorMessage(errorMessage);
			return "";
		}
		
		return embeddedScreenGR.parent.table;
	},
    type: 'GetEmbeddedScreensMasterItemTable'
});
```