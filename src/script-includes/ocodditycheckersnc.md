---
title: "OCOddityCheckerSNC"
id: "ocodditycheckersnc"
---

API Name: global.OCOddityCheckerSNC

```js
var OCOddityCheckerSNC = Class.create();
OCOddityCheckerSNC.prototype = {
	initialize: function(isMobileRequest) {
		this._onCallCommon = new OnCallCommon();
		this._isMobileRequest = isMobileRequest;
	},
	/**
		@Input: groupId
		@output: JSON object with information about the conflicting rosters per user, per rota shift
		for e.g:
		[{
			"rota_name": "Global",
			"rota_id": "af3a3aeaeb201100fcfb858ad106fe09",
			"rota_start_time": "2018-10-07 12:30:00",
			"rota_end_time": "2018-10-10 12:30:00",
			"conflict_user_id": "5137153cc611227c000bbd1bd8cd2007",
			"conflict_user_name": "David Loo",
			"conflict_rosters": [{
					"633a3aeaeb201100fcfb858ad106fe0a": "Primary",
					"7a5007eeeb201100fcfb858ad106fe8b": "Secondary",
					"conflict_start_date_time": "2018-10-09 00:00:00",
					"conflict_end_date_time": "2018-10-09 23:59:59"
				},
				{
					"633a3aeaeb201100fcfb858ad106fe0a": "Primary",
					"7a5007eeeb201100fcfb858ad106fe8b": "Secondary",
					"conflict_start_date_time": "2018-10-10 10:00:00",
					"conflict_end_date_time": "2018-10-10 12:30:00"
				}
			]
		}]
		
		Steps to find oddities:
		1. Pre-process and populate 'rotaInfo': Array of objects with rota info and user_id as key. 
		[
		  {
			"rota_start_date": "2018-09-25 12:30:00",
			"rota_end_date": "2018-09-25 21:30:00",
			"user_id": [
			  {
				"roster_start_date": "2018-09-25 12:30:00",
				"roster_end_date": "2018-09-25 18:30:00",
				"user_name": "Aqib Mushtaq",
				"roster_id": "d0ec5fdcd7011200f2d224837e610318",
				"roster_name": "Primary"
			  },
			  {
				"roster_start_date": "2018-09-25 12:30:00",
				"roster_end_date": "2018-09-25 21:30:00",
				"user_name": "Aqib Mushtaq",
				"roster_id": "14ec5fdcd7011200f2d224837e610318",
				"roster_name": "Secondary"
			  },
			]
		  }
		]
		
		2. Now, 'rotaInfo' is iterated for O(n^2) loop to find conflicting rosters
	*/
	getConflictsInGroup: function(startDate, endDate, groupId, maxDays, allSpansFromStartAndEndDate) {
		var rotaIds = [];
		var groupOddityInfo = [];
		var rotaMap = {};
		if (JSUtil.nil(groupId)) {
			gs.addErrorMessage(gs.getMessage("Invalid input data provided"));
			return [];
		}
		var rotaGr = new GlideRecord("cmn_rota");
		rotaGr.addQuery("group", groupId);
		rotaGr.query();
		while (rotaGr.next()) {
			rotaIds.push(rotaGr.getUniqueValue());
			if (!rotaMap[rotaGr.getUniqueValue()]) {
				rotaMap[rotaGr.getUniqueValue()] = {};
				rotaMap[rotaGr.getUniqueValue()].display_value = rotaGr.getDisplayValue('name');
			}
		}
		if (!allSpansFromStartAndEndDate) {
			if (JSUtil.nil(startDate) || JSUtil.nil(endDate)) {
				gs.addErrorMessage(gs.getMessage("Invalid input data provided"));
				return [];
			}
			var maxOddityDuration = maxDays;
			if (!maxOddityDuration)
				maxOddityDuration = parseInt(gs.getProperty("com.snc.on_call_rotation.oddity_max_days", "30"));
			var oddityDateDiff = gs.dateDiff(startDate, endDate, true);
			if (JSUtil.nil(oddityDateDiff) || oddityDateDiff < 0) {
				gs.addErrorMessage(gs.getMessage("Invalid start and end time provided"));
				return [];
			}
			var providedOddityDuration = parseInt(oddityDateDiff / (24 * 60 * 60));
			if (providedOddityDuration > maxOddityDuration) {
				gs.addErrorMessage(gs.getMessage("Oddity can not be found for more than {0} days", maxOddityDuration));
				return [];
			}
			var formatterClass = OCFormatterMapping.formatters["dhtmlx"];
			var formatter = new formatterClass();
			var ocrRotaV2 = new OCRotationV2(null, formatter);
			allSpansFromStartAndEndDate = ocrRotaV2
			.setStartDate(startDate)
			.setEndDate(endDate)
			.setGroupIds(groupId)
			.setRotaIds(rotaIds)
			.getSpans();
		}
		var rotaInfo = [];
		for (var i = 0; i < allSpansFromStartAndEndDate.length; i++) {
			var spanStartDate = allSpansFromStartAndEndDate[i].start_date + "";
			var spanEndDate = allSpansFromStartAndEndDate[i].end_date + "";
			var rosterId = allSpansFromStartAndEndDate[i].roster_id + "";
			var rotaId = allSpansFromStartAndEndDate[i].rota_id + "";
			var userName = allSpansFromStartAndEndDate[i].user_name + "";
			var rosterName = allSpansFromStartAndEndDate[i].roster_name + "";
			if ((allSpansFromStartAndEndDate[i].type + "") == "rota") {
				rotaInfo.push({
					rota_id: rotaId,
					rota_name: rotaMap[rotaId].display_value,
					rota_start_date: spanStartDate,
					rota_end_date: spanEndDate
				});
			} else if ((allSpansFromStartAndEndDate[i].type + "") == "roster" || (allSpansFromStartAndEndDate[i].type + "") == "override") {
				var that = this;
				var rosterRotaIndexArr = this._findRotaForRoster(rotaInfo, spanStartDate, spanEndDate, rotaId);
				if (rosterRotaIndexArr.length > 0) {
					rosterRotaIndexArr.forEach(function(rosterRotaIndex) {
						if (rosterRotaIndex >= 0) {
							var userId = allSpansFromStartAndEndDate[i].user_id + "";
							var roster = {
								roster_start_date: spanStartDate,
								roster_end_date: spanEndDate,
								user_name: userName,
								roster_id: rosterId,
								roster_name: rosterName
							};
							if (that._isMobileRequest) {
								roster.sys_id = allSpansFromStartAndEndDate[i].sys_id + "";
								roster.type = allSpansFromStartAndEndDate[i].type + "";
								roster.table = allSpansFromStartAndEndDate[i].table + "";
							}
							if (!rotaInfo[rosterRotaIndex].hasOwnProperty(userId))
								rotaInfo[rosterRotaIndex][userId] = [];
							rotaInfo[rosterRotaIndex][userId].push(roster);
						}
					});
				}

			}
		}
		var rotaOddityInfo = this._findOddities(rotaInfo);
		for (var k = 0; k < rotaOddityInfo.length; k++) {
			groupOddityInfo.push(rotaOddityInfo[k]);
		}
		return groupOddityInfo;
	},
	isConflictingOverlapInGroup: function(startDate, endDate, groupId, maxDays, spans) {
		if (this._onCallCommon.isOverlapAllowed(groupId))
			return false;
		if (JSUtil.nil(groupId) || JSUtil.nil(startDate) || JSUtil.nil(endDate)) {
			gs.addErrorMessage(gs.getMessage("Invalid input data provided"));
			return [];
		}
		var maxOddityDuration = parseInt(gs.getProperty("com.snc.on_call_rotation.oddity_max_days", "30"));
		var oddityDateDiff = gs.dateDiff(startDate, endDate, true);
		if (JSUtil.nil(oddityDateDiff) || oddityDateDiff < 0) {
			gs.addErrorMessage(gs.getMessage("Invalid start and end time provided"));
			return [];
		}
		var providedOddityDuration = parseInt(oddityDateDiff / (24 * 60 * 60));
		if (providedOddityDuration > maxOddityDuration) {
			gs.addErrorMessage(gs.getMessage("Oddity can not be found for more than {0} days", maxOddityDuration));
			return [];
		}
		var timeMaps = [];
		var timezone = gs.getSession().getTimeZoneName();
		var startDateTime = new GlideDateTime(startDate);
		var endDateTime = new GlideDateTime(endDate);
		var rotaGr = new GlideRecord("cmn_rota");
		rotaGr.addQuery("group", groupId);
		rotaGr.query();
		while (rotaGr.next()) {
			var schedule = new GlideSchedule(rotaGr.getValue('schedule'));
			var timeMap = schedule.getTimeMap(startDateTime, endDateTime, timezone);
			timeMaps.push(timeMap);
		}
		var isOverlap = false;
		var timeMapsLength = timeMaps.length;
		for (var i = 0; i < timeMapsLength; i++) {
			for (var j = i + 1; j < timeMapsLength; j++) {
				var overlapTimemap = timeMaps[i].overlapsWith(timeMaps[j], timezone);
				isOverlap = isOverlap || overlapTimemap.hasNext();
				if (isOverlap)
					break;
			}
			if (isOverlap)
				break;
		}
		return isOverlap;
	},
	/*
		@Input: fromDate, toDate, groupId
		@output: JSON object with information about the spans of inactive members, members left the group, members with timeoff without coverage
		for e.g:
		{
			"user_timeoff_no_coverage": [
			  "f298d2d2c611227b0106c6be7f154bc8"
			],
			"f298d2d2c611227b0106c6be7f154bc8": [
			  {
				"user_name": "Bow Ruggeri",
				"user_id": "f298d2d2c611227b0106c6be7f154bc8",
				"start": "2018-08-21 03:30:00",
				"end": "2018-08-21 11:30:00",
				"rota_id": "a6096f22eb601100fcfb858ad106fe6e",
				"roster_id": "6a096f22eb601100fcfb858ad106fe6e",
				"type": "timeoff"
			  },
			  {
				"user_name": "Bow Ruggeri",
				"user_id": "f298d2d2c611227b0106c6be7f154bc8",
				"start": "2018-08-22 03:30:00",
				"end": "2018-08-22 11:30:00",
				"rota_id": "a6096f22eb601100fcfb858ad106fe6e",
				"roster_id": "6a096f22eb601100fcfb858ad106fe6e",
				"type": "timeoff"
			  }
			],
			"user_inactive": [
			  "5137153cc611227c000bbd1bd8cd2007"
			],
			"5137153cc611227c000bbd1bd8cd2007": [
			  {
				"user_name": "David Loo",
				"user_id": "5137153cc611227c000bbd1bd8cd2007",
				"start": "2018-08-21 03:30:00",
				"end": "2018-08-21 11:30:00",
				"rota_id": "a6096f22eb601100fcfb858ad106fe6e",
				"roster_id": "6a096f22eb601100fcfb858ad106fe6e",
				"type": "roster"
			  },
			  {
				"user_name": "David Loo",
				"user_id": "5137153cc611227c000bbd1bd8cd2007",
				"start": "2018-08-22 03:30:00",
				"end": "2018-08-22 11:30:00",
				"rota_id": "a6096f22eb601100fcfb858ad106fe6e",
				"roster_id": "6a096f22eb601100fcfb858ad106fe6e",
				"type": "roster"
			  },
			  {
				"user_name": "David Loo",
				"user_id": "5137153cc611227c000bbd1bd8cd2007",
				"start": "2018-08-20 03:30:00",
				"end": "2018-08-20 11:30:00",
				"rota_id": "a6096f22eb601100fcfb858ad106fe6e",
				"roster_id": "6a1ee762eb601100fcfb858ad106fe0b",
				"type": "roster"
			  }
			]
		}
	*/
	getGaps: function(fromDate, toDate, groupId, maxDays, spans) {
		var gaps = {};
		gaps['total_count'] = 0;
		var requiredData = ["user_name", "user_id", "start", "end", "rota_id", "roster_id", "type", "roster_name"];
		if (this._isMobileRequest)
			requiredData.push("sys_id","table");
		var gapTypes = ["user_inactive", "user_left", "user_timeoff_no_coverage"];
			
		if (!spans) {
			if (JSUtil.nil(groupId) || JSUtil.nil(fromDate) || JSUtil.nil(toDate)) {
				gs.addErrorMessage(gs.getMessage("Invalid input data provided"));
				return {};
			}
			var maxGapsDuration = maxDays;
			if (!maxGapsDuration)
				maxGapsDuration = parseInt(gs.getProperty("com.snc.on_call_rotation.gaps_max_days", "30"));
			var gapsDateDiff = gs.dateDiff(fromDate, toDate, true);
			if (JSUtil.nil(gapsDateDiff) || gapsDateDiff < 0) {
				gs.addErrorMessage(gs.getMessage("Invalid start and end time provided"));
				return {};
			}
			var providedGapsDuration = parseInt(gapsDateDiff / (24 * 60 * 60));
			if (providedGapsDuration > maxGapsDuration) {
				gs.addErrorMessage(gs.getMessage("Gaps can not be found for more than {0} days", maxGapsDuration));
				return {};
			}
			var formatterClass = OCFormatterMapping.formatters["dhtmlx"];
			var formatter = new formatterClass();
			var ocRotaV2 = new OCRotationV2(null, formatter);
			spans = ocRotaV2
				.setStartDate(fromDate)
				.setEndDate(toDate, false)
				.setGroupIds(groupId)
				.getSpans();
		}
		/* removing rotas form spans */
		var filteredSpans = spans.filter(function(item) {
			if (item['type'] == "roster" || item['type'] == "timeoff" || item['type'] == "override") return item;
		});
		if (filteredSpans.length == 0)
			return gaps;
		/* grouping by users with required data*/
		var userSpans = filteredSpans.reduce(function(r, a) {
			r[a["user_id"]] = r[a["user_id"]] || [];
			var temp = {};
			requiredData.forEach(function(data) {
				temp[data] = a[data];
			});
			var startDisplayValue = new GlideDateTime();
			startDisplayValue.setDisplayValueInternal(a['start']);
			temp.start_display_value = startDisplayValue.getDisplayValue();
			var endDisplayValue = new GlideDateTime();
			endDisplayValue.setDisplayValueInternal(a['end']);
			temp.end_display_value = endDisplayValue.getDisplayValue();
			r[a["user_id"]].push(temp);
			return r;
		}, Object.create(null));
		var coverageSpans = filteredSpans.filter(function(item) {
			if (item['type'] == 'override') return item;
		});
		var usersActiveKeyMap = this._getUsersActiveMap(userSpans);
		var usersLeftGroupKeyMap = this._getUsersLeftGroupMap(userSpans, groupId);
		
		for (var key in userSpans) {
			if (!key)
				continue;
			
			if (!usersActiveKeyMap[key]) {
				gaps[gapTypes[0]] = gaps[gapTypes[0]] || [];
				gaps[gapTypes[0]].push(key);
				gaps[key] = userSpans[key];
				gaps['total_count'] += userSpans[key].length;
				continue;
			}
			
			if (usersLeftGroupKeyMap[key]) {
				gaps[gapTypes[1]] = gaps[gapTypes[1]] || [];
				gaps[gapTypes[1]].push(key);
				gaps[key] = userSpans[key];
				gaps['total_count'] += userSpans[key].length;
				continue;
			}
			var timeOffSpans = userSpans[key].filter(function(item) {
				if (item['type'] == 'timeoff') return item;
			});
			if (timeOffSpans.length == 0)
				continue;
			timeOffSpans.forEach(function(item) {
				var gdtS = new GlideDateTime();
				gdtS.setDisplayValueInternal(item.start);
				var gdtE = new GlideDateTime();
				gdtE.setDisplayValueInternal(item.end);
				var rotaMemberGr = new GlideRecord("cmn_rota_member");
				rotaMemberGr.addQuery("member", item.user_id);
				rotaMemberGr.addQuery("roster.rota.group", groupId);
				rotaMemberGr.query();
				while (rotaMemberGr.next()) {
					var rotationSched = rotaMemberGr.rotation_schedule;
					var scheduleGr = new GlideSchedule(rotationSched);
					var timeMap = scheduleGr.getTimeMap(gdtS, gdtE);
					timeMap.buildMap(scheduleGr.getTimeZone());
					var event;
					while (timeMap.hasNext()) {
						event = timeMap.next();
						if (event) {
							var eventStart = event.getStart().getGlideDateTime();
							var eventEnd = event.getEnd().getGlideDateTime();
							var eventOrigEnd = event.getEnd().getGlideDateTime();
							var splitEvent = false;
							do {
								if (this._isMultiDay(eventStart, eventOrigEnd, true)) {
									eventEnd.setDisplayValueInternal(eventStart.getDisplayValueInternal().split(" ")[0] + " 23:59:59");
									splitEvent = true;
								} else {
									eventEnd.setValue(eventOrigEnd);
									splitEvent = false;
								}
								var checkCoverage = this._checkCoverage(coverageSpans, eventStart, eventEnd, rotaMemberGr);
								if (checkCoverage && !checkCoverage.coverageExists) {
									if (checkCoverage.gaps && checkCoverage.gaps.length > 0) {
										var eventGaps = checkCoverage.gaps;
										for (var g in eventGaps)
											this._addNewGap(gaps, gapTypes, key, item, eventGaps[g].start, eventGaps[g].end, rotaMemberGr);
									} else {
										this._addNewGap(gaps, gapTypes, key, item, eventStart, eventEnd, rotaMemberGr);
									}
								}
								eventStart.addDaysLocalTime(1);
								eventStart.setDisplayValueInternal(eventStart.getDisplayValueInternal().split(" ")[0] + " 00:00:00");
							} while (splitEvent);
						}
					}
				}
			}, this);
		}
		return gaps;
	},
	
	_addNewGap: function(gaps, gapTypes, spanKey, timeOffSpan, eventStartGdt, eventEndGdt, rotaMemberGr) {
		var temp = JSON.parse(JSON.stringify(timeOffSpan));
		temp.start = eventStartGdt.getDisplayValueInternal();
		temp.start_display_value = eventStartGdt.getDisplayValue();
		temp.end = eventEndGdt.getDisplayValueInternal();
		temp.end_display_value = eventEndGdt.getDisplayValue();
		temp.roster_id = rotaMemberGr.roster + '';
		temp.roster_name = rotaMemberGr.roster.getDisplayValue();
		temp.rota_id = rotaMemberGr.roster.rota + '';
		gaps[gapTypes[2]] = gaps[gapTypes[2]] || [];
		if (gaps[gapTypes[2]].indexOf(spanKey) == -1) {
			gaps[gapTypes[2]].push(spanKey);
		}
		gaps[spanKey] = gaps[spanKey] || [];
		gaps[spanKey].push(temp);
		gaps['total_count']++;
		return gaps;
	},
	
	/**
	 * @param coverageSpans [Array]: array of coverage spans
	 * @param eventStartGdt, eventEndGdt [GlideDateTime]: start and end of event
	 * @param rotaMemberGr [GlideRecord]: 
	 * return: [Object]: {coverageExists: <Boolean>, gaps:<Array({start: [GlideDateTime], end: [GlideDateTime]})>}
	 */
	_checkCoverage: function(coverageSpans, eventStartGdt, eventEndGdt, rotaMemberGr) {
		if (!coverageSpans)
			return {coverageExists: false};

		var coverages = coverageSpans.filter(function(cover) {
			var coverStart = new GlideDateTime();
			coverStart.setDisplayValueInternal(cover.start);
			var coverEnd = new GlideDateTime();
			coverEnd.setDisplayValueInternal(cover.end);
			return rotaMemberGr.roster == cover.roster_id && coverEnd.compareTo(eventStartGdt) > 0 && coverStart.compareTo(eventEndGdt) < 0;
		});
		
		if (coverages.length == 0)
			return {coverageExists: false};
		
		coverages.sort(function(c1, c2) {
			var c1Start = new GlideDateTime();
			c1Start.setDisplayValueInternal(c1.start);
			var c2Start = new GlideDateTime();
			c2Start.setDisplayValueInternal(c2.start);
			return c1Start.getNumericValue() - c2Start.getNumericValue();
		});
		var j, gaps = [];
		var coverage_0 = this._getCoverageInterval(coverages[0]);
		
		// Check for gap before first coverage
		if (coverage_0.end.compareTo(eventEndGdt) <= 0  && coverage_0.start.compareTo(eventStartGdt) > 0)
			gaps.push({start: eventStartGdt, end: coverage_0.start});
		
		// Check for gaps in between coverages
		for (var i = 0; i < coverages.length; i++) {	
			var coverage_i = (i == 0) ? coverage_0 : this._getCoverageInterval(coverages[i]);
			if (coverage_i.start.compareTo(eventStartGdt) <= 0 && coverage_i.end.compareTo(eventEndGdt) >= 0)
				return {coverageExists: true};
			j = i + 1;
			var coverage_j = this._getCoverageInterval(coverages[j]);
			if (coverage_j.start.compareTo(coverage_i.end) > 0)
				gaps.push({start: coverage_i.end, end: coverage_j.start});
        }
		// Check for gap after last coverage
		var coverage_n = coverages.length == 1 ? coverage_0 : this._getCoverageInterval(coverages[coverages.length - 1]);
		if (eventEndGdt.compareTo(coverage_n.end) > 0)
			gaps.push({start: coverage_n.end, end: eventEndGdt});
		
		return (gaps.length == 0) ? {coverageExists: true}: {coverageExists: false, gaps: gaps};
	},
	
	_getCoverageInterval: function(coverage) {
		var start = new GlideDateTime();
		start.setDisplayValueInternal(coverage.start);
		var end = new GlideDateTime();
		end.setDisplayValueInternal(coverage.end);
		return {start: start, end: end};
	},
	
	/**
	 * @param startGdt [GlideDateTime]: start of event
	 * @param endGdt [GlideDateTime]: end of event (assumption: endGdt can not be less than startGdt)
	 * @param inclusive [Boolean]: if true, consider endGdt + 00:00:00  single day, where endDay = 1 + startDay
	 * return: [Boolean]
	 */
	_isMultiDay: function(startGdt, endGdt, inclusive) {
		var tempEndGdt  = new GlideDateTime();
		tempEndGdt.setNumericValue(endGdt.getNumericValue() - (inclusive ? 1 : 0));
		return (startGdt.getYearLocalTime() !== tempEndGdt.getYearLocalTime()   ||
				startGdt.getMonthLocalTime() !== tempEndGdt.getMonthLocalTime() ||
				startGdt.getDayOfMonthLocalTime() !== tempEndGdt.getDayOfMonthLocalTime()
				);
	},
	
	_getUsersLeftGroupMap: function(userSpans, groupId) {
		var groupMembers = [];
		var userGroupMemberGr = new GlideRecord("sys_user_grmember");
		userGroupMemberGr.addQuery("group", groupId);
		userGroupMemberGr.query();
		while (userGroupMemberGr.next()) {
			groupMembers.push(userGroupMemberGr.user + '');
		}
		
		var usersLeftGroupKeyMap = {};
		for (var user in userSpans) {
			if (groupMembers.indexOf(user) == -1)
				usersLeftGroupKeyMap[user] = true;
			else
				usersLeftGroupKeyMap[user] = false;
		}
		return usersLeftGroupKeyMap;
	},
	
	_getUsersActiveMap: function(userSpans) {
		var usersActiveKeyMap = {};
		var userSysIds = Object.keys(userSpans);
		if (!userSysIds)
			userSysIds = [];
		var usersGr = new GlideRecord('sys_user');
		usersGr.addQuery('sys_id', 'IN', userSysIds.join());
		usersGr.addActiveQuery();
		usersGr.query();
		while(usersGr.next()) {
			usersActiveKeyMap[usersGr.getUniqueValue()] = true;
		}
		return usersActiveKeyMap;
	},
	
	getPendingTimeOffRequests: function() {
		var currentUserId = gs.getUserID();
		var approvalGr = new GlideAggregate("sysapproval_approver");
		if (!approvalGr.isValid())
			return 0;
		approvalGr.addQuery("source_table", "roster_schedule_span_proposal");
		approvalGr.addQuery("approver", currentUserId);
		approvalGr.addQuery("state", "requested");
		approvalGr.addAggregate('COUNT');
		approvalGr.query();
		if (approvalGr.next())
			return approvalGr.getAggregate('COUNT');
		else
			return 0;
	},
	_findOddities: function(rotaInfo) {
		if (JSUtil.nil(rotaInfo))
			return [];
		var oddityInfo = [];
		for (var i = 0; i < rotaInfo.length; i++) {
			for (var key in rotaInfo[i]) {
				if (rotaInfo[i][key] instanceof Array) {
					var userInfo = rotaInfo[i][key],
						rotaOddityInfo = {},
						conflictRosters = [],
						conflictUserName = "";
					for (var j = 0; j < userInfo.length; j++) {
						var spanStartDate = new GlideDateTime();
						spanStartDate.setDisplayValueInternal(userInfo[j].roster_start_date);
						var spanEndDate = new GlideDateTime();
						spanEndDate.setDisplayValueInternal(userInfo[j].roster_end_date);
						for (var l = j + 1; l < userInfo.length; l++) {
							var usrSpanStartDate = new GlideDateTime();
							usrSpanStartDate.setDisplayValueInternal(userInfo[l].roster_start_date);
							var usrSpanEndDate = new GlideDateTime();
							usrSpanEndDate.setDisplayValueInternal(userInfo[l].roster_end_date);
							if (spanStartDate.compareTo(usrSpanEndDate) < 0 && spanEndDate.compareTo(usrSpanStartDate) > 0) {
								if (!conflictUserName)
									conflictUserName = userInfo[j].user_name;
								var obj = {};
								var jUserInfo = {
									roster_id: userInfo[j].roster_id,
									roster_name: userInfo[j].roster_name
								};
								var lUserInfo = {
									roster_id: userInfo[l].roster_id,
									roster_name: userInfo[l].roster_name
								};
								if (this._isMobileRequest) {
									jUserInfo.sys_id = userInfo[j].sys_id;
									jUserInfo.type = userInfo[j].type;
									jUserInfo.table = userInfo[j].table;
									lUserInfo.sys_id = userInfo[l].sys_id;
									lUserInfo.type = userInfo[l].type;
									lUserInfo.table = userInfo[l].table;
								}
								obj['conflict_roster'] = [jUserInfo,lUserInfo];
								var maxDate = this._getMax(spanStartDate, usrSpanStartDate);
								obj["conflict_start_date_time"] = maxDate.getDisplayValueInternal();
								obj["conflict_start_date_time_display_value"] = maxDate.getDisplayValue();
								var minDate = this._getMin(spanEndDate, usrSpanEndDate);
								obj["conflict_end_date_time"] = minDate.getDisplayValueInternal();
								obj["conflict_end_date_time_display_value"] = minDate.getDisplayValue();
								conflictRosters.push(obj);
							}
						}
					}
					if (conflictRosters.length) {
						rotaOddityInfo.rota_name = rotaInfo[i].display_value;
						rotaOddityInfo.rota_id = rotaInfo[i].rota_id;
						rotaOddityInfo.rota_start_time = rotaInfo[i].rota_start_date;
						rotaOddityInfo.rota_end_time = rotaInfo[i].rota_end_date;
						rotaOddityInfo.conflict_user_id = key;
						rotaOddityInfo.conflict_user_name = conflictUserName;
						rotaOddityInfo.conflict_rosters = conflictRosters;
						oddityInfo.push(rotaOddityInfo);
						rotaOddityInfo = {};
					}
				}
			}
		}
		return oddityInfo;
	},
	_getMax: function(d1, d2) {
		if (d1.compareTo(d2) >= 0)
			return d1;
		return d2;
	},
	_getMin: function(d1, d2) {
		if (d1.compareTo(d2) >= 0)
			return d2;
		return d1;
	},
	/**
		Find in which rota shift the given roster belongs
	*/
	_findRotaForRoster: function(rotaInfo, spanStartDate, spanEndDate, spanRotaId) {
		var spanStartDateGdt = new GlideDateTime();
		spanStartDateGdt.setDisplayValueInternal(spanStartDate);
		var spanEndDateGdt = new GlideDateTime();
		spanEndDateGdt.setDisplayValueInternal(spanEndDate);
		var rotaSpanIndex = [];
		for (var i = 0; i < rotaInfo.length; i++) {
			if (rotaInfo[i].rota_id != spanRotaId)
				continue;
			var rotaStGdt = new GlideDateTime();
			rotaStGdt.setDisplayValueInternal(rotaInfo[i].rota_start_date);
			var rotaEnGdt = new GlideDateTime();
			rotaEnGdt.setDisplayValueInternal(rotaInfo[i].rota_end_date);
			//Handling intersection of rotaGdt and spanGdt by doing negation of their exclusion.
			if (!((rotaStGdt.compareTo(spanEndDateGdt) >= 0) || (rotaEnGdt.compareTo(spanStartDateGdt) <= 0)))
                rotaSpanIndex.push(i); 
		}
		return rotaSpanIndex;
	},
	_isUserActive: function(userId) {
		var userGr = new GlideRecord("sys_user");
		userGr.get(userId);
		if (userGr.active)
			return true;
		return false;
	},
	_leftGroup: function(userId, groupId) {
		var userGrpGr = new GlideRecord("sys_user_grmember");
		userGrpGr.addQuery("user", userId);
		userGrpGr.addQuery("group", groupId);
		userGrpGr.query();
		if (!userGrpGr.hasNext())
			return true;
		return false;
	},
	type: 'OCOddityCheckerSNC'
};
```