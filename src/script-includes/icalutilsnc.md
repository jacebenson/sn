---
title: "ICalUtilSNC"
id: "icalutilsnc"
---

API Name: global.ICalUtilSNC

```js
var ICalUtilSNC = Class.create();

ICalUtilSNC.PREAMBLE = [
	"VERSION:2.0",
	"PRODID:-//Service-now.com//Outlook 11.0 MIMEDIR//EN",
	"METHOD:PUBLISH"
];

ICalUtilSNC.ALARM = [
	"BEGIN:VALARM",
	"TRIGGER:-PT30M",
	"REPEAT:2",
	"DURATION:PT15M",
	"ACTION:DISPLAY",
	"END:VALARM"
];

ICalUtilSNC.BYDAY = {
	daily : "MO,TU,WE,TH,FR,SA,SU",
	weekdays : "MO,TU,WE,TH,FR",
	weekends : "SA,SU",
	weekMWF : "MO,WE,FR",
	weekTT : "TU,TH"
};

ICalUtilSNC.FREQ = "WEEKLY";

ICalUtilSNC.MULTIPLE = 7;

ICalUtilSNC.DAYS = {
	1 : "MO",
	2 : "TU",
	3 : "WE",
	4 : "TH",
	5 : "FR",
	6 : "SA",
	7 : "SU"
};

ICalUtilSNC.BEGIN_CAL = "BEGIN:VCALENDAR";
ICalUtilSNC.END_CAL = "END:VCALENDAR";
ICalUtilSNC.BEGIN_EVENT = "BEGIN:VEVENT";
ICalUtilSNC.END_EVENT = "END:VEVENT";
ICalUtilSNC.SEQUENCE = "SEQUENCE:1";
ICalUtilSNC.STATUS = "X-MICROSOFT-CDO-BUSYSTATUS:FREE";
ICalUtilSNC.SHOW_AS = "TRANSP:TRANSPARENT";

ICalUtilSNC.prototype = {

    initialize: function() {
    },

	formatRecurringRule: function(ruleObj) {
		var rule = "RRULE:";
		if (ruleObj.FREQ)
			rule += "FREQ=" + ruleObj.FREQ + ";";
		if (ruleObj.INTERVAL)
			rule += "INTERVAL=" + ruleObj.INTERVAL + ";";
		if (ruleObj.BYDAY)
			rule += "BYDAY=" + ruleObj.BYDAY + ";";
		if (ruleObj.WKST)
			rule += "WKST=" + ruleObj.WKST + ";";
		if (ruleObj.UNTIL)
			rule += "UNTIL=" + ruleObj.UNTIL + ";";
		return rule;
	},

	formatICalEvent: function(arrEvent, useAlarm) {
		var iCalEvent = [
			ICalUtilSNC.BEGIN_EVENT,
			ICalUtilSNC.SEQUENCE
		];
		iCalEvent = iCalEvent.concat(arrEvent);
		iCalEvent.push(ICalUtilSNC.SHOW_AS);
		iCalEvent.push(ICalUtilSNC.STATUS);
		if (useAlarm)
			iCalEvent = iCalEvent.concat(ICalUtilSNC.ALARM);
		iCalEvent.push(ICalUtilSNC.END_EVENT);
		return iCalEvent.join("\n");
	},
	
	formatICalComponent: function(arrEvents) {
		var eventCalendar = [
			ICalUtilSNC.BEGIN_CAL,
			ICalUtilSNC.PREAMBLE.join("\n")
		];
		eventCalendar = eventCalendar.concat(arrEvents);
		eventCalendar.push(ICalUtilSNC.END_CAL);
		return eventCalendar;
	},

	getSDT: function(sdtStr, timeZone) {
		var scheduleDateTime = new GlideScheduleDateTime();

		scheduleDateTime.setValue(sdtStr);
		if (!(sdtStr.slice(-1) === "Z" || JSUtil.nil(timeZone))) {
			scheduleDateTime.setTimeZone(timeZone);
			scheduleDateTime.setTimeZone("Etc/UTC");
		}

		return scheduleDateTime;
	},

	getDateFromScheduleDateTime: function(scheduleDateTime) {
		var date = scheduleDateTime.getValue();
		if (!JSUtil.nil(date))
			return date.split("T")[0];
		return "";
	},

	getTimeFromScheduleDateTime: function(scheduleDateTime) {
		var date = scheduleDateTime.getValue();
		if (!JSUtil.nil(date))
			return date.split("T")[1];
		return "";
	},

    type: 'ICalUtilSNC'
};
```