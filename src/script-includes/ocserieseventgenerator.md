---
title: "OCSeriesEventGenerator"
id: "ocserieseventgenerator"
---

API Name: global.OCSeriesEventGenerator

```js
var OCSeriesEventGenerator = Class.create();

OCSeriesEventGenerator.prototype = {
    initialize: function() {
		this.log = new GSLog("com.snc.on_call_rotation.log.level", this.type);
		this.iCalUtil = new ICalUtil();
    },

	getMemberCalendar: function(groupId, rotaId, userId, dateRangeObj, memberSchedules, calendarLink) {
		var rosterEvents = [];
		var repeatingMemberSpans = this._getRepeatingMemberSchedules(memberSchedules);

		if (repeatingMemberSpans.length == 0)
			return rosterEvents;

		var memberGR = new GlideRecord("cmn_rota_member");
		memberGR.addQuery("member", userId);
		memberGR.addQuery("roster.rota", rotaId);
		if (repeatingMemberSpans.length > 0)
			memberGR.addQuery("roster", "IN", repeatingMemberSpans.join(","));
		var condition = memberGR.addNullQuery("from");
		memberGR.appendOrQuery(condition, "from", "<", dateRangeObj.to);
		memberGR.query();

		while (memberGR.next()) {
			var memberSchedule = memberSchedules[memberGR.roster + ""];
			var to = memberGR.to + "";

			if (JSUtil.nil(to)) {
				rosterEvents = rosterEvents.concat(this.getRosterMemberEvents(memberGR, memberSchedule.startTimes, memberSchedule.excludeItems, dateRangeObj.to, calendarLink));
				continue;
			}

			var toNum = new GlideDateTime(to).getNumericValue();
			if (toNum > new GlideDateTime(dateRangeObj.from).getNumericValue())
				rosterEvents = rosterEvents.concat(this.getRosterMemberEvents(memberGR, memberSchedule.startTimes, memberSchedule.excludeItems, dateRangeObj.to, calendarLink));
		}

		return rosterEvents;
	},

	getRosterMemberEvents: function(rotaMemberGR, seriesStartTimes, excludeItems, repeatUntil, calendarLink) {
		var rotaSpansInRange = Object.keys(seriesStartTimes);

		// Get the rotas schedule spans
		var rotaScheduleSpanGR = new GlideRecord("cmn_schedule_span");
		rotaScheduleSpanGR.addQuery("schedule", rotaMemberGR.roster.rota.schedule + "");
		rotaScheduleSpanGR.addNotNullQuery("repeat_type");
		if (rotaSpansInRange.length > 0)
			rotaScheduleSpanGR.addQuery("sys_id", "IN", rotaSpansInRange.join(","));
		rotaScheduleSpanGR.query();

		if (!rotaScheduleSpanGR.hasNext())
			return "Cannot find rota schedule span";

		// Get the members schedule spans for their roster
		var memberScheduleSpanGR = new GlideRecord("cmn_schedule_span");
		memberScheduleSpanGR.addQuery("schedule", rotaMemberGR.rotation_schedule + "");
		memberScheduleSpanGR.query();

		if (!memberScheduleSpanGR.next())
			return "Cannot find member schedule span";

		var timeZone = rotaMemberGR.rotation_schedule.time_zone + "";
		return this.getRosterICalEvents(rotaScheduleSpanGR, memberScheduleSpanGR, seriesStartTimes, excludeItems, repeatUntil, timeZone, calendarLink);
	},

	/**
	 * Creates an iCal event per rota schedule span, whilst considering the member schedule span.
	 * 
	 * @param rotaScheduleSpanGR can be comprised of multiple spans
	 * @param memberScheduleSpanGR is comprised of a single span
	 * @return arrEvents list of iCal events for the member's schedule
	**/
	getRosterICalEvents: function(rotaScheduleSpanGR, memberScheduleSpanGR, seriesStartTimes, excludeItems, repeatUntil, timeZone, calendarLink) {
		var arrEvents = [];

		while (rotaScheduleSpanGR.next()) {
			var eventArr = [];

			var ruleObj = {
				"FREQ" : "",
				"INTERVAL" : "",
				"BYDAY" : "",
				"WKST" : "",
				"UNTIL" : ""
			};

			var dateTimeObj = this._getEventStartAndEnd(rotaScheduleSpanGR, memberScheduleSpanGR, seriesStartTimes, timeZone);

			eventArr.push("UID:" + rotaScheduleSpanGR.getUniqueValue() + memberScheduleSpanGR.getUniqueValue());

			var repeatType = rotaScheduleSpanGR.getValue("repeat_type") + "";
			if (!JSUtil.nil(repeatType)) {
				var memberFreq = memberScheduleSpanGR.getValue("repeat_count") + "";
				ruleObj.FREQ = ICalUtilSNC.FREQ;

				var byDay;
				if (repeatType == "weekly") {
					var daysOfWeek = rotaScheduleSpanGR.getValue("days_of_week") + "";
					byDay = ICalUtilSNC.DAYS[daysOfWeek[0]];
					for (var i = 1; i < daysOfWeek.length; i++)
						byDay += "," + ICalUtilSNC.DAYS[daysOfWeek[i]];
				} else
					byDay = ICalUtilSNC.BYDAY[repeatType];

				ruleObj.BYDAY = byDay;
				ruleObj.INTERVAL = ( parseInt(memberFreq, 10) / ICalUtilSNC.MULTIPLE );

				// WKST should be when the first event begins (day of week from memberspan record)
				var startDay = new ICalUtil().getSDT(memberScheduleSpanGR.getValue("start_date_time")).getGlideDateTime().getDayOfWeekUTC();

				ruleObj.WKST = ICalUtilSNC.DAYS[startDay];

				var rotaRepeatUntil = rotaScheduleSpanGR.getValue("repeat_until") + "";
				var rotaRepeatUntilDate = this.iCalUtil.getSDT(rotaRepeatUntil);
				if (rotaRepeatUntil === "00000000") {
					var repeatUntilGDT = new GlideDateTime(repeatUntil);
					repeatUntilGDT.addDaysUTC(1);
					rotaRepeatUntilDate = new GlideScheduleDateTime(repeatUntilGDT);
				}
				ruleObj.UNTIL = rotaRepeatUntilDate.getValue();

				eventArr.push(this.iCalUtil.formatRecurringRule(ruleObj));
			}

			eventArr.push("DTEND" + dateTimeObj.end);
			eventArr.push("DTSTART" + dateTimeObj.start);
			eventArr.push("DTSTAMP" + dateTimeObj.start);

			eventArr.push("EXDATE:" + this._getExcludeDateTimes(rotaScheduleSpanGR.getUniqueValue(), excludeItems));

			var eventName = memberScheduleSpanGR.schedule.name + "";
			eventArr.push("SUMMARY:" + eventName);
			eventArr.push("DESCRIPTION:" + eventName);
			eventArr.push("URL:" + calendarLink);

			arrEvents.push(this.iCalUtil.formatICalEvent(eventArr, true));
		}

		return arrEvents;
	},

	_getRepeatingMemberSchedules: function(memberSchedules) {
		var repeatingMemberSpans = [];
		for (var rosterId in memberSchedules)
			if (memberSchedules[rosterId].startTimes !== undefined)
				repeatingMemberSpans.push(rosterId);
		return repeatingMemberSpans;
	},
	
	_getExcludeDateTimes: function(rotaSpanSysId, excludeItems) {
		var exdate = [];
		for (var i = 0; i < excludeItems.length; i++)
			if (excludeItems[i].item.getScheduleSpanId() == rotaSpanSysId)
				exdate.push(excludeItems[i].span.getStart().getValue());
		return exdate.join(",");
	},

	_getEventStartAndEnd: function(rotaScheduleSpanGR, memberScheduleSpanGR, seriesStartTimes, timeZone) {
		// Setting end date, needs DURATION from rota start and end, then add duration to member start
		var rotaStartGSDT = this.iCalUtil.getSDT(rotaScheduleSpanGR.getValue("start_date_time"), timeZone);
		var rotaEndGSDT = this.iCalUtil.getSDT(rotaScheduleSpanGR.getValue("end_date_time"), timeZone);
		
		var firstOccurence = seriesStartTimes[rotaScheduleSpanGR.getUniqueValue()];
		firstOccurence.setTimeZone(timeZone);
		var startDate = this.iCalUtil.getDateFromScheduleDateTime(firstOccurence);

		rotaStartGSDT.setTimeZone(timeZone);
		var startTime = this.iCalUtil.getTimeFromScheduleDateTime(rotaStartGSDT);
		var startDateTime = this.iCalUtil.getSDT(startDate + "T" + startTime, timeZone);

		var difference = ( (rotaEndGSDT.getMS()) - (rotaStartGSDT.getMS()) );
		var endDateTime = new GlideScheduleDateTime(startDateTime);
		endDateTime.addSeconds(difference / 1000);

		var dtStart = ":" + startDateTime.getValue();
		var dtEnd = ":" + endDateTime.getValue();
		if ("Etc/UTC" != timeZone) {
			dtStart = ";TZID=" + timeZone + dtStart.replace("Z", "");
			dtEnd = ";TZID=" + timeZone + dtEnd.replace("Z", "");
		}

		return {
			start : dtStart,
			end : dtEnd
		};
	},


    type: 'OCSeriesEventGenerator'
};
```