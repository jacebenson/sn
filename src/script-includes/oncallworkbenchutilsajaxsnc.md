---
title: "OnCallWorkbenchUtilsAjaxSNC"
id: "oncallworkbenchutilsajaxsnc"
---

API Name: global.OnCallWorkbenchUtilsAjaxSNC

```js
var OnCallWorkbenchUtilsAjaxSNC = Class.create();
OnCallWorkbenchUtilsAjaxSNC.prototype = Object.extendsObject(AbstractAjaxProcessor, {

	overrideEscalation: function() {
		var rotaSysId = this.getParameter('sysparm_rota_sys_id');
		new OnCallWorkbenchUtils().overrideEscalation(rotaSysId);
	},

	resetEscalation: function() {
		var rotaSysId = this.getParameter('sysparm_rota_sys_id');
		new OnCallWorkbenchUtils().resetEscalation(rotaSysId);
	},

	type: 'OnCallWorkbenchUtilsAjaxSNC'
});
```