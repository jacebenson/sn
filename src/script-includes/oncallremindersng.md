---
title: "OnCallRemindersNG"
id: "oncallremindersng"
---

API Name: global.OnCallRemindersNG

```js
var OnCallRemindersNG = Class.create();

OnCallRemindersNG.prototype = {

	SECONDS_PER_DAY: 86400,
	ROTATION_INTERVAL_LIMIT: 28, // max 28 days ahead notification
	OCR_REMINDERS_LOG: "com.snc.on_call_rotation.log.level",
	OCR_REMINDER_EVENT: "rota.on_call.reminder",
	OCR_TABLE_REMINDER_EVENT: "rota.on_call.table.reminder",

	initialize: function () {
		this.log = new GSLog(this.OCR_REMINDERS_LOG, this.type);
		this.maxHtmlLength = gs.getProperty("com.snc.on_call_rotation.max_html_length", 4000);
	},

	/**
 	* This is main function called for sending reminders in automated way or through UI action by clicking button for resending reminders
 	* AUTOMATED WAY : new OnCallRemindersNG().sendReminders(null); - iterates through all active rotas in system with Send reminder option checked,
 	*                     finds active rosters with checked Send reminder option.
 	*
 	*     CONDITION FOR SENDING REMINDERS: If at the moment when automated job runs roster's reminderLeadTime is
 	*         equal to the number of days remaining till the begining of next roster rotation
 	*         then function sends reminder e-mail to roster's members involved in upcoming rotation interval.
 	*         If roster does not have reminderLeadTime defined rota's reminderLeadTime is used if it is defined
 	*         and if not default value 2 is used.
 	*
 	*     SPAN OF TIME TABLE - E-mails are being sent per rota and contain same rotation time table for the whole rota and
 	*         for all rosters members with only difference that each recepient will have his own name highlighted in time table.
 	*         If there is at least one roster in rota which satisfies condition for sending reminders than span of time table is
 	*         from the begining of the next rotation of that roster till the end of longest rotation interval among all
 	*         rosters in rota which satisfies condition for sending reminders.
 	*
 	*     RECEPIENTS are members of each roster per rota which satisfies condition for sending reminders and who are involved in upcoming roster rotation period.
 	*
 	* RESENDING REMINDERS (UI action per rota) : new OnCallRemindersNG().sendReminders(rotaID); - resends reminders for specific rota
 	*                                            If specified rota has reminder option checked,
 	*                                            finds all active rosters with checked Send reminder option.
 	*     SPAN OF TIME TABLE - E-mails are being sent per rota and contain same rotation time table for the whole rota and
 	*         for all rosters members with only difference that each recepient will have his own name highlighted in time table.
 	*         Begining of span is current date + smallest reminder lead time of all rosters reminders lead times with reminder option checked
 	*         End of a span is calculated as fallows:
 	*         max value of expression
 	*          (current date +
 	*          reminder lead time +
 	*          days till end of rotation at the moment (current date + reminder lead time) +
 	*          rotation interval)
 	*          among all rosters per rota which we consider for sending reminders
 	*
 	*     RECEPIENTS are members of each roster of rota which satisfies condition for sending remindersa and who are involved in upcoming roster rotation period.
 	*
 	* @param String rotaID - id of rota, if provided function is called from UI action on button (Resend reminders) on rota view, else function is called from automated Scheduled job
 	*                 and sends reminders for all rota on system
 	*/
	sendReminders: function (rotaID) {
		/* check each rota that wants reminders */
		var rotaGR = this.getRotaGr(rotaID);
		while (rotaGR.next()) {
			var endTime = new GlideDateTime();
			var startTime = null;

			// can be overridden by rosterGR.reminder_lead_time
			var reminderLeadTime = (JSUtil.notNil(rotaGR.reminder_lead_time) && (rotaGR.reminder_lead_time >= 0)) ? rotaGR.reminder_lead_time : 2;
			this.log.debug("[sendReminders] rota reminderLeadTime: " + reminderLeadTime);

			var rosterIds = [];
			var rosterGR = this.getRosterGr(rotaGR.getUniqueValue());
			while (rosterGR.next()) {
				if (!rosterGR || rosterGR.rotation_start_date == "00000000")
					continue;

				if (JSUtil.notNil(rosterGR.reminder_lead_time) && (rosterGR.reminder_lead_time >= 0))
					reminderLeadTime = rosterGR.reminder_lead_time;

				this.log.debug("[sendReminders] roster reminderLeadTime: " + reminderLeadTime);

				var condition = false;
				if (rotaID)
					condition = true;
				else {
					var daysToRotation = this.getNumberOfDaysTillNextRotation(rosterGR, false);
					var rotationInterval = this.getRotationInterval(rosterGR);
					if (daysToRotation == reminderLeadTime || (reminderLeadTime == 0 && daysToRotation == rotationInterval) || (((reminderLeadTime - daysToRotation) % rotationInterval) == 0))
						condition = true;
				}

				this.log.debug("[sendReminders] condition: " + condition);

				if (condition) {
					var rosterStartTime = this.getRosterStartTime(reminderLeadTime);
					var rosterEndTime = this.getRosterEndTime(rosterGR, reminderLeadTime);
					if (!rotaID) // in a case of resending reminders we don't update last reminder time
						this.updateRosterLastReminderTime(rosterGR.getUniqueValue(), rosterEndTime);
					endTime = this.adjustEndTime(endTime, rosterEndTime); // assigns greater of two parameters
					startTime = this.adjustStartTime(startTime, rosterStartTime); //assigns smaller of two parameters
					rosterIds.push(rosterGR.getUniqueValue());
				}
			}
			if (startTime && this.sendEmails(rotaGR, startTime, endTime, rosterIds) && !rotaID)
				this.updateRotaLastReminderTime(rotaGR.getUniqueValue());
		}
	},

	/**
 	* Returns roster's rotation interval in days. Maximum number of days of rotation interval is set to 28.
 	* @param roster - GlideRecord
 	*/
	getRotationInterval: function (roster) {
		//Start with daily rotation
		var rotationInterval = parseInt(roster.getValue("rotation_interval_count"), 10);

		if (roster.rotation_interval_type == "weekly")
			rotationInterval = roster.rotation_interval_count * 7;

		if (rotationInterval > this.ROTATION_INTERVAL_LIMIT)
			rotationInterval = this.ROTATION_INTERVAL_LIMIT;

		this.log.debug("[getRotationInterval] rotationInterval: " + rotationInterval);
		return rotationInterval;
	},

	/**
 	* Returns number of days till next rotation for specified roster
 	* @param roster - GlideRecord
 	* @param endOfRotation - boolean, if true function returns number of days till the end of rotation
 	*                                 if false function returns number of days till the begining of new rotation
 	*
 	* @param fromTime - GlideDateTime, sets starting point for which we want to get number of days till start of next rotation or end of current rotation
 	*/
	getNumberOfDaysTillNextRotation: function (roster, isEndOfRotation, fromTime) {
		if (!roster || !roster.rotation_start_date)
			return -1;

		fromTime = (!fromTime) ? new GlideDateTime() : fromTime;

		// Get Rota Start Date
		var rosterStartDateTime = new GlideDateTime();
		rosterStartDateTime.setDisplayValue(roster.rotation_start_date.getDisplayValue());

		var fromDateTime = new GlideDateTime();
		fromDateTime.setDisplayValue(fromTime.getDate().getDisplayValue());
		var rotationInterval = this.getRotationInterval(roster);
		
		if(roster.getValue('rotation_interval_type') === "weekly") {
			var timezone = roster.rota.schedule.time_zone + "";
			
			// adjust rotation day to dow_for_rotate, if defined.
			var dowForRotate = parseInt(roster.getValue('dow_for_rotate'));
			
			// Prepone the start date to selected day of the week.
			if (!isNaN(dowForRotate))
				this._rotateToWeekDay(rosterStartDateTime, dowForRotate, timezone);
		}
		
		return this._getNumberOfDaysTillNextRotation(rosterStartDateTime, fromDateTime, isEndOfRotation, rotationInterval);
	},

	_getNumberOfDaysTillNextRotation: function(rotaStartDateTime, fromDateTime, isEndOfRotation, rotationInterval) {
		rotaStartDateTime = !rotaStartDateTime ? new GlideDateTime() : rotaStartDateTime;
		fromDateTime = !fromDateTime ? new GlideDateTime() : fromDateTime;

		this.log.debug("[_getNumberOfDaysTillNextRotation] rotaStartDateTime: " + rotaStartDateTime);
		this.log.debug("[_getNumberOfDaysTillNextRotation] fromDateTime: " + fromDateTime);
		this.log.debug("[_getNumberOfDaysTillNextRotation] isEndOfRotation: " + isEndOfRotation);
		this.log.debug("[_getNumberOfDaysTillNextRotation] rotationInterval: " + rotationInterval);

		if (!rotaStartDateTime.isDST() && fromDateTime.isDST())
			fromDateTime.add(3600000);

		var dateDiff = gs.dateDiff(rotaStartDateTime.getDisplayValue(), fromDateTime.getDisplayValue(), false);
		var durationDateDiff = new GlideDuration(dateDiff);
		var daysDifference = Math.abs(durationDateDiff.getDayPart());
		var daysToRotation = 0;
		
		// case when fromDateTime < rotaStartDateTime
		if (fromDateTime.compareTo(rotaStartDateTime) < 0) {
		    if (isEndOfRotation && (daysDifference > 0))
                daysDifference--;
            this.log.debug("[_getNumberOfDaysTillNextRotation] fromDateTime < rotaStartDateTime daysToRotation: " + daysToRotation);
            return daysDifference;
        }

		
		var daysIntoRotation = daysDifference % rotationInterval;
		daysToRotation = rotationInterval - daysIntoRotation;

		// if endOfRotation is true we need number of days to end of current rotation
		if (isEndOfRotation && (daysToRotation > 0))
			daysToRotation--;

		this.log.debug("[_getNumberOfDaysTillNextRotation] daysToRotation: " + daysToRotation);
		return daysToRotation;
	},
	
	_rotateToWeekDay: function(startGdt, dowForRotate, rotaScheuleTimezone) {
		var dow = this.getDayOfWeekTZ(startGdt, rotaScheuleTimezone);
		while(dow != dowForRotate){
			startGdt.addDaysLocalTime(-1);
			dow = this.getDayOfWeekTZ(startGdt, rotaScheuleTimezone);
		}
	},
	
	getDayOfWeekTZ: function(gdt, timezone){
		gdt = new GlideDateTime(gdt);
		gdt.setTZ(this._parseTZ(timezone));
		return parseInt(gdt.getDayOfWeekLocalTime());
	},

	_parseTZ: function(timeZoneStr){
		var schedule = new GlideSchedule();
		schedule.setTimeZone(timeZoneStr);
		return schedule.getTZ();
	},

	/**
 	* Returns GlideDateTime value of current time + reminderLeadTime
 	* @param reminderLeadTime - rosters's reminder lead time tells how many days before roster's rotation on call reminders need to be sent
 	*/
	getRosterStartTime: function(reminderLeadTime) {
		var startTime = new GlideDateTime();
		startTime.addSeconds(reminderLeadTime * this.SECONDS_PER_DAY);

		this.log.debug("getRosterStartTime: " + startTime.getDate().toString());
		return startTime;
	},

	/**
 	* Returns GlideDateTime value calculated as
 	*         (current date +
 	*          reminder lead time +
 	*          days till end of rotation at the moment (current date + reminder lead time) +   //this will be 0 in a case of automated call
 	*          rotation interval)
 	* If (current time + reminder lead time) is a starting day of new roster's rotation than it returns date when that new rotation ends
 	* If (current time + reminder lead time) is in the middle of current rotation than it returns date when that rotation ends
 	* @param roster - GlideRecord
 	* @param reminderLeadTime - rosters's reminder lead time tells how many days before roster's rotation on call reminders need to be sent
 	*/
	getRosterEndTime: function (roster, reminderLeadTime) {
		var days = 0;
		days += reminderLeadTime;

		var fromDate = new GlideDateTime();
		fromDate.addSeconds(reminderLeadTime * this.SECONDS_PER_DAY);

		//number of days till end of current rotation starting from fromDate
		var daysTillEndOfCurrentRota = this.getNumberOfDaysTillNextRotation(roster, true, fromDate);
		days += daysTillEndOfCurrentRota;

		//daysTillBeginingOfNextRotation from fromDate should be 0 in case of automated sending
		var daysTillBeginingOfNextRotation = this.getNumberOfDaysTillNextRotation(roster, false, fromDate);
		if (daysTillBeginingOfNextRotation == 0)
			days += this.getRotationInterval(roster);
		if (days > this.ROTATION_INTERVAL_LIMIT)
			days = this.ROTATION_INTERVAL_LIMIT;

		var endTime = new GlideDateTime();
		endTime.addSeconds(days * this.SECONDS_PER_DAY);

		this.log.debug("[getRosterEndTime] rosterEndTime: " + endTime.getDate().toString());
		return endTime;
	},

	/**
 	* Updates last_reminder_time on rota to be current date
 	* @param rotaID - id of a rota
 	*/
	updateRotaLastReminderTime: function (rotaID) {
		var rota = new GlideRecord('cmn_rota');
		rota.get("sys_id", rotaID);
		rota.last_reminder_time = (new GlideDateTime()).getDisplayValue();
		rota.update();
	},

	/**
 	* Updates last_reminder_time on roster to be dateTime (usually last day of roster rotation )
 	* @param rosterID - id of a roster
 	* @param dateTime - GlideDateTime
 	*/
	updateRosterLastReminderTime: function (rosterID, dateTime) {
		var roster = new GlideRecord('cmn_rota_roster');
		roster.get('sys_id', rosterID);
		roster.last_reminder_time = dateTime.getDisplayValue();
		roster.update();
	},

	/**
 	* Sets endTime to be greater value of the two endTime and rosterEndTime
 	* @param GlideDateTime endTime
 	* @param GlideDateTime rosterEndTime
 	*/
	adjustEndTime: function (endTime, rosterEndTime) {
		if (endTime.compareTo(rosterEndTime) < 0) // if endTime < rosterEndTime
			endTime = rosterEndTime;

		this.log.debug("adjustEndTime: " + endTime.getDate().toString());
		return endTime;
	},

	/**
 	* Sets startTime to be smaller value of these two: startTime and rosterStartTime
 	* @param GlideDateTime startTime
 	* @param GlideDateTime rosterStartTime
 	* @return startTime to be smaller value of the these two startTime and rosterStartTime
 	*/
	adjustStartTime: function (startTime, rosterStartTime) {
		// if (startTime is not defined) or (startTime > rosterStartTime)
		if (!startTime || (startTime.compareTo(rosterStartTime) > 0))
			startTime = rosterStartTime;
		this.log.debug("adjustStartTime: " + startTime.getDate().toString());
		return startTime;
	},

	/**
 	* Constructs a URL that will direct a user to their personal shcedule report
 	* This is the same as clicking the "My Schedule Report" module from the navigation menu
 	*
 	* @param String startDate (e.g. 2013-10-01)
 	* @param String endDate (e.g. 2013-11-01)
 	*
 	* @return String url
 	*/
	getMySchedulesUrl: function (startDate, endDate) {
		var instanceName = GlideProperties.get("instance_name");
		var fallbackUrl = "https://" + instanceName + ".service-now.com";
		var uiPage = "ui_page_process.do?sys_id=a4ce24b3bf1011003f07e2c1ac0739ae&sys_action=btn_get_schedule&schedule_range=date_range";
		var start = "&start_date=" + startDate;
		var end = "&end_date=" + endDate;
		var baseUrl = GlideProperties.get("glide.servlet.uri", fallbackUrl) + "";
		var url = baseUrl + (baseUrl.charAt(baseUrl.length - 1).equals("/") ? "" : "/");
		url += uiPage + start + end;

		this.log.debug("[getMySchedulesUrl] url: " + url);
		return url;
	},

	/**
 	* @return String containing html style for time table with highlight class for specific userID
 	*/
	getStyle: function (userID) {
		var style = "<style>#schedule table, #schedule th, #schedule td {border-collapse: collapse;border: 1px solid black;text-align: center;padding: 5px;";
		style += "font-size: " + gs.getProperty('css.base.font-size', '10pt') + ";font-family:" + gs.getProperty('css.base.font-family', 'Arial') + ";}";
		style += "#schedule th {background-color: " + gs.getProperty('css.base.color', '#767676') + ";color: white;}";
		style += ".h" + userID + "{background-color:#BAF2AE;}</style>";
		this.log.debug("getStyle: " + style);
		return style;
	},

	/**
 	* Generates time table in buildRotaSchedule and sends e-mail reminders to users
 	* @param GlideRecord rotaGR - rota
 	* @param GlideDateTime startTime - starting date for time table
 	* @param GlideDateTime endTime - end date for time table
 	* @return int - number of reminder recepients
 	*/
	sendEmails: function (rotaGR, startTime, endTime, rosterIds) {
		this.log.debug("[sendEmails] startTime: " + startTime);
		this.log.debug("[sendEmails] endTime: " + endTime);
        
		var users = {}; // recepients of reminders
		var fsr = this._buildFSR(rotaGR, startTime, endTime, rosterIds, users);
		var html = "<div id='schedule'>" + fsr.getHTML(true) + "</div>";
		var i18nMsg = gs.getMessage("See your schedule");
		html += "<div><a href='" + this._getLink(startTime, endTime) + "'>" + i18nMsg + "</a></div>";
		var userSize = 0;
		for (var userID in users) {
			var htmlStr = this.getStyle(userID) + html;
			this.log.debug("[sendEmails] html length: " + htmlStr.length);
			if (htmlStr.length >= this.maxHtmlLength) {
				gs.eventQueue(this.OCR_TABLE_REMINDER_EVENT, rotaGR, userID, this._storeHtml(htmlStr, rotaGR.getUniqueValue()));
				this.log.debug("Email length greater than or equal to: " + this.maxHtmlLength);
				this.log.debug("Event: " + this.OCR_TABLE_REMINDER_EVENT + " triggered for: [" + users[userID].name + "] sys_user.sys_id: " + userID);
			} else {
				gs.eventQueue(this.OCR_REMINDER_EVENT, rotaGR, userID, htmlStr);
				this.log.debug("Event: " + this.OCR_REMINDER_EVENT + " triggered for: [" + users[userID].name + "] sys_user.sys_id: " + userID);
			}
			userSize++;
		}
		this.log.logNotice("On-Call Reminders generated for period starting: " + startTime.getDate().toString() + " ending: " + endTime.getDate().toString() + ". " + userSize + " reminder events generated.");
		return userSize;
	},

	_buildFSR: function (rotaGR, startTime, endTime, rosterIds, users) {
		var fsr = new FormattedScheduleReport(rotaGR.schedule.time_zone);
		fsr.buildScheduleEmail(rotaGR.group + "", startTime, endTime, rotaGR.getUniqueValue());
		for (var i = 0; i < rosterIds.length; i++)
			fsr.getUsers(rotaGR, rosterIds[i], startTime, endTime, users);
		return fsr;
	},

	_getLink: function (startTime, endTime) {
		var endTimeForLink = new GlideDateTime(endTime);
		endTimeForLink.addSeconds(this.SECONDS_PER_DAY);
		var link = this.getMySchedulesUrl(startTime.getDate().getDisplayValue(), endTimeForLink.getDate().getDisplayValue());
		this.log.debug("[_getLink] link: " + link);
		return link;
	},

	_storeHtml: function (htmlReport, rotaSysId) {
		if (JSUtil.nil(htmlReport))
			return "";
		var gr = new GlideRecord("v_formatted_schedule_report");
		gr.setValue("html_report", htmlReport);
		if (!JSUtil.nil(rotaSysId))
			gr.setValue("rota", rotaSysId);
		return gr.insert();
	},

	/**
	* Get rotas that require reminders
	* @param String rotaSysId - SysId of rota record
	* @return GlideRecord gr - cmn_rota
	*/
	getRotaGr: function (rotaID) {
		var gr = new GlideRecord("cmn_rota");
		gr.addActiveQuery();
		gr.addQuery('send_reminders', true);
		if (rotaID)
			gr.addQuery("sys_id", rotaID);
		gr.query();
		return gr;
	},

	/**
	* Get rotas that require reminders
	* @param String rotaSysId - SysId of rota record
	* @return GlideRecord gr - cmn_rota_roster
	*/
	getRosterGr: function (rotaSysId) {
		var gr = new GlideRecord("cmn_rota_roster");
		gr.addActiveQuery();
		gr.addQuery("rota", rotaSysId);
		gr.addQuery("send_reminders", true);
		gr.query();
		return gr;
	},

	type: "OnCallRemindersNG"
};
```