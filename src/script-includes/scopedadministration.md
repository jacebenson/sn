---
title: "ScopedAdministration"
id: "scopedadministration"
---

API Name: global.ScopedAdministration

```js
var ScopedAdministration = Class.create();
ScopedAdministration.prototype = {
    initialize: function() {
    },

	currentUserIsScopeAdmin: function(scope, strict) {	
		var scopeAdminRoles = this._getScopeAdminRolesGr(scope);
		var userRoles = gs.getSession().getRoles();
		var allowAdminIfTurnedOff = false;
		if (strict === undefined || !strict)
			allowAdminIfTurnedOff = scope.getValue('scoped_administration') == 0;
		
		if (userRoles.indexOf('maint') >= 0)
			return true;
			
		if (!scopeAdminRoles.hasNext() || allowAdminIfTurnedOff)
			return userRoles.indexOf('admin') >= 0;
		
		while (scopeAdminRoles.next()) {
			if (userRoles.indexOf(scopeAdminRoles.getDisplayValue()) >= 0)
				return true;
		}
		return false;
    },
	
	adminRoleContainsScopeAdminRoles: function(scope) {
		var adminRoleContains = this._getAdminRoleContainsGr();
		var roles = [];
		while (adminRoleContains.next())
			roles.push(adminRoleContains.getValue('contains'));
		
		var scopeAdminRoles = this._getScopeAdminRolesGr(scope);
		if (!scopeAdminRoles.hasNext())
			return false;
		
		while (scopeAdminRoles.next())
			if (roles.indexOf(scopeAdminRoles.getValue('sys_id')) < 0)
				return false;
		return true;
    },
	
	addScopeAdminRolesToAdminContains: function(scope) {
		var adminRole = this._getAdminRoleGr();
		var scopeAdminRoles = this._getScopeAdminRolesGr(scope);
		while (scopeAdminRoles.next()) {
			var adminRoleContains = new GlideRecord('sys_user_role_contains');
			adminRoleContains.addQuery('role', adminRole.sys_id);
			adminRoleContains.addQuery('contains', scopeAdminRoles.sys_id);
			adminRoleContains.query();
			if (adminRoleContains.hasNext())
				continue;
			adminRoleContains = new GlideRecord('sys_user_role_contains');
			adminRoleContains.initialize();
			adminRoleContains.setValue('role', adminRole.sys_id);
			adminRoleContains.setValue('contains', scopeAdminRoles.sys_id);
			adminRoleContains.insert();
		}
	},
	
	removeScopeAdminRolesFromAdminContains: function(scope) {
		var adminRole = this._getAdminRoleGr();
		var scopeAdminRoles = this._getScopeAdminRolesGr(scope);
		while (scopeAdminRoles.next()) {
			var adminRoleContains = new GlideRecord('sys_user_role_contains');
			adminRoleContains.addQuery('role', adminRole.sys_id);
			adminRoleContains.addQuery('contains', scopeAdminRoles.sys_id);
			adminRoleContains.deleteMultiple();
		}
    },
	
	countNumberOfActiveScopeAdminIfContainsRemoved: function(container, contained) {
		var usersWithContainer = [];
		var gr = new GlideRecord('sys_user_has_role');
		gr.addQuery('role', container);
		gr.query();
		while (gr.next())
			usersWithContainer.push(gr.getValue('user'));
		
		var usersWithRoleButNotFromContainer = [];
		gr = new GlideRecord('sys_user_has_role');
		gr.addQuery('role', contained);
		gr.query();
		while (gr.next()) {
			if (usersWithContainer.indexOf(gr.getValue('user')) >= 0 && gr.getValue('inh_count') == '1')
				continue;
			usersWithRoleButNotFromContainer.push(gr.getValue('user'));
		}
		
		if (usersWithRoleButNotFromContainer.length() == 0)
			return 0;
		
		var activeUsers = new GlideRecord('sys_user');
		activeUsers.addActiveQuery();

		// also check the users are not locked out, etc...

		// PRB1296088: Empty password field should not be used
		// to check whether a user is able to log in or not.
		// Remove the check.
		activeUsers.addQuery('locked_out', false).addOrCondition('locked_out', null);
		activeUsers.addQuery('web_service_access_only', false).addOrCondition('web_service_access_only', null);
		activeUsers.addQuery('internal_integration_user', false).addOrCondition('internal_integration_user', null);
		
		activeUsers.addQuery('sys_id', 'IN', usersWithRoleButNotFromContainer.join());
		activeUsers.query();
		return activeUsers.getRowCount();
    },
	
	countNumberOfActiveScopeAdminIfRoleRemoved: function(user, role) {
		var gr = new GlideRecord('sys_user_has_role');
		gr.addQuery('role', role);
		gr.addQuery('user', '!=', user);
		gr.addQuery('user.active', true);
		gr.query();
		return gr.getRowCount();
	},
	
	getScopeName: function(role) {
		var gr = new GlideRecord('sys_metadata');
		gr.addQuery('sys_id', role);
		gr.query();
		var result = 'global';
		if (gr.next()) {
			var scope = gr.sys_scope;
			if ('global' != scope) {
				var sysScopeRecord = new GlideRecord('sys_scope');
				sysScopeRecord.addQuery('sys_id', scope);
				sysScopeRecord.query();
				if (sysScopeRecord.next())
					result = sysScopeRecord.scope;
			}
		}
		return result;
	},
	
	canDeleteScopedAdminContainedRoleRespectingAdminMinCountProperty: function(container, contained) {
		adminMinCount = this.getScopedAdminMinCountIfConfigured(contained);
		var numberOfActiveScopedAdminIfRoleRemoved = this.countNumberOfActiveScopeAdminIfContainsRemoved(container, contained);
		return numberOfActiveScopedAdminIfRoleRemoved >= adminMinCount;
	},
	
	canDeleteActiveScopedAdminRespectingAdminMinCountProperty: function(user, role) {
		adminMinCount = this.getScopedAdminMinCountIfConfigured(role);
		var numberOfActiveScopedAdminIfRoleRemoved = this.countNumberOfActiveScopeAdminIfRoleRemoved(user, role);
		return numberOfActiveScopedAdminIfRoleRemoved >= adminMinCount;
	},
	
	getScopedAdminMinCountIfConfigured: function(role) {
		var adminMinCountPropertyName = this.getScopedAdminMinCountPropertyName(role);
		var adminMinCount = GlideProperties.getInt(adminMinCountPropertyName, 1);
		adminMinCount = adminMinCount < 2 ? 1 : adminMinCount;
		return adminMinCount;
	},
	
	getScopedAdminMinCountPropertyName: function(role) {
		var scopeName = this.getScopeName(role);
		var adminMinCountPropertyName = scopeName.concat('.min_admin_count');
		return adminMinCountPropertyName;
	},
	
	getUserScopeAdminRolesGr: function(userSysID) {
		var gr = new GlideRecord('sys_user_has_role');
		gr.addQuery('user', userSysID);
		
		// Then filter user role which is scoped admin, following existing logic in the function isScopeAdminRole
		// So for user with 1000 user roles and 5 of them are scoped admin role, this filter will limit the number of return down to 5.
		if (GlideTableDescriptor.fieldExists('sys_user_role', 'scoped_admin')) {
			gr.addQuery('role.scoped_admin', 'true');
		} else {
			gr.addQuery('role.assignable_by', "SAMEAS", "sys_id"); // i.e. where field 'assignable_by' = field 'sys_id'
		}
		gr.addQuery('role.sys_scope.scoped_administration', 'true');
		
		gr.query();
		return gr;
	},
	
	isScopeAdminRole: function(roleSysID) {
		var gr = new GlideRecord('sys_user_role');
		if (GlideTableDescriptor.fieldExists('sys_user_role', 'scoped_admin')) {
			gr.addQuery('sys_id', roleSysID);
			gr.addQuery('scoped_admin', 'true');
		} else {
			gr.addQuery('assignable_by', roleSysID);
		}
		gr.addQuery('sys_scope.scoped_administration', 'true');
		gr.query();
		return gr.getRowCount() > 0;
    },

    getContainsScopedAdminRoleIDs: function(roleSysID) {
        var rmAPI = new SNC.RoleManagementAPI();
        var containsIDs = rmAPI.findAllContainedRolesForRole(roleSysID);
        var it = containsIDs.iterator();
        // build scoped admin role result
        var scopedAdminRoleIDs = [];
        while (it.hasNext()) {
            var elem = it.next();
            if (this.isScopeAdminRole(elem))
                scopedAdminRoleIDs.push(elem);
        }
        return scopedAdminRoleIDs;
    },
        
	isScopedAdminIfRoleScopedAdminDisabled: function(scopeID, userID, roleID) {
		var scopedAdminRoleIDs = this.getScopedAdminRoleIDs(scopeID);
		var userScopedRolesIDs = this.getUserScopedRoleIDs(scopeID, userID);
		var intersectRoles = new ArrayUtil().intersect(scopedAdminRoleIDs, userScopedRolesIDs);
		if (intersectRoles.length == 1  && new ArrayUtil().contains(intersectRoles, roleID))
			return false;
		
		return intersectRoles.length > 0;
	},
	
	getUserScopedRoleIDs: function(scopeID, userID) {
		var roleIDs = [];
		var gr = new GlideRecord('sys_user_has_role');
		gr.addQuery('user', userID);
		gr.addQuery('role.sys_scope', scopeID);
		gr.query();
		while (gr.next())
			roleIDs.push(gr.role.toString());
		
		return roleIDs;
	},
	
	getScopedAdminRoleIDs : function(scopeID) {
		var gr = this._getScopedAdminRolesGr(scopeID);
		var res = [];
		while (gr.next())
			res.push(gr.getUniqueValue().toString());
		
		return res;
	},
	
	getScopeAdminRolesArray : function(scope) {
		var gr = this._getScopeAdminRolesGr(scope);
		var res = [];
		while (gr.next())
			res.push(gr.sys_id);
		return res;
	},
	
	isScopedAdministrationOn: function(scopeID) {
		var gr = new GlideRecord('sys_scope');
		if (gr.get('sys_id', scopeID))
			return JSUtil.getBooleanValue(gr, 'scoped_administration');
		return false;
	},
	
	_getScopedAdminRolesGr: function(scopeID) {
		var gr = new GlideRecord('sys_scope');
		if (gr.get('sys_id', scopeID) && JSUtil.getBooleanValue(gr, 'scoped_administration'))
			return this._getScopeAdminRolesGr(gr);
		
		return new GlideRecord('sys_user_role');
	},
	
	_getScopeAdminRolesGr : function(scope) {
		var gr = new GlideRecord('sys_user_role');
		if (GlideTableDescriptor.fieldExists('sys_user_role', 'scoped_admin')) {
			gr.addQuery('sys_scope', scope.sys_id);
			gr.addQuery('scoped_admin', 'true');
		} else {
			var jc = gr.addJoinQuery('sys_user_role', 'sys_id', 'assignable_by');
			jc.addCondition('sys_scope', scope.sys_id);
		}
		gr.query();
		return gr;
	},
	
	_getAdminRoleContainsGr : function() {
		var adminRole = this._getAdminRoleGr();
		
		var roleContains = new GlideRecord('sys_user_role_contains');
		roleContains.addQuery('role', adminRole.sys_id);
		roleContains.query();
		return roleContains;
	},
	
	_getAdminRoleGr : function () {
		var adminRole = new GlideRecord('sys_user_role'); 
		adminRole.get('name', 'admin');
		return adminRole;
	},
	
    type: 'ScopedAdministration'
};
```