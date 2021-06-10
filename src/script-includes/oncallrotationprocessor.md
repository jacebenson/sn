---
title: "OnCallRotationProcessor"
id: "oncallrotationprocessor"
---

API Name: global.OnCallRotationProcessor

```js
var OnCallRotationProcessor = Class.create();
OnCallRotationProcessor.prototype = Object.extendsObject(AbstractScriptProcessor, {
	UI_APPS : {
		"ON_CALL" : "sn.on_call",
		"OCF": "sn.$ocf"
	},

	initialize: function() {
		this.log = new GSLog("com.snc.on_call_rotation.log.level", this.type);
	},

	redirectToCalendar: function() {
		var ocUrl = new OCUrl().setRosterScheduleParams();

		var redirect = g_request.getParameter("sysparm_redirect");
		if (redirect)
			ocUrl.setAttribute("sysparm_redirect", redirect);

		var groupId = g_request.getParameter("sysparm_group_id");
		if (groupId)
			ocUrl.setAttribute("sysparm_group_id", groupId);

		var url = ocUrl.getUrl();

		if (this.log.atLevel(GSLog.DEBUG))
			this.log.debug("[redirectToCalendar] url: " + url);

		g_response.sendRedirect(url);
	},

	getScheduleUrl: function(scheduleId) {
		var gr = new GlideRecord("cmn_rota");
		if (!gr.get("schedule", scheduleId)) {
			this.log.warn("[OnCallRotationProcessor] could not find schedule with sys_id: " + scheduleId);
			return "";
		}

		var groupId = gr.getValue("group");

		return new OCUrl().setRosterScheduleParams().setGroupId(groupId).setScheduleId(scheduleId);
	},

	isCalendarSupported: function () {
		var useDoctype = this._getBooleanProperty("glide.ui.doctype");
		var showLegacyCalendar = this._getBooleanProperty("com.snc.on_call_rotation.show_legacy_calendar");
		var isBrowserSupported = this._isBrowserSupported();

		this.log.debug("[OnCallRotationProcessor] showLegacyCalendar = " + showLegacyCalendar);

		if (!showLegacyCalendar && useDoctype && isBrowserSupported)
			return true;
		return false;
	},

	_isBrowserSupported: function () {
		var currentOnCallMacro = gs.getProperty("com.snc.on_call_rotation.calendar_macro");
		var scopeName = (currentOnCallMacro == "ocf_calendar.xml") ? this.UI_APPS.OCF : this.UI_APPS.ON_CALL;
		return new OnCallRotation().isBrowserSupported(scopeName);
	},

	_getBooleanProperty: function (propertyName) {
		this.log.debug("[_getBooleanProperty] propertyName = " + propertyName);
		return (gs.getProperty(propertyName, "true") + "" == "true");
	},

	type: "OnCallRotationProcessor"
});
```