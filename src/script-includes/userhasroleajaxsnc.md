---
title: "UserHasRoleAjaxSNC"
id: "userhasroleajaxsnc"
---

API Name: global.UserHasRoleAjaxSNC

```js
var UserHasRoleAjaxSNC = Class.create();

UserHasRoleAjaxSNC.prototype = Object.extendsObject(AbstractAjaxProcessor, {
    ajaxFunction_userHasRole: function() {
		var userIds = this.getParameter('sysparm_user_sys_ids');
		var kb = this.getParameter('sysparm_kb');
		var field = this.getParameter('sysparm_field');
		
		userIds = GlideStringUtil.split(userIds);
		var users = [];
		var canRunScript;
		
		var kbGr = new GlideRecord('kb_knowledge_base');
		if(kb != "-1")
			canRunScript = kbGr.get(kb) && kbGr[field].canWrite();
		else {
			kbGr.initialize();
			canRunScript = kbGr[field].canCreate();
		}
		if(canRunScript){
			for(var i = 0; i < userIds.size(); i++) {
				var hasRoleGR = new GlideRecord('sys_user_has_role');
				var sysId = userIds.get(i);
				hasRoleGR.addQuery('user', sysId);
				var orCondition = hasRoleGR.addQuery('role.name', 'knowledge_manager');
				orCondition.addOrCondition('role.name', 'admin'); 
				hasRoleGR.query();

				if (!hasRoleGR.hasNext()){
					var user = GlideUser.getUserByID(sysId);
					users.push(user.getFullName());
				}
			}
		}
		return users.join(", ");
	}

});
```