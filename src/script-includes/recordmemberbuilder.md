---
title: "RecordMemberBuilder"
id: "recordmemberbuilder"
---

API Name: global.RecordMemberBuilder

```js
var RecordMemberBuilder = Class.create();
RecordMemberBuilder.prototype = {
    initialize: function() {
		this.members = {};
		this.debug = false;
    },
	put: function(sysId, name, lastName) {
		sysId = sysId.trim();
		name = name.trim();
		
		if (this.debug) {
			gs.log("#####################################");
			gs.log('members: ' + JSON.stringify(members));
			gs.log('sysId: ' + sysId);
			gs.log('name: ' + name);
			gs.log("#####################################");
		}
		if (JSUtil.nil(this.members) || this.members[sysId])
			return;
		
		this.members[sysId] = {
			name: name,
			initials: GlideNGInitials.getInitials(name),
			last_name: lastName ? lastName.trim() : '',
			sys_id: sysId,
			record_is_visible: true
		};
	},
	getJson: function() {
		return JSON.stringify(this.members);
	},
    type: 'RecordMemberBuilder'
};
```