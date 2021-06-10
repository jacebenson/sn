---
title: "GetButtonTable"
id: "getbuttontable"
---

API Name: global.GetButtonTable

```js
var GetButtonTable = Class.create();
GetButtonTable.prototype = Object.extendsObject(AbstractAjaxProcessor, {
	getButtonTableName: function() {
		var buttonId = this.getParameter('sysparm_button_id');
		if (!buttonId)
			return "";

		var msg = "";
		var buttonGR = new GlideRecord("sys_sg_button");
		if (!buttonGR.canRead()) {
			gs.warn("Cannot read table: sys_sg_button");
			msg = gs.getMessage("Security constraints prevent access to table");
			gs.addErrorMessage(msg);
			return "";
		}

		buttonGR.get(buttonId);
		if(!buttonGR.isValidRecord()) {
			gs.error("Invalid button: " + buttonId);
			msg = gs.getMessage("Button not found");
			gs.addErrorMessage(msg);
			return "";
		}

		if (!buttonGR.canRead()) {
			gs.warn("Cannot read record: " + buttonId);
			msg = gs.getMessage("Security constraints prevent access to record");
			gs.addErrorMessage(msg);
			return "";
		}

		var buttonTableGE = buttonGR.getElement("table");
		if (!buttonTableGE.canRead()) {
			gs.warn("Cannot read field: table");
			msg = gs.getMessage("Security constraints prevent access to field");
			gs.addErrorMessage(msg);
			return "";
		}

		return buttonGR.table;
	},
    type: 'GetButtonTable'
});
```