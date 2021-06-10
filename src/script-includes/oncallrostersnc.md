---
title: "OnCallRosterSNC"
id: "oncallrostersnc"
---

API Name: global.OnCallRosterSNC

```js
var OnCallRosterSNC = Class.create();
OnCallRosterSNC.prototype = {
	SHIFT_STATE: {
		DRAFT: "draft"
	},
	MAX_LOOP_COUNT: 18250,//50 years
	MAX_LOOP_COUNT_DAYS_OF_WEEK: 10,

	initialize: function(_gr, _gs) {
		this._log = new GSLog("com.snc.on_call_rotation.log.level", this.type);
		this._onCallCommon = new OnCallCommon();

		if (typeof _gr === "string")
			this._initFromSysId(_gr);
		else if (_gr) {
			this._gr = _gr;
			this._rosterSysId = this._gr.sys_id + "";
		}
		this._gs = _gs || gs;

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[initialize] rosterSysId: " + this._rosterSysId);
	},

	/**
	 * Compute the rotation schedules for a roster based on the rotation
	 * values specified for the roster.
	 */
	computeRotationSchedules: function() {
		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[computeRotationSchedules] rosterSysId: " + this._rosterSysId);

		if (!this._gr || !this._rosterSysId) {
			this._log.error("computeRotationSchedule called without a valid cmn_rota_roster record");
			return;
		}

		// If there is no roster rotation schedule, then leave things alone as this means that roster members have
		// individually defined rotation schedules that are "custom"
		var type = this._gr.rotation_interval_type + "";
		if (!type)
			return;

		var rotaGr = new GlideRecord("cmn_rota");
		if (!rotaGr.get(this._gr.rota + "")) {
			this._log.error("[computeRotationSchedules] called with a record that does not have a 'cmn_rota' record");
			return;
		}

		var createSchedules = this._gs.getValue(OnCallRosterSNC.PROPERTY_CREATE_SCHEDULES, false);
		if (createSchedules)
			this._deleteRosterMemberSchedules(this._rosterSysId);
		else
			this._deleteRosterMemberScheduleSpans(this._rosterSysId);

		if ((rotaGr.active + "" !== "true" && rotaGr.state != this.SHIFT_STATE.DRAFT) || this._gr.active + "" !== "true") {
			this._log.error("[computeRotationSchedules] no active rotas or rosters found");
			return;
		}

		var scheduleGr = new GlideRecord("cmn_schedule");
		if (!scheduleGr.get(rotaGr.schedule + "")) {
			this._log.error("[computeRotationSchedules] called with a record that does not have a schedule");
			return;
		}

		this._createMemberRotationSchedules(rotaGr, rotaGr.getDisplayValue("group"), scheduleGr, createSchedules);
	},

	getActiveMembers: function(dateGdt) {
		var members = [];
		var memberGr = this.getActiveMembersGr(dateGdt);
		memberGr.query();

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[getActiveMembers] table: " + memberGr.getTableName() + " encodedQuery: " + memberGr.getEncodedQuery());

		while (memberGr.next()) {
			var member = new OnCallMember(memberGr);
			members.push(member);

			if (this._log.atLevel(GSLog.DEBUG))
				this._log.debug("[getActiveMembers] add member: " + member.toString());
		}

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[getActiveMembers] membersLength: " + members.length);

		return members;
	},

	getActiveMembersGr: function(gd) {
		var memberGr = new GlideRecord("cmn_rota_member");
		this._addActiveMemberQueries(gd, memberGr);
		memberGr.orderBy("order");
		return memberGr;
	},

	getActiveMemberCount: function(gdt) {
		var rotaMemberGa = new GlideAggregate("cmn_rota_member");
		this._addActiveMemberQueries(gdt, rotaMemberGa);
		rotaMemberGa.query();
		return rotaMemberGa.getRowCount();
	},

	getActiveMembersOrdered: function(dateGdt) {
		var previousDay = new GlideDate();
		previousDay.setValue(dateGdt);
		previousDay.addDaysUTC(-1);
		var lastOnCallMember = this.getOnCallMember(previousDay);

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[getActiveMembersOrdered] dateGdt: " + dateGdt + " lastOnCallMember: " + lastOnCallMember);

		var members = this.getActiveMembers(dateGdt);
		if (lastOnCallMember === null)
			return members;

		var head = [];
		var tail = [];
		members.forEach(function(member) {
			if (member.getOrder() > lastOnCallMember.getOrder())
				head.push(member);
			else
				tail.push(member);
		});

		var activeMembers = head.concat(tail).slice();

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[getActiveMembersOrdered] activeMembers: " + JSON.stringify(activeMembers));

		return activeMembers;
	},

	getGr: function() {
		return this._gr;
	},

	getId: function() {
		return this._rosterSysId;
	},

	getOnCallMember: function(dateGdt) {
		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[getOnCallMember] dateGdt: " + dateGdt);

		var startGdt = new GlideDateTime();
		startGdt.setDisplayValue(dateGdt.getDisplayValue());
		var endGdt = new GlideDateTime();
		endGdt.setDisplayValue(dateGdt.getDisplayValue());
		endGdt.addDaysUTC(1);
		endGdt.add(-1); // remove a second to get EOD of the start date
		var memberGr = this.getActiveMembersGr(dateGdt);

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[getOnCallMember] table: " + memberGr.getTableName() + " encodedQuery: " + memberGr.getEncodedQuery());

		memberGr.query();
		while (memberGr.next()) {
			var rotationScheduleSysId = memberGr.rotation_schedule + "";
			if (rotationScheduleSysId) {

				if (this._log.atLevel(GSLog.DEBUG))
					this._log.debug("[getOnCallMember] rotationScheduleSysId: " + rotationScheduleSysId + " memberSysId: " + memberGr.sys_id);

				var memberSchedule = new GlideSchedule(rotationScheduleSysId);
				var spans = memberSchedule.getSpans(startGdt, endGdt);
				if (spans.size() > 0)
					return new OnCallMember(memberGr);
			}
		}
		return null;
	},

	/**
	 * Get all the member from and to dates spans
	 * Used to determine the date ranges at which members are active in a roster record
	 *
	 * return [array] unique set of date spans
	 */
	getMemberDates: function() {
		// Get member From and To dates and combine them to create a set of spans.
		// The spans are used to determine when rota members are added/removed
		var fromDates = this._getMemberFromDates();
		var toDates = this._getMemberToDates();

		var memberDates = [];
		var processedDates = [];
		for (var fromDate in fromDates)
			if (fromDates.hasOwnProperty(fromDate) && processedDates.indexOf(fromDate) == -1) {
				processedDates.push(fromDate);
				memberDates.push(fromDates[fromDate]);
			}
		for (var toDate in toDates)
			if (toDates.hasOwnProperty(toDate) && !fromDates[toDate.getNumericValue()] && processedDates.indexOf(toDate) == -1) {
				processedDates.push(toDate);
				memberDates.push(toDates[toDate]);
			}
		memberDates.sort(function (d1, d2) { return d1.getNumericValue() - d2.getNumericValue(); });

		var spans = [];
		var i = 0;
		var length = memberDates.length;
		while (i < length) {
			var span = new OnCallMemberDateSpan();
			span.setStart(memberDates[i]);

			if (memberDates[i + 1]) {
				span.setEnd(memberDates[i + 1]);
				i += 2;
			} else
				i++;

			spans.push(span);
		}

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[getMemberDates] spans: " + JSON.stringify(spans));

		return spans;
	},

	/**
	 * Add queries to a cmn_rota_member GlideRecord to get active members during the provided date
	 *
	 * gd [GlideDate]
	 * memberGr [GlideRecord] cmn_rota_member GlideRecord to mutate
	 */
	_addActiveMemberQueries: function(gd, memberGr) {
		var startOfPreviousGd = this._getPreviousRotationDate(gd);
		memberGr.addQuery("roster", this._rosterSysId);
		if (memberGr.isValidField("from") && memberGr.isValidField("to")) {
			var qcFrom = memberGr.addNullQuery("from");
			qcFrom.addOrCondition("from", "<=", startOfPreviousGd);
			var qcTo = memberGr.addNullQuery("to");
			qcTo.addOrCondition("to", ">", startOfPreviousGd);
		}
	},

	_createSchedule: function(rotaGr, groupName, timeZoneName, onCallMember, user) {
		var onCallSchedule = new OnCallSchedule();
		this._defineSchedule(onCallSchedule, rotaGr, groupName, timeZoneName, onCallMember, user);
		var scheduleSysId = onCallSchedule.create();

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[_createSchedule] scheduleSysId: " + scheduleSysId);

		return scheduleSysId;
	},

	_createScheduleSpan: function (startGid, user, onCallMemberDateSpan, scheduleId, rotaSchedule, previousMemberEndGid) {
		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[_createScheduleSpan] startGid: " + startGid + " user: " + user.getDisplayName() + " scheduleId: " + scheduleId + " previousMemberEndGid: " + previousMemberEndGid + " onCallMemberDateSpan-Start: " + onCallMemberDateSpan.getStart() + " onCallMemberDateSpan-End: " + onCallMemberDateSpan.getEnd());

		if (!scheduleId) {
			this._log.error("Will not create/update a schedule span for user: [" + user.getDisplayName() + "] because they have no Schedule");
			return;
		}

		var startDateStr = this._gr.rotation_start_time + "";
		var startGit = new GlideIntegerTime();
		startGit.setTime(startDateStr.substring(0, 2), startDateStr.substring(2, 4), startDateStr.substring(4, 6));
		var endGit = new GlideIntegerTime();
		endGit.setTime(startDateStr.substring(0, 2), startDateStr.substring(2, 4), startDateStr.substring(4, 6));
		endGit.add(-1);
		var allDay = this.isAllDay();

		if (allDay) {
			startGit.setTime("00", "00", "00");
			endGit.setTime("23", "59", "59");
		}

		var repeatUntilGid = "";
		var repeatUntilGd = onCallMemberDateSpan.getEnd();
		if (repeatUntilGd) {
			var repeatUntilGdStr = this._onCallCommon.gdToDate(repeatUntilGd);
			var gid = new GlideIntegerDate();
			gid.setValue(repeatUntilGdStr);
			repeatUntilGid = gid.getValue();

			if (this._log.atLevel(GSLog.DEBUG))
				this._log.debug("[_createScheduleSpan] user: " + user.getDisplayName() + " repeatUntilGd: " + repeatUntilGd + " repeatUntilGdStr: " + repeatUntilGdStr + " repeatUntilDate: " + repeatUntilGid);
		}

		var endDateGid = new GlideIntegerDate();
		endDateGid.setValue(startGid.getValue() + "");
		var intervalCount = this.getRotationIntervalDays();
		endDateGid.addDays(allDay ? intervalCount - 1 : intervalCount);
		var memberCount = this.getActiveMemberCount(onCallMemberDateSpan.getStart());
		var repeatCount = intervalCount * memberCount;

		var shouldSplitScheduleSpanPerDay = false;
		var daysOfWeek = rotaSchedule.getDaysOfWeek() + "";

		if (!this._isWeeklyRotation()) {
			//if rotation is not weekly then repeat type will be "specific"
			if (daysOfWeek && daysOfWeek.length > 0 && daysOfWeek.length < 7) {
				//split should happen only when atleast one day is not selected.
				shouldSplitScheduleSpanPerDay = true;
			}
		}
		var scheduleSpans = [];
		if (shouldSplitScheduleSpanPerDay) {
			//clone start and end dates to avoid changing original values
			var startGidClone = new GlideIntegerDate();
			startGidClone.setValue(startGid.getValue());

			var endDateGidClone = new GlideIntegerDate();
			endDateGidClone.setValue(endDateGid.getValue());

			if (previousMemberEndGid) {
				//This is the number of days shifted forward by previous members because of gaps in daysOfWeek
				//same number of days hsould be forwarded to current member to avoid overlapping
				var previousMemberEndGidClone = new GlideIntegerDate();
				previousMemberEndGidClone.setValue(previousMemberEndGid.getValue());

				var maxLoopCount = 0;
				while (startGidClone.compareTo(previousMemberEndGidClone) < 0 && maxLoopCount < this.MAX_LOOP_COUNT) {
					startGidClone.addDays(1);
					endDateGidClone.addDays(1);
					maxLoopCount++;
				}
				if (maxLoopCount == this.MAX_LOOP_COUNT) {
					//loop reached the limit which is set in MAX_LOOP_COUNT
					this._log.warn('MAX_LOOP_COUNT[maxLoopCount] limit reached startGid: ' + startGid + ' previousMemberEndGid: ' + previousMemberEndGid + ' endDateGid: ' + endDateGid);
					startGidClone.setValue(startGid.getValue());
					endDateGidClone.setValue(endDateGid.getValue());
				}
			}

			var maxLoopCountForDates = 0;
			while (startGidClone.compareTo(endDateGidClone) <= 0 && maxLoopCountForDates < this.MAX_LOOP_COUNT) {
				maxLoopCountForDates++;
				//if scheduleSpan is spanning across 5 days then 5 schedule spans has to be created for eacy day instead of 1 schedule span which is spanning across multiple days
				//if only 1 schedule span is created then repeatation is not linear because of gaps in daysOfWeek
				//of multiple spans are created each covering only 1 day and repeating, the repetetion will be linear
				var dayOfWeek = this._getDayOfWeek(startGidClone);

				var maxLoopCountForDaysOfWeek = 0;
				while (daysOfWeek.indexOf(dayOfWeek) == -1 && maxLoopCountForDaysOfWeek < this.MAX_LOOP_COUNT_DAYS_OF_WEEK) {
					startGidClone.addDays(1);
					endDateGidClone.addDays(1);
					dayOfWeek = this._getDayOfWeek(startGidClone);
					maxLoopCountForDaysOfWeek++;
				}
				if (maxLoopCountForDaysOfWeek == this.MAX_LOOP_COUNT_DAYS_OF_WEEK) {
					//loop reached the limit which is set in MAX_LOOP_COUNT_DAYS_OF_WEEK
					this._log.warn('MAX_LOOP_COUNT_DAYS_OF_WEEK limit reached startGid: ' + startGid + ' previousMemberEndGid: ' + previousMemberEndGid + ' endDateGid: ' + endDateGid + ' daysOfWeek: ' + daysOfWeek);
				}

				var startStr = startGidClone.getValue() + "T" + "000000";
				var endStr = startGidClone.getValue() + "T" + "235959";

				if (startGidClone.compareTo(startGid) == 0) {
					//this is first day
					startStr = startGidClone.getValue() + "T" + this._onCallCommon.gitToTime(startGit);
				}
				if (startGidClone.compareTo(endDateGidClone) == 0) {
					//this is last day
					endStr = startGidClone.getValue() + "T" + this._onCallCommon.gitToTime(endGit);
				}
				scheduleSpans.push({
					dateGid: startGidClone,
					startStr: startStr,
					endStr: endStr
				});
				startGidClone.addDays(1);
			}
			if (maxLoopCountForDates == this.MAX_LOOP_COUNT) {
				//loop reached the limit which is set in MAX_LOOP_COUNT
				this._log.warn('MAX_LOOP_COUNT[maxLoopCountForDates] limit reached startGid: ' + startGid + ' previousMemberEndGid: ' + previousMemberEndGid + ' endDateGid: ' + endDateGid);
				scheduleSpans = [];//schedule spans table will bloatup if we don't empty this array incase of infinite loop
				scheduleSpans.push({
					dateGid: endDateGid,
					startStr: startGid.getValue() + "T" + this._onCallCommon.gitToTime(startGit),
					endStr: endDateGid.getValue() + "T" + this._onCallCommon.gitToTime(endGit)
				});
			}
		}
		else {
			//if repeat type is not "specific" or there is no gap in daysOfWeek then fallback to default behaviour of creating single schedule span which is spanning across multiple days
			scheduleSpans.push({
				dateGid: endDateGid,
				startStr: startGid.getValue() + "T" + this._onCallCommon.gitToTime(startGit),
				endStr: endDateGid.getValue() + "T" + this._onCallCommon.gitToTime(endGit)
			});
		}

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[_createScheduleSpan] scheduleId: " + scheduleId + " list of spans created: " + JSON.stringify(scheduleSpans));

		for (var i = 0; i < scheduleSpans.length; i++) {
			//created schedule spans for each day
			var scheduleSpan = scheduleSpans[i];
			var startStr = scheduleSpan.startStr;
			var endStr = scheduleSpan.endStr;
			this._defineScheduleSpan(scheduleId, user.getDisplayName(), startStr, endStr, repeatUntilGid, repeatCount, allDay, rotaSchedule).create();
		}
		return scheduleSpans[scheduleSpans.length - 1].dateGid;
	},

	_getDayOfWeek: function (gid) {
		var startGdt = this._convertGidToGdt(gid);
		var dayOfWeek = startGdt.getDayOfWeek();
		return dayOfWeek;
	},

	/**
	 * Creates cmn_schedule_span records for the members of a rotation schedule
	 *
	 * rotaGr [GlideRecord]
	 * groupName [string]
	 * rotaScheduleGr [GlideRecord]
	 * createSchedules [boolean]
	 */
	_createMemberRotationSchedules: function(rotaGr, groupName, rotaScheduleGr, createSchedules) {
		createSchedules = createSchedules + "" === "true" ? true : false;
		var timezone = rotaScheduleGr.time_zone + "";
		var rotaSchedule = new GlideSchedule(rotaGr.schedule + "");
		var rosterDates = this.getMemberDates();
		var rosterDatesLength = rosterDates.length;
		var memberSchedules = {};
		var intervalCount = this.getRotationIntervalDays();

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[_createMemberRotationSchedules] createSchedules: " + createSchedules + " timezone: " + timezone + " intervalCount: " + intervalCount + " rosterDatesLength: " + rosterDatesLength);

		for (var i = 0; i < rosterDatesLength; i++) {
			var rosterDateSpan = rosterDates[i];
			var rosterDateSpanStart = rosterDateSpan.getStart();
			if (!rosterDateSpanStart) {
				this._log.error("[_createMemberRotationSchedules] invalid rosterDateSpanStart in cmn_rota_roster: " + this._rosterSysId);
				continue;
			}

			var memberStartStr = this._onCallCommon.gdToDate(rosterDateSpanStart);

			if (this._log.atLevel(GSLog.DEBUG))
				this._log.debug("[_createMemberRotationSchedules] rosterDateSpan: " + rosterDateSpan.toString() + " rosterDateSpanStart: " + rosterDateSpanStart + " memberStartStr: " + memberStartStr);

			var memberStartGid = new GlideIntegerDate();
			memberStartGid.setValue(memberStartStr);
			var members = this.getActiveMembersOrdered(rosterDateSpanStart);
			var membersLength = members.length;

			if (this._log.atLevel(GSLog.DEBUG))
				this._log.debug("[_createMemberRotationSchedules] membersLength: " + membersLength);

			var excludedSpans = [];
			var previousMemberEndGid;
			for (var j = 0; j < membersLength; j++) {
				var member = members[j];

				if (this._log.atLevel(GSLog.DEBUG))
					this._log.debug("[_createMemberRotationSchedules] member: " + member.toString());

				var user = GlideUser.getUserByID(member.getMemberId());
				var scheduleId = member.getRotationScheduleId();

				if (!scheduleId) {
					scheduleId = this._createSchedule(rotaGr, groupName, timezone, member, user);
					memberSchedules[member.getId()] = scheduleId;
					member.setRotationScheduleId(scheduleId);
					member.update(false);
				}

				// If we are updating schedules rather than creating from scratch, ensure the
				// following member's cmn_schedule is updated memberSchedules is updated
				if (!createSchedules && !memberSchedules[member.getId()]) {
					this._updateSchedule(scheduleId, rotaGr, groupName, timezone, member, user);
					memberSchedules[member.getId()] = scheduleId;
				}

				// In cases where the rotation interval differs to the rota's schedule it should
				// check per member to ensure each schedule starts from a valid day.
				memberStartGid = this._getValidMemberStartDate(memberStartGid, rotaSchedule);

				var isWeeklyRotation = this._isWeeklyRotation();
				var dowForRotate = this._getRotationDayOfWeek();
				if (isWeeklyRotation && dowForRotate) {
					// Prepone the start date to selected day of the week.
					var result = this._rotateToWeekDay(memberStartGid, dowForRotate, timezone);

					// Exclude preponed days.
					if (result.count) {
						memberStartGid = result.memberStartGid;
						this._excludeRotatedDays(memberStartGid, result.count - 1, scheduleId, user);
					}
				}

				previousMemberEndGid = this._createScheduleSpan(memberStartGid, user, rosterDateSpan, scheduleId, rotaSchedule, previousMemberEndGid);

				var memberToDate = member.getTo();
				if (memberToDate) {
					//if rota member has toDate then create exclude entry from his toDate to date till his next rotation
					var memberToDateGd = new GlideDate();
					memberToDateGd.setValue(memberToDate);

					//using setDisplayValueInternal() with getValue() because memberToDateGd value is explicitly set above using setValue()
					var memberToDateGdt = new GlideDateTime();
					memberToDateGdt.setDisplayValueInternal(memberToDateGd.getValue() + ' 00:00:00');

					var rosterDateSpanEnd = rosterDateSpan.getEnd();
					var toDateIsInSpanRange = memberToDateGd.onOrAfter(rosterDateSpanStart) && memberToDateGd.before(rosterDateSpanEnd);

					if (toDateIsInSpanRange) {
						//create exclude only when toDate is in between span range and in between member rotation dates
						var toDateIsInMemberSchedule = false;

						var memberSchedule = new GlideSchedule(scheduleId);
						if (memberSchedule.isValid()) {
							//schedule.isInSchedule() won't work when parent is populated. hence using getSpans

							var endOfToDateGdt = new GlideDateTime();
							endOfToDateGdt.setDisplayValueInternal(memberToDateGd.getValue() + ' 23:59:59');

							toDateIsInMemberSchedule = memberSchedule.getSpans(memberToDateGdt, endOfToDateGdt).size() > 0;
						}

						if (toDateIsInMemberSchedule) {
							var count = 0;
							while (rosterDateSpanEnd.after(memberToDateGd)) {
								rosterDateSpanEnd.addDaysUTC(-1);
								count++;
							}

							var memberToDateGid = this._convertGdtToGid(memberToDateGdt);
							memberToDateGid.addDays(1);

							//create exclude entry and associate it with member rota schedule
							var excludedScheduleSpanId = this._excludeRotatedDays(memberToDateGid, count - 1, scheduleId, user);
							excludedSpans.push({
								memberPosition: j,
								scheduleSpanId: excludedScheduleSpanId
							});

							if (this._log.atLevel(GSLog.DEBUG))
								this._log.debug("[_createMemberRotationSchedules] [exclude span created for toDate to next day of rotation] scheduleId: " + scheduleId + " user: " + user.getDisplayName() + " excludedScheduleSpanId: " + excludedScheduleSpanId);
						}
					}
				}

				// For subsequent member's we only need to add the interval to the start date
				memberStartGid.addDays(intervalCount);
			}


			//excluded spans should be patched with next available members to avoid no schedule.
			for (var k = 0; k < excludedSpans.length; k++) {
				var excludedSpan = excludedSpans[k];
				excludedSpanMemberPosition = excludedSpan.memberPosition;

				//identify next available member as on-call
				var nextMemberPosition = excludedSpanMemberPosition + 1;
				if (nextMemberPosition == membersLength) {
					nextMemberPosition = 0;
				}

				//get next available on-call member schedule
				var nextMember = members[nextMemberPosition];
				var nextMemberScheduleId = nextMember.getRotationScheduleId();
				var nextMemberGr = GlideUser.getUserByID(nextMember.getMemberId());

				//get excluded schedule span on current user
				var excludedSpanGr = new GlideRecord('cmn_schedule_span');
				excludedSpanGr.initialize();
				if (excludedSpanGr.get(excludedSpan.scheduleSpanId)) {
					//create new excluded span from excluded schedule span definition and associate it with next available on-call member schedule
					excludedSpanGr.setValue('schedule', nextMemberScheduleId);
					excludedSpanGr.setValue('type', 'on_call');
					excludedSpanGr.setValue('name', nextMemberGr.getDisplayName());
					excludedSpanGr.insert();

					if (this._log.atLevel(GSLog.DEBUG))
						this._log.debug("[_createMemberRotationSchedules] [patch span created for excluded span] excludedSpan: " + excludedSpan.scheduleSpanId + " patchSpan: " + excludedSpanGr.getUniqueValue());
				}
			}
		}

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[_createMemberRotationSchedules] memberSchedules: " + JSON.stringify(memberSchedules));
	},

	_rotateToWeekDay: function(gid, dowForRotate, rotaScheuleTimezone) {
		 var startGdt = this._convertGidToGdt(gid);
		 var dow = this.getDayOfWeekTZ(startGdt, rotaScheuleTimezone);

		 var count = 0;
		 while(dow != dowForRotate){
			 startGdt.addDaysUTC(-1);
			 dow = this.getDayOfWeekTZ(startGdt, rotaScheuleTimezone);
			 count++;
		 }
		 var memberStartGid = this._convertGdtToGid(startGdt);
		 return {memberStartGid: memberStartGid, count: count};
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

	_excludeRotatedDays: function(memberStartGid, count, scheduleId, user){
		var startGid = new GlideIntegerDate();
		startGid.setValue(memberStartGid.getValue());
		var startGit = new GlideIntegerTime();
		startGit.setTime("00", "00", "00");
		var startStr = startGid.getValue() + "T" + this._onCallCommon.gitToTime(startGit);

		var endGid= new GlideIntegerDate();
		endGid.setValue(memberStartGid.getValue());
		endGid.addDays(count);
		var endGit = new GlideIntegerTime();
		endGit.setTime("23", "59", "59");
		var endStr = endGid.getValue() + "T" + this._onCallCommon.gitToTime(endGit);

		return this._defineScheduleSpanExclude(scheduleId, user.getDisplayName(),startStr,endStr, this.isAllDay()).create();
	},

	_convertGidToGdt: function(gid){
		var gdt = new GlideDateTime();
		gdt.setDisplayValue(gid.getDisplayValue());
		return gdt;
	},

	_convertGdtToGid: function(gdt){
		var gid = new GlideIntegerDate();
		var str = this._onCallCommon.gdtToDate(gdt);
		gid.setValue(str);
		return gid;
	},

	_defineScheduleSpanExclude: function(scheduleSysId, username, startStr, endStr, allDay){
		var onCallScheduleSpan = new OnCallScheduleSpan();
		onCallScheduleSpan.setSchedule(scheduleSysId);
		onCallScheduleSpan.setType("exclude");
		onCallScheduleSpan.setShowAs("on_call");
		onCallScheduleSpan.setName(username);
		onCallScheduleSpan.setStartDate(startStr);
		onCallScheduleSpan.setEndDate(endStr);
		onCallScheduleSpan.setRepeatType(null);
		onCallScheduleSpan.setRepeatCount(1);
		onCallScheduleSpan.setAllDay(allDay);
		return onCallScheduleSpan;
	},

	_defineScheduleSpan: function (scheduleSysId, username, startDateTime, endDateTime, repeatUntilDate, repeatCount, allDay, rotaSchedule) {
		allDay = allDay + "" === "true" ? true : false;

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[_defineScheduleSpan] scheduleSysId: " + scheduleSysId + " username: " + username + " startDateTime: " +
				startDateTime + " endDateTime: " + endDateTime + " repeatUntilDate: " + repeatUntilDate + " repeatCount: " + repeatCount +
				" allDay: " + allDay + " rotaSchedule: " + rotaSchedule.getID());

		var onCallScheduleSpan = new OnCallScheduleSpan();
		onCallScheduleSpan.setSchedule(scheduleSysId);
		onCallScheduleSpan.setType("on_call");
		onCallScheduleSpan.setShowAs("on_call");
		onCallScheduleSpan.setName(username);
		onCallScheduleSpan.setStartDate(startDateTime);
		onCallScheduleSpan.setEndDate(endDateTime);
		onCallScheduleSpan.setRepeatUntil(repeatUntilDate);
		onCallScheduleSpan.setRepeatCount(repeatCount);
		onCallScheduleSpan.setAllDay(allDay);
		var type = this._gr.rotation_interval_type + "";
		if (type === "weekly") {
			onCallScheduleSpan.setRepeatType("daily");
			onCallScheduleSpan.setDaysOfWeek("1234567");
		} else {
			onCallScheduleSpan.setRepeatType("specific");
			onCallScheduleSpan.setDaysOfWeek(rotaSchedule.getDaysOfWeek());
		}
		onCallScheduleSpan.setMonthlyType("dom");
		return onCallScheduleSpan;
	},

	_getValidMemberStartDate: function(gid, schedule) {
		var startGdt = new GlideDateTime();
		startGdt.setDisplayValue(gid.getDisplayValue());
		if (!this.isAllDay()) {
			var rotationStartTime = this._gr.rotation_start_time.getGlideObject();
			var milliseconds = rotationStartTime.getHour() * 60 * 60 * 1000;
			milliseconds += rotationStartTime.getMinute() * 60 * 1000;
			milliseconds += rotationStartTime.getSecond() * 1000;
			startGdt.add(milliseconds);
		}
		var timeToNext = schedule.whenNext(startGdt);
		startGdt.add(timeToNext);
		var memberStartGid = new GlideIntegerDate();
		var memberStartStr = this._onCallCommon.gdtToDate(startGdt);

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[_getValidMemberStartDate] memberStartStr: " + memberStartStr);

		memberStartGid.setValue(memberStartStr);
		return memberStartGid;
	},

	/**
	 * Get all member From dates which have been populated (+ a previous day), also includes the roster start date
	 * Members from dates are adjusted to match the next rotation
	 *
	 * return [array] unique set of member From dates
	 */
	_getMemberFromDates: function() {
		var rosterStartGd = this._getStartDate();
		var startDates = {};
		startDates[rosterStartGd.getNumericValue()] = rosterStartGd;
		var memberStartDates = [];
		var membersGr = new GlideRecord("cmn_rota_member");

		if (!this._rosterSysId || !membersGr.isValidField("from") || !membersGr.isValidField("to")) {
			if (!this._rosterSysId)
					this._log.error("[_getMemberFromDates] invalid rosterSysId");

			Object.keys(startDates).forEach(function(key) { memberStartDates.push(startDates[key]); });
			return memberStartDates;
		}

		membersGr.addQuery("roster", this._rosterSysId);
		var qc = membersGr.addNullQuery("to");
		qc.addOrCondition("to", ">", rosterStartGd); // filter out members who end before the roster start
		membersGr.addNotNullQuery("from");
		membersGr.addQuery("from", ">", rosterStartGd);
		membersGr.orderBy("from");
		membersGr.query();
		while (membersGr.next()) {
			var from = membersGr.from + "";
			var fromGd = new GlideDate();
			fromGd.setValue(from);
			fromGd.addDaysUTC(this.getNumberOfDaysTillNextRotation(fromGd, false));
			startDates[fromGd.getNumericValue()] = fromGd;
			var fromGd2 = new GlideDate();
			fromGd2.setValue(fromGd);
			fromGd2.addDaysUTC(-1);
			if (rosterStartGd.compareTo(fromGd2) < 0) // Only add dates after the roster start date
				startDates[fromGd2.getNumericValue()] = fromGd2;
		}
		return startDates;
	},

	/**
	 * Get the members To dates pairs (To date on the cmn_rotamember adjusted to the next rotation start and a previous day)
	 * The previous day is used as a cut off for the prior date span
	 *
	 * return [array] unique set of member To dates
	 */
	_getMemberToDates: function() {
		var rosterStartGd = this._getStartDate();
		var endDates = {};
		var memberEndDates = [];
		var membersGr = new GlideRecord("cmn_rota_member");

		if (!this._rosterSysId || !membersGr.isValidField("to")) {
			if (!this._rosterSysId)
					this._log.error("[_getMemberToDates] invalid rosterSysId");
			return memberEndDates;
		}

		membersGr.addQuery("roster", this._rosterSysId);
		membersGr.addQuery("to", ">", rosterStartGd);
		membersGr.addNotNullQuery("to");
		membersGr.orderBy("to");
		membersGr.query();
		while (membersGr.next()) {
			var to = membersGr.to + "";
			var toGd = new GlideDate();
			toGd.setValue(to);
			toGd.addDaysUTC(this.getNumberOfDaysTillNextRotation(toGd, false));
			endDates[toGd.getNumericValue()] = toGd;
			var toGd2 = new GlideDate();
			toGd2.setValue(toGd);
			toGd2.addDaysUTC(-1);
			endDates[toGd2.getNumericValue()] = toGd2;
		}
		return endDates;
	},

	getRotationIntervalDays: function() {
		var rotationInterval = this._getIntervalCount();
		if (this._gr.rotation_interval_type + "" === "weekly")
			rotationInterval = rotationInterval * 7;
		return rotationInterval;
	},

	getMembers: function() {
		var members = [];
		var memberGr = new GlideRecord("cmn_rota_member");
		memberGr.addQuery("roster", this._rosterSysId);
		memberGr.orderBy("order");
		memberGr.query();
		while (memberGr.next())
			members.push(new OnCallMember(memberGr));
		return members;
	},

	_getRotationDayOfWeek: function () {
		if (this._isWeeklyRotation()) {
			var dowForRotate = parseInt(this._gr.getValue('dow_for_rotate'));
			if (!isNaN(dowForRotate)) {
				return dowForRotate;
			}
		}
	},

	_isWeeklyRotation: function () {
		return this._gr.getValue('rotation_interval_type') == "weekly";
	},

	getNumberOfDaysTillNextRotation: function(fromGdt, isEndOfRotation) {
		fromGdt = fromGdt || new GlideDateTime();
		var rotationInterval = this.getRotationIntervalDays();
		var rotationStartGd = this._getStartDate();

		//check if DayOfWeekRotation is configured for weekly rotation
		var isWeeklyRotation = this._isWeeklyRotation();
		var dowForRotate = this._getRotationDayOfWeek();
		if (isWeeklyRotation && dowForRotate) {
			//rotationStartGd not necessarily will start exactly on DayOfWeekRotation
			//adjust rotationStartGd to next DayOfWeekRotation
			//getDayOfWeekUTC() is used because getDayOfWeek() is returning incorrect results in US/Eastern timezone
			while (rotationStartGd.getDayOfWeekUTC() != dowForRotate) {
				rotationStartGd.addDaysUTC(1);
			}
		}

		var daysDifference = new GlideDuration(rotationStartGd.getNumericValue() - fromGdt.getNumericValue()).getDayPart();
		daysDifference = Math.abs(daysDifference);

		if (fromGdt.compareTo(rotationStartGd) < 0) {
			if (isEndOfRotation && (daysDifference > 0))
				daysDifference--;
			return daysDifference;
		}

		var daysIntoRotation = daysDifference % rotationInterval;
		var daysToRotation = rotationInterval - daysIntoRotation;

		// if endOfRotation is true we need number of days to end of current rotation
		if (isEndOfRotation && (daysToRotation > 0))
			daysToRotation--;

		return daysToRotation;
	},

	/**
	 * Delete all of the computed rotation schedules for the members of a roster.
	 */
	_deleteRosterMemberSchedules: function(rosterSysId) {
		var scheduleGr = new GlideRecord("cmn_schedule");
		var memberGr = new GlideRecord("cmn_rota_member");
		memberGr.addQuery("roster", rosterSysId);
		memberGr.query();
		while (memberGr.next()) {
			var scheduleID = memberGr.rotation_schedule + "";
			if (scheduleID) {
				scheduleGr.setWorkFlow(false);
				if (scheduleGr.get(scheduleID))
					scheduleGr.deleteRecord();
			}
		}
	},

	/**
	 * Delete all cmn_schedule_spans of the computed rotation schedules for members of a roster.
	 */
	_deleteRosterMemberScheduleSpans: function(rosterSysId) {
		var scheduleSysIds = [];
		var rotaMemberGr = new GlideRecord("cmn_rota_member");
		rotaMemberGr.addQuery("roster", rosterSysId);
		rotaMemberGr.query();
		while (rotaMemberGr.next()) {
			var scheduleSysId = rotaMemberGr.rotation_schedule + "";
			if (!scheduleSysId)
				continue;
			scheduleSysIds.push(scheduleSysId);
		}

		if (scheduleSysIds.length > 0) {
			var scheduleSpanGr = new GlideRecord("cmn_schedule_span");
			scheduleSpanGr.addQuery("schedule", scheduleSysIds);
			scheduleSpanGr.query();
			scheduleSpanGr.setWorkFlow(false);
			scheduleSpanGr.deleteMultiple();
		}
	},

	_defineSchedule: function(onCallSchedule, rotaGr, groupName, timeZoneName, onCallMember, user) {
		var scheduleName = groupName + ": " + user.getDisplayName() + ": " + this._gr.name + "";

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[_defineSchedule] scheduleName: " + scheduleName);

		onCallSchedule.setName(scheduleName);
		onCallSchedule.setTimezone(timeZoneName);
		onCallSchedule.setType("rotation");
		onCallSchedule.setDocument(onCallMember.getTableName());
		onCallSchedule.setDocumentKey(onCallMember.getId());
		onCallSchedule.setParent(rotaGr.schedule + "");
		onCallSchedule.setReadOnly(true);
	},

	_initFromSysId: function(rosterSysId) {
		this._rosterSysId = rosterSysId || "";

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[_initFromSysId] rosterSysId: " + this._rosterSysId);

		if (!this._rosterSysId)
			return;

		var gr = new GlideRecord(this.getTableName());
		if (gr.get(this._rosterSysId))
			this._gr = gr;
	},

	_getPreviousRotationDate: function (gdt) {
		var startOfPrevious = this._getNextRotationDate(gdt).getDate();
		// add one day to get the beginning of the previous rotation
		startOfPrevious.addDaysUTC(-this.getRotationIntervalDays() + 1);

		var isWeeklyRotation = this._isWeeklyRotation();
		var dowForRotate = this._getRotationDayOfWeek();
		if (isWeeklyRotation && dowForRotate) {
			//if calculated previousRotationDate is before Start date of roster then return roster start date
			var rosterStartDate = this._getStartDate();
			if (startOfPrevious.before(rosterStartDate)) {
				return rosterStartDate;
			}
		}

		return startOfPrevious;
	},

	_getNextRotationDate: function(fromDateGdt) {
		var days = this.getNumberOfDaysTillNextRotation(fromDateGdt, true);
		var nextDate = new GlideDateTime(fromDateGdt);
		nextDate.addDaysUTC(days);
		return nextDate;
	},

	_getIntervalCount: function(){
		return parseInt(this._gr.rotation_interval_count + "");
	},

	_getStartDate: function() {
		var gd = new GlideDate();
		var startDate = this._gr.getDisplayValue("rotation_start_date");
		if (startDate)
			gd.setDisplayValue(startDate);
		return gd;
	},

	getTableName: function() {
		return "cmn_rota_roster";
	},

	isAllDay: function() {
		var rotaStartTimeStr = this._gr.rotation_start_time + "";
		var startTimeGit = new GlideIntegerTime();
		startTimeGit.setTime(rotaStartTimeStr.substring(0, 2), rotaStartTimeStr.substring(2, 4), rotaStartTimeStr.substring(4, 6));

		// Check property to ensure we should factor a Daily rotation interval to mean all day
		var factorDailyInterval = this._gr.rotation_interval_type + "" == "daily" && this._gs.getProperty(OnCallRosterSNC.PROPERTY_FACTOR_DAILY_ROTATION_INTERVAL_ALL_DAY, true) == "true";

		if (this._log.atLevel(GSLog.DEBUG))
			this._log.debug("[isAllDay] rosterAllDay: " + this._gr.rotation_all_day + " factorDailyInterval: " + factorDailyInterval);

		// If the roster's All day rotation is checked or start-time is 0 or rotation interval is Daily
		return this._gr.rotation_all_day || startTimeGit.getIntegerTimeValue() <= 0 || factorDailyInterval;
	},

	_updateSchedule: function(scheduleId, rotaGr, groupName, timeZoneName, onCallMember, user) {
		var onCallSchedule = new OnCallSchedule(scheduleId);
		this._defineSchedule(onCallSchedule, rotaGr, groupName, timeZoneName, onCallMember, user);
		return onCallSchedule.update(false);
	},

	toString: function() {
		return this.type;
	},

	type: 'OnCallRosterSNC'
};

OnCallRosterSNC.PROPERTY_SKIP_COMPUTE_SCHEDULES = "com.snc.on_call_rotation.skip_compute_member_rotation_schedules";
OnCallRosterSNC.PROPERTY_CREATE_SCHEDULES = "com.snc.on_call_rotation.create_member_rotation_schedules";
OnCallRosterSNC.PROPERTY_FACTOR_DAILY_ROTATION_INTERVAL_ALL_DAY = "com.snc.on_call_rotation.factor_daily_rotation_interval_all_day";
```