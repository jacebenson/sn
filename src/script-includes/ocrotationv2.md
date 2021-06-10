---
title: "OCRotationV2"
id: "ocrotationv2"
---

API Name: global.OCRotationV2

```js
var OCRotationV2 = Class.create();
OCRotationV2.formatters = {'fullcalendar' : OCFullCalendarFormatter, 'dhtmlx' : OCDHTMLXCalendarFormatter};
OCRotationV2.DEFAULT_FORMAT_OPTION = 'DEFAULT_FORMAT_OPTION';
OCRotationV2.prototype = Object.extendsObject(OCRotation, {
	initialize: function(schedulePage, formatter) {
		OCRotation.prototype.initialize.call(this, schedulePage);
		this.changeRotaColors = new ChangeRotaColors();
		if (formatter != OCRotationV2.DEFAULT_FORMAT_OPTION) {
			this.formatter = formatter;
			if (this.formatter == null || this.formatter == undefined)
				this.formatter = new OCFullCalendarFormatter();
		}
		this.onCallRotation = new global.OnCallRotation();
	},

	/* Get the a schedules time spans between two dates and filtered by groups,
	 * rotas, rosters and users.
	 *
	 * @return An array of spans which have the following attributes:
	 *		   id, sys_id, table, rota_id, roster_id, user_id, text, description,
	 *         color, textColor, start_date, end_date
	 *
	 * Examples:
	 * (1) Get all spans for the default time period
	 * var spans = new OCRotationV2()
	 *   .getSpans();
	 *
	 * (2) Get all spans between 1st April 2014 and 5th June 2014
	 * var spans = new OCRotationV2()
	 *   .setStartDate("2014-04-01")
	 *   .setEndDate("2014-06-05")
	 *   .getSpans();
	 *
	 * (3) Get the Network group's spans for the default time period
	 * var spans = new OCRotationV2()
	 *   .setGroupIds("287ebd7da9fe198100f92cc8d1d2154e")
	 *   .getSpans();
	 *
	 * (4) Get ITIL User's spans between 1st January 2014 and 31st January
	 * 2014
	 * var spans = new OCRotationV2()
	 *   .setStartDate("2014-01-01")
	 *   .setEndDate("2014-01-31")
	 *   .setUserIds("681b365ec0a80164000fb0b05854a0cd")
	 *   .getSpans();
	 *
	 * (5) Get grouped spans. Nests spans under the rota 'parent'.
	 * This allows child spans to be derived from the rota_parent object.
	 * - rota_parent
	 *   - primary
	 *   - secondary
	 *   - tertiary override
	 *
	 * // Group spans by providing group as an argument.
	 * var formatter = new OCDHTMLXCalendarFormatter("group");
	 * var spans = new OCRotationV2()
	 *   .setStartDate("2014-01-01")
	 *   .setEndDate("2014-01-31")
	 *   .setUserIds("681b365ec0a80164000fb0b05854a0cd")
	 *   .getSpans();
	 *
	 *
	 */
	getSpans: function() {
		if (this.log.atLevel(GSLog.DEBUG))
			this.timer.start("[getSpans]");

		if (this.isDirty())
			this.buildRotas();

		var items = this.getSchedulePage().getPage().getItems();
		this.log.debug("[getSpans] items.length=" + items.size());

		var events = [];
		for (var i = 0; i < items.size(); i++)
			events = events.concat(this._buildSpans(items.get(i)));

		if (this.formatter && this.formatter.groupEvents)
			events = this.formatter.getGroupedEvents();

		if (this.log.atLevel(GSLog.DEBUG))
			this.timer.stop("[getSpans]");
		return events;
	},

	getItems: function() {
		if (this.log.atLevel(GSLog.DEBUG))
			this.timer.start("[getItems]");

		if (this.isDirty())
			this.buildRotas();

        if (this.log.atLevel(GSLog.DEBUG))
			this.timer.stop("[getItems]");
		return this.getSchedulePage().getPage().getItems();
	},

	/* Get an array of groups which have active Rotas (cmn_rota records)
	 *
	 * @return [Array]: An array of group objects which each contain three keys, 'sys_id', 'name' and 'editable'
	 *         of the sys_user_group record. Editable is true if the logged in user has rights to modify rotas
	 *         for the group.
	 *
	 * Example: Print all the groups and their attributes
	 *
	 * var groups = new OCRotationV2().getGroups();
	 * groups.forEach(function(group, index) {
	 *     gs.log("sys_id = " + group.sys_id + ", editable = " + group.editable + ", name: " + group.name, index);
	 * });
	 *
	 */
	_buildPinnedGroups: function(groupData) {
		var userPreference = gs.getUser().getPreference("com.snc.on_call_rotation.landing_page.pinned_groups") + '';
		if (userPreference)
			groupData.pinnedGroupsSysIds = userPreference.split(",");

		if (groupData.pinnedGroupsSysIds[0] === "" || groupData.pinnedGroupsSysIds[0] === null || groupData.pinnedGroupsSysIds[0] === 'null')
			groupData.pinnedGroupsSysIds = [];

		// Get groups that users have prioritised via their user preference
		if (groupData.offset < groupData.pinnedGroupsSysIds.length) {
			groupData.encodedQuery += OCRotationV2.AND + "groupIN" + groupData.pinnedGroupsSysIds;

			if (this.log.atLevel(GSLog.DEBUG))
				this.log.debug("[_buildPinnedGroups] build pinned request data");

			groupData = this._buildGroupData(groupData);
			
			if (this.log.atLevel(GSLog.DEBUG))
				this.log.debug("[_buildPinnedGroups] " + " pinnedGroupsLength: " + groupData.pinnedGroupsSysIds.length + " pinnedGroups: " + groupData.pinnedGroupsSysIds.join(","));
		}
	},
	
    _getGroupIdsWithUserNameContains: function (textSearch) {
		var todayDate = new GlideDateTime().getDate().getValue(); // returns internal formatted date
		var memberGr = new GlideRecord("cmn_rota_member");
		memberGr.addQuery("member.active", "=", true);
		memberGr.addQuery("member.name", "CONTAINS", textSearch);
		memberGr.addEncodedQuery("from=NULL^ORfrom<=" + todayDate);
		memberGr.addEncodedQuery("to=NULL^ORto>=" + todayDate);
		memberGr.query();
		var rosterIds = {};
		var rotaIds = {};
		var groupIds = {};
		var memberIds = [];
		while (memberGr.next())
			if (memberGr.roster &&
				memberGr.roster.rota &&
				memberGr.roster.rota.group + "") {
				rosterIds[memberGr.roster + ""] = true;
				rotaIds[memberGr.roster.rota + ""] = true;
				groupIds[memberGr.roster.rota.group + ""] = true;
				memberIds.push(memberGr.sys_id + "");
			}

		var filteredGroupIds = [];

		if (Object.keys(rosterIds).length) {
			var who = this.onCallRotation.whoIsOnCall(Object.keys(groupIds).join(","), Object.keys(rotaIds).join(","), Object.keys(rosterIds).join(","));
			if (who.length)
				memberIds.forEach(function (memberId) {
					var i;
					for (i = 0; i < who.length; i++)
						if (who[i].memberId === memberId)
							filteredGroupIds.push(who[i].group);
				});
		}

		return filteredGroupIds;
	},
	
	_buildSearchGroups: function(groupData, textSearch, excludeGroupSysIds, textSearchType) {
		textSearch = textSearch || "";
		excludeGroupSysIds = excludeGroupSysIds || "";

		if (textSearch)
			if (JSUtil.nil(textSearchType) || textSearchType == OCRotationV2.textSearchTypes.GROUP_SCHEDULE) { // Default
				groupData.encodedQuery += OCRotationV2.AND + "group.nameLIKE" + textSearch;
				groupData.encodedQuery +=  OCRotationV2.AND + "OR" + "nameLIKE" + textSearch;
			} else if (textSearchType == OCRotationV2.textSearchTypes.USER) {
				var groupIds = this._getGroupIdsWithUserNameContains(textSearch);
				if (groupIds.length)
					groupData.encodedQuery += OCRotationV2.AND + "group.sys_idIN" + groupIds.join(",");
			}
		if (excludeGroupSysIds)
			groupData.encodedQuery += OCRotationV2.AND + "group.sys_idNOT IN" + excludeGroupSysIds;
		
		groupData = this._buildGroupData(groupData);
	},
	
	_buildBelongGroups: function(groupData) {
		var userMemberGr = new GlideRecord('sys_user_grmember');
		userMemberGr.addQuery('user', gs.getUserID());
		userMemberGr.addQuery('group.active', 'true');
		userMemberGr.addEncodedQuery('JOINsys_user_grmember.group=cmn_rota.group!active=true');
		userMemberGr.query();
		while(userMemberGr.next()) {
			if (groupData.belongGroupsSysIds.indexOf(userMemberGr.group + '') == -1 && groupData.pinnedGroupsSysIds.indexOf(userMemberGr.group + '') == -1)
				groupData.belongGroupsSysIds.push(userMemberGr.group + '');
		}

		var managerGroupGr = new GlideRecord('sys_user_group');
		managerGroupGr.addQuery('manager', gs.getUserID());
		managerGroupGr.addActiveQuery();
		managerGroupGr.addEncodedQuery('JOINsys_user_group.sys_id=cmn_rota.group!active=true');
		managerGroupGr.query();
		while(managerGroupGr.next()) {
			if (groupData.belongGroupsSysIds.indexOf(managerGroupGr.sys_id + '') == -1 && groupData.pinnedGroupsSysIds.indexOf(managerGroupGr.sys_id + '') == -1)
				groupData.belongGroupsSysIds.push(managerGroupGr.sys_id + '');
		}
		// Get groups that users belong to or the groups he manages
		if (groupData.offset < groupData.belongGroupsSysIds.length) {
			groupData.encodedQuery += OCRotationV2.AND + "groupIN" + groupData.belongGroupsSysIds;

			if (this.log.atLevel(GSLog.DEBUG))
				this.log.debug("[_buildBelongGroups] build user belong request data");

			groupData = this._buildGroupData(groupData);
			
			if (this.log.atLevel(GSLog.DEBUG))
				this.log.debug("[getGroups]" + " belongGroupsLength: " + groupData.belongGroupsSysIds.length + " belongGroups: " + groupData.belongGroupsSysIds.join(","));
		}
	},
	
	getGroups: function(groupLimit, offset, filter, textSearch, excludeGroupSysIds, textSearchType) {
		if (this.log.atLevel(GSLog.DEBUG))
			this.timer.start("[getGroups]");

		if (!groupLimit && !offset)
			return this._getGroups();
		if (!filter)
			filter = 'all';

		var groupData = {};
		groupData.result = [];
		groupData.preventDuplicateGroups = {};
		groupData.groupCounter = 0;
		groupData.offsetCounter = 0;
		groupData.encodedQuery = "active=true" + OCRotationV2.AND + "group.active=true";
		groupData.pinnedGroupsSysIds = [];
		groupData.belongGroupsSysIds = [];
		groupData.priorityGroupsSysIds = [];
		groupData.searchGroupsSysIds = [];

		if (groupLimit)
			groupData.groupLimit = parseInt(groupLimit);

		if (!groupData.groupLimit || isNaN(groupData.groupLimit))
			groupData.groupLimit = parseInt(gs.getProperty("com.snc.on_call_rotation.landing_page.group_limit", "20"));

		if (offset)
			groupData.offset = parseInt(offset);

		if (!groupData.offset || isNaN(groupData.offset))
			groupData.offset = 0;

		var requestLimit = groupData.offset + groupData.groupLimit;
		if (filter == 'pinned') {
			this._buildPinnedGroups(groupData);
		}
		else if (filter == 'manage_belong') {
			this._buildBelongGroups(groupData);
		}
		else if (filter == 'all') {
			if (this.log.atLevel(GSLog.DEBUG))
					this.log.debug("[getGroups] build all group request data");
			
			//Get pinned groups
			this._buildPinnedGroups(groupData);
			//get belong groups
			if (groupData.groupCounter < groupData.groupLimit && requestLimit > groupData.pinnedGroupsSysIds.length) {
				
				groupData.offset = groupData.offset - groupData.pinnedGroupsSysIds.length;
				groupData.offset = groupData.offset < 0 ? 0 : groupData.offset;
				groupData.encodedQuery = "active=true" + OCRotationV2.AND + "group.active=true";
				this._buildBelongGroups(groupData);
			}
			
			var priorityGroupsLength = groupData.pinnedGroupsSysIds.length + groupData.belongGroupsSysIds.length;
			groupData.priorityGroupsSysIds = groupData.pinnedGroupsSysIds.concat(groupData.belongGroupsSysIds);
			// Get all other groups if the current request limit has not been exceeded
			if (groupData.groupCounter < groupData.groupLimit && requestLimit > priorityGroupsLength) {

				groupData.offset = groupData.offset - groupData.belongGroupsSysIds.length;
				groupData.offset = groupData.offset < 0 ? 0 : groupData.offset;

				groupData.encodedQuery = "active=true" + OCRotationV2.AND + "group.active=true";
				groupData = this._buildGroupData(this._removeGroups(0, requestLimit, groupData));
			}
		}

		else if (filter == 'search') {
			this._buildSearchGroups(groupData, textSearch, excludeGroupSysIds, textSearchType);
		}
		
		if (this.log.atLevel(GSLog.DEBUG))
			this.timer.stop("[getGroups]");

		return groupData.result;
	},
	
	_getGroups: function() {
	    if (this.log.atLevel(GSLog.DEBUG))
	        this.timer.start("[_getGroups]");
	
	    var groups = {};
	    var gr = new GlideRecord("cmn_rota");
	    gr.addActiveQuery();
	    gr.addQuery('group.active', true);
	    gr.orderBy('group.name');
	    gr.query();
	    while (gr.next()) {
	        var groupSysId = gr.getValue("group");
			if (groups[groupSysId])
				continue;
			
	        groups[groupSysId] = {
	            name: gr.group.getDisplayValue(),
	            editable: new OCCalendarUtils().canWriteByGroupSysId(groupSysId) + "",
	        };
	    }
		
		var groupsSysIds = Object.keys(groups);
		var groupSettingMap = new OCRosterSpanApprovalUtil().getPTOApprovalAndCoverageStatusByGroups(groupsSysIds);
	    var result = [];
	    for (var key in groups)
	        result.push({
	            sys_id: key + "",
	            id: key + "",
	            name: groups[key].name + "",
	            text: groups[key].name + "",
	            editable: groups[key].editable + "",
	            isApprovalRequired: groupSettingMap[key].isPTOAccessible + "",
	            isProposedCoverMandatory: groupSettingMap[key].isProposedCoverMandatory + ""
	        });
	
	    if (this.log.atLevel(GSLog.DEBUG))
	        this.timer.stop("[_getGroups]");
	
	    return result;
	},

	_buildGroupData: function(groupData) {
		if (this.log.atLevel(GSLog.DEBUG)) {
			this.timer.start("[_buildGroupData]");
			this.log.debug("[_buildGroupData] groupData: " + JSON.stringify(groupData));
		}

		var groupsSysIds = [];
		var encodedQuery = groupData.encodedQuery + OCRotationV2.AND + "ORDERBYgroup.name";

		if (this.log.atLevel(GSLog.DEBUG))
			this.log.debug("[_buildGroupData] encodedQuery: " + encodedQuery);

		var gr = new GlideRecord("cmn_rota");
		gr.addEncodedQuery(encodedQuery);
		gr.query();
		while (gr.next() && groupData.groupCounter < groupData.groupLimit) {
			var groupSysId = gr.getValue("group") + "";
			
			if (this.log.atLevel(GSLog.DEBUG))
				this.log.debug("[_buildGroupData] checking: " + groupSysId);

			// Ignore offset groups
			if (groupData.offsetCounter < groupData.offset) {

				if (this.log.atLevel(GSLog.DEBUG))
					this.log.debug("[_buildGroupData] offsetCounter: " + groupData.offsetCounter + " groupSysId: " + groupSysId);

				if (groupData.preventDuplicateGroups[groupSysId])
					continue;

				if (this.log.atLevel(GSLog.DEBUG))
					this.log.debug("[_buildGroupData] preventDuplicateGroups: " + groupSysId);

				groupData.preventDuplicateGroups[groupSysId] = true;
				groupData.offsetCounter++;
				continue;
			}

			if (groupData.preventDuplicateGroups[groupSysId])
				continue;

			if (this.log.atLevel(GSLog.DEBUG))
				this.log.debug("[_buildGroupData] adding: " + groupSysId);
			

			groupsSysIds.push(groupSysId);
			groupData.result.push({
			    sys_id: groupSysId,
			    id: groupSysId,
			    name: gr.group.getDisplayValue() + "",
			    text: gr.group.getDisplayValue() + "",
			    manager: gr.group.manager + "",
			    users: this._getGroupMembers(groupSysId),
			    editable: new OCCalendarUtils().canWriteByGroupSysId(groupSysId) + "",
			});

			groupData.preventDuplicateGroups[groupSysId] = true;
			groupData.groupCounter++;
		}

		var groupSettingMap = new OCRosterSpanApprovalUtil().getPTOApprovalAndCoverageStatusByGroups(groupsSysIds);
		
		for (var i = 0; i < groupData.result.length; i++) {
			var groupInfo = groupData.result[i];
			if (groupsSysIds.indexOf(groupInfo.sys_id) != -1) {
				var groupSetting = groupSettingMap[groupInfo.sys_id];
				groupInfo.isApprovalRequired = groupSetting.isPTOAccessible + "";
				groupInfo.isProposedCoverMandatory = groupSetting.isProposedCoverMandatory + "";
			}
		}
		
		if (this.log.atLevel(GSLog.DEBUG)) {
			this.timer.stop("[_buildGroupData]");
			this.log.debug("[_buildGroupData] groupData: " + JSON.stringify(groupData));
		}

		return groupData;
	},
	
	getIndividualGroupData: function(groupId) {
		var groupData = {};
		groupData.result = [];
		groupData.preventDuplicateGroups = {};
		groupData.groupCounter = 1;
		groupData.offset = 0;
		groupData.groupLimit = 2;
		groupData.offsetCounter = 1;
		groupData.encodedQuery = "active=true" + OCRotationV2.AND + "group.active=true" + OCRotationV2.AND + "group=" + groupId;
		groupData.pinnedGroupsSysIds = [];
		groupData.belongGroupsSysIds = [];
		groupData.priorityGroupsSysIds = [];
		groupData.searchGroupsSysIds = [];
		
		var groupInfo = this._buildGroupData(groupData);
		return groupInfo.result;
	},

	_removeGroups: function(start, end, groupData) {
		var groupSysIds = groupData.priorityGroupsSysIds.slice(start, end);
		if (groupSysIds.length < 1)
			return groupData;

		groupSysIds.forEach(function(groupSysId) {
			groupData.preventDuplicateGroups[groupSysId] = true;
		});
		groupData.encodedQuery += "^groupNOT IN" + groupSysIds.join(",");
		return groupData;
	},

	/* Get an array of active Rotas (cmn_rota) for a given Group ID (sys_user_group)
	 *
	 * @return [Array]: An array of rota objects which each contain three keys,
	 *				    'sys_id', 'name', and 'group_sys_id' of the cmn_rota record
	 *
	 * Example: Print all the rotas and their attributes for the Network group
	 *
	 * var rotas = new OCRotationV2().getRotasByGroup("287ebd7da9fe198100f92cc8d1d2154e");
	 * rotas.forEach(function(rota, index) {
	 *     gs.log("sys_id = " + rota.sys_id + ", name: " + rota.name, index);
	 * });
	 *
	 */
	getRotasByGroup: function(groupSysIds) {
		if (this.log.atLevel(GSLog.DEBUG))
			this.timer.start("[getRotasByGroup]");
		var rotas = [];
		if (JSUtil.nil(groupSysIds))
			return rotas;

		var gr = new GlideRecord('cmn_rota');
		gr.addQuery('group', 'IN', groupSysIds);
		gr.addActiveQuery();
		gr.query();
		while (gr.next())
			rotas.push({'name': gr.name + '',
						'sys_id': gr.sys_id + '',
						'group_sys_id': gr.group + ''});
		if (this.log.atLevel(GSLog.DEBUG))
			this.timer.stop("[getRotasByGroup]");
		return rotas;
	},

	/* Get an array of active Roster (cmn_rota_roster) for a given Rota ID (cmn_rota)
	 *
	 * @return [Array]: An array of rota objects which each contain three keys,
	 *				    'sys_id', 'name', and 'rota_sys_id' of the cmn_rota_roster record
	 *
	 * Example: Print all the rotas and their attributes for the Network group
	 *
	 * var rosters = new OCRotationV2().getRostersByRotas("3b192362eb601100fcfb858ad106fe45");
	 * rosters.forEach(function(roster, index) {
	 *     gs.log("sys_id = " + roster.sys_id + ", name: " + roster.name + ", rota_sys_id = " + roster.rota_sys_id, index);
	 * });
	 *
	 */
	getRostersByRotas: function(rotaSysIds) {
		if (this.log.atLevel(GSLog.DEBUG))
			this.timer.start("[getRostersByRotas]");
		var rosters = [];
		if (JSUtil.nil(rotaSysIds))
			return rosters;

		var gr = new GlideRecord('cmn_rota_roster');
		gr.addQuery('rota', 'IN', rotaSysIds);
		gr.addActiveQuery();
		gr.orderBy('order');
		gr.query();
		while (gr.next()) {
			rosters.push({
				name: gr.name + '',
				sys_id: gr.sys_id + '',
				rota_sys_id: gr.rota + '',
				roster_rota_name: gr.name + ' (' + gr.rota.name + ')',
				group_sys_id: gr.rota.group + ''
			});
		}
		if (this.log.atLevel(GSLog.DEBUG))
			this.timer.stop("[getRostersByRotas]");
		return rosters;
	},

	/* Data for the dhtmlx scheduler's timeline view.
	 *
	 * @return  An array of objects which contains two attributes.
	 * 'key' which is span's ID (cmn_scheudle_span or
	 * cmn_rota_member). 'label' the display value on the timeline view.
	 *
	 * Examples:
	 * (1) Get all sections for the default time period
	 *	    var spans = new OCRotationV2().getSections();
	 * (2) Get all sections between 1st April 2014 and 5th June 2014 for the Network group
	 *      var spans = new OCRotationV2()
	 *        .setStartDate("2014-04-01")
	 *        .setEndDate("2014-06-05")
	 *        .setGroupIds("287ebd7da9fe198100f92cc8d1d2154e")
	 *        .getSections();
	 */
	getSections: function() {
		if (this.log.atLevel(GSLog.DEBUG))
			this.timer.start("[getSections]");
		if (this.isDirty())
			this.buildRotas();

        var sections = {};
		var sectionsArr = [];
		var items = this.getSchedulePage().getPage().getItems();

		for (var i = 0; i < items.size(); i++) {
			var item = items.get(i);
			var scheduleSpanDefId = item.getSysId();
			if (!sections.hasOwnProperty(scheduleSpanDefId)) {
				sections[scheduleSpanDefId] = {key: scheduleSpanDefId, label: item.getName()};
				sectionsArr.push(sections[scheduleSpanDefId]);
			}
		}
		if (this.log.atLevel(GSLog.DEBUG))
			this.timer.stop("[getSections]");
		return sectionsArr;
	},

	_getGroupMembers: function(groupSysId) {
		var members = [];
		if (!groupSysId)
			return members;

		var gr = new GlideRecord("sys_user_grmember");
		gr.addQuery("group", groupSysId);
		gr.query();
		while (gr.next())
			members.push(gr.user + "");
		return members;
	},

    _getRotasGrBySysId: function(rotaSysIds) {
		var gr = new GlideRecord("cmn_rota");
		gr.addQuery("sys_id", "IN", rotaSysIds);
		gr.query();
		return gr;
	},

    _getRotasGrByGroup: function() {
		var rotaGr = new GlideRecord("cmn_rota");
		if (!JSUtil.nil(this.getGroupIds()))
			rotaGr.addQuery("group", "IN", this.getGroupIds());
		rotaGr.addActiveQuery();
		rotaGr.query();
		this.log.debug("[buildRotas] rota count = " + rotaGr.getRowCount());
		return rotaGr;
	},

	_buildSpans: function(item) {
		if (this.log.atLevel(GSLog.DEBUG))
			this.timer.start("[_buildSpans]");

		var spans = item.getTimeSpans();
		var result = [];
		this.log.debug("[buildSpans] spans.size()=" + spans.size());
		for (var i = 0; i < spans.size(); i++)
			result.push(this.formatEvent(item, spans.get(i)));

		if (this.log.atLevel(GSLog.DEBUG))
			this.timer.stop("[_buildSpans]");

		return result;
	},

	formatEvent: function (item, span) {
		var event = {
			title: item.getName() + "",
			color: item.getBackground() + "",
			textColor: this.changeRotaColors.getContrast(item.getBackground()) + "",
			start: span.getStart().getGlideDateTime().getDisplayValueInternal() + "",
			startNumeric: span.getStart().getGlideDateTime().getNumericValue() + "",
			end: span.getEnd().getGlideDateTime().getDisplayValueInternal() + "",
			endNumeric: span.getEnd().getGlideDateTime().getNumericValue() + "",
			sys_id: item.getSysId() + "",
			table: item.getTable() + "",
			rota_id: item.getRotaId() + "",
			roster_id: item.getRosterId() + "",
			roster_name: item.getRosterName() + "",
			user_id: item.getUserId() + "",
			user_name: item.getUserName() + "",
			user_email: item.getUserEmail() + "",
			user_contact_number: item.getUserContactNumber() + "",
			user_active: item.getUserActive(),
			group_id: item.getGroupId() + "",
			order: item.getOrder() + "",
			description: item.getDescription() + "",
			type: item.getType()
		};
		if (span.getActualStart())
			event.actual_start_date = span.getActualStart().getGlideDateTime().getDisplayValueInternal() + "";
		if (span.getActualEnd())
			event.actual_end_date = span.getActualEnd().getGlideDateTime().getDisplayValueInternal() + "";

		if (span.getOriginTimeSpan() && span.getOriginTimeSpan().getAllDay())
			event.all_day = span.getOriginTimeSpan().getAllDay();
		else
			event.all_day = false;
		if (!this.formatter)
			return event;
		return this.formatter.formatEvent(event);
	},

    _isLegacy: function() {
        return false;
    },

	type: 'OCRotationV2'
});

OCRotationV2.AND = "^";
OCRotationV2.textSearchTypes = {
	USER: 'user',
	GROUP_SCHEDULE: 'group_schedule'
};

```