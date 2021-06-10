---
title: "OCEscalationPathUtilSNC"
id: "ocescalationpathutilsnc"
---

API Name: global.OCEscalationPathUtilSNC

```js
var OCEscalationPathUtilSNC = Class.create();
OCEscalationPathUtilSNC.SUCCESS = "success";
OCEscalationPathUtilSNC.ERROR = "error";

OCEscalationPathUtilSNC.prototype = {
	initialize: function() {
        this.commonUtils = new OnCallCommon();
		this.rota_id = "";
		this.overallDelay = 0;
    },

    TABLES: {
        USER: "sys_user",
        GROUP: "sys_user_group",
        CMN_ROTA: "cmn_rota",
        CMN_ROTA_ROSTER: "cmn_rota_roster",
        CMN_ROTA_MEMBER: "cmn_rota_member",
        CMN_ROTA_ESC_STEP_DEF: "cmn_rota_esc_step_def",
        CMN_NOTIF_DEVICE: "cmn_notif_device",
        CMN_ROTA_ESCALATION_SET: 'cmn_rota_escalation_set'
    },
	
	ESCALATION_TYPE: {
		OUTGOING: 'start',
		INCOMING: 'end',
		ALL: 'all',
		DEFAULT: 'default'
	},

    _toJS: function(gr, requiredFields, skipACL) {
        return this.commonUtils.toJS(gr, requiredFields, skipACL);
    },
	
    _getEscalationStepUsers: function(userSysIds) {
        var userProfiles = [];
        if (userSysIds.length == 0)
            return userProfiles;

        for (var index = 0; index < userSysIds.length; index++) {
            var user = GlideUser.getUserByID(userSysIds[index]);
            if (!user || !user.getID())
                continue;

            var userProfileDetail = {
                user: {
                    sys_id: userSysIds[index],
                    avatar: user.getAvatar() || "",
                    initials: user.getInitials() || "",
                    name: user.getFullName() || "",
                    title: user.getTitle() || "",
                    email: user.getEmail() || "",
                    contact_number: user.getMobileNumber() || user.getBusinessNumber() || ""
                }
            };
            userProfiles.push(userProfileDetail);
        }
        return userProfiles;
    },
    
    _getNameInitials: function(name) {
		var splitName = name.split(" ");
		var initials = "";
		for(var index = 0; index < splitName.length && index < 2; index++)
			initials += splitName[index].charAt(0).toUpperCase();
		return initials;
	},

    _getEscalationStepGroups: function(escPlan) {
        var groups = escPlan.escalationGroups;
        var groupDetails = [];
        for (var index = 0; index < groups.length; index++) {
            var groupGr = new GlideRecord(this.TABLES.GROUP);
            if (!groupGr.get(groups[index]))
                continue;

            var aggregateMembers = new GlideAggregate("sys_user_grmember");
            aggregateMembers.addAggregate("COUNT");
            aggregateMembers.addQuery("group", groups[index]);
            aggregateMembers.addQuery("user.active", true);
            aggregateMembers.query();
            var members = 0;
            if (aggregateMembers.next())
                members = aggregateMembers.getAggregate("COUNT");
			
            var groupDetail = this._toJS(groupGr, ["name", "description"], false);
            groupDetail.initials = this._getNameInitials(groupGr.name + "");
            groupDetail.groupMembersCount = members;
            var manager;
            if (!JSUtil.nil(groupGr.manager))
                	manager = GlideUser.getUserByID(groupGr.manager + "");
            if (manager && manager.getID()) {
				groupDetail.manager = {
					avatar: manager.getAvatar() || "",
                    initials: manager.getInitials() || "",
                    name: manager.getFullName() || "",
                    title: manager.getTitle() || "",
				};
			}
            groupDetails.push(groupDetail);
        }
        return groupDetails;
    },

    _getEscalationStepDevices: function(escPlan) {
        var devices = escPlan.deviceIds;
		var deviceDetails = [];
		for (var index = 0; index < devices.length; index++) {
			var deviceGr = new GlideRecord(this.TABLES.CMN_NOTIF_DEVICE);
			if (!deviceGr.get(devices[index]))
				continue;
			var deviceDetail = this._toJS(deviceGr, ["name", "type", "phone_number", "email_address"], true);
			if (!deviceDetail)
				return [];
			deviceDetail.initials = this._getNameInitials(deviceGr.name + "");
			deviceDetails.push(deviceDetail);
		}
        return deviceDetails;
    },
    
    _getUniqueUserIds: function(userIds) {
		for(var i = 0; i < userIds.length; ++i) {
			for(var j = i + 1; j < userIds.length; ++j) {
				if(userIds[i] === userIds[j])
					userIds.splice(j--, 1);
			}
		}
		return userIds;	
	},
	
    _getEscalationLevelAudience: function(escPlan, userSysIds) {
        var audiences = {};
        userSysIds = this._getUniqueUserIds(userSysIds);
        audiences.userDetails = this._getEscalationStepUsers(userSysIds);
        audiences.groupDetails = this._getEscalationStepGroups(escPlan);
        audiences.deviceDetails = this._getEscalationStepDevices(escPlan);
		if ((audiences.userDetails.length + audiences.groupDetails.length + audiences.deviceDetails.length) > 0)
			return audiences;
		return;
    },
	
    _getDuration: function(totalDuration) {
        var gdtStart = new GlideDateTime();
        var gdtEnd = new GlideDateTime();
        gdtEnd.add(totalDuration);
        var duration = GlideDateTime.subtract(gdtStart, gdtEnd);
        return duration.getDisplayValue();
    },
	
	_getEscNotificationList: function(gapBetweenSteps, reminderDelay, reminderNum) {
	    var notifications = {};
		var overallTimeAtLevel = 0;
	    
	    notifications.repeats = [];
	    for (var index = 0; index < reminderNum; index++) {
		overallTimeAtLevel += reminderDelay;
	        var reminderMsg = gs.getMessage("Reminder {0} - {1}", [parseInt(index + 1) + "", this._getDuration(reminderDelay)]);
	        notifications.repeats.push({
	            reminder: reminderMsg,
	            seconds: reminderDelay / 1000
	        });
	    }

		overallTimeAtLevel += gapBetweenSteps;
		notifications.overallTime = gs.getMessage("{0} delay", this._getDuration(overallTimeAtLevel));
		notifications.overallTimeSec = overallTimeAtLevel / 1000;
		this.overallDelay += overallTimeAtLevel;
	    return {
	        data: notifications
	    };
	},

    _getRosterDetails: function(escPlan, isLastStep) {
        if (!escPlan.rosterId)
            return;
        var rosterGr = new GlideRecord(this.TABLES.CMN_ROTA_ROSTER);
        if (!rosterGr.get(escPlan.rosterId))
            return;

        var reminderDuration = rosterGr.time_between_reminders.getGlideObject();
        var reminderDelay = reminderDuration ? reminderDuration.getNumericValue() : 0;
        var rosterInfo = {
            data: {
                notifications: {}
            }
        };
		
		var rota = new OnCallRotation();
        var catchAllType = rota.getCatchAllType(escPlan.rotaId);
		var isCatchAllDefined = JSUtil.nil(catchAllType) ? false : true;
        
		var timeToNextStep;
		if (escPlan.timeToNextStep)
			timeToNextStep = escPlan.timeToNextStep.getNumericValue();
		var gapBetweenSteps = timeToNextStep ? timeToNextStep : reminderDelay;
		rosterInfo.data.timeToStart = this._getDuration(this.overallDelay);
        var escNotificationsList = this._getEscNotificationList(gapBetweenSteps, reminderDelay, escPlan.reminderNum);
        rosterInfo.data.name = rosterGr.getValue("name");
		if (isLastStep && !isCatchAllDefined) {
			rosterInfo.data.gapBetweenSteps = gs.getMessage("Escalation ends in {0}", this._getDuration(gapBetweenSteps));
			rosterInfo.data.gapBetweenStepsSec = gapBetweenSteps / 1000;
			rosterInfo.data.isLastStep = true;
		}
		else {
			rosterInfo.data.gapBetweenSteps = gs.getMessage("Escalate to next step after {0}", this._getDuration(gapBetweenSteps));
			rosterInfo.data.gapBetweenStepsSec = gapBetweenSteps / 1000;
		}
        rosterInfo.data.notifications = escNotificationsList.data;
        return rosterInfo;
    },

    _getCatchAllDetails: function(escPlan, level) {
        var rota = new OnCallRotation();
        var catchAllType = rota.getCatchAllType(escPlan.rotaId);
        var catchAllMembers = [];
        var member;
        if (JSUtil.nil(catchAllType))
			return;
		
        if (catchAllType == "all") {
            var catchAllRoster = rota.getCatchAll(escPlan.rotaId);
            member = new GlideRecord(this.TABLES.CMN_ROTA_MEMBER);
            member.query('roster', catchAllRoster);

            // iterate over members
            while (member.next()) {
                catchAllMembers.push(member.member + "");
            }
        } else {
            var catchAllIndividual = rota.getCatchAll(escPlan.rotaId);
            member = new GlideRecord(this.TABLES.USER);
            if (member.get(catchAllIndividual))
                catchAllMembers.push(catchAllIndividual);
        }
        var escAudiences = this._getEscalationLevelAudience(escPlan, catchAllMembers);
        if (typeof escAudiences == "undefined")
            return;

		var timeToStart = "";
		if (this.overallDelay != 0)
			timeToStart = gs.getMessage("{0}", this._getDuration(this.overallDelay));
        var rosterInfo = {
            data: {
				timeToStart: timeToStart,
			}            
        };

        rosterInfo.data.name = gs.getMessage("Catch All");
        rosterInfo.data.catch_all = true;
		
        return {
            data: {
                escAudiences: escAudiences,
                rosterDetails: rosterInfo.data,
                level: level
            }
        };
    },

    _getLevelByShiftDetails: function(escPlan, level, isLastStep) {
        var escAudiences = this._getEscalationLevelAudience(escPlan, [escPlan.userId]);
        if (typeof escAudiences == "undefined")
            return;

        var rosterDetails = this._getRosterDetails(escPlan, isLastStep);
        if (typeof rosterDetails == "undefined")
            return;
        return {
            data: {
                escAudiences: escAudiences,
                rosterDetails: rosterDetails.data,
                level: level
            }
        };
    },

    _getCustomEscalationDetails: function(escPlan, level, isLastStep) {
        var escAudiences = this._getEscalationLevelAudience(escPlan, escPlan.userIds);		
		var reminderDelay = 0;
		if (escPlan.timeBetweenReminders)
			reminderDelay = escPlan.timeBetweenReminders.getNumericValue();

        var escLevelInfo = {
            data: {
                notifications: {}
            }
        };
		
		var timeToNextStep;
		if (escPlan.timeToNextStep)
			timeToNextStep = escPlan.timeToNextStep.getNumericValue();
		var gapBetweenSteps = timeToNextStep ? timeToNextStep : 0;
		
		var escalationStepDefGr = new GlideRecord(this.TABLES.CMN_ROTA_ESC_STEP_DEF);
		if(!escalationStepDefGr.get(escPlan.cmnRotaEscStepDefId))
			return;
		
		escLevelInfo.data.timeToStart = this._getDuration(this.overallDelay);
		var escNotificationsList = this._getEscNotificationList(gapBetweenSteps, reminderDelay, escPlan.reminderNum);
		if(escNotificationsList && escNotificationsList.data) {
			escLevelInfo.data.notifications = escNotificationsList.data;
			escLevelInfo.data.name = escalationStepDefGr.name + "" || gs.getMessage("Custom Escalation");
			if (isLastStep) {
				escLevelInfo.data.gapBetweenSteps = gs.getMessage("Escalation ends in {0}", this._getDuration(gapBetweenSteps));
				escLevelInfo.data.gapBetweenStepsSec = gapBetweenSteps / 1000;
				escLevelInfo.data.isLastStep = true;
			}
			else {
				escLevelInfo.data.gapBetweenSteps = gs.getMessage("Escalate to next step after {0}", this._getDuration(gapBetweenSteps));
				escLevelInfo.data.gapBetweenStepsSec = gapBetweenSteps / 1000;
			}
			return {
				data: {
					escAudiences: escAudiences,
					rosterDetails: escLevelInfo.data,
					level: level
				}
			};
		}
        return;
    },
	
	_getEscalationOverlapRule: function(groupId) {
		var gr = new GlideRecord('on_call_group_preference');
		gr.addQuery('group', groupId);
		gr.addActiveQuery();
		gr.query();
		
		if (gr.next()) {
			var overlapRule = gr.escalation_rule_rota_overlap + '';
			if (overlapRule !== this.ESCALATION_TYPE.DEFAULT)
				return overlapRule;
		}
		
		return gs.getProperty('com.snc.on_call_rotation.escalation_rule_rota_overlap');
	},
	
	_getOverlappingRotas: function (groupId, rotaId, gdt) {
		var ocRotation = new OnCallRotation();
		var rotas = ocRotation.getOverlappingRotas(groupId, gdt);
		
		var that = this;
		var overlappingRotas = rotas.map(function (rota) {
			var rotaGr = new GlideRecord(that.TABLES.CMN_ROTA);
			if(rotaGr.get(rota.rotaSysId))
				rota.name = rotaGr.name + "";
			return rota;
		});
		
		overlappingRotas = this._sortRotasByDate(overlappingRotas);
		
		
		var counter = 0;
		if (overlappingRotas.length > 0) {
			var rota = overlappingRotas[counter];
			var startGdt = new GlideDateTime();
			var endGdt = new GlideDateTime();
			startGdt.setDisplayValueInternal(rota.start + '');
			endGdt.setDisplayValueInternal(rota.end + '');
			
			var currentTimeGdt = new GlideDateTime();
			if (currentTimeGdt.onOrAfter(startGdt) && currentTimeGdt.onOrBefore(endGdt)) {
				var overlapRule = this._getEscalationOverlapRule(groupId);
				if(overlapRule == this.ESCALATION_TYPE.INCOMING && !rotaId) {
					this.rota_id = overlappingRotas[overlappingRotas.length - 1].rotaSysId;
					return [];
				} else if(overlapRule == this.ESCALATION_TYPE.OUTGOING && !rotaId) {
					this.rota_id = overlappingRotas[0].rotaSysId;
					return [];
				} else if (overlapRule == this.ESCALATION_TYPE.ALL) {
					rotaId = !rotaId ? overlappingRotas[0].rotaSysId : rotaId;
					this.rota_id = rotaId;
					return overlappingRotas.filter(function(rota) {
						return rota.rotaSysId != rotaId;
					});
				} else return [];
			}
		}

		return [];
	},
	
	_getEndLevelDelay: function (escPlan) {
		var rota = new OnCallRotation();
		var catchAllType = rota.getCatchAllType(escPlan.rotaId);
		var timeToStart = "";
		if (JSUtil.nil(catchAllType) || !JSUtil.nil(escPlan.cmnRotaEscStepDefId))
			timeToStart = this._getDuration(this.overallDelay);
		return timeToStart;
	},

	_getOnCallEscalationDetails: function (groupId, rotaId, gdt, escalationSetSysId, taskTable, taskSysId) {
		var result = {};
		var level = 0;
		this.overallDelay = 0;
		result.data = [];
		result.escalationSet = {};

		var rota = new OnCallRotation();
		var escalationPlans;

		if (escalationSetSysId) {
			escalationPlans = rota.getEscalationPlanByEscalationSet(escalationSetSysId, groupId, rotaId, gdt);
		}
		else {
			var taskGr;
			if (taskTable && taskSysId) {
				taskGr = new GlideRecord(taskTable);
				if (!taskGr.get(taskSysId)) {
					taskGr = null;
				}
			}
			escalationPlans = rota.getEscalationPlan(groupId, gdt, rotaId, taskGr);
		}

		if (escalationPlans.length == 0) {
			result.type = OCEscalationPathUtilSNC.ERROR;
			result.msg = gs.getMessage("Escalation path is not defined");
			return result;
		}

		for (level; level < escalationPlans.length; level++) {
			var shiftDetails;
			var isLastStep = escalationPlans.length - 1 == level ? true : false;
			if (JSUtil.nil(escalationPlans[level].cmnRotaEscStepDefId))
				shiftDetails = this._getLevelByShiftDetails(escalationPlans[level], level + 1, isLastStep);
			else
				shiftDetails = this._getCustomEscalationDetails(escalationPlans[level], level + 1, isLastStep);

			if (typeof shiftDetails == "undefined")
				continue;
			result.data.push(shiftDetails.data);
		}
		if (JSUtil.nil(escalationPlans[0].cmnRotaEscStepDefId)) {
			var catchAllDetails = this._getCatchAllDetails(escalationPlans[0], level + 1);
			if (!JSUtil.nil(catchAllDetails))
				result.data.push(catchAllDetails.data);
		}

		var endLevelOverallDelay = this._getEndLevelDelay(escalationPlans[0]);
		this.overallDelay = endLevelOverallDelay;
		result.type = OCEscalationPathUtilSNC.SUCCESS;
		return result;
	},

    _getOnCallShiftDetails: function(groupId, rotaId, gdt, overlappingRotas) {
        var ocRotation = new OCRotationV2();
        var groupsData = ocRotation.getIndividualGroupData(groupId);
        var onCallRotation = new OnCallRotation();
		if (overlappingRotas)
			onCallRotation.simulateEscalationToAllRotas(true);
        var onCallMembersData = onCallRotation.processIndividualOCData(groupsData, gdt);
		if (!onCallMembersData || (onCallMembersData.onCallData && onCallMembersData.onCallData.length == 0))
			return [];
		return this._buildDataModel(onCallMembersData, "all", groupId, rotaId);
    },

    _buildDataModel: function(result, filter, groupId, rotaId) {
	    var groups = [];
	
	    if (!result || !result.onCallData)
	        return groups;
	
	    result.onCallData.forEach(function(onCallElem) {
	        if (onCallElem.group != groupId || onCallElem.rota != rotaId)
	            return;
	        if (onCallElem.group && !result.groups[onCallElem.group].rota)
	            result.groups[onCallElem.group].rota = result.rotas[onCallElem.rota];
	        else if (onCallElem.group && result.groups[onCallElem.group].rota && result.groups[onCallElem.group].rota.sys_id != onCallElem.rota) {
	            var cloneGroupData = JSON.parse(JSON.stringify(result.groups[onCallElem.group]));
	            cloneGroupData.rota = result.rotas[onCallElem.rota];
	            result.groups[onCallElem.group + "_" + onCallElem.rota] = cloneGroupData;
	        }
	
	        if (onCallElem.rota && !result.rotas[onCallElem.rota].rosters) {
	            result.rotas[onCallElem.rota].rosters = [];
	            result.rotas[onCallElem.rota].rosters.push(result.rosters[onCallElem.roster]);
	        } else if ((onCallElem.rota && onCallElem.roster) && result.rotas[onCallElem.rota].rosters.indexOf(result.rosters[onCallElem.roster]) === -1)
	            result.rotas[onCallElem.rota].rosters.push(result.rosters[onCallElem.roster]);
	
	        if (onCallElem.roster && !result.rosters[onCallElem.roster].member) {
	            result.rosters[onCallElem.roster].member = result.members[onCallElem.memberId];
	            result.rosters[onCallElem.roster].member.user = result.users[onCallElem.userId];
	        }
	    });
	
	    Object.keys(result.groups).forEach(function(outerKey) {
	        var group = result.groups[outerKey];
	        if (!group.rota) {
	            Object.keys(result.rotas).forEach(function(innerKey) {
	                if (!group.nextRota && result.rotas[innerKey].group === group.sys_id && result.rotas[innerKey].start)
	                    group.nextRota = result.rotas[innerKey];
	            });
	        }
	        group.id = outerKey;
	        group.filter = filter;
	        groups.push(group);
	    });
	
	    groups.sort(function(a, b) {
	        if (a.name < b.name)
	            return -1;
	        if (a.name > b.name)
	            return 1;
	        return 0;
	    });
	
	    return groups;
	},
	
	_getCurrentRotaInfo: function (rotaGr, gdt) {
		var schedule = new GlideSchedule(rotaGr.schedule + "");
		if (schedule.isValid() && schedule.isInSchedule(gdt)) {
			var scheduleTimeMap = schedule.fetchTimeMapWithExcludes(gdt, gdt, null, false);

			var rotaInfo = {
				rotaSysId: rotaGr.getUniqueValue(),
				rotaTimeZone: schedule.getTimeZone(),
				isCustomEscalation: rotaGr.getValue('use_custom_escalation') == '1'
			};

			if (scheduleTimeMap.hasNext()) {
				var span = scheduleTimeMap.next();
				rotaInfo.start = span.getActualStart().getDisplayValueInternal();
				rotaInfo.startDisplayValue = span.getActualStart().getDisplayValue();
				rotaInfo.end = span.getActualEnd().getDisplayValueInternal();
				rotaInfo.endDisplayValue = span.getActualEnd().getDisplayValue();
				rotaInfo.name = rotaGr.getValue("name");

				var startGdt = new GlideDateTime();
				startGdt.setDisplayValueInternal(rotaInfo.start);
				var endGdt = new GlideDateTime();
				endGdt.setDisplayValueInternal(rotaInfo.end);
				var currentTimeGdt = new GlideDateTime();
				if (currentTimeGdt.onOrAfter(startGdt) && currentTimeGdt.onOrBefore(endGdt))
					rotaInfo.isCurrentTimeShift = true;
				else
					rotaInfo.isCurrentTimeShift = false;
			}
			return rotaInfo;
		}
	},

	_getOnCallCurrentRota: function (groupId, rotaId, gdt) {
		var rotas = [];
		var rotaInfo;
		var rotaGr = new GlideRecord(this.TABLES.CMN_ROTA);
		if (rotaGr.get(rotaId) && rotaGr.getValue('active') == '1') {
			rotaInfo = this._getCurrentRotaInfo(rotaGr, gdt);
			if (rotaInfo)
				rotas.push(rotaInfo);
		} else {
			rotaGr.addQuery("group", groupId);
			rotaGr.addActiveQuery();
			rotaGr.query();
			while (rotaGr.next()) {
				rotaInfo = this._getCurrentRotaInfo(rotaGr, gdt);
				if (rotaInfo)
					rotas.push(rotaInfo);
			}
		}
		var sortedRotas = this._sortRotasByDate(rotas);
		if (sortedRotas.length > 0)
			return sortedRotas[0];
		return null;
	},

	_getGroupDetails: function (groupId) {
		if(JSUtil.nil(groupId))
			return;
		var gr = new GlideRecord(this.TABLES.GROUP);
		if(gr.get(groupId)); {
			return this._toJS(gr, ["name", "manager"], false);
		}
	},

	getOnCallEscalationShift: function(groupId, rotaId, gdt, escalationSetSysId, taskTable, taskSysId) {
		if (typeof groupId == "object")
			groupId = groupId[0];
		if (typeof rotaId == "object")
			rotaId = rotaId[0];
		if (typeof escalationSetSysId == "object")
			escalationSetSysId = escalationSetSysId[0];
		if (typeof taskTable == "object")
			taskTable = taskTable[0];
		if (typeof taskSysId == "object")
			taskSysId = taskSysId[0];

		if (!groupId)
			return;

		var overlappingRotas = this._getOverlappingRotas(groupId, rotaId, gdt);
		if (this.rota_id)
			rotaId = this.rota_id;
		var curRotaDetails = this._getOnCallCurrentRota(groupId, rotaId, gdt);
		if (curRotaDetails && !rotaId) {
			rotaId = curRotaDetails.rotaSysId;
		}
		var escalationDetails = this._getOnCallEscalationDetails(groupId, rotaId, gdt, escalationSetSysId, taskTable, taskSysId);
		var groupDetails = this._getGroupDetails(groupId);
		var groupOnCallMembers = this._getOnCallShiftDetails(groupId, rotaId, gdt, overlappingRotas);

		return {
			curRotaDetails: curRotaDetails,
			escalationDetails: escalationDetails,
			overlappingRotas: overlappingRotas,
			groupOnCallMembers: groupOnCallMembers,
			groupDetails: groupDetails,
			endLevelOverallDelay: this.overallDelay
		};
    },

	_sortRotasByDate: function (rotasList) {
		rotasList.sort(function(rota1, rota2) {
			var gdt1 = new GlideDateTime(rota1.start);
			var gdt2 = new GlideDateTime(rota2.start);
			if(gdt1.before(gdt2))
				return -1;
			if(gdt1.equals(gdt2))
				return 0;
			else
				return 1;
		});

		return rotasList;
	},

	_getRotas: function(rotaGr, gdtStart, gdtEnd) {
		var schedule = new GlideSchedule(rotaGr.schedule + "");
		var rotas = [];
		if (schedule.isValid()) {
			var scheduleTimeMap = schedule.fetchTimeMap(gdtStart, gdtEnd, null, false);
			while (scheduleTimeMap.hasNext()) {
				var span = scheduleTimeMap.next();
				var rotaInfo = {};
				rotaInfo.start = span.getActualStart().getDisplayValueInternal();
				rotaInfo.end = span.getActualEnd().getDisplayValueInternal();
				rotaInfo.rota_id = rotaGr.getUniqueValue() + "";

				var rotaStartGdt = new GlideDateTime();
				rotaStartGdt.setDisplayValueInternal(rotaInfo.start);
				var rotaEndGdt = new GlideDateTime();
				rotaEndGdt.setDisplayValueInternal(rotaInfo.end + "");
				var currentTimeGdt = new GlideDateTime();
				if (currentTimeGdt.onOrAfter(rotaStartGdt) && currentTimeGdt.onOrBefore(rotaEndGdt))
					rotaInfo.isCurrentTimeShift = true;
				else
					rotaInfo.isCurrentTimeShift = false;

				if (rotaEndGdt.onOrAfter(gdtStart))
					rotas.push(rotaInfo);
			}
		}
		return rotas;
	},

	getNextRotasList: function (groupId, startDate) {
		if (typeof groupId == "object")
			groupId = groupId[0];

		var NUMBER_OF_DAYS = 30;
		var nextRotas = [];
		var gdtStart;
		if (JSUtil.nil(startDate))
			gdtStart = new GlideDateTime();
		else {
			gdtStart = new GlideDateTime();
			gdtStart.setDisplayValueInternal(startDate);
			gdtStart.addDays(1); // Start from the previously calculated spans
		}
		var gdtEnd = new GlideDateTime();
		gdtEnd.setDisplayValueInternal(gdtStart.getDisplayValueInternal());
		gdtEnd.addDays(NUMBER_OF_DAYS);

		var rotaGr = new GlideRecord(this.TABLES.CMN_ROTA);
		rotaGr.addQuery("group", groupId);
		rotaGr.addActiveQuery();
		rotaGr.query();
		
		while(rotaGr.next()) {
			var rotas = this._getRotas(rotaGr, gdtStart, gdtEnd);
			if (rotas.length > 0)
				nextRotas = nextRotas.concat(rotas);
		}
		this._sortRotasByDate(nextRotas);
		return nextRotas;
	},

    type: 'OCEscalationPathUtilSNC'
};
```