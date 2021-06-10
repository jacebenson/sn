---
title: "OCUrl"
id: "ocurl"
---

API Name: global.OCUrl

```js
var OCUrl = Class.create();
OCUrl.prototype = {

	initialize: function() {
		this.supported = new OnCallRotationProcessor().isCalendarSupported();
		if (this.supported)
			this.url = new GlideURL("$oc.do");
		else
			this.url = new GlideURL("show_schedule.do");
	},

	setRosterScheduleParams: function() {
		if (!this.supported) {
			this.setAttribute("sysparm_type" , "roster");
			this.setAttribute("sysparm_include_view" , "monthly,weekly,daily,oldtimeline");
		}
		return this;
	},

	setScheduleParams: function() {
		if (!this.supported) {
			this.setAttribute("sysparm_domain_restore" , "false");
			this.setAttribute("sysparm_stack" , "no");
		}

		return this;
	},

	setScheduleId: function(scheduleId) {
		if (!this.supported)
			this.setAttribute("sysparm_sys_id" , scheduleId);
		return this;
	},

	setGroupId: function(groupId) {
		if (this.supported)
			this.setAttribute("sysparm_group_id" , groupId);
		return this;
	},

	setAttribute: function(name, value) {
		this.url.set(name, value);
		return this;
	},

	getUrl: function() {
		return this.url.toString();
	},

	type: "OCUrl"
};
```