---
title: "OnCallSecurityNG"
id: "oncallsecurityng"
---

API Name: global.OnCallSecurityNG

```js
var OnCallSecurityNG=Class.create();

OnCallSecurityNG.prototype = {

	initialize : function () {
		this.log = new GSLog("com.snc.on_call_rotation.log.level", this.type);
	},

	setDebug: function(value) {
		this.debug = value;
	},

	/**
 	* Check if user has access to Rotas and Rota related records for the given group. Check is based on 3 things:
 	*
 	*  1. Check if the user is a member of the given group.
 	*  2. Check if the user is the manager for the given group or has the rota_manager role.
 	*  3. Check if the user has the rota_admin role.
 	*
 	* @param String groupId
 	*
 	* @return boolean hasAccess
 	*/
	rotaAccess: function(group) {
		var isMember = this._isMemberOf(group); // is user a member of the rota's group?
		var isManager = this.rotaMgrAccess(group);
		if (this.log.atLevel(GSLog.DEBUG))
			this.log.debug("[rotaAccess] isMember: " + isMember + " isManager: " +  isManager);
		return (isMember || isManager);
	},

	/**
 	* Check if the user is the manager for the given group or has the rota_manager role.
 	*
 	* @param String groupSysId
 	*
 	* @return boolean hasMgrAccess
 	*/
	rotaMgrAccess: function(groupSysId) {
		if (this.rotaAdminAccess())
			return true;

		if (JSUtil.nil(groupSysId))
			return this.isManagerOfAnyGroup();

		var groupGr = this._getGroupRecord(groupSysId);
		if (!JSUtil.nil(groupGr)) {
			var isAccessAllowed = groupGr.manager == this._getUserID() || this._hasRoleInGroup('rota_manager', groupGr.getUniqueValue());
			if (isAccessAllowed) return true;
		}

		var groupSettingGr = this._getGroupSettingRecord(groupSysId);
		if (!JSUtil.nil(groupSettingGr))
			return this.isRotaManagerOfGroup(groupSettingGr);

		return false;
	},

	/**
 	* Will return true if the user has any of the following roles: rota_admin, rota_manager or
 	* the currently logged in user is a manager of any group
 	*
 	* @return boolean
 	*/
	rotaMgrAny: function() {
		if (this.rotaAdminAccess())
			return true;

		// does user have rota manager role
		if (this._hasRole('rota_manager'))
			return true;

		return this.isManagerOfAnyGroup();
	},

	rotaMgrAccessByScheduleSpan: function(cmnScheduleSpanGr) {
		var answer = false;
		if (!cmnScheduleSpanGr.schedule.nil()) {
			if(cmnScheduleSpanGr.schedule.type == 'roster' && cmnScheduleSpanGr.schedule.document == 'cmn_rota') {
				var cmnRotaGr = new GlideRecord('cmn_rota');
				cmnRotaGr.addQuery('schedule', cmnScheduleSpanGr.schedule + '');
				cmnRotaGr.query();
				if (cmnRotaGr.next()) {
					answer = this.rotaMgrAccess(cmnRotaGr.group + '');
				}
			}
		}
		return answer;
	},
	
	isManagerOfAnyGroup: function() {
		var userSysId = this._getUserID();

		var ga = this.getManagedGroups(userSysId, true);
		ga.next();

		if (parseInt(ga.getAggregate('COUNT'), 10) > 0)
			return true;

		// Get groups where current user has been delegated rota_manager.
		var gaHasRole = this.getDelegatedGroups(userSysId);
		gaHasRole.next();
		
		// Get groups where current user has rota manager from any preference record.
		var grpsManagedFromPreference = this.getManagedGroupsByPreferences(userSysId);

		return (parseInt(gaHasRole.getAggregate('COUNT'), 10) > 0) || (grpsManagedFromPreference && grpsManagedFromPreference.length > 0);
	},

	/**
 	* Check if the currently logged in user has access to any roster schedule span (that is not time off)
 	* that is based on the given schedule.
 	*
 	* @param GlideRecord schedule
 	*
 	* @return boolean scheduleAccess
 	*/
	rotaAccessSchedule: function(/* cmn_schedule */ current) {
		if (this.log.atLevel(GSLog.DEBUG))
			this.log.debug("[rotaAccessSchedule] called for schedule: " + current.getUniqueValue() + ", user " + this._getUserID());
		if (this.rotaMgrAny())
			return true;
		
		// search through this schedule's roster spans
		var gr = new GlideRecord('roster_schedule_span');
		gr.addQuery('schedule', current.getUniqueValue());
		gr.setWorkflow(false);
		gr.query();
		var timeOff = false;
		while (gr.next()) {
			if (this.log.atLevel(GSLog.DEBUG))
				this.log.debug("[rotaAccessSchedule] name: " + gr.name);
			if (gr.type == 'time_off') {
				// Time off entries have blank groups, deal with later
				timeOff = true;
				if (this.log.atLevel(GSLog.DEBUG))
					this.log.debug("[rotaAccessSchedule] time_off entry found");
				continue;
			}
			if (this.rotaAccess(gr.group))
				return true;                                 // you can view this schedule
		}
		
		if (!timeOff)
			return false;
		
		// this should never happen
		if (this._isAccessSameGroupAs(current.name))
			return true;
		
		return false;
	},

	/**
 	* Will return true if the current logged in user has rota_admin role or if the user
 	* is the manager of any of the spans related to the given schedule or has the rosta_manager role.
 	*
 	* @param GlideRecord schedule
 	*
 	* @return boolean
 	*/
	rotaMgrSchedule: function(/* cmn_schedule */ current) {
		if (this.log.atLevel(GSLog.DEBUG))
			this.log.debug("[rotaMgrSchedule] called for schedule: " + current.getUniqueValue() + ", user " + this._getUserID());
		if (this.rotaAdminAccess())
			return true;
		
		// search through this schedule's roster spans
		var gr = new GlideRecord('roster_schedule_span');
		gr.addQuery('schedule', current.getUniqueValue());
		gr.setWorkflow(false);
		gr.query();
		var timeOff = false;
		while (gr.next()) {
			if (gr.type == 'time_off') {
				// Time off entries have blank groups, deal with later
				timeOff = true;
				continue;
			}
			if (this.rotaMgrAccess(gr.group))
				return true;                                 // you can write to this schedule
		}
		
		if (!timeOff)
			return false;
		
		// this should never happen
		if (this._isMgrSameGroupAs(current.name))
			return true;
		
		return false;
	},

	/**
 	* Checks if the user logged in can create a schedule based on one of these conditions: 
	*
	* 1) Has rota_admin role
	* 2) Has rota_manager role && is manager of a group
 	*
 	* @return boolean
 	*/
	canCreateSchedule: function() {
		if (gs.hasRole('rota_admin'))
			return true;

		return this.isManagerOfAnyGroup();
	},

	/**
 	* Gets an array of groups sys ids for the current user
 	*
 	* @return array of strings
 	*/
	getGroups: function() {
		var userSysId = this._getUserID();
		var groupSysIds = {};
		if (gs.hasRole('rota_manager') || gs.hasRole('rota_admin')) {
			var gaGroup = this.getManagedGroups(userSysId, !gs.hasRole("rota_admin"));
			while (gaGroup.next())
				groupSysIds[gaGroup.getValue('sys_id')] = '';

			// Add groups where current user has been delegated rota_manager.
			var gaHasRole = this.getDelegatedGroups(userSysId);
			while (gaHasRole.next())
				groupSysIds[gaHasRole.getValue('granted_by')] = '';
		}

		return Object.keys(groupSysIds);
	},

	/**
	 * Gets groups that are managed by userSysId or returns all groups for rota_admin's.
	 *
	 * @param userSysId String sys_user.sys_id current session's user sys_id
	 * @param ignoreRotaAdmin Boolean do not constrain the query by manager for rota_admin's
	 *
	 * @return gaGroup GlideAggregate
	**/
	getManagedGroups: function(userSysId, ignoreRotaAdmin) {
		var gaGroup = new GlideAggregate("sys_user_group");
		gaGroup.addAggregate("COUNT");
		gaGroup.groupBy("sys_id");
		gaGroup.setWorkflow(false);
		gaGroup.addActiveQuery();
		if (ignoreRotaAdmin)
			gaGroup.addQuery("manager", userSysId);
		gaGroup.query();
		return gaGroup;
	},

	/**
	 * Gets sys_user_has_role records for groups that the user has been delegated the rota_manager role.
	 *
	 * @param userSysId String sys_user.sys_id current session's user sys_id
	 *
	 * @return gaHasRole GlideAggregate
	**/
	getDelegatedGroups: function(userSysId) {
		var gaHasRole = new GlideAggregate("sys_user_has_role");
		gaHasRole.addAggregate("COUNT");
		gaHasRole.groupBy("granted_by");
		gaHasRole.addActiveQuery();
		gaHasRole.addQuery("user", userSysId);
		gaHasRole.addQuery("role.name", "rota_manager");
		gaHasRole.addQuery("granted_by", "!=", "not-applicable");
		gaHasRole.addNotNullQuery("granted_by");
		gaHasRole.query();
		return gaHasRole;
	},
	
	/**
	 * Gets group ids for groups that the user has been delegated the manager role by group preferences.
	 *
	 * @param userSysId String sys_user.sys_id current session's user sys_id
	 *
	 * @return groupIds Array
	**/
	getManagedGroupsByPreferences: function(userSysId) {
		var groupIds = [];
		var groupSettingGr = new GlideRecord("on_call_group_preference");
		groupSettingGr.query();
		while (groupSettingGr.next()) {
			var groupId = groupSettingGr.group + "";
			if (groupId && this.isRotaManagerOfGroup(groupSettingGr, userSysId))
				groupIds.push(groupId);
		}
		return groupIds;
	},

	/**
 	* Check if a user has access to to any Rota thats related to any Group the user is a member of.
 	*
 	* @param String userName
 	*
 	* @return boolean
 	*/
	_isAccessSameGroupAs: function(userName) {
		if (this.log.atLevel(GSLog.DEBUG))
			this.log.debug("[_isAccessSameGroupAs] username: " + userName);
		// do they have access to any group rota that this user with time-off has access to?
		var gr = new GlideRecord('sys_user_grmember');
		gr.addActiveQuery();
		// (this is a temporary approach, ideally a schedule would be properly connected to a user record)
		gr.addQuery('user.name', userName);
		gr.setWorkflow(false);
		gr.query();
		while (gr.next()) {
			if (this.log.atLevel(GSLog.DEBUG))
				this.log.debug("[_isAccessSameGroupAs] access to: " + gr.group + "?");
			if (this.rotaAccess(gr.group))
				return true;
		}
		return false;
	},

	/**
 	* Check if a user has access to to any Rota thats related to any Group the user is a member of.
 	*
 	* @param String userName
 	*
 	* @return boolean
 	*/
	_isMgrSameGroupAs: function(userName) {
		// do they have manager level access to any group rota that this user with time-off has access to?
		var gr = new GlideRecord('sys_user_grmember');
		gr.addActiveQuery();
		// (this is a temporary approach, ideally a schedule would be properly connected to a user record)
		gr.addQuery('user.name', userName);
		gr.setWorkflow(false);
		gr.query();
		while (gr.next()) {
			if (this.rotaMgrAccess(gr.group))
				return true;
		}
		return false;
	},

	/**
 	* Checks if the currently logged in user has the rota_admin role.
 	*
 	* @param String userId [Optional], to check the role for given userId, instead of logged user.
 	*
 	* @return boolean hasMgrAccess
 	*/
	rotaAdminAccess: function(userId) {
		var isRotaAdmin;
		if(!userId) {
			userId = this._getUserID();
			isRotaAdmin = this._hasRole("rota_admin");
		} else {
			var user = GlideUser.getUserByID(userId);
			isRotaAdmin = user.hasRole("rota_admin");
		}
		if (this.log.atLevel(GSLog.DEBUG))
			this.log.debug("[rotaAdminAccess] called for user " + this._getUserID() + ' [' + isRotaAdmin + ']');
		return (isRotaAdmin);
	},


	/**
 	* Setup a test user for testing some fo the functions in this script. Testable functions include:
 	*    - _getUserID
 	*    - _isMemberOf
 	*
 	* @param String sys_id user
 	*/
	setTestUser: function(value) {
		if (this.log.atLevel(GSLog.DEBUG))
			this.log.debug("[setTestUser] set to: " + value);
		this.testUser=value; //  "a9b0fd4dc611227601908ba719053cf6"; // Beth Anglin
	},

	/**
 	* Setup test roles for testing some fo the functions in this script. Testable functions include:
 	*    - _hasRole
 	*    - _hasRoleInGroup
 	*
 	* @param Array roles
 	*/
	setTestRoles: function(/* list of roles */ value) {
		if (this.log.atLevel(GSLog.DEBUG))
			this.log.debug("[setTestRoles] set to " + this.__keys(value));
		this.testRoles = value;
	},

	/**
 	* Returns the sys_id of the currently logged in user or the test user if one is set
 	*
 	* @return String sys_id
 	*/
	_getUserID: function() {
		if (this.testUser)
			return this.testUser;
		return gs.getUserID();
	},

	/**
 	* Checks if the currently logged in user or the test user (if one is set) is a member of the given group
 	*
 	* @param string groupName
 	*
 	* @return boolean
 	*/
	_isMemberOf: function(group) {
		if (this.log.atLevel(GSLog.DEBUG))
			this.log.debug("[_isMemberOf] group: " + group);
		if (this.testUser) {
			var User = GlideUser;
			return User.getUserByID(this.testUser).isMemberOf(group);
		}
		return gs.getUser().isMemberOf(group);
	},

	/**
 	* Checks if the currently logged in user has the role specified or if the
 	* role specified exists in the list of test roles (if test roles are setup)
 	*
 	* @param String roleName
 	*
 	* @return boolean
 	*/
	_hasRole: function(role) {
		if (this.testRoles)
			return this.testRoles[role];
		return gs.hasRole(role);
	},

	/**
 	* Checks if the current user has the specified role within a specified group or if the
 	* role specified exists in the list of test roles (if test roles are setup).
 	* Returns true if all of the following conditions are met:
 	*
 	*    1. The logged-in user HAS the role in question
 	*    2. The "Granted by" field on the user role record is set to the specified group
 	*    3. The "inherited" field on the user role record is false
 	*
 	* @param String roleName
 	* @param GlideRecord group
 	*
 	* @return boolean
 	*/
	_hasRoleInGroup: function(role, group) {
		if (this.testRoles)
			return this.testRoles[role + '_' + group];
		return gs.hasRoleInGroup(role, group);
	},

	/**
 	* Returns a list of the properties and functions of an object
 	*
 	* @param Object
 	*
 	* @return Array
 	*/
	__keys: function(object) {
		var list = [];
		for (var x in object)
			list.push(x.toString());
		return list;
	},

	_getGroupRecord: function (groupId) {
		var gr = new GlideRecord('sys_user_group');
		gr.setWorkflow(false);
		if (gr.get(groupId))
			return gr;
		return null;
	},
	

	_getGroupSettingRecord: function(groupId) {
		if (!JSUtil.nil(groupId)) {
			var groupSettingGr = new GlideRecord("on_call_group_preference");
			if (groupSettingGr.get("group", groupId))
				return groupSettingGr;
		}
		return null;	
	},

	getRotaManagersFromGroup: function(groupSettingGr) {
		var query = "sys_idIN";
		if (JSUtil.nil(groupSettingGr) || JSUtil.nil(groupSettingGr.getValue("group"))) {
			query += -1;
			return query;
		}
		var grpGr = new GlideRecord("sys_user_grmember");
		grpGr.addQuery("group", groupSettingGr.getValue("group"));
		grpGr.query();
		var grpMembersPresent = false;
		while (grpGr.next()) {
			if (grpGr.user && grpGr.user.active) {
				var userId = grpGr.getValue("user");
				if (grpGr.hasNext()) {
					query += (userId + ",");
				} else {
					query += userId;
				}
				grpMembersPresent = true;
			}
		}
		if (!grpMembersPresent)
			query += -1;
		return query;
	},

    /**
     * @param groupSettingGr, on_call_group_preference's GlideRecord.
     * @param String userId [Optional], to check the role for given userId, instead of logged user.
 	 */
	isRotaManagerOfGroup: function(groupSettingGr, userId) {
		if (JSUtil.nil(groupSettingGr))
			return false;
		var rotaManagers = groupSettingGr.rota_managers;
		if (rotaManagers.nil())
			return false;
		var rotaManagersList = rotaManagers.split(",");
		var currentUserId = userId ? userId : this._getUserID();
		if (rotaManagersList.indexOf(currentUserId) != -1)
			return true;
		return false;
	},

	/*
	* Checks if time off in approval spans should be viewable to user
	*/

	isTimeOffInApprovalSpanViewable: function (spanGr) {
		return this.rotaMgrAccess(spanGr.group) || spanGr.schedule.document_key == gs.getUser().getID();
	},
	
	checkManagerAcessOfGroup: function (groupSysId) {
		var groupGr = this._getGroupRecord(groupSysId);
		if (!JSUtil.nil(groupGr)) {
			var isAccessAllowed = groupGr.manager == this._getUserID() || this._hasRoleInGroup('rota_manager', groupGr.getUniqueValue());
			if (isAccessAllowed) return true;
		}

		var groupSettingGr = this._getGroupSettingRecord(groupSysId);
		if (!JSUtil.nil(groupSettingGr))
			return this.isRotaManagerOfGroup(groupSettingGr);

		return false;
	},

	getManagerAccessForGroups: function (groupSysIds) {
		if (!groupSysIds)
			groupSysIds = [];
		
		var groupManagerAccessMap = {};
		for (var i = 0; i < groupSysIds.length; i++) {
			var group = groupSysIds[i];
			groupManagerAccessMap[group] = false;
		}
		
		var groupGr = new GlideRecord('sys_user_group');
		groupGr.setWorkflow(false);
		groupGr.addQuery('sys_id', 'IN', groupSysIds.join());
		groupGr.query();
		
		while(groupGr.next()) {
			var isAccessAllowed = groupGr.manager + '' == this._getUserID() || this._hasRoleInGroup('rota_manager', groupGr.getUniqueValue());
			if (isAccessAllowed)
				groupManagerAccessMap[groupGr.getUniqueValue()] = true;
		}

		var remainingGroups = [];
		for (var j = 0; j < groupSysIds.length; j++) {
			var groupId = groupSysIds[j];
			if (!groupManagerAccessMap[groupId])
				remainingGroups.push(groupId);
		}
		
		var currentUser = this._getUserID();
		var groupSettingGr = new GlideRecord("on_call_group_preference");
		groupSettingGr.addQuery("group", "IN", remainingGroups.join());
		groupSettingGr.addNotNullQuery('rota_managers');
		groupSettingGr.query();
		while (groupSettingGr.next()) {
			var isManager = this.isRotaManagerOfGroup(groupSettingGr, currentUser);
			if (isManager)
				groupManagerAccessMap[groupSettingGr.group + ''] = true;
		}
		
		return groupManagerAccessMap;
	},
	
	rotaMgrAccessForGroups: function(groupSysIds) {
		if (!groupSysIds)
			groupSysIds = [];
		
		var rotaMgrAccessMap = {};
		if (this.rotaAdminAccess()) {
			for (var i = 0; i < groupSysIds.length; i++) {
				rotaMgrAccessMap[groupSysIds[i]] = true;
			}
			return rotaMgrAccessMap;
		}

		return this.getManagerAccessForGroups(groupSysIds);
	},
	type: 'OnCallSecurityNG'

};
```