---
title: "OnCallRotationCalculator"
id: "oncallrotationcalculator"
---

API Name: global.OnCallRotationCalculator

```js
// Build the rotation for a group and date range
// Results are stored in the AJAXSchedulePage's AJAXScheduleItem items - we reuse the existing
//    AJAXSchedulePage support that creates and tracks AJAXScheduleItem's making it appropriate
//      for our purpose here to create the rotation information in the same way that we do for the
//    Group Roster schedule page.
//
// Building the rotations takes into account:
//    roster schedule
//    member on-call rotation schedule
//    on-call overrides
//    member time off
//
// You can control what is saved as AJAXScheduleItem's using the following flags:
//    includeTimeOff    - include time off entries for group members if true (default = false)
//    includeCoverage   - include coverage entries for group members if true (default = true)
//    activeRotasOnly   - only include active rotas (default = true)
//    activeRostersOnly - only include active rosters (default = true)
//
// Usage:
//    gs.include("OnCallRotationCalculator");
//    var rotation = new OnCallRotationCalculator();
//    rotation.setPage(/*AJAXSchedulePage*/ page);
//    rotation.limitRotaId(rotaId);     // Optional: limit to a specific Rota
//    rotation.limitRosterId(rosterId); // Optional: limit to a specific Roster
//    rotation.run(groupId);
//    var items = rotation.getItems();
//    ... do something with the items ...
//

gs.include("PrototypeServer");
var OnCallRotationCalculator = Class.create();
OnCallRotationCalculator.prototype = {
    initialize: function() {
		this.log = new GSLog("com.snc.on_call_rotation.log.level", this.type());
		this.occ = new OnCallCommon();
        this.includeTimeOff = false;   // never include user's time_off entries in their own on-call reminders and notifications
        this.includeCoverage = true;
        this.activeRostersOnly = true; // only remind and notify on active Rosters
        this.activeRotasOnly = true;   // only remind and notify on active Rotas
        // this.rotaId;   // limit to this specific Rota
        // this.rosterId; // limit to this specific Roster
    },

    /**
     * The ajaxSchedulePage provides the methods used to create the AJAXScheduleItem
     * items that contain the rotation information we are computing.  Use getItems()
     * to get the List of items that were created after run() was called
     */
    setPage: function(/* AJAXSchedulePage */ ajaxSchedulePage) {
        this.page = ajaxSchedulePage;
    },

	run: function(groupId) {
        this.log.debug("OnCallRotationCalculator.run(" + groupId +") with limit roster=" + this.rosterId);
		if (this.page) {
			var start = this.page.getStart();
			var end = this.page.getEnd();
			if (start && end) {
				this.startDate = start.getGlideDateTime().getValue().split(" ")[0];
				this.endDate = end.getGlideDateTime().getValue().split(" ")[0];
			}
		}
        this.groupId = groupId;
        this.removeRotation();
        if (this.onCallMembers())
            this.rosterMembersInfo();
    },

    // Sometimes we only want to see a report for a single roster (like when we're doing reminders).
    // Call this before calling "run".
    limitRosterId: function(rosterId) {
        this.rosterId = rosterId;
    },

    // Sometimes we only want to see a report for a single rota (like when we're doing reminders).
    // Call this before calling "run".
    limitRotaId: function(rotaId) {
        this.rotaId = rotaId;
    },

    removeRotation: function() {
        var gr = new GlideRecord('v_rotation');
        gr.initialize();
        gr.addQuery('current_user_id', gs.userID());
        gr.deleteMultiple();
    },

    createSchedule: function(scheduleId) {
        scheduleId = scheduleId + "";
        this.log.debug("[createSchedule] scheduleId=" + scheduleId);
        if (JSUtil.nil(scheduleId)) {
            this.log.error("[createSchedule] failed return GlideSchedule for scheduleId=" + scheduleId);
            return null;
        }
        return new GlideSchedule(scheduleId);
    },

	onCallMembers: function() {
		this.log.debug("[onCallMembers] start date = " + this.page.getStart().getDisplayValue() + ", end date = " + this.page.getEnd().getDisplayValue());
        var rotaGR = new GlideRecord("cmn_rota");
        if (this.groupId)
            rotaGR.addQuery("group", this.groupId);
        if (this.rotaId)
            rotaGR.addQuery("sys_id", this.rotaId);
        if (this.activeRotasOnly)
            rotaGR.addActiveQuery();
        rotaGR.query();
		var hasRotation = false;
        while (rotaGR.next()) {
			hasRotation = true;
            // NB. this means 'manually populated' rotas don't get processed
            var rosterGR = new GlideRecord("cmn_rota_roster");
            rosterGR.addQuery("rota", rotaGR.sys_id);
            if (this.activeRostersOnly) {
                rosterGR.addActiveQuery();
            }
            if (this.rosterId)
                rosterGR.addQuery("sys_id", this.rosterId);
            rosterGR.orderBy("order");
            rosterGR.query();
            while (rosterGR.next()) {
                var items = this.page.addSchedule(rotaGR.schedule, this.page.getColor(rosterGR.sys_id), '');
				this.log.debug("[onCallMembers] roster found = " + rosterGR.getDisplayValue() + ", size = " + items.size());
                for (var i = 0; i < items.size(); i++) {
                    var item = items.get(i); // item is com.glide.schedules.AJAXScheduleItem
					this.log.debug("[buildData] looping items: " + item);
                    item.addData("group", rotaGR.group.sys_id + "");
                    item.addData("type", "roster");
                    item.addData("roster", rosterGR.sys_id  + "");
                    item.addData("rota", rotaGR.sys_id  + "");
                }

                // Get the roster members schedules
                this.rosterMembers(rotaGR.sys_id, rosterGR.sys_id, rosterGR.order);
            }
        }
		return hasRotation;
    },

	rosterMembers: function(rotaId, rosterId, rosterOrder) {
        var gr = new GlideRecord("cmn_rota_member");
        gr.initialize();
        gr.addQuery("roster", rosterId);
        gr.query();
        while (gr.next()) {
            this.onCallMember(rotaId, rosterId, gr, rosterOrder);
        }
    },

    onCallMember: function(rotaId, rosterId, memberGR, rosterOrder) {
        // Get the member's rotation schedule and remove this user's time off and any coverage periods
        var memberSched = this.createSchedule(memberGR.rotation_schedule);
        if (!memberSched)
            return;
        this.excludeTimeOff(memberSched, memberGR.member);
        this.excludeCoverage(memberSched, rosterId);
        var item = this.page.addScheduleObject(memberSched, '', this.page.darkenColor(this.page.getColor(rosterId)), /*ignoreEmpty*/true);
        item.addData("group", this.groupId);
        item.addData("type", "rotation");
        item.addData("roster", rosterId);
        item.addData("rota", rotaId);
        item.addData("user", memberGR.member);
        item.addData("roster_order", rosterOrder);
    },

    excludeTimeOff: function(sched, userId) {
        var gr = new GlideRecord("sys_user");
        if (gr.get(userId)) {
            var scheduleId = gr.schedule;
            if (scheduleId) {
                gr = new GlideRecord("cmn_schedule_span");
                var query = "schedule=" + scheduleId + "^group=" + this.groupId + "^ORgroupISEMPTY^type=time_off";
                gr.addEncodedQuery(query);
				this._applyDateLimitedQuery(gr);
                gr.query();
                sched.addTimeSpansExcluded(gr);
            }
        }
    },

    excludeCoverage: function(sched, rosterID) {
        var gr = new GlideRecord("roster_schedule_span");
        gr.addQuery("group", this.groupId);
        gr.addQuery("type", "on_call");
        gr.addNullQuery("roster"); // search for "all" Coverage first (backwards compat checks)
		this._applyDateLimitedQuery(gr);
        gr.query();
        sched.addTimeSpansExcluded(gr);
        if (!rosterID.isNil()) {
            gr.initialize();
            gr.addQuery("group", this.groupId);
            gr.addQuery("type", "on_call");
            gr.addQuery("roster", rosterID);
			this._applyDateLimitedQuery(gr);
            gr.query();
            sched.addTimeSpansExcluded(gr);
        }
        // now the backwards compatible search (i.e. non-roster_schedule_span entries)
        var gro = new GlideRecord("cmn_schedule_span");
        gro.addQuery("group", this.groupId);
        gro.addQuery("type", "on_call");
        gro.addQuery("sys_class_name", "!=", "roster_schedule_span");
		this._applyDateLimitedQuery(gro);
        gro.query();
        sched.addTimeSpansExcluded(gro);
    },

	rosterMembersInfo: function() {
        if (!this.includeTimeOff && !this.includeCoverage)
            return;
		
        var gr = new GlideRecord("sys_user");
		var qc = gr.addJoinQuery("sys_user_grmember", "sys_id", "user");
		qc.addCondition("group", "IN", this.groupId+"");
		var userIds = this._getGroupRotaMemberIds(this.groupId).join(",");
		if (!JSUtil.nil(userIds))
			gr.addEncodedQuery("^NQsys_idIN" + userIds); // union operator
        gr.query();
        while (gr.next()) {
            if (gr.schedule != '') {
                this.log.debug("[rosterMembersInfo] this.memberInfo(" + gr.name +" [" + gr.sys_id + "])");
                this.memberInfo(gr);
            }
        }
    },

    memberInfo: function(userGR) {
		if (this.log.atLevel(GSLog.DEBUG))
			this.log.debug("[memberInfo] User sys_id=" +  userGR.sys_id);

        var timeOffColor = this.page.getColor(1);
        var coverageColor = this.page.getColor(2);
        var gr = new GlideRecord('cmn_schedule_span');
        var tz = userGR.schedule.time_zone + '';

        // time off entries
        // (NB. it never makes sense to include time_off entries in a user's on-call notifications)
        // TODO: left in, for purposes of later code-merge and refactoring with cmn_schedule_page:Group rosters
        if (this.includeTimeOff) {
            gr.addQuery("schedule", userGR.schedule);
            gr.addQuery("type", "time_off");
			this._applyDateLimitedQuery(gr);
            gr.query();
            while (gr.next()) {
                var item = this.page.addScheduleSpan(gr, tz, '', timeOffColor);
                item.addData("group", this.groupId);
                item.addData("type", "time_off");
                item.addData("user", userGR.sys_id);
            }
        }

        // coverage entries
        if (this.includeCoverage) {
            var scheduleList = [];
            var rotaList = [];
            var rotaSchedule;
            if (this.rosterId) {
				if (this.log.atLevel(GSLog.DEBUG))
					this.log.debug("[memberInfo] adding schedules for specific roster=" + this.rosterId);

                // load the schedule for specific roster's rota, in order to work out if coverage covers this rota (and therefore this roster)
                // (NB. this only works as long as rota schedules can't overlap)
                var tRosterGR = new GlideRecord('cmn_rota_roster');
                if (tRosterGR.get(this.rosterId) && (this.activeRostersOnly && tRosterGR.active)
                        && (this.activeRostersOnly && tRosterGR.rota.active)) {
					if (this.log.atLevel(GSLog.DEBUG))
						this.log.debug("memberInfo: adding schedule=" + tRosterGR.rota.schedule.name + " for rota=" + tRosterGR.rota.name + " roster=" + tRosterGR.name + " [" + this.rosterId + "]");
                    rotaSchedule = this.createSchedule(tRosterGR.rota.schedule);
                    if (rotaSchedule)
                        scheduleList.push(rotaSchedule);
                    rotaList.push(tRosterGR.rota.sys_id);
                }
            }
            else {
				if (this.log.atLevel(GSLog.DEBUG))
					this.log.debug("[memberInfo] adding schedules for all group="+this.groupId);

                // Not every rota has a roster, but every rota will have a schedule of some sort (even a manually populated one)
                var tRotaGR = new GlideRecord('cmn_rota');
                if (this.activeRotasOnly)
                    tRotaGR.addActiveQuery();
                tRotaGR.addQuery('group', this.groupId);
                if (this.rotaId)
                    tRotaGR.addQuery("sys_id", this.rotaId);
                tRotaGR.query();
                while (tRotaGR.next()) {
                    if (this.log.atLevel(GSLog.DEBUG))
						this.log.debug("[memberInfo] adding schedule=" + tRotaGR.schedule.name + " for rota=" + tRotaGR.name);
                    rotaSchedule = this.createSchedule(tRotaGR.schedule);
                    if (rotaSchedule)
                        scheduleList.push(rotaSchedule);
                    rotaList.push(tRotaGR.sys_id);
                }
            }

            gr.initialize(); // cmn_schedule_span
            gr.addQuery("schedule", userGR.schedule);
            gr.addQuery("group", this.groupId);
            gr.addQuery("type", "on_call");
			this._applyDateLimitedQuery(gr);
            gr.query();
            while (gr.next()) {
                for (var i = 0; i < scheduleList.length; i++) {
                    var coverageMatches = false;
                    // if this coverage period is linked to our target roster, then include it
                    // else, if this coverage period isn't linked to any roster but it covers our target rota/roster's schedule, then include it
                    // (in theory, on_call_add_item should have ensured that coverage periods are either attached to a roster or
                    //  aligned with entries manually defined and directly attached to a rota's schedule)
                    var overlaps = scheduleList[i].overlapsWith(gr, tz);
                    var grrRoster = "";
                    var grrRosterRota = "";
                    if (gr.sys_class_name == 'roster_schedule_span') {
                        var grr = new GlideRecord("roster_schedule_span");
                        if (grr.get(gr.sys_id)) {
                            if (this.log.atLevel(GSLog.DEBUG))
								this.log.debug("[memberInfo] [" + grr.roster.isNil() + "] grr.roster.name=\"" + grr.roster.name + "\"");
                            if ((!grr.roster.isNil() && this.rosterId && grr.roster.sys_id == this.rosterId)
                                    || (grr.roster.isNil() && overlaps.isEmpty() == false ))
                                coverageMatches = true;
                            if (!grr.roster.isNil()) {
                                if (this.rotaId && this.rotaId != grr.roster.rota)
                                    continue;
                                grrRoster = grr.roster.sys_id;
                                grrRosterRota = grr.roster.rota;
                            }
                        }
                    }
                    if (overlaps.isEmpty() == false)
                        // an empty roster value (old type), but it overlaps with this rota's schedule
                        coverageMatches = true;

                    if (coverageMatches) {
                        var spanItem = this.page.addScheduleSpan(gr, tz, '', coverageColor);
                        if (this.log.atLevel(GSLog.DEBUG)) {
							overlaps.dumpTimeMapTZ();
							this.log.debug("memberInfo: overlaps with group=" + this.groupId + ", user=" + userGR.sys_id + ", rota=" + rotaList[i] + ", roster=" + grrRoster);
                        }
                        spanItem.addData("group", this.groupId);
                        spanItem.addData("type", "coverage");
                        spanItem.addData("user", userGR.sys_id);
                        if (grrRosterRota !== "")
                            spanItem.addData("rota", grrRosterRota);
                        else
                            spanItem.addData("rota", rotaList[i]);
                        if (grrRoster != "")
                            spanItem.addData("roster", grrRoster);
                    }
                }
            }
        }
    },

    /**
     *
     * Combine a list of ScheduleDateTimeSpan into a consolidated list of ScheduleDateTimeSpan if the times can be combined.
     * This assumes that the spans in the list appear in the order by start time.  Note that differences of one second are
     * forgiven.
     *
     * For example, these two spans:
     *       2008-03-17 00:00:00 - 2008-03-17 23:59:59
     *       2008-03-18 00:00:00 - 2008-03-18 23:59:59
     * Will be combined into a single span:
     *       2008-03-17 00:00:00 - 2008-03-18 23:59:59
     */
    combineSpans: function(spans) {
        var newSpans = [];
        if (spans.length == 0)
            return newSpans;
        var priorSpan = spans[0];
        for (var i=1; i<spans.length; i++) {
            var thisSpan = spans[i];
            var adjacentTo = priorSpan.adjacentTo(thisSpan);
            if (adjacentTo == 1) { // prior span starts immediately prior to this span?
                if (priorSpan.getEnd().compareTo(thisSpan.getEnd()) == -1) // this time has a later end time so use it
                    priorSpan.setEnd(thisSpan.getEnd());
            } else {
                newSpans.push(priorSpan);
                priorSpan = thisSpan;
            }
        }
        newSpans.push(priorSpan);
        return newSpans;
    },

	_applyDateLimitedQuery: function(gr) {
		if (!this.startDate || !this.endDate)
			return;

		var encodedQuery = this.occ.getDateLimitedEncQuery(gr.getEncodedQuery(), this.startDate, this.endDate);
		gr.initialize();
		gr.addEncodedQuery(encodedQuery);

		if (this.log.atLevel(GSLog.DEBUG))
			this.log.debug("[_applyDateLimitedQuery] table: " + gr.getTableName() + " encodedQuery: " + encodedQuery);
	},

	/*
     * Get a comma seperated list of user IDs who are part of the specified group's rotas
     */
    _getGroupRotaMemberIds: function(groupId) {
        var ocr = new OCRotation();
        var memberGr = ocr.getRosterMembersGr(null, null, null, groupId);

        var userIds = {};
        while (memberGr.next())
            userIds[memberGr.member+""] = true;

        var userIdsArr = [];
        for (var userId in userIds)
            userIdsArr.push(userId);

        return userIdsArr;
    },

    type: function() {
        return 'OnCallRotationCalculator';
    }
};

```