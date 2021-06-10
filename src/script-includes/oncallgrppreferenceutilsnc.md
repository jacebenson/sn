---
title: "OnCallGrpPreferenceUtilSNC"
id: "oncallgrppreferenceutilsnc"
---

API Name: global.OnCallGrpPreferenceUtilSNC

```js
var OnCallGrpPreferenceUtilSNC = Class.create();
OnCallGrpPreferenceUtilSNC.prototype = {
	initialize: function() {
	},

	getEligibleGroupsEncQuery: function(userId) {
		if (!userId)
			userId = gs.getUserID();
		var groupIds = [];
		var ocs = new OnCallSecurityNG();
		if (ocs.rotaAdminAccess(userId))
			return 'active=true';
		var delegatedGroupsGA = ocs.getDelegatedGroups(userId);
		while (delegatedGroupsGA.next()) {
			groupIds.push(delegatedGroupsGA.getValue('granted_by'));
		}
		var managedGroupsGA = ocs.getManagedGroups(userId, true);
		while (managedGroupsGA.next()) {
			groupIds.push(managedGroupsGA.getValue('sys_id'));
		}
		groupIds = groupIds.concat(ocs.getManagedGroupsByPreferences(userId));
		if (groupIds)
			return 'sys_idIN' + groupIds.join(',');
		else
			return 'sys_idIN-1';
	},

	validateUniqueGroupInPreferences: function(grpGr) {
		if (JSUtil.nil(grpGr) || JSUtil.nil(grpGr.getValue("group"))) {
			gs.addErrorMessage(gs.getMessage("Invalid data for group settings"));
			return false;
		}
		var groupSettingGr = new GlideRecord("on_call_group_preference");
		groupSettingGr.addQuery("sys_id", "!=", grpGr.getUniqueValue());
		groupSettingGr.addQuery("group", grpGr.getValue("group"));
		groupSettingGr.query();
		if (groupSettingGr.next()) {
			gs.addErrorMessage(gs.getMessage("Duplicate Group Preferences can not be defined"));
			return false;
		}
		return true;
	},

	/**
 	* Validates Selected Rota Managers for group preference
		- User should be member of selected group
		- User should be active
 	* @param groupPreferenceGr
 	* @return bool
 	*/
	validateRotaManagersFromPreferenceList: function(grpPreferenceGr) {
		if (JSUtil.nil(grpPreferenceGr) || JSUtil.nil(grpPreferenceGr.getValue("group"))) {
			gs.addErrorMessage(gs.getMessage("Invalid group preference data"));
			return false;
		}
		var rotaManagers = grpPreferenceGr.rota_managers;
		if (rotaManagers.nil())
			return true;
		var rotaManagersList = rotaManagers.split(",");
		var grpRecord = grpPreferenceGr.getValue("group");
		var usrGr = new GlideRecord("sys_user");
		var nonMemberUsers = [], nonActiveUsers = [];
		for (var i = 0; i < rotaManagersList.length; i++) {
			if (usrGr.get(rotaManagersList[i]) && !usrGr.active) {
				nonActiveUsers.push(usrGr.getDisplayValue());
			}
			var userRecord = GlideUser.getUserByID(rotaManagersList[i]);
			if (!JSUtil.nil(userRecord) && !JSUtil.nil(usrGr)) {
				if (!userRecord.isMemberOf(grpRecord)) {
					nonMemberUsers.push(usrGr.getDisplayValue());
				}
			} else {
				gs.addErrorMessage(gs.getMessage("Invalid user record"));
				return false;
			}
		}
	
		if (nonActiveUsers.length) {
			gs.addErrorMessage(gs.getMessage("User(s) {0}: not active", nonActiveUsers.join(",")));
		}
		if (nonMemberUsers.length) {
			gs.addErrorMessage(gs.getMessage("User(s) {0}: not group members", nonMemberUsers.join(",")));
		}
		if (nonActiveUsers.length || nonMemberUsers.length)
			return false;
		return true;
	},

    type: 'OnCallGrpPreferenceUtilSNC'
};
```