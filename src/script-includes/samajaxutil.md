---
title: "SAMAjaxUtil"
id: "samajaxutil"
---

API Name: global.SAMAjaxUtil

```js
var SAMAjaxUtil = Class.create();
SAMAjaxUtil.prototype = Object.extendsObject(AbstractAjaxProcessor, {
	
	getPluginInfo : function() {
		var status = new SAMUtils().getPluginStatus(this.getParameter('sysparm_plugin_id'));
		var values = this.newItem("values");
		values.setAttribute("status", status);
	},
	
    type: 'SAMAjaxUtil'
});
```