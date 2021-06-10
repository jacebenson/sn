---
title: "RemoveCustomTableRole"
id: "removecustomtablerole"
---

API Name: global.RemoveCustomTableRole

```js
var RemoveCustomTableRole = Class.create();
RemoveCustomTableRole.prototype = {
	initialize: function() {
		this.USER = "user";
		this.ROLE = "role";
		this.GROUP = "group";
		this.CONTAINS = "contains";
		this.SYS_USER_GRMEMBER_TABLE = "sys_user_grmember";
		this.SYS_USER_HAS_ROLE_TABLE = "sys_user_has_role";
		this.SYS_GROUP_HAS_ROLE_TABLE = "sys_group_has_role";
		this.SYS_USER_ROLE_CONTAINS_TABLE = "sys_user_role_contains";
	},

	removeRoleViaGroupRole :function(group, roleName, roleSysId ) {
		var sysUserGrmemberGR = new GlideRecord(this.SYS_USER_GRMEMBER_TABLE);
		sysUserGrmemberGR.addQuery(this.GROUP, group);
		sysUserGrmemberGR.query();
		
		while (sysUserGrmemberGR.next()) {
			var user = sysUserGrmemberGR.getValue(this.USER);
			this.removeRoleViaUserRole(user, roleName, roleSysId);
		}
	},
	
	removeRoleViaUserRole: function(user, roleName, roleSysId) {
		//remove access to CT for child roles
		var sysUserRoleContainsGr = new GlideRecord(this.SYS_USER_ROLE_CONTAINS_TABLE);
		sysUserRoleContainsGr.addQuery(this.ROLE, roleSysId);
		sysUserRoleContainsGr.query();
		while (sysUserRoleContainsGr.next()) {
			var childRoleSysId = sysUserRoleContainsGr.getValue(this.CONTAINS);
			var childRoleName = sysUserRoleContainsGr.getElement(this.CONTAINS).getDisplayValue();
			this.removeRoleViaUserRole(user, childRoleName, childRoleSysId);
		}
		
		var sysUserHasRoleGr  = new GlideRecord(this.SYS_USER_HAS_ROLE_TABLE);
		sysUserHasRoleGr.addQuery(this.USER, user);
		sysUserHasRoleGr.addQuery(this.ROLE, roleSysId);
		sysUserHasRoleGr.query();
		
		// remove user role to CT if there is this role is not assigned to user anymore
		if (sysUserHasRoleGr.getRowCount() == 0) {
			SNC.UACTScriptUtils.removeUserRoleToCT(user, roleName);
		}
	},
	
	removeRoleViaGroupMember :function(group, user) {
		var sysGroupHasRoleGr = new GlideRecord(this.SYS_GROUP_HAS_ROLE_TABLE);
		sysGroupHasRoleGr.addQuery(this.GROUP, group);
		sysGroupHasRoleGr.query();
		
		while (sysGroupHasRoleGr.next()) {
			var roleSysId = sysGroupHasRoleGr.getValue(this.ROLE);
			var roleName = sysGroupHasRoleGr.getElement(this.ROLE).getDisplayValue();
			this.removeRoleViaUserRole(user, roleName, roleSysId);
		}
	},
	
    type: 'RemoveCustomTableRole'
};
```