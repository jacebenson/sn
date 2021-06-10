---
title: "OCRotaICalendarSNC"
id: "ocrotaicalendarsnc"
---

API Name: global.OCRotaICalendarSNC

```js
var OCRotaICalendarSNC = Class.create();
OCRotaICalendarSNC.prototype = {

	SCHEDULE_TYPE: {
		TIME_OFF: "time_off",
		TIMEOFF: "timeoff"
	},

	MULTIPLIER: {
		"daily": 1,
		"weekly": 7
	},

    initialize: function() {
		this.log = new GSLog("com.snc.on_call_rotation.log.level", this.type);
    },

	/**
	 * Returns iCal formatted events for the given users rotation
	 *
	 * @return result String - text/calendar formatted string.
	**/
	getCalendarEvents: function(groupId, rotaId, userId, dateRangeObj, useCache) {
		var result = "";

		if (JSUtil.nil(groupId) || JSUtil.nil(rotaId) || JSUtil.nil(userId))
			return result;

		// Get the cmn_rota record as it will be referenced throughout
		var rotaGR = new GlideRecord("cmn_rota");
		if (!rotaGR.get(rotaId))
			return result;

		// from and to dates, used for getItems, series repeatUntil and, storing response in cache
		if (!dateRangeObj)
			dateRangeObj = this._getCalculationDates(groupId, rotaGR);

		// Gets response from cache if it exists
		if (useCache)
			result = this.getEventsFromTable(groupId, rotaId, userId, dateRangeObj);

		// Already have the response
		if (result)
			return result;

		// Get link to calendar to add to individual events
		var calendarLink = this.getOnCallCalendarURL(rotaGR);

		// Get all events we are concerned about
		var scheduleItems = this.createCalendarEvents(groupId, rotaId, userId, dateRangeObj);
		var repeatRotaSpanIdArr = this._getMonthlyAndYearlyRepeatRotaSpans(rotaGR);
		var memberSchedules = this.processSeriesEvent(scheduleItems, repeatRotaSpanIdArr, userId);
		var seriesEvents = new OCSeriesEventGenerator().getMemberCalendar(groupId, rotaId, userId, dateRangeObj, memberSchedules, calendarLink);

		var overrideEvents = [];
		for (var rosterItem in memberSchedules)
			for (var i = 0; i < memberSchedules[rosterItem].includeItems.length; i++)
				overrideEvents.push(this.createCustomEvent(rotaGR.group.getDisplayValue() + "", memberSchedules[rosterItem].includeItems[i], calendarLink));

		if (seriesEvents.length == 0 && overrideEvents.length == 0) {
			result = this.createPlaceholderCalendar(rotaGR, dateRangeObj, calendarLink);
			if (useCache)
				this.saveCalendarEvents(groupId, rotaId, userId, dateRangeObj, result);
			return result;
		}

		// Combine seriesEvents and overrideEvents as they are the result
		var arrEvents = [];
		arrEvents = arrEvents.concat(seriesEvents);
		arrEvents = arrEvents.concat(overrideEvents);
		result = new ICalUtil().formatICalComponent(arrEvents).join("\n");

		// Store the response so we can do a lookup for subsequent requests
		if (useCache)
			this.saveCalendarEvents(groupId, rotaId, userId, dateRangeObj, result);

		return result;
	},

	createPlaceholderCalendar: function(rotaGR, dateRangeObj, calendarLink) {
		var gdt = new GlideDateTime(dateRangeObj.from);
		var startSDT = new GlideScheduleDateTime(gdt);
		gdt.addSeconds(3600);
		var endSDT = new GlideScheduleDateTime(gdt);
		var arrDetails = [
			rotaGR.name + "",
			rotaGR.group.getDisplayValue() + ""
		];
		var i18nSummary = gs.getMessage("Placeholder for {0} rotation in the {1} group", arrDetails);
		var i18nDescription = gs.getMessage("You have no upcoming on-call commitments for {0} rotation in the {1} group. This is a placeholder event.", arrDetails);
		var event = [new ICalUtil().formatICalEvent([
			"UID:placeholder",
			"DTSTAMP:" + startSDT.getValue(),
			"DTSTART:" + startSDT.getValue(),
			"DTEND:" + endSDT.getValue(),
			"SUMMARY:" + i18nSummary,
			"DESCRIPTION:" + i18nDescription,
			"URL:" + calendarLink
		], false)];

		return new ICalUtil().formatICalComponent(event).join("\n");
	},

	/**
	 * Retrieves iCalendar from cmn_rota_cal_event table if response for the request exists.
	 *
	 * @param dateRangeObj Object
	 * @return String - response if match found for the request, else NULL
	**/
	getEventsFromTable: function(groupId, rotaId, userId, dateRangeObj) {
		// Check if we have already fulfilled this request, return stored response if so
		var gr = new GlideRecord("cmn_rota_resp_cache");
		gr.addQuery("from", dateRangeObj.from);
		gr.addQuery("to", dateRangeObj.to);
		gr.addQuery("group", groupId);
		gr.addQuery("rota", rotaId);
		gr.addQuery("user", userId);
		gr.query();

		// Response exists
		if (gr.next())
			return gr.getValue("payload");

		return null;
	},

	/**
	 * Calculates AJAXScheduleItems for specified users rotation.
	 *
	 * @param String groupId
	 * @param String rotaId
	 * @param String userId
	 * @param dateRangeObj {from: yyyy-mm-dd, to: yyyy-mm-dd}
	 * @return AJAXScheduleItem[]
	**/
	createCalendarEvents: function(groupId, rotaId, userId, dateRangeObj) {
		var scheduleItems = new OCRotationV2(null, null)
			.setCompressTimeMap(false)
			.setStartDate(dateRangeObj.from)
			.setEndDate(dateRangeObj.to, true)
			.setGroupIds(groupId)
			.setRotaIds(rotaId)
			.setRosterIds("")
			.setUserIds(userId)
			.getItems();

		return scheduleItems;
	},

	processSeriesEvent: function(scheduleItems, repeatRotaSpanIdArr, userId) {
		var rotaSpanItems = []; // Derived from rota schedule spans
		var memberSpanItems = []; // Derived from member schedule spans
		var rosterSpanItems = []; // Derived from roster_schedule_span; overrides and extra coverage spans
		var definitionItems = []; // Combination of rotaSpanItems and rosterSpanItems that are extra coverage spans

		for (var i = 0; i < scheduleItems.size(); i++) {
			var scheduleItem = scheduleItems.get(i);
			var scheduleItemTable = scheduleItem.getTable();

			if ("cmn_schedule_span" == scheduleItemTable)
				rotaSpanItems.push(scheduleItem);

			if ("cmn_rota_member" == scheduleItemTable)
				memberSpanItems.push(scheduleItem);

			if ("roster_schedule_span" == scheduleItemTable && this.SCHEDULE_TYPE.TIMEOFF != scheduleItem.getType()) {				
				rosterSpanItems.push(scheduleItem);

				if (JSUtil.nil(scheduleItem.getUserId()))
					definitionItems.push(scheduleItem);
			}
		}
		definitionItems = definitionItems.concat(rotaSpanItems);

		// Need to consider multiple member span items individually
		var memberSchedules = {};

		for (var j = 0; j < memberSpanItems.length; j++) {
			var rotaMemberItems = this.handleRotaMember(memberSpanItems[j], rotaSpanItems, definitionItems, repeatRotaSpanIdArr);
			memberSchedules[memberSpanItems[j].getRosterId()] = {
				"includeItems": rotaMemberItems.includeItems,
				"excludeItems": rotaMemberItems.excludeItems,
				"startTimes": rotaMemberItems.seriesStartTimes
			};
		}

		for (var k = 0; k < rosterSpanItems.length; k++) {
			var rosterId = rosterSpanItems[k].getRosterId();

			if (!memberSchedules[rosterId])
				memberSchedules[rosterId] = {
					"includeItems": [],
					"excludeItems": []
				};

			if (userId == rosterSpanItems[k].getUserId()) {
				var overrideItems = this.handleOverrideMember(rosterSpanItems[k]);
				memberSchedules[rosterId].includeItems = memberSchedules[rosterId].includeItems.concat(overrideItems);
				continue;
			}

			var rosterItems = this.updateExceptionList(rosterSpanItems[k], null, rotaSpanItems);
			memberSchedules[rosterId].excludeItems = memberSchedules[rosterId].excludeItems.concat(rosterItems);
		}

		return memberSchedules;
	},

	handleRotaMember: function(scheduleItem, rotaSpanItems, definitionItems, repeatRotaSpanIdArr) {
		var customScheduleItems = [];
		var excludeScheduleItems = [];
		var seriesStartTimes = {};
		var timeSpans = scheduleItem.getTimeSpans();

		for (var i = 0; i < timeSpans.size(); i++) {
			var timeSpan = timeSpans.get(i);
			if (this.matchRotaSpanRule(timeSpan, rotaSpanItems, repeatRotaSpanIdArr, seriesStartTimes))
				continue;
			customScheduleItems.push({item: scheduleItem, span: timeSpan});
			var excludeScheduleItem = this.updateExceptionList(scheduleItem, timeSpan, rotaSpanItems);
			if (excludeScheduleItem)
				excludeScheduleItems.push(excludeScheduleItem);
		}

		return {
			"includeItems": customScheduleItems,
			"excludeItems": excludeScheduleItems,
			"seriesStartTimes": seriesStartTimes
		};
	},

	handleOverrideMember: function(scheduleItem) {
		var includeItems = [];
		var timeSpans = scheduleItem.getTimeSpans();
		for (var i = 0; i < timeSpans.size(); i++)
			includeItems.push({
				item: scheduleItem,
				span: timeSpans.get(i)
			});
		return includeItems;
	},

	matchRotaSpanRule: function(timeSpan, rotaSpanItems, repeatRotaSpanIdArr, seriesStartTimes) {
		for (var i = 0; i < rotaSpanItems.length; i++) {
			var timeSpans = rotaSpanItems[i].getTimeSpans();
			if (repeatRotaSpanIdArr.indexOf(rotaSpanItems[i]) != -1)
				return false;
			for (var j = 0; j < timeSpans.size(); j++)
				if (timeSpan.compareTo(timeSpans.get(j)) == 0) {
					var rotaSpanSysId = rotaSpanItems[i].getScheduleSpanId();
					if (!seriesStartTimes[rotaSpanSysId])
						seriesStartTimes[rotaSpanSysId] = timeSpan.getStart();
					return true;
				}
		}

		return false;
	},

	getIntersectRotaSpanItem: function(timeSpan, rotaSpanItems) {
		for (var i = 0; i < rotaSpanItems.length; i++) {
			var timeSpans = rotaSpanItems[i].getTimeSpans();
			for (var j = 0; j < timeSpans.size(); j++) {
				var rotaTimeSpan = timeSpans.get(j);
				if (timeSpan.overlapWith(rotaTimeSpan)) {
					// Normalize span start and end to UTC
					rotaTimeSpan.getStart().setTimeZone("Etc/UTC");
					rotaTimeSpan.getEnd().setTimeZone("Etc/UTC");
					return {
						"item": rotaSpanItems[i],
						"span": rotaTimeSpan
					};
				}
			}
		}

		return false;
	},

	createCustomEvent: function(groupName, scheduleItemSpan, calendarLink) {
		var startSDT = scheduleItemSpan.span.getStart();
		startSDT.setTimeZone("Etc/UTC");
		var start = startSDT.getValue();
		var endSDT = scheduleItemSpan.span.getEnd();
		endSDT.setTimeZone("Etc/UTC");

		var name = scheduleItemSpan.item.getName();
		var userName = scheduleItemSpan.item.getUserName();
		if (!JSUtil.nil(userName))
			name = groupName + ": " + userName;
		var rosterName = scheduleItemSpan.item.getRosterName();
		if (!JSUtil.nil(rosterName))
			name += ": " + rosterName;

		return new ICalUtil().formatICalEvent([
			"UID:" + start + name,
			"DTSTAMP:" + start,
			"DTSTART:" + start,
			"DTEND:" + endSDT.getValue(),
			"SUMMARY:" + name,
			"DESCRIPTION:" + name,
			"URL:" + calendarLink
		], true);
	},

	updateExceptionList: function(scheduleItem, timeSpan, rotaSpanItems) {
		var includeItems = [];
		var excludeItems = [];
		var items = {
			"includeItems" : includeItems,
			"excludeItems" : excludeItems
		};

		if (JSUtil.nil(scheduleItem.getUserId()))
			return excludeItems;

		var excludeItem;

		if (timeSpan) {
			for (var i=0; i<rotaSpanItems.length; i++) {
				var rotaTimeSpans = rotaSpanItems[i].getTimeSpans();
				for (var j = 0; j < rotaTimeSpans.size(); j++)
					if (timeSpan.compareTo(rotaTimeSpans.get(j)) == 0)
						return excludeItems;
			}
			excludeItem = this.getIntersectRotaSpanItem(timeSpan, rotaSpanItems);
			if (excludeItem)
				items.excludeItems.push({item: excludeItem.item, span: excludeItem.span});
		} else {
			var timeSpans = scheduleItem.getTimeSpans();
			for (var k = 0; k < timeSpans.size(); k++) {
				excludeItem = this.getIntersectRotaSpanItem(timeSpans.get(k), rotaSpanItems);
				excludeItems.push({item: excludeItem.item, span: excludeItem.span});
			}
		}

		return excludeItems;
	},

	/**
	 * Stores calculated iCalendar for subsequent requests.
	 *
	 * @param dateRangeObj Object
	 * @param result String
	**/
	saveCalendarEvents: function(groupId, rotaId, userId, dateRangeObj, result) {
		var rotaRespCacheGR = new GlideRecord("cmn_rota_resp_cache");
		rotaRespCacheGR.setValue("payload", result);
		rotaRespCacheGR.setValue("from", dateRangeObj.from + "");
		rotaRespCacheGR.setValue("to", dateRangeObj.to + "");
		rotaRespCacheGR.setValue("group", groupId);
		rotaRespCacheGR.setValue("rota", rotaId);
		rotaRespCacheGR.setValue("user", userId);
		rotaRespCacheGR.insert();
	},

	invalidateRotaRespCache: function(gr) {
		var iCalUtil = new ICalUtil();
		var rotaRespCacheGR = null;
		var tableName = gr.getTableName();

		if (tableName == "cmn_rota_member")
			rotaRespCacheGR = this._getRotaRespCache(null, null, gr.roster.rota.group + "", gr.roster.rota + "", null,
				gr.from + "", gr.to + "");

		if (tableName == "cmn_schedule_span" && (gr.schedule.document + "") == "cmn_rota") {
			var rotaGR = new GlideRecord("cmn_rota");
			rotaGR.get(gr.schedule.document_key + "");
			rotaRespCacheGR = this._getRotaRespCache(null, gr.repeat_type + "", rotaGR.group + "", rotaGR.sys_id + "", null, null, null);
		}

		if (tableName == "roster_schedule_span" && gr.getValue("type") == "on_call")
			rotaRespCacheGR = this._getRotaRespCache(null, gr.repeat_type + "", gr.group + "", gr.roster.rota + "", null,
				iCalUtil.getSDT(gr.start_date_time + "").getGlideDateTime(),
				iCalUtil.getSDT(gr.end_date_time + "").getGlideDateTime());

		if (tableName == "roster_schedule_span" && gr.getValue("type") == this.SCHEDULE_TYPE.TIME_OFF)
			rotaRespCacheGR = this._getRotaRespCache(this.SCHEDULE_TYPE.TIME_OFF, gr.repeat_type + "", null, null, gr.schedule.document_key + "",
				iCalUtil.getSDT(gr.start_date_time + "").getGlideDateTime(),
				iCalUtil.getSDT(gr.end_date_time + "").getGlideDateTime());

		if (rotaRespCacheGR)
			rotaRespCacheGR.deleteMultiple();
	},

	cleanExpiredCache: function() {
		var today = new GlideDate();
		var rotaRespCacheGR = new GlideRecord("cmn_rota_resp_cache");
		rotaRespCacheGR.addQuery("from", "<", today);
		rotaRespCacheGR.query();
		rotaRespCacheGR.deleteMultiple();
	},

	getOnCallCalendarURL: function(rotaGR) {
		var instanceName = GlideProperties.get("instance_name");
 		var fallbackURL = "https://" + instanceName + ".service-now.com";
		var baseURL = gs.getProperty("glide.servlet.uri", fallbackURL);
		var linkToCalendar = new OnCallRotationProcessor().getScheduleUrl(rotaGR.schedule + "").getUrl();

		return baseURL + linkToCalendar;
	},

	/**
  	 * Constructs a subscribable URL that provides an iCalendar for a users rotation
  	**/
 	getMemberCalendarURL: function (groupId, rotaId, userId) {
 		var instanceName = GlideProperties.get("instance_name");
 		var fallbackURL = "https://" + instanceName + ".service-now.com";
 		var baseURL = gs.getProperty("glide.servlet.uri", fallbackURL);
		var service = "api/now/on_call_rota/rotaUserICalendar/";

 		return baseURL + service + groupId + "/"
 			+ rotaId + "/"
 			+ userId;
 	},

	sendCalendarURL: function (rotaGR) {
		var rotaMemberGA = new GlideAggregate("cmn_rota_member");
		rotaMemberGA.addQuery("roster.rota", rotaGR.getUniqueValue());
		rotaMemberGA.groupBy("member");
		rotaMemberGA.query();

		while (rotaMemberGA.next()) {
			var memberLink = this.getMemberCalendarURL(rotaGR.group + "", rotaGR.sys_id + "", rotaMemberGA.member + "");
			gs.eventQueue("rota.on_call.subscription", rotaGR, rotaMemberGA.member + "", memberLink);
		}
	},

	populateCalendarSubscriptionSettings: function() {
		var rotaGR = new GlideRecord("cmn_rota");
		rotaGR.addNullQuery("coverage_lead_type");
		rotaGR.addNullQuery("coverage_interval");
		rotaGR.setValue("coverage_lead_type", "weekly");
		rotaGR.setValue("coverage_interval", "12");
		rotaGR.updateMultiple();
	},
	
	coverageLimitExceeded: function(rotaGR) {
		var intervalType = rotaGR.getValue("coverage_lead_type");
		var interval = rotaGR.getValue("coverage_interval");
		if (JSUtil.nil(intervalType) || JSUtil.nil(interval))
			return false;

		var maximum = parseInt(gs.getProperty("com.snc.on_call_rotation.max_subscription_interval", 364), 10);
		var days = parseInt(interval, 10) * this.MULTIPLIER[intervalType];
		
		if (days <= maximum)
			return false;
		
		if ("weekly" === intervalType)
				gs.addErrorMessage(gs.getMessage("Calendar subscription 'Get coverage for' has exceeded the limit of {0} weeks ({1} days)", [Math.floor(maximum / 7) + "", maximum + ""]));
			else
				gs.addErrorMessage(gs.getMessage("Calendar subscription 'Get coverage for' has exceeded the limit of {0} days ({1} weeks)", [maximum + "", Math.floor(maximum / 7) + ""]));
		
		return true;
	},

	_getRotaRespCache: function(type, repeat, groupSysId, rotaSysId, userSysId, from, to) {

		// Ensure arguments are not null per request type
		if (type === this.SCHEDULE_TYPE.TIME_OFF && JSUtil.nil(userSysId))
			return null;
		if (type !== this.SCHEDULE_TYPE.TIME_OFF && (JSUtil.nil(groupSysId) || JSUtil.nil(rotaSysId)))
			return null;

		var rotaRespCacheGR = new GlideRecord("cmn_rota_resp_cache");
		if (!JSUtil.nil(from) && JSUtil.nil(repeat))
			if (!JSUtil.nil(to)) {
				rotaRespCacheGR.addQuery("from", "<=", to);
				rotaRespCacheGR.addQuery("to", ">=", from);
			} else
				rotaRespCacheGR.addQuery("to", ">=", from);
		if (!JSUtil.nil(userSysId))
			rotaRespCacheGR.addQuery("user", userSysId);
		if (!JSUtil.nil(rotaSysId))
			rotaRespCacheGR.addQuery("rota", rotaSysId);
		if (!JSUtil.nil(groupSysId))
			rotaRespCacheGR.addQuery("group", groupSysId);
		rotaRespCacheGR.query();

		return rotaRespCacheGR;
	},

	/**
	 * Creates the date range for the on-call rota data to be calculated.
	 *
	 * @return Object - {from, to}
	**/
	_getCalculationDates: function(groupId, rotaGR) {
		var intervalType = rotaGR.getValue("coverage_lead_type");
		var interval = rotaGR.getValue("coverage_interval");
		if (JSUtil.nil(intervalType))
			intervalType = "weekly";
		if (JSUtil.nil(interval))
			interval = 12;
		var maximum = parseInt(gs.getProperty("com.snc.on_call_rotation.max_subscription_interval", 364), 10);
		var days = parseInt(interval, 10) * this.MULTIPLIER[intervalType];
		days = days > maximum ? maximum : days;

		var from = new GlideDate();
		var to = new GlideDate();
		to.addDaysUTC(days);

		return {
			from : from,
			to : to
		};
	},

	/**
	 * Get rotation spans that cannot be translated into a series iCal event.
	 * Will make use of the AJAXScheduleItem object representation for these spans.
	 *
	 * @param rotaId
	 * @return GlideRecord - rota spans that require individual events
	**/
	_getMonthlyAndYearlyRepeatRotaSpans: function(rotaGR) {
		var repeatRotaSpanIdArr = [];

		var rotaScheduleSpansGR = new GlideRecord("cmn_schedule_span");
		rotaScheduleSpansGR.addQuery("schedule", rotaGR.schedule + "");
		var condition = rotaScheduleSpansGR.addQuery("repeat_type", "monthly");
		rotaScheduleSpansGR.appendOrQuery(condition, "repeat_type", "yearly");
		rotaScheduleSpansGR.query();

		while (rotaScheduleSpansGR.next())
			repeatRotaSpanIdArr.push(rotaScheduleSpansGR.getUniqueValue());

		return repeatRotaSpanIdArr;
	},

    type: 'OCRotaICalendarSNC'
};
```