---
title: "RosterMember"
id: "rostermember"
---

API Name: global.RosterMember

```js
gs.include("PrototypeServer");
gs.include("AJAXHelper");

var RosterMember = Class.create();

RosterMember.prototype = {
	initialize: function() {
	},
	
	isUserRostered: function(userSysId, groupSysId) {
		if (JSUtil.nil(userSysId) || JSUtil.nil(groupSysId))
			return false;
		var gr = new GlideRecord('cmn_rota_member');
		gr.addQuery('member', userSysId);
		gr.addQuery('roster.rota.group', groupSysId);
		gr.query();
		return gr.next();
	},
	
	getRosters: function(groupID) {
		var gr = new GlideRecord("cmn_rota_roster");
		gr.addQuery("group", groupID);
		gr.query();
		var a = new AJAXHelper();
		a.createItemXML(gr, root, ['sys_id', 'name']);
	},
	
	getMembers: function(rosterID) {
		var doc = root.getOwnerDocument();
		var u = GlideUser;
		var gr = new GlideRecord("cmn_rota_member");
		gr.addQuery("roster", rosterID);
		gr.query();
		while (gr.next()) {
			// get the name of the member from the user table
			var name = u.resolveNameFromSysID(gr.getValue("member"));
			var item = doc.createElement('item');
			root.appendChild(item);
			item.setAttribute('sys_id', gr.getValue('sys_id'));
			item.setAttribute('name', name);
		}
	},
	
	saveOverride: function() {
		
	}
	
};
```