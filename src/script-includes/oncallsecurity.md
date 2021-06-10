---
title: "OnCallSecurity"
id: "oncallsecurity"
---

API Name: global.OnCallSecurity

```js
var OnCallSecurity = Class.create();
OnCallSecurity.prototype = {
	initialize: function() {
	},
	
	rotaAccess: function(group) {
		// is user the manger of the rota's group?
		var this_manager = group.manager == gs.getUserID();
		
		// is user a member of the rota's group?
		var this_member = gs.getUser().isMemberOf(group);
		
		var is_admin = gs.hasRole("roster_admin");
		return (this_manager || this_member || is_admin);
	},
	
	type: 'OnCallSecurity'
};

function rotaAccess(group) {
	return new OnCallSecurity().rotaAccess(group);
}
```