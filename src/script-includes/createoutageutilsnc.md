---
title: "CreateOutageUtilSNC"
id: "createoutageutilsnc"
---

API Name: global.CreateOutageUtilSNC

```js
var CreateOutageUtilSNC = Class.create();
CreateOutageUtilSNC.prototype = {
    initialize: function() {
    },
	
	createOutageFromTask: function(contentGr) {
		if (!contentGr || contentGr.sys_id.nil())
			return null;
		var outage = new GlideRecord("cmdb_ci_outage");
		outage.cmdb_ci = contentGr.cmdb_ci;
		outage.task_number = contentGr.sys_id;
		var outageID = outage.insert();

		var task_outage = new GlideRecord('task_outage'); 
		task_outage.task = contentGr.sys_id; 
		task_outage.outage = outageID; 
		task_outage.insert();

		return outage;
	},

	getNewOutageLink: function(contentGr) {
		if (!contentGr || contentGr.sys_id.nil())
			return null;

		var shortDesc = "";
		if(contentGr.cmdb_ci != "" && contentGr.cmdb_ci.name != "")
			shortDesc = contentGr.cmdb_ci.name + " Outage";
		else 
			shortDesc = "Outage";

		return ("cmdb_ci_outage.do?sys_id=-1&sysparm_query=" + encodeURIComponent("cmdb_ci=" + contentGr.getValue("cmdb_ci") + "^task_number=" + contentGr.getUniqueValue() + "^short_description=" + shortDesc + "^EQ"));
	},

	createTaskOutageRecord: function(taskGr, outageGr) {
		if (!taskGr || taskGr.sys_id.nil() || !outageGr || outageGr.sys_id.nil())
			return null;

		var taskOutageGr = new GlideRecord('task_outage');
		taskOutageGr.task = taskGr.getUniqueValue();
		taskOutageGr.outage = outageGr.getUniqueValue();
		taskOutageGr.insert();

		return taskOutageGr;
	},

	
    type: 'CreateOutageUtilSNC'
};
```