---
title: "OCCalendarUtils"
id: "occalendarutils"
---

API Name: global.OCCalendarUtils

```js
var OCCalendarUtils = Class.create();
OCCalendarUtils.DEFAULT_READ_ROLES = "itil,roster_admin,rota_admin,rota_manager";
OCCalendarUtils.UTC_DATE_FORMAT = "yyyy-MM-dd";
OCCalendarUtils.UTC_TIME_FORMAT = "HH:mm:ss";

OCCalendarUtils.prototype = {

	DATE_FORMAT_DHTMLX : {
		"%Y" : "yyyy",
		"%y" : "yy",
		"%M" : "MMM",
		"%m" : "MM",
		"%d" : "dd"
	},

	UI_16_PLUGIN: 'com.glide.ui.ui16',

	USE_CONCOURSE_PREFERENCE: 'use.concourse',

	TIME_FORMAT_DHTMLX : {
		"%H" : "HH",
		"%h" : "hh",
        "%g:" : /^h:/,
		"%i" : "mm",
		"%s" : "ss",
		"%a" : "a"
	},
	
	TABLES: {
		SYS_CHOICE: 'sys_choice'
	},
	
	/*set of recommended colors*/
	PALLETE_COLORS:      ['#D8EAFD', '#ABE2E8', '#C3F1C6', '#FBEAB7', '#FFDCC6', '#FACFD7', '#FBC8EB', '#D8D9F9', '#B8DAE6', '#FECEAD'],
	/*set of recommended dark colors in exact matching sequence of the set of recommended colors*/
	PALLETE_DARK_COLORS: ['#A0C6ED', '#89C6CC', '#98D49E', '#F8DE8E', '#FDB481', '#F595A8', '#F89BDC', '#B1B4F2', '#88C2D5', '#F48C45'],

	initialize: function() {
		this.log = new GSLog("com.snc.on_call_rotation.log.level", this.type);
	},

	/**
 	* Get the first day of week from system property.
 	*
 	* glide.ui.date_format.first_day_of_week stipulates that first day of week is 1 (Sunday).
 	* Example: Sunday=1, Monday=2, Tuesday=3 etc.
 	*
 	* @return Integer first day of week
 	**/
	getSystemFirstDayOfWeek: function() {
		var firstDayOfWeekProperty = parseInt(gs.getProperty('glide.ui.date_format.first_day_of_week', 1), 10);
		var isValid = (typeof firstDayOfWeekProperty === 'number' && (firstDayOfWeekProperty % 1) === 0) &&
		(firstDayOfWeekProperty > 0 && firstDayOfWeekProperty <= 7);
		return isValid ? firstDayOfWeekProperty : 1;
	},

	/**
 	* Get date format from user defined format or system format if not found, but converted
	* to DHTMLX format as per spec:
 	*
	* http://docs.dhtmlx.com/scheduler/settings_format.html
	*
	* Add additional formats to the DATE_FORMAT_DHTMLX property of this object.
	*
 	**/
	getUserDateFormat: function() {
		var userDateFormat = gs.getUser().getDateFormat() + "";

		for (var dateFormat in this.DATE_FORMAT_DHTMLX)
			userDateFormat = userDateFormat.replace(this.DATE_FORMAT_DHTMLX[dateFormat], dateFormat);

		this.log.debug("[getUserDateFormat] userDateFormat: " + userDateFormat);
		return userDateFormat;
	},

	/**
 	* Get time format from user defined format or system format if not found, but converted
	* to DHTMLX format as per spec:
 	*
	* http://docs.dhtmlx.com/scheduler/settings_format.html
	*
	* Add additional formats to the TIME_FORMAT_DHTMLX property of this object.
	*
 	**/
	getUserTimeFormat: function() {
		var userTimeFormat = gs.getUser().getTimeFormat() + "";

		for (var timeFormat in this.TIME_FORMAT_DHTMLX)
			userTimeFormat = userTimeFormat.replace(this.TIME_FORMAT_DHTMLX[timeFormat], timeFormat);

		this.log.debug("[getUserTimeFormat] userTimeFormat: " + userTimeFormat);
		return userTimeFormat;
	},

	canRead: function() {
		return GlideSecurityManager.get().hasRole(gs.getProperty("com.snc.on_call_rotation.calendar_read_roles", this.DEFAULT_READ_ROLES));
	},

	/**
 	* Checks if the current session's user can write for the currently selected group on the calendar.
 	*
 	* Used by OnCallRotation Scripted REST API's
 	*
 	* @param String sys_user_group
 	* @return Boolean does the user have write privileges for the group
 	**/
	canWriteByGroupSysId: function(groupSysId) {
		if (!groupSysId)
			return false;
		return new OnCallSecurityNG().rotaMgrAccess(groupSysId);
	},

	canWriteByGroupRecord: function(groupGR) {
		return this.canWriteByGroupSysId(groupGR.getUniqueValue());
	},

	getPalleteDarkColors: function(lightColor) {
		var matchedIndex = this.PALLETE_COLORS.indexOf(lightColor + '');
		if (matchedIndex > -1)
			return this.PALLETE_DARK_COLORS[matchedIndex];
	},

	isUI16Enabled: function() {
		return GlidePluginManager.isActive(this.UI_16_PLUGIN) && gs.getUser().getPreference(this.USE_CONCOURSE_PREFERENCE) == 'true';
	},
	
	type: 'OCCalendarUtils'
};
```