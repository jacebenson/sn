---
title: "OnCallWorkbenchUtilsSNC"
id: "oncallworkbenchutilssnc"
---

API Name: global.OnCallWorkbenchUtilsSNC

```js
var OnCallWorkbenchUtilsSNC = Class.create();
OnCallWorkbenchUtilsSNC.prototype = {
	
	SYS_USER_GROUP: "sys_user_group",
	SYS_USER_GRMEMBER: "sys_user_grmember",
	CMN_ROTA: "cmn_rota",
	CMN_ROTA_MEMBER: "cmn_rota_member",
	
	getGroupDetails: function(groupSysId) {
		if (this.groupHasActiveShifts(groupSysId)) {
			var gr = new GlideRecord(this.SYS_USER_GROUP);
			if (gr.get(groupSysId)) {
				var obj = {};
				obj.canRead = gr.canRead();
				if (obj.canRead) {
					var requiredFields = ["name", "description", "manager"];
					obj.groupJs = OnCallWorkbenchUtilsSNC.onCallCommon.toJS(gr, requiredFields);
				}
				return obj;
			}
		}
	},
	
	getAccessDetails: function(groupSysId) {
		var access = {};
		var ocsNg = new OnCallSecurityNG();
		access.isRotaAdmin = ocsNg.rotaAdminAccess();
		access.isManager = ocsNg.rotaMgrAccess(groupSysId);
		access.isMember = this._isCurrentUserGrpMember(groupSysId) && gs.getUser().isMemberOf(groupSysId);
		return access;
	},
	
	_isCurrentUserGrpMember: function(groupSysId) {
		var todayDate = new GlideDateTime().getDate().getValue(); // returns internal formatted date
		var memberGr = new GlideRecord('cmn_rota_member');
		memberGr.addQuery("member", "=", gs.getUserID());
		memberGr.addQuery("roster.rota.group", "=", groupSysId);
		memberGr.addEncodedQuery("from=NULL^ORfrom<=" + todayDate);
		memberGr.addEncodedQuery("to=NULL^ORto>=" + todayDate);
		memberGr.setLimit(1);
		memberGr.query();
		return memberGr.hasNext();
	},
	
	/*
	 * Get groups that user belongs to or manages
	 */
	getGroups: function() {
		var groups = {}, filterGroups = [];
		var userSysId = gs.getUserID();
		var isRotaAdmin = new OnCallSecurityNG().rotaAdminAccess();
		this._populateManagedGroups(groups, userSysId, isRotaAdmin);
		if(!isRotaAdmin) {// All on-call groups are already populated for admin, so skiping below step
			this._populateMemberGroups(groups, userSysId);
		}
		Object.keys(groups).forEach(function(groupId) {
			filterGroups.push(groups[groupId]);
		});
		return filterGroups;
	},

	/*
	 * Get groups that user manages. 
	 * No explicit computation of groups managed through delegation and on-call group preferences, as same are being included as part of member groups.
	 */
	_populateManagedGroups: function(groups, userSysId, isRotaAdmin) {
		var managerGroupGr = new GlideRecord(this.SYS_USER_GROUP);
		OnCallWorkbenchUtilsSNC.onCallCommon.addManagedGroupsQuery(managerGroupGr, userSysId, isRotaAdmin);
		managerGroupGr.query();
		while(managerGroupGr.next())
			if (!groups[managerGroupGr.sys_id + ""])
				groups[managerGroupGr.sys_id + ""] = OnCallWorkbenchUtilsSNC.onCallCommon.toJS(managerGroupGr, OnCallWorkbenchUtilsSNC.FILTER_GROUP_FIELDS);
	},

	/*
	 * Get groups that user belongs to.
	 */
	_populateMemberGroups: function(groups, userSysId) {
		var userMemberGr = new GlideRecord(this.SYS_USER_GRMEMBER);
		userMemberGr.addQuery('user', userSysId);
		userMemberGr.addQuery('group.active', 'true');
		userMemberGr.addEncodedQuery('JOINsys_user_grmember.group=cmn_rota.group!active=true');
		userMemberGr.query();
		var memberGroupGr = new GlideRecord(this.SYS_USER_GROUP);
		while(userMemberGr.next())
			if (!groups[userMemberGr.group + ""] && memberGroupGr.get(userMemberGr.group + "")) {
				groups[userMemberGr.group + ""] =  OnCallWorkbenchUtilsSNC.onCallCommon.toJS(memberGroupGr, OnCallWorkbenchUtilsSNC.FILTER_GROUP_FIELDS);
			}	
	},
	
	/*
	 * Returns count of users how are active members of any roster from the given group
	 */
	getGroupMemberCount: function (groupId) {
		return new OnCallCommon().getGroupMemberCount(groupId);
	},
	
	getActiveRotas: function (groupId) {
		var rotaGr = new GlideRecord(this.CMN_ROTA);
		rotaGr.addActiveQuery();
		rotaGr.addQuery("group", groupId);
		rotaGr.query();
		var rotas = [], requiredFields = ["name"];
		while(rotaGr.next())
			rotas.push(OnCallWorkbenchUtilsSNC.onCallCommon.toJS(rotaGr, requiredFields));
		return rotas;
	},
	
	overrideEscalation: function(rotaSysId) {
		var rotaGr = new GlideRecord(this.CMN_ROTA);
		if (rotaGr.get(rotaSysId)) {
			rotaGr.setValue("use_custom_escalation", true);
			rotaGr.update();
			
			var escalationSetGr = new GlideRecord("cmn_rota_escalation_set");
			escalationSetGr.addQuery("cmn_rota", rotaSysId);
			escalationSetGr.addActiveQuery();
			escalationSetGr.addQuery("default", true);
			escalationSetGr.query();
			if (!escalationSetGr.hasNext()) {
				new OCEscalationDesigner().createDefaultEscalationSet(rotaSysId);
			}
		}
	},
	
	resetEscalation: function(rotaSysId) {
		var rotaGr = new GlideRecord(this.CMN_ROTA);
		if (rotaGr.get(rotaSysId)) {
			rotaGr.setValue("use_custom_escalation", false);
			rotaGr.update();
		}
	},
	
	_hasEscalationSteps: function(rotaSysId) {
		var escalationStepsGr = new GlideRecord('cmn_rota_esc_step_def');
		escalationStepsGr.addQuery('escalation_set.cmn_rota', rotaSysId);
		escalationStepsGr.query();
		return escalationStepsGr.hasNext();
	},
	
	getGroupRotas: function(groupId) {
		var rotas = [];
		var onCallRotation = new OnCallRotation();
		var onCallCommon = new OnCallCommon();
		if (!groupId) {
			throw {
				message: "invalid group sys_id"
			};
		}
		var rotaGr = new GlideRecord('cmn_rota');
		rotaGr.addQuery('group', groupId);
		rotaGr.addActiveQuery();
		rotaGr.query();
		while(rotaGr.next()) {
			var rotaJs = onCallCommon.toJS(rotaGr, ["sys_id", "name", "schedule", "use_custom_escalation"]);
			rotaJs.escalation_type = {};
			rotaJs.rota_members = [];
			rotaJs.escalation_type.value = onCallRotation.getEscalationType(rotaGr.getUniqueValue());
			if (rotaJs.escalation_type.value == 'roster'){
				rotaJs.escalation_type.display_value = gs.getMessage('Rotate through rosters');
			}
			else if (rotaJs.escalation_type.value == 'member'){
				rotaJs.escalation_type.display_value = gs.getMessage('Rotate through members');
			}
			else {
				rotaJs.escalation_type.value = 'none';
				rotaJs.escalation_type.display_value = gs.getMessage('None (no active rosters defined)');
			}
			
			if (rotaJs.use_custom_escalation.value == "true") {
				rotaJs.use_custom_escalation.has_steps = this._hasEscalationSteps(rotaGr.getUniqueValue());
			}
			
			var todayDate = new GlideDateTime().getDate().getValue(); // returns internal formatted date
			var memberGr = new GlideRecord(this.CMN_ROTA_MEMBER);
			memberGr.addQuery("member.active", "=", true);
			memberGr.addQuery("roster.rota", "=", rotaGr.getUniqueValue());
			memberGr.addEncodedQuery("from=NULL^ORfrom<=" + todayDate);
			memberGr.addEncodedQuery("to=NULL^ORto>=" + todayDate);
			memberGr.query();

			var memberIds = [];
			while (memberGr.next())
				memberIds.push(memberGr.member + "");
			if(memberIds.length){
				var userMemberGr = new GlideAggregate(this.SYS_USER_GRMEMBER);
				userMemberGr.addQuery("group", groupId);
				userMemberGr.addQuery("user", "IN", memberIds.join(","));
				userMemberGr.addQuery("group.active", "true");
				userMemberGr.addEncodedQuery("JOINsys_user_grmember.group=cmn_rota.group!active=true");
				userMemberGr.query();
				while(userMemberGr.next()) {
					var rotaMemberJs = {
						value: userMemberGr.user + '',
						display_value: userMemberGr.getDisplayValue('user')
					};
					rotaJs.rota_members.push(rotaMemberJs);
				}
			}
			rotas.push(rotaJs);
		}
		return rotas;
	},

	getGroupPreferenceIdByGroup: function(groupSysId) {
		var groupPrefGr = new OnCallRotation().getGroupPreferenceByGroup(groupSysId);
		if(groupPrefGr)
			return groupPrefGr.sys_id + "";
		return "-1";
	},

	groupHasActiveShifts: function(groupSysId) {
		var rotaGr = new GlideAggregate(this.CMN_ROTA);
		rotaGr.addQuery('group', groupSysId);
		rotaGr.addQuery('active', true);
		rotaGr.query();
		return rotaGr.hasNext();
	},

    type: 'OnCallWorkbenchUtilsSNC'
};
OnCallWorkbenchUtilsSNC.FILTER_GROUP_FIELDS = ["name"];
OnCallWorkbenchUtilsSNC.onCallCommon = new OnCallCommon();
```