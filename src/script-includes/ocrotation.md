---
title: "OCRotation"
id: "ocrotation"
---

API Name: global.OCRotation

```js
var OCRotation = Class.create();
OCRotation.prototype = {

	/* 
	 * Keeps track of when an a value (such as the start date) has 
	 * been changed and a call to buildRotas is required
	 */
	_isDirty: true,

	_inclusiveEndDate: true,

	SHIFT_STATE: {
		DRAFT: "draft"
	},

	SPAN_FETCH_PREFERENCE: {
		ALL: "all", // It will fetch all the active rotas or inactive rotas in draft state
		DRAFT_ONLY: "draft", // It will fetch all the inactive rotas in draft state only
		NONE: "" // fetch only the active rotas
	},

	initialize: function(schedulePage) {
		this.log = new GSLog("com.snc.on_call_rotation.log.level", this.type);
		if (this.log.atLevel(GSLog.DEBUG))
			this.log.debug("[initialize] START");
		this.timer = new OCTimer(this.type);
		this.legacySpanSuport = gs.getProperty("com.snc.on_call_rotation.support_legacy_spans", "false") == "false" ? false : true;
		this.editRotaMsg = gs.getMessage('Edit rota');
		this.viewRotaMsg = gs.getMessage('View rota');
		this.sm = GlideSecurityManager.get();
		this.arrayUtils = new ArrayUtil();

		if (!JSUtil.nil(schedulePage)) {
			this.setSchedulePage(schedulePage);
			this.setStartDate(this.getSchedulePage().getParameter("start"));
			this.setEndDate(this.getSchedulePage().getParameter("end"));
		}

		// make sure we have some dates
		if (JSUtil.nil(this.getStartDate()))
			this.setStartDate();
		if (JSUtil.nil(this.getEndDate()))
			this.setEndDate();

		// check whether to compress adjacent spans or not
		if (JSUtil.nil(this.getCompressTimeMap()))
			this.setCompressTimeMap(true);

		if (JSUtil.nil(this.getExcludeTimeOff()))
			this.excludeTimeOff = true;

		if (JSUtil.nil(this.getSpanFetchPreference()))
			this.spanFetchPreference = this.SPAN_FETCH_PREFERENCE.NONE;

		if (this.log.atLevel(GSLog.DEBUG))
			this.log.debug("[initialize] END");
	},

	_init: function() {
		if (this.log.atLevel(GSLog.DEBUG)) {
			this.log.debug("[_init] startDate: " + this.getStartDate().getValue() + ", endDate: " + this.getEndDate().getValue() + ", timezone: " + this.getTimezone());
			this.timer.start("[_init]");
		}

		if (JSUtil.nil(this.getSchedulePage()))
			this.setSchedulePage(new SchedulePage());

		var timezone = this.getTimezone();

		var start = new GlideScheduleDateTime(this.getStartDate().getDisplayValue());
		if (this.log.atLevel(GSLog.DEBUG))
			this.log.debug("[_init] start converted: " + start);
		start.setTimeZone(timezone);

		var end = new GlideScheduleDateTime(this.getEndDate().getDisplayValue());
		
		if (this.log.atLevel(GSLog.DEBUG))
			this.log.debug("[_init] end converted: " + end);
		end.setTimeZone(timezone);

		if (this.log.atLevel(GSLog.DEBUG))
			this.log.debug("[_init] start: " + start + " (" + start.getTimeZone().getID() + "), end: " + end + " (" + end.getTimeZone().getID() + "), timezone: " + this.getTimezone());

		if (JSUtil.nil(this.getSchedulePage().getPage()))
			this.getSchedulePage().setPage(new GlideAJAXSchedulePage(start, end, timezone));

		this.getSchedulePage().clear();
		this.getSchedulePage().getPage().setDateRange(start, end);
		this.getSchedulePage().getPage().setTimeZone(timezone);
		this.getSchedulePage().getPage().setCompressTimeMap(this.getCompressTimeMap());

		if (this.log.atLevel(GSLog.DEBUG))
			this.timer.stop("[_init]");
	},

	isDirty: function() {
		return this._isDirty;
	},

	setDirty: function(isDirty) {
		this._isDirty = isDirty;
		return this;
	},

	getStartDate: function() {
		return this.startDate;
	},

	/* Set the start date used when building rotas
	 *
	 * @param *optional* startDate [String]: When the time spans should start from as
	 * a string in the yyyy-MM-dd format. A default is applied if not provided which
	 * is the first day of the previous month.
	 *
	 * @param *optional* isDateTime [boolean]: set to true, if startDate has both Date and time. false, if it has only Date
	 */
	setStartDate: function(startDate, isDateTime) {
		if (JSUtil.nil(startDate)) {
			if (this.log.atLevel(GSLog.DEBUG))
				this.log.debug("[setStartDate] no startDate set to current day minus one month");
			var currentDateTime = new GlideDateTime();
			currentDateTime.addMonthsLocalTime(-1);
			currentDateTime.setDayOfMonthLocalTime(1);
			startDate = new GlideDateTime();
			startDate.setDisplayValueInternal(currentDateTime.getLocalDate() + " 00:00:00");
		} else {
			var temp = new GlideDateTime();
			if (!isDateTime)
				temp.setDisplayValueInternal(startDate + " 00:00:00");
			else
				temp.setDisplayValueInternal(startDate);
			startDate = temp;
		}
		
		if (this.log.atLevel(GSLog.DEBUG))
			this.log.debug("[setStartDate] startDate: " + startDate);
		this.startDate = startDate;
		this.setDirty(true);
		return this;
	},

	getEndDate: function() {
		return this.endDate;
	},

	/* Set the end date used when building rotas
	 *
	 * @param *optional* endDate [String]: When the time spans should end as a string
	 * in the yyyy-MM-dd format. A default is applied if not provided which is the
	 * last day of the next month.
	 *
	 * @param *optional* isDateTime [boolean]: set to true, if endDate has both Date and time. false, if it has only Date
	 */
	setEndDate: function(endDate, inclusive, isDateTime) {
		this._inclusiveEndDate = JSUtil.nil(inclusive) ? true : inclusive;
		if (JSUtil.nil(endDate)) {
			if (this.log.atLevel(GSLog.DEBUG))
				this.log.debug("[setEndDate] no endDate set to current day plus one month");
			var currentDateTime = new GlideDateTime();
			currentDateTime.addMonthsLocalTime(1);
			currentDateTime.setDayOfMonthLocalTime(31);
			endDate = new GlideDateTime();
			endDate.setDisplayValueInternal(currentDateTime.getLocalDate() + " 23:59:59");
		} else {
			var temp = new GlideDateTime();
			if (!isDateTime)
				temp.setDisplayValueInternal(endDate + " 23:59:59");
			else
				temp.setDisplayValueInternal(endDate);
			endDate = temp;
		}

		if (!this._inclusiveEndDate)
			endDate.addDaysLocalTime(-1);

		if (this.log.atLevel(GSLog.DEBUG))
			this.log.debug("[setEndDate] endDate: " + endDate);
		this.endDate = endDate;
		this.setDirty(true);
		return this;
	},

	getTimezone: function() {
		if (JSUtil.nil(this.timezone)) 
			this.timezone = GlideSession.get().getTimeZoneName();
		return this.timezone;
	},

	setTimezone: function (timezone) {
		this.timezone = timezone;
		this.setDirty(true);
		return this;
	},

	setExcludeTimeOff: function(excludeTimeOff) {
		this.excludeTimeOff = excludeTimeOff;
		return this;
	},

	getCompressTimeMap: function() {
		return this.compressTimeMap;
	},

	setCompressTimeMap: function(compressTimeMap) {
		this.compressTimeMap = compressTimeMap;
		return this;
	},

	getExcludeTimeOff: function() {
		return this.excludeTimeOff;
	},

	getGroupIds: function() {
		return this.groupIds;
	},

	/* Set the Group ID used when building rotas
	 *
	 * groupIds [String]: A comma seperated list of sys_user_group
	 * sys_ids to filter the cmn_rota records fetched
	 */
	setGroupIds: function(groupIds) {
		// Make sure this is always a String
		this.groupIds = groupIds + "";
		this.setDirty(true);
		return this;
	},

	getRotaIds: function() {
		return this.rotaIds;
	},

	/* Set the Rota IDs used when building rotas
	 *
	 * rotaIds [String]: A comma seperated list of cmn_rota sys_ids
	 * to filter the returned spans
	 */
	setRotaIds: function(rotaIds) {
		this.rotaIds = rotaIds;
		this.setDirty(true);
		return this;
	},

	getRosterIds: function() {
		return this.rosterIds;
	},

	/* Set the Roster IDs used when building rotas
	 *
	 * rosterIds [String]: A comma seperated list of cmn_rota_roster
	 * sys_ids to filter the returned spans
	 */
	setRosterIds: function(rosterIds) {
		this.rosterIds = rosterIds;
		this.setDirty(true);
		return this;
	},

	getUserIds: function() {
		return this.userIds;
	},

	/* Set the User IDs used when building rotas
	 *
	 * userIds [String]: A comma seperated list of sys_user sys_ids
	 * to filter the returned spans
	 */
	setUserIds: function(userIds) {
		this.userIds = userIds;
		this.setDirty(true);
		return this;
	},

	getSchedulePage: function() {
		this.schedulePage.getPage().setLegacy(this._isLegacy());
		return this.schedulePage;
	},

	setSchedulePage: function(page) {
		this.schedulePage = page;
		var groupId = this.schedulePage.getParameter("group");
		if (!JSUtil.nil(groupId))
			this.setGroupIds(groupId + "");
		this.setDirty(true);
		return this;
	},

	getSpanFetchPreference: function () {
		return this.spanFetchPreference;
	},

	setSpanFetchPreference: function(preference) {
		if (JSUtil.notNil(preference))
			this.spanFetchPreference = preference;
		return this;
	},

	/* 
	 * Get a GlideRecord for the cmn_rota table which is filtered by Rota IDs, 
	 * Group IDs, Roster IDs and User IDs. The GlideRecord will only contain
	 * cmn_rota records which match all the criteria.
	 *
	 * @param *optional* rotaIds [String]: A comma separated list of cmn_rota sys_ids 
	 *
	 * @param *optional* groupIds [String]: A comma separated list of sys_user_group sys_ids 
	 *									    which are referred to by cmn_rota records
	 *
	 * @param *optional* rosterIds [String]: A comma separated list of cmn_rota_roster sys_ids 
	 *
	 * @param *optional* userIds [String]: A comma separated list of sys_user sys_ids which 
	 *									   are referred to by cmn_rota_member records
	 *
	 * @return [GlideRecord]: A queried GlideRecord
	 */
	getRotaGr: function(rotaIds, groupIds, rosterIds, userIds) {
		if (this.log.atLevel(GSLog.DEBUG))
			this.timer.start("[getRotaGr]");

		var filteredRotaIds = "";
		if (!JSUtil.nil(userIds))
			filteredRotaIds = this._getRotaIdsFromMembers(userIds, rosterIds, rotaIds, groupIds);
		else if (!JSUtil.nil(rosterIds))
			filteredRotaIds = this._getRotaIdsFromRosters(rosterIds, rotaIds, groupIds);
		else
			filteredRotaIds = this._getRotaIdsFromRotas(rotaIds, groupIds);

		var rotaGr = new GlideRecord("cmn_rota");
		rotaGr.addQuery("sys_id", "IN", filteredRotaIds);
		rotaGr.query();

		if (this.log.atLevel(GSLog.DEBUG)) {
			this.log.debug("[getRotaGr] rota count = " + rotaGr.getRowCount() + ", query = " + rotaGr.getEncodedQuery());
			this.timer.stop("[getRotaGr]");
		}

		return rotaGr;
	},

	/*
	 * Builds the schedule spans and stores them within the Schedule Page object.
	 */
	buildRotas: function() {
		if (this.log.atLevel(GSLog.DEBUG)) {
			this.log.debug("[buildRotas]");
			this.timer.start("[buildRotas]");
		}

		this._init();

		var rotaGr = this.getRotaGr(this.getRotaIds(), this.getGroupIds(), this.getRosterIds(), this.getUserIds());

		if (this.log.atLevel(GSLog.DEBUG))
			this.log.debug("[buildRotas] rota count = " + rotaGr.getRowCount());

		var userIds = {};	// gather a list of unique member sys_user ids
		var rotaIds = [];
		while (rotaGr.next()) {
			var canWrite = rotaGr.canWrite();
			var rotaId = rotaGr.sys_id + "";
			rotaIds.push(rotaId);
			this.log.debug("[buildRotas] editRights = " + canWrite + ", rotaId = " + rotaId);
			var rotaMsg = canWrite ? this.editRotaMsg : this.viewRotaMsg;

			if (this.log.atLevel(GSLog.DEBUG))
				this.timer.start("[_buildUserSpan.addSchedule]");

			var items = this.getSchedulePage().addSchedule(rotaGr.schedule, this._getEventBgColor(rotaId, "rota"), null, canWrite);

			if (this.log.atLevel(GSLog.DEBUG))
				this.timer.stop("[_buildUserSpan.addSchedule]");
			
			var groupId = rotaGr.group + "";
			var rotaLink = rotaGr.getLink(true);
			for (var i = 0; i < items.size(); i++) {
				var rotaItem = items.get(i);
				rotaItem.setGroupId(groupId);
				rotaItem.addMenuURL(rotaMsg, rotaLink);
				rotaItem.setRotaId(rotaId);
				if (!rotaItem.getType())
					rotaItem.setType("rota");
			}

			var memberGr = this.getRosterMembersGr(rotaId, this.getRosterIds(), this.getUserIds());
			while (memberGr.next()) {
				this._buildMember(rotaId, memberGr, canWrite);
				userIds[memberGr.member+""] = true;
			}
		}
		
		var userIdArr = this._getKeys(userIds);
		
		// Include users who provide coverage, may have left the group
		var rssGr = new GlideRecord('roster_schedule_span');
		rssGr.addQuery('roster.rota', 'IN', rotaIds);
		if(userIdArr.length)
			rssGr.addQuery('user', 'NOT IN', userIdArr);
		rssGr.addEncodedQuery(this._getDateLimitedEncQuery('type=on_call'));
		rssGr.query();
		while (rssGr.next())
			userIds[rssGr.user + ""] = true;

		userIdArr = this._getKeys(userIds);

		this._getMembersInfo(null, userIdArr);
		this.setDirty(false);

		if (this.log.atLevel(GSLog.DEBUG))
			this.timer.stop("[buildRotas]");

		return this;
	},
	
	_getKeys: function(obj) {
		var keys = [];
		for (var key in obj)
			keys.push(key);
		return keys;
	},

	/* 
	 * Get a GlideRecord for the cmn_rota_member table which is filtered by Rota IDs, 
	 * Roster IDs and User IDs. The GlideRecord will only contain cmn_rota_member records
	 * which match all the criteria.
	 *
	 * @param *optional* rotaIds [String]: A comma separated list of cmn_rota sys_ids
	 *
	 * @param *optional* rosterIds [String]: A comma separated list of cmn_rota_roster sys_ids 
	 *
	 * @param *optional* userIds [String]: A comma separated list of sys_user sys_ids which 
	 *									   are referred to by cmn_rota_member records
	 * @param *optional* groupIds [String]: A comma separated list of Group [sys_user_group] sys_ids which
	 *										are referred to by the Rota [cmn_rota] record
	 *
	 * @return [GlideRecord]: A queried GlideRecord of cmn_rota_member records matching all the parameters
	 */
	getRosterMembersGr: function(rotaIds, rosterIds, userIds, groupIds) {
		if (this.log.atLevel(GSLog.DEBUG))
			this.timer.start("[getRosterMembersGr]");

		var gr = new GlideRecord("cmn_rota_member");

		if (!JSUtil.nil(rosterIds)) {
			if (this.log.atLevel(GSLog.DEBUG))
				this.log.debug("[getRosterMembersGr] rosterSysIds=" + rosterIds);
			gr.addQuery("roster", "IN", rosterIds);
		}

		if (!JSUtil.nil(userIds)) {
			if (this.log.atLevel(GSLog.DEBUG))
				this.log.debug("[getRosterMembersGr] userSysIds=" + userIds);
			gr.addQuery("member", "IN", userIds);
		}

		if (!JSUtil.nil(rotaIds)) {
			if (this.log.atLevel(GSLog.DEBUG))
				this.log.debug("[getRosterMembersGr] rotaIds=" + rotaIds);
			gr.addQuery("roster.rota", "IN", rotaIds);
		}

		if (!JSUtil.nil(groupIds)) {
			if (this.log.atLevel(GSLog.DEBUG))
				this.log.debug("[getRosterMembersGr] groupIds=" + groupIds);
			gr.addQuery("roster.rota.group", "IN", groupIds);
		}

		gr.addQuery("roster.active", "true");
		gr.orderBy("roster.order");
		gr.orderBy("order");
		gr.query();
		
		if (this.log.atLevel(GSLog.DEBUG))
			this.log.debug("[getRosterMembersGr] encodedQuery=" + gr.getEncodedQuery());

		if (this.log.atLevel(GSLog.DEBUG))
			this.timer.stop("[getRosterMembersGr]");
		return gr;
	},

	_buildMember: function(rotaId, memberGr, canWrite) {
		if (this.log.atLevel(GSLog.DEBUG)) {
			this.log.debug("[_buildMember] rotaId=" + rotaId + " memberGr.sys_id=" + memberGr.sys_id);
			this.timer.start("[_buildMember]");
		}

		var rosterId = memberGr.roster + "";
		var rosterName = memberGr.roster.name + "";

		if (this.log.atLevel(GSLog.DEBUG))
			this.log.debug("[_buildMember] rosterId: " + rosterId);

		var memberId = memberGr.member + "";
		var memberName = memberGr.member.name + "";
		var memberEmail = memberGr.member.email + "";
		var memberPhone = memberGr.member.mobile_phone + "";
		var memberActive = memberGr.member.active;
	
		if (JSUtil.nil(memberPhone))
			memberPhone = memberGr.member.phone + "";

		var groupId = memberGr.roster.rota.group + '';
		
		// Get the member's rotation schedule and remove this user's time off
		var memberSchedule = new GlideSchedule(memberGr.rotation_schedule + "");
		if (this.getExcludeTimeOff())
			this._excludeTimeOff(memberSchedule, memberGr.member, groupId);

		this._excludeCoverage(memberSchedule, rosterId);

		// Get the user's name
		var name;
		var userGr = new GlideRecord('sys_user');
		userGr.setWorkflow(false);	// inactive users are not visible to non-admins
		if (userGr.get(memberId)) {
			name = userGr.name + " (" + memberGr.roster.name + ")";
			if(!memberName)
				memberName = userGr.name;
		}
		else
			name = " (" + memberGr.roster.name + ")";

		var eventBgColor = this._getEventBgColor(rotaId, "roster");

		if (this.log.atLevel(GSLog.DEBUG))
			this.log.debug("[_buildMember] name: " + name + " eventBgColor:" + eventBgColor);

		var item = this.getSchedulePage().addScheduleObject(memberSchedule, name, eventBgColor, true);
		if (!JSUtil.nil(rotaId))
			item.setRotaId(rotaId);
		if (!JSUtil.nil(rosterId))
			item.setRosterId(rosterId);
		if (!JSUtil.nil(rosterName))
			item.setRosterName(rosterName);
		if (!JSUtil.nil(memberId))
			item.setUserId(memberId);
		if (!JSUtil.nil(memberName))
			item.setUserName(memberName);
		if (!JSUtil.nil(memberEmail))
			item.setUserEmail(memberEmail);
		if (!JSUtil.nil(memberPhone))
			item.setUserContactNumber(memberPhone);
		if (!JSUtil.nil(memberActive))
			item.setUserActive(memberActive);
		if (!JSUtil.nil(memberGr)) {
			item.setSysId(memberGr.getUniqueValue());
			item.setTable(memberGr.getTableName());
			item.setGroupId(this._getMemberGroups(memberGr.member));
		}
		item.setOrder(memberGr.roster.order + "");
		item.setEditable(canWrite);
		item.setDescription(gs.getMessage("On-call rotation"));
		item.setType("roster");
		
		if (this.log.atLevel(GSLog.DEBUG)) {
			this.log.debug("[_buildMember] item: " + item);
			this.timer.stop("[_buildMember]");
		}

	},

	_excludeTimeOff: function(memberSchedule, userID, groupId) {
		if (this.log.atLevel(GSLog.DEBUG))
			this.timer.start("[_excludeTimeOff]");
		var gr = new GlideRecord("sys_user");
		gr.setWorkflow(false);	// inactive users are not visible to non-admins
		
		// Get groups encoded query
		var groupEncQuery = "groupISEMPTY";
		if (groupId)
			groupEncQuery += "^ORgroup.sys_id=" + groupId;
		
		if (gr.get(userID)) {
			var scheduleID = gr.schedule;
			if (scheduleID) {
				var grSpan = this._getRosterScheduleSpan(this._getDateLimitedEncQuery("schedule=" + scheduleID + "^type=" + "time_off" + "^" + groupEncQuery));
				if (this.log.atLevel(GSLog.DEBUG)) {
					this.log.debug("[excludeTimeOff] encQuery: " + grSpan.getEncodedQuery());
					this.log.debug("[excludeTimeOff] getRowCount: " + grSpan.getRowCount());
				}

				// Exclude this schedule span according to its own time-zone so that repeats and repeat-until is factored correctly
				while (grSpan.next())
					memberSchedule.excludeTimeSpan(grSpan, (grSpan.schedule ? grSpan.schedule.time_zone + "" : ""));
			}
		}
		if (this.log.atLevel(GSLog.DEBUG))
			this.timer.stop("[_excludeTimeOff]");
	},

	_excludeCoverage: function(schedule, rosterSysId) {
		if (this.log.atLevel(GSLog.DEBUG))
			this.timer.start("[_excludeCoverage]");
		if (!rosterSysId.isNil()) {
			var gr = this._getRosterScheduleSpan(this._getDateLimitedEncQuery("roster=" + rosterSysId + "^type=" + "on_call" + "^" + this._getGroupLimitedEncQuery()));
			if (this.log.atLevel(GSLog.DEBUG)) {
				this.log.debug("[_excludeCoverage] getRowCount: " + gr.getRowCount());
				this.timer.start("[schedule.addTimeSpansExcluded]");
			}

			// Exclude this schedule span according to its own time-zone so that repeats and repeat-until is factored correctly
			while (gr.next())
				schedule.excludeTimeSpan(gr, (gr.schedule ? gr.schedule.time_zone + "" : ""));
			if (this.log.atLevel(GSLog.DEBUG))
				this.timer.stop("[schedule.addTimeSpansExcluded]");
		}
		
		if (this.legacySpanSuport)
			this._legacyRosterScheduleSpans(schedule, this.getGroupIds());

		if (this.log.atLevel(GSLog.DEBUG))
			this.timer.stop("[_excludeCoverage]");
	},

	// Backwards compatible search (i.e. non-roster_schedule_span entries)
	_legacyRosterScheduleSpans: function(schedule, groupSysIds) {
		if (this.log.atLevel(GSLog.DEBUG))
			this.timer.start("[_legacyRosterScheduleSpans]");

		var gr = new GlideRecord("cmn_schedule_span");
		gr.addQuery("group", "IN", groupSysIds);
		gr.addQuery("type", "on_call");
		gr.addQuery("sys_class_name", "!=", "roster_schedule_span");
		gr.addQuery("schedule.type", "!=", "roster");
		gr.query();
		schedule.addTimeSpansExcluded(gr);

		if (this.log.atLevel(GSLog.DEBUG))
			this.timer.stop("[_legacyRosterScheduleSpans]");
	},

	_getMembersInfo: function(rotaId, userIds) {
		if (this.log.atLevel(GSLog.DEBUG))
			this.timer.start("[_getMembersInfo]");
		
		//Get users from group
		var groupMemberGr = new GlideRecord("sys_user_grmember");
		groupMemberGr.setWorkflow(false);
		groupMemberGr.addQuery("group", "IN", this.getGroupIds() + "");
		groupMemberGr.query();
		while (groupMemberGr.next()) {
			if (!this.arrayUtils.contains(userIds, groupMemberGr.getValue("user")))
				userIds.push(groupMemberGr.getValue("user"));
		}

		// Get member info for all users of the groups + members of rota (userIds)
		if (!JSUtil.nil(userIds)) {
			var gr = new GlideRecord("sys_user");
			// inactive users are not visible to non-admins
			gr.setWorkflow(false);
			gr.addQuery("sys_id", "IN", userIds.join(","));
			gr.query();

			if (this.log.atLevel(GSLog.DEBUG))
				this.log.debug("[_getMembersInfo] encoded query: " + gr.getEncodedQuery());

			while (gr.next()) {
				if (this.log.atLevel(GSLog.DEBUG))
					this.log.debug("[_getMembersInfo] checking schedule for user name=" + gr.name);
				if (gr.schedule != '') {
					if (this.log.atLevel(GSLog.DEBUG))
						this.log.debug("[_getMembersInfo] found schedule for user");
					this._getMemberInfo(gr, rotaId);
				}
			}
		}

		if (this.log.atLevel(GSLog.DEBUG))
			this.timer.stop("[_getMembersInfo]");
	},
	
	_getMemberInfo: function(userGr, rotaId) {
		if (this.log.atLevel(GSLog.DEBUG))
			this.timer.start("[_getMemberInfo]");
		this._timeOffScheduleSpan(userGr, rotaId);
		this._timeOffInApprovalScheduleSpan(userGr, rotaId);
		this._overrideScheduleSpan(userGr);
		if (this.log.atLevel(GSLog.DEBUG))
			this.timer.stop("[_getMemberInfo]");
	},

	_overrideScheduleSpan: function(userGr) {
		if (this.log.atLevel(GSLog.DEBUG))
			this.timer.start("[_overrideScheduleSpan]");
		var userName = userGr.name + "";
		var scheduleSysId = userGr.schedule + "";
		var overrideColor = this.getSchedulePage().getColor(2);
		var gr = this._getScheduleSpanWithoutUserFilter(scheduleSysId, "on_call");
		if (this.log.atLevel(GSLog.DEBUG))
			this.log.debug("[_overrideScheduleSpan] gr row count: " + gr.getRowCount());
		while (gr.next())
			this._buildUserSpan(gr, this._getCoverageName(userName, gr.sys_class_name, gr.sys_id), overrideColor, gr.roster.rota + "", userGr, "override");
		if (this.log.atLevel(GSLog.DEBUG))
			this.timer.stop("[_overrideScheduleSpan]");
	},

	_timeOffScheduleSpan: function(userGr, rotaId) {
		if (this.log.atLevel(GSLog.DEBUG))
			this.timer.start("[_timeOffScheduleSpan]");
		this._buildTimeOffScheduleSpan(userGr, rotaId, "time_off", this.getSchedulePage().getColor(1), gs.getMessage("Time off"), "timeoff", false);
		if (this.log.atLevel(GSLog.DEBUG))
			this.timer.stop("[_timeOffScheduleSpan]");
	},

	_timeOffInApprovalScheduleSpan: function(userGr, rotaId) {
		if (this.log.atLevel(GSLog.DEBUG))
			this.timer.start("[_timeOffInApprovalScheduleSpan]");
		this._buildTimeOffScheduleSpan(userGr, rotaId, "time_off_in_approval", "transparent", gs.getMessage("Time off - In approval"), "time_off_in_approval", true);
		if (this.log.atLevel(GSLog.DEBUG))
			this.timer.stop("[_timeOffInApprovalScheduleSpan]");
	},

	_buildTimeOffScheduleSpan: function(userGr, rotaId, type, color, message, field, checkApproval) {
		if (this.log.atLevel(GSLog.DEBUG))
			this.timer.start("[_buildTimeOffScheduleSpan]");
		if (this.log.atLevel(GSLog.DEBUG)) {
			this.log.debug("[_buildTimeOffScheduleSpan] rotaId: " + rotaId);
			this.log.debug("[_buildTimeOffScheduleSpan] type: " + type);
			this.log.debug("[_buildTimeOffScheduleSpan] color: " + color);
			this.log.debug("[_buildTimeOffScheduleSpan] message: " + message);
			this.log.debug("[_buildTimeOffScheduleSpan] field: " + field);
			this.log.debug("[_buildTimeOffScheduleSpan] checkApproval: " + checkApproval);
		}
		var userName = userGr.name + "";
		if (this.log.atLevel(GSLog.DEBUG))
			this.log.debug("[_buildTimeOffScheduleSpan] userName: " + userName);
		var scheduleSysId = userGr.schedule + "";
		var gr = this._getScheduleSpan(scheduleSysId, type);
		while (gr.next())
			if (!checkApproval || (checkApproval && new OnCallSecurityNG().isTimeOffInApprovalSpanViewable(gr)))
				this._buildUserSpan(gr, gs.getMessage("{0} ({1})", [userName, message]), color, rotaId, userGr, field);
		if (this.log.atLevel(GSLog.DEBUG))
			this.timer.stop("[_buildTimeOffScheduleSpan]");
	},
	
	/*
	* Replica method of _getScheduleSpan, not considering the "user" filter as it already filters the record by user's schedule ID
	*/
	_getScheduleSpanWithoutUserFilter: function(scheduleSysId, type) {
		if (this.log.atLevel(GSLog.DEBUG))
			this.timer.start("[_getScheduleSpanWithoutUserFilter]");
		var gr = this._getRosterScheduleSpan(this._getDateLimitedEncQuery("schedule=" + scheduleSysId + "^type=" + type + "^" + this._getGroupLimitedEncQuery()));
		if (this.log.atLevel(GSLog.DEBUG)) {
			this.log.debug("[_getScheduleSpan] row count: " + gr.getRowCount());
			this.timer.stop("[_getScheduleSpan]");
		}
		return gr;
	},

	_getScheduleSpan: function(scheduleSysId, type) {
		if (this.log.atLevel(GSLog.DEBUG))
			this.timer.start("[_getScheduleSpan]");
		var userLimitedQuery = "";
		if (this.getUserIds() && this.getUserIds().length && this.getUserIds().length > 0)
			userLimitedQuery = "^" + this._getUserLimitedEncQuery();
		var gr = this._getRosterScheduleSpan(this._getDateLimitedEncQuery("schedule=" + scheduleSysId + "^type=" + type + "^" + this._getGroupLimitedEncQuery() + userLimitedQuery));
		if (this.log.atLevel(GSLog.DEBUG)) {
			this.log.debug("[_getScheduleSpan] row count: " + gr.getRowCount());
			this.timer.stop("[_getScheduleSpan]");
		}
		return gr;
	},

	_getRosterScheduleSpan: function(encQuery) {
		if (this.log.atLevel(GSLog.DEBUG))
			this.log.debug("[_getRosterScheduleSpan] encQuery: " + encQuery);
		var gr = new GlideRecord("roster_schedule_span");
		gr.addEncodedQuery(encQuery);
		gr.setWorkflow(false);
		gr.query();
		return gr;
	},

	_getDateLimitedEncQuery: function(limitedBy) {
		var and = "^";
		var or = "^NQ";
		var startDateTime = this._formatDateStr(this.getStartDate().getUTCValue());
		var endDateTime = this._formatDateStr(this.getEndDate().getUTCValue());
		
		var startInEndIn = limitedBy + and + "start_date_time>=" + startDateTime + and + "end_date_time<=" + endDateTime;
		var startOutEndIn = limitedBy + and + "start_date_time<=" + startDateTime + and + "end_date_time>=" + startDateTime + and + "end_date_time<=" + endDateTime;
		var startInEndOut = limitedBy + and + "start_date_time>=" + startDateTime + and + "start_date_time<=" + endDateTime + and + "end_date_time>=" + endDateTime;
		var startOutEndOut = limitedBy + and + "start_date_time<=" + startDateTime + and + "end_date_time>=" + endDateTime;
		var repeatNotNull = limitedBy + and + "repeat_type!=null" + and + "repeat_until=00000000^ORrepeat_until=null^ORrepeat_until>=" + startDateTime.split("T")[0];
		var encQuery = startInEndIn + or + startOutEndIn + or + startInEndOut + or + startOutEndOut + or + repeatNotNull;
		if (this.log.atLevel(GSLog.DEBUG))
			this.log.debug("[_getDateLimitedEncQuery] encQuery: " + encQuery);
		return encQuery;
	},

	_getGroupLimitedEncQuery: function() {
		var encQuery = "groupISEMPTY";
		// Support legacy span records that do not have group values, hence null is queried
		if (!JSUtil.nil(this.getGroupIds()) && this.getGroupIds().length > 0)
			encQuery += "^ORgroup.sys_idIN" + this.getGroupIds();
		if (this.log.atLevel(GSLog.DEBUG))
			this.log.debug("[_getGroupLimitedEncQuery] encQuery: " + encQuery);
		return encQuery;
	},

	_getUserLimitedEncQuery: function() {
		var encQuery = "";
		// Support legacy span records that do not have group values, hence null is queried
		if (this.getUserIds() && this.getUserIds().length && this.getUserIds().length > 0)
			encQuery += "user.sys_idIN" + this.getUserIds();
		if (this.log.atLevel(GSLog.DEBUG))
			this.log.debug("[_getUserLimitedEncQuery] encQuery: " + encQuery);
		return encQuery;
	},

	/*
	 * Input: yyyy-MM-dd hh:mm:ss
	 * Output: yyyyMMddThhmmssZ
	 * e.g 
	 * 2016-08-02 00:00:00
	 * 20160802T000000Z
	 */
	_formatDateStr: function(strDate) {
		strDate = strDate + "";
		strDate = strDate.replace(/\s+/g, "T");
		strDate = strDate.replace(/\-/g, "");
		strDate = strDate.replace(/\:/g, "");
		strDate += "Z";
		return strDate;
	},

	_getCoverageName: function(userName, tableName, rosterScheduleSpanId) {
		if (this.log.atLevel(GSLog.DEBUG))
			this.timer.start("[_getCoverageName]");
		var coverageName = gs.getMessage("{0} (Coverage)", [userName]);

		// see if we have a reference to a roster in there	
		if (tableName == 'roster_schedule_span') {
			var gr = new GlideRecord("roster_schedule_span");
			gr.addQuery("sys_id", rosterScheduleSpanId);
			gr.query();
			if (gr.next() && gr.roster.name != "")
				coverageName = gs.getMessage("{0} ({1} Coverage)", [userName, gr.roster.name + ""]);
		}
		if (this.log.atLevel(GSLog.DEBUG)) {
			this.log.debug("[_getCoverageName] coverageName: " + coverageName);
			this.timer.stop("[_getCoverageName]");
		}	
		return coverageName;
	},

	_getMemberGroups: function(userSysId) {
		if (this.log.atLevel(GSLog.DEBUG))
			this.timer.start("[_getMemberGroups]");

		var groupSysIds = {};
		var gr = new GlideRecord("sys_user_grmember");
		gr.addActiveQuery();
		gr.addQuery("user", userSysId);
		gr.query();
		while(gr.next())
			groupSysIds[gr.group + ''] = gr.group + '';

		var result = [];
		for(var key in groupSysIds)
			result.push(key);

		if (this.log.atLevel(GSLog.DEBUG))
			this.timer.stop("[_getMemberGroups]");
		return result.join(",");
	},

	_buildUserSpan: function(gr, altName, color, rotaId, userGr, type) {
		if (this.log.atLevel(GSLog.DEBUG)) {
			this.log.debug("[_buildUserSpan] altName: " + altName + ", rotaId: " + rotaId);
			this.timer.start("[_buildUserSpan]");
		}
		var memberId = userGr.sys_id + "";
		var memberName = userGr.name + "";
		var memberEmail = userGr.email + "";
		var memberPhone = userGr.mobile_phone + "";
		if (JSUtil.nil(memberPhone))
			memberPhone = userGr.phone + "";
		if (this.log.atLevel(GSLog.DEBUG))
			this.timer.start("[_buildUserSpan.addScheduleSpan]");
		var timeZone = this.getTimezone();
		var spanTimeZone = gr.schedule.time_zone + "";
		if (!JSUtil.nil(spanTimeZone))
			timeZone = spanTimeZone;
		var item = this.getSchedulePage().getPage().addScheduleSpan(gr, timeZone, "", color);
		if (this.log.atLevel(GSLog.DEBUG))
			this.timer.stop("[_buildUserSpan.addScheduleSpan]");
		if (!JSUtil.nil(rotaId))
			item.setRotaId(rotaId);
		if (!JSUtil.nil(memberId))
			item.setUserId(memberId);
		if (!JSUtil.nil(memberName))
			item.setUserName(memberName);
		if (!JSUtil.nil(memberEmail))
			item.setUserEmail(memberEmail);
		if (!JSUtil.nil(memberPhone))
			item.setUserContactNumber(memberPhone);
		if (!JSUtil.nil(type))
			item.setType(type);
		item.setName(altName);
		item.setDescription("");
		// An override is linked to a roster, ensure same order is applied
		if (gr.roster + "" && gr.roster.order + "")
			item.setOrder(parseInt(gr.roster.order + "", 10));
		else
			item.setOrder(999999);
		if (type == 'override') {
			item.setRosterId(gr.roster.sys_id + "");
			item.setRosterName(gr.roster.name + "");
		}
		if (this.log.atLevel(GSLog.DEBUG))
			this.timer.stop("[_buildUserSpan]");
	},
	
	_getEventBgColor: function(rotaId, type) {
		if (this.log.atLevel(GSLog.DEBUG))
			this.timer.start("[_getEventBgColor]");

		var eventBgColor;
		if (this.getSchedulePage().getPage().isLegacy())
			eventBgColor = type == "rota" ? this.getSchedulePage().getColor(rotaId) : this.getSchedulePage().darkenColor(this.getSchedulePage().getColor(rotaId));
		else {
			if (type === "rota") {
				var rotaPalleteDarkColor = new OCCalendarUtils().getPalleteDarkColors(this.getSchedulePage().getColor(rotaId));
				eventBgColor = (rotaPalleteDarkColor) ? rotaPalleteDarkColor : this.getSchedulePage().darkenColor(this.getSchedulePage().getColor(rotaId));
			}
			else
				eventBgColor = this.getSchedulePage().getColor(rotaId);
		}

		if (this.log.atLevel(GSLog.DEBUG))
			this.timer.stop("[_getEventBgColor]");

		return eventBgColor;
    },

    saveCatchAllToRotationItems: function() {
        if (this.log.atLevel(GSLog.DEBUG))
            this.timer.start("[saveCatchAllToRotationItems]");

        var ocr = new OnCallRotation();
        var catchAllType;
        var catchAllSysID;
        var gr = new GlideRecord("v_rotation");
        var ga = new GlideAggregate("v_rotation");
        ga.groupBy("group");
        ga.groupBy("start_date_time");
        ga.groupBy("end_date_time");
        ga.groupBy("rota");
        ga.query();
        while (ga.next()) {
            catchAllType = ocr.getCatchAllType(ga.rota.toString());
            catchAllSysID = ocr.getCatchAll(ga.rota.toString());
            gr.initialize();
            gr.current_user_id = gs.userID();
            gr.group = ga.group;
            gr.type = catchAllType;
            gr.rota = ga.rota;
            gr.start_date_time = ga.start_date_time;
            gr.end_date_time = ga.end_date_time;

            if (catchAllType == "all") {
                var rotaMember = new GlideRecord("cmn_rota_member");
                rotaMember.addQuery("roster", catchAllSysID);
                rotaMember.query();
                while (rotaMember.next()) {
                    gr.user = rotaMember.member;
                    gr.roster = catchAllSysID;
                    gr.insert();
                }
            } else if (catchAllType) {
                var user = new GlideRecord("sys_user");
                user.get(catchAllSysID);
                gr.roster = "";
                gr.user = user.sys_id;
                gr.insert();
            }
        }
		if (this.log.atLevel(GSLog.DEBUG))
			this.timer.stop("[saveCatchAllToRotationItems]");
    },

    saveRotationItems: function(items, startGdt, endGdt) {
		if (this.log.atLevel(GSLog.DEBUG))
			this.timer.start("[saveRotationItems]");

        var gr = new GlideRecord("v_rotation");
        for (var i = 0; i < items.size(); i++) {
            var item = items.get(i);
            var type = item.getDataByKey("type") + "";

            if (type == "roster")
                continue;

            var spans = item.getTimeSpans();
            for (var j = 0; j < spans.size(); j++) {
                var span = spans.get(j);
                gr.initialize();
                gr.current_user_id = gs.userID();
                gr.group = item.getDataByKey("group");
                gr.type = type;
                gr.roster = item.getDataByKey("roster");
                gr.rota = item.getDataByKey("rota");
                gr.user = item.getDataByKey("user");

                // Make sure date range falls within the report range
                var sdt = span.getStart().getGlideDateTime();
                var edt = span.getEnd().getGlideDateTime();

                if (sdt.compareTo(startGdt) < 0)
                    sdt = startGdt;

                if (edt.compareTo(endGdt) > 0)
                    edt = endGdt;

                if (edt.compareTo(sdt) < 0)
                    continue;

                gr.start_date_time = sdt.getDisplayValue() + "";
                gr.end_date_time = edt.getDisplayValue() + "";
                gr.insert();
            }
        }
        this.saveCatchAllToRotationItems();
		if (this.log.atLevel(GSLog.DEBUG))
			this.timer.stop("[saveRotationItems]");
    },

    formattedReportUrl: function(start_date, end_date, groups) {
        if (this.log.atLevel(GSLog.DEBUG)) {
            this.log.debug("[formattedReportUrl] start_date: " + start_date + ", end_date: " + end_date + ", groups: " + groups);
            this.timer.start("[formattedReportUrl]");
        }

        groups = (!JSUtil.nil(groups)) ? groups : "";
        var redirect = 'schedule_formatted_report.do?sysparm_start_date=' + start_date + '&sysparm_end_date=' + end_date;

        if (!JSUtil.nil(groups)) {
            var glist = this._getGroupArr(groups);

            if (glist.length > 199) {
                glist = glist.slice(0, 199);
                this.log.debug("[formattedReportUrl] groups exceed 200 truncating to first 200");
            }

            if (glist.length > 0 && !JSUtil.nil(glist.join(",")))
                redirect += "&sysparm_groups=" + glist.join(",");
        }

        if (this.log.atLevel(GSLog.DEBUG)) {
            this.log.debug("[formattedReportUrl] redirect: " + redirect);
            this.log.debug("[formattedReportUrl] redirect length: " + redirect.length);
            this.timer.stop("[formattedReportUrl]");
        }
        return redirect;
    },

    _getGroupArr: function(groups) {
        if (JSUtil.nil(groups))
            return [];
        var glist = groups.split(",");
        var index = glist.indexOf("--");
        if (index > -1)
            glist.splice(index, 1);
        return glist;
    },

    v_rotation_handling: function(start_date, end_date) {
        // groups is global variable and this part is for legacy support
        this.vRotationHandling(start_date, end_date, groups);
    },

    vRotationHandling: function(start_date, end_date, groups) {
        if (this.log.atLevel(GSLog.DEBUG)) {
            this.log.debug("[vRotationHandling] start_date: " + start_date + ", end_date: " + end_date);
            this.timer.start("[vRotationHandling]");
        }

        groups = (!JSUtil.nil(groups)) ? groups : "";

        // set the date range to be from now to the end of next month
        if (!start_date)
            start_date = gs.now();

        var start_gdt = new GlideDateTime();
        start_gdt.setDisplayValue(start_date);

        if (!end_date)
            end_date = gs.now();

        var end_gdt = new GlideDateTime();
        end_gdt.setDisplayValue(end_date);
        end_gdt.addSeconds(86399);

        var tz = gs.getSession().getTimeZoneName();
        var start = new GlideScheduleDateTime(start_gdt);
        var end = new GlideScheduleDateTime(end_gdt);
        start.setTimeZone(tz);
        end.setTimeZone(tz);
        var page = new GlideAJAXSchedulePage(start, end, tz);

        var ocrCalculator = new OnCallRotationCalculator();
        ocrCalculator.setPage(page);
        ocrCalculator.activeRostersOnly = true;
        var glist = this._getGroupArr(groups);
        for (var i = 0; i < glist.length; i++)
        	if (!JSUtil.nil(glist[i]))
	            ocrCalculator.run(glist[i]);
        ocrCalculator.removeRotation();
        this.saveRotationItems(ocrCalculator.page.getItems(), start_gdt, end_gdt);

        gs.addInfoMessage(gs.getMessage("On-call Rotation Schedule for {0} to {1}",[start_date, end_date]));

        var redirect = "v_rotation_list.do?sysparm_query=^ORDERBYstart_date_time";

        if (this.log.atLevel(GSLog.DEBUG)) {
            this.log.debug("[vRotationHandling] redirect: " + redirect);
            this.log.debug("[vRotationHandling] redirect length: " + redirect.length);
			this.timer.stop("[vRotationHandling]");
		}
        return redirect;
    },

	_formQueryPerFetchPreference: function (gr) {
		var stateField = "";
		var activeField = "";
		var table = gr.getRecordClassName();
		switch (table) {
			case "cmn_rota":
				stateField = "state";
				activeField = "active";
				break;
			case "cmn_rota_roster":
				stateField = "rota.state";
				activeField = "rota.active";
				break;
			case "cmn_rota_member":
				stateField = "roster.rota.state";
				activeField = "roster.rota.active";
				break;
		}

		if (this.getSpanFetchPreference() == this.SPAN_FETCH_PREFERENCE.ALL) {
			var qc = gr.addQuery = gr.addQuery(activeField, true);
			var qcOR = qc.addOrCondition(activeField, false);
			qcOR.addCondition(stateField, this.SHIFT_STATE.DRAFT);
		} else if (this.getSpanFetchPreference() == this.SPAN_FETCH_PREFERENCE.DRAFT_ONLY) {
			gr.addQuery(stateField, this.SHIFT_STATE.DRAFT);
			gr.addQuery(activeField, false);
		} else
			gr.addQuery(activeField, true);

		return gr;
	},

	_getRotaIdsFromRotas: function(rotaIds, groupIds) {
		if (this.log.atLevel(GSLog.DEBUG))
			this.timer.start("[_getRotaIdsFromRotas]");

		var rotaGr = new GlideRecord("cmn_rota");
		if (!JSUtil.nil(rotaIds))
			rotaGr.addQuery("sys_id", "IN", rotaIds);
		if (!JSUtil.nil(groupIds))
			rotaGr.addQuery("group", "IN", groupIds);
		this._formQueryPerFetchPreference(rotaGr);
		rotaGr.query();

		var rotaIdsArr = [];
		while (rotaGr.next())
			rotaIdsArr.push(rotaGr.sys_id + "");

		if (this.log.atLevel(GSLog.DEBUG))
			this.timer.stop("[_getRotaIdsFromRotas]");

		return rotaIdsArr.join(",");
	},
	
	_getRotaIdsFromRosters: function(rosterIds, rotaIds, groupIds) {
		if (this.log.atLevel(GSLog.DEBUG))
			this.timer.start("[_getRotaIdsFromRosters]");

		var rosterGr = new GlideRecord("cmn_rota_roster");
		rosterGr.addQuery("sys_id", "IN", rosterIds);
		if (!JSUtil.nil(rotaIds))
			rosterGr.addQuery("rota", "IN", rotaIds);
		if (!JSUtil.nil(groupIds))
			rosterGr.addQuery("rota.group", "IN", groupIds);
		rosterGr.addQuery("active", "true");
		this._formQueryPerFetchPreference(rosterGr);
		rosterGr.query();

		var rotaIdsArr = [];
		while (rosterGr.next())
			rotaIdsArr.push(rosterGr.rota + "");

		if (this.log.atLevel(GSLog.DEBUG))
			this.timer.stop("[_getRotaIdsFromRosters]");

		return rotaIdsArr.join(",");
	},

	_getRotaIdsFromMembers: function (userIds, rosterIds, rotaIds, groupIds) {
		if (this.log.atLevel(GSLog.DEBUG))
			this.timer.start("[_getRotaIdsFromMembers]");

		var memberGr = new GlideRecord("cmn_rota_member");
		memberGr.addQuery("member", "IN", userIds);
		if (!JSUtil.nil(rosterIds))
			memberGr.addQuery("roster", "IN", rosterIds);
		if (!JSUtil.nil(rotaIds))
			memberGr.addQuery("roster.rota", "IN", rotaIds);
		if (!JSUtil.nil(groupIds))
			memberGr.addQuery("roster.rota.group", "IN", groupIds);
		this._formQueryPerFetchPreference(memberGr);
		memberGr.addQuery("roster.active", "true");
		memberGr.query();

		var rotaIdsArr = [];
		while (memberGr.next())
			rotaIdsArr.push(memberGr.roster.rota + "");

		if (this.log.atLevel(GSLog.DEBUG))
			this.timer.stop("[_getRotaIdsFromMembers]");

		return rotaIdsArr.join(",");
	},
	
    _isLegacy: function() {
        return true;
    },

	type: 'OCRotation'
};
```