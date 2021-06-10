---
title: "OCGroup"
id: "ocgroup"
---

API Name: global.OCGroup

```js
var OCGroup = Class.create();
OCGroup.prototype = {
    initialize: function(groupId) {
    	this.log = new GSLog("com.snc.on_call_rotation.log.level", this.type);
		this.groupId = groupId;
    },

	/* Get an array of User objects for active users in a group
	 *
	 * @return [Array]: An array of user objects which each contain two keys, 
	 *				    'sys_id' and 'name' of the sys_user record
	 */
	getMembers: function() {
		var members = [];
		if (JSUtil.nil(this.groupId))
			return members;

		var liveProfile = new GlideappLiveProfile();
		var gr = new GlideRecord('sys_user_grmember');
		gr.addQuery('group', this.groupId);
		gr.addQuery('user.active', 'true');
		gr.orderBy('user.name');
		gr.query();
		while (gr.next()) {
			var avatar = liveProfile.getAvatar(liveProfile.getID(gr.user.sys_id + ''));
			members.push({
					'name': gr.user.name + '',
					'sys_id': gr.user + '',
					'user_email': gr.user.email + '',
					'user_contact_number': gr.user.mobile_phone + '' != '' ? gr.user.mobile_phone + '' : gr.user.phone + '',
					'userID': gr.user + '',
					'initials': new SNC.LiveFeedApi().getInitials(gr.user.name + ''),
					'avatar': avatar
				});
		}
		return members;
	},

	/* Get an array of User objects for active users in a group that are on-call at this point in time
	 *
	 * @return [Array]: An array of user objects which each contain two keys,
	 *				    'sys_id' and 'name' of the sys_user record
	 */
	getOnCallMembers: function() {
		var liveProfile = new GlideappLiveProfile();
		var spans = new OCRotationV2()
		.setStartDate(this.startDateTime)
		.setEndDate(this.endDateTime)
		.setGroupIds(this.groupId)
		.setRotaIds(this.rotaIds)
		.setRosterIds(this.rosterIds)
		.getSpans();

		var memberSysIds = [];
		for (var i = 0; i < spans.length; i++)
			if (spans[i].table == 'cmn_rota_member')
				memberSysIds.push(spans[i].user_id);

		var members = [];
		var gr = new GlideRecord('sys_user_grmember');
		gr.addQuery('group', this.groupId);
		gr.addQuery('user.active', 'true');
		gr.addQuery('user.sys_id', 'IN', memberSysIds);
		gr.query();
		while (gr.next()) {
			var avatar = liveProfile.getAvatar(liveProfile.getID(gr.user.sys_id + ''));
			members.push({
					'name': gr.user.name + '',
					'sys_id': gr.user + '',
					'user_email': gr.user.email + '',
					'user_contact_number': gr.user.mobile_phone + '' != '' ? gr.user.mobile_phone + '' : gr.user.phone + '',
					'userID': gr.user + '',
					'initials': new SNC.LiveFeedApi().getInitials(gr.user.name),
					'avatar': avatar
				});
		}
		return members;
	},

	/* Get an array of User objects for active users in a group that are NOT on-call at this point in time
	 *
	 * @return [Array]: An array of user objects which each contain two keys, 
	 *				    'sys_id' and 'name' of the sys_user record
	 */
	getAvailableMembers: function() {
		var allMembers = this.getMembers();
		var onCallMembers = this.getOnCallMembers();
		var memberIndex = this._indexFrom(onCallMembers);
		this.log.debug("[getAvailableMembers] allMembers: " + JSON.stringify(allMembers));
		this.log.debug("[getAvailableMembers] onCallMembers: " + JSON.stringify(onCallMembers));
		return this._difference(allMembers, memberIndex, this._hasMember);
	},

	getRefQualAvailableMembers: function(rotaMemberGr, rosterGr) {
		if (!JSUtil.nil(rotaMemberGr) && !JSUtil.nil(rotaMemberGr.roster.rota.group))
			this.groupId = rotaMemberGr.roster.rota.group;
		else if (!JSUtil.nil(rosterGr) || !JSUtil.nil(rosterGr.rota.group))
			this.groupId = rosterGr.rota.group;
		if (JSUtil.nil(this.groupId))
			return "";
		this.log.debug("[getRefQualAvailableMembers] groupId: " + this.groupId);
		var members = [];
		var gr = new GlideRecord("sys_user_grmember");
		gr.addQuery("group", this.groupId);
		gr.addQuery("user.active", "true");
		gr.orderBy("user.name");
		gr.query();
		while (gr.next())
			members.push(gr.user + "");
		if (members.length > 0)
			return "sys_idIN" + members.join(",");
		return "";
	},

	setGroupId: function(groupId) {
		this.groupId = groupId;
		return this;
	},

	setStartDateTime: function(startDateTime) {
		this.startDateTime = startDateTime;
		return this;
	},

	setEndDateTime: function(endDateTime) {
		this.endDateTime = endDateTime;
		return this;
	},

	setRotaIds: function(rotaIds) {
		this.rotaIds = rotaIds;
		return this;
	},

	setRosterIds: function(rosterIds) {
		this.rosterIds = rosterIds;
		return this;
	},

	_indexFrom: function(members) {
		var index = {};
		for (var i = 0; i < members.length; i++) {
			var subindex = index.hasOwnProperty(members[i].sys_id) ? index[members[i].sys_id] : index[members[i].sys_id] = {};
			subindex[members[i].name] = {};
		}
		return index;
	},

	_hasMember: function (member, index) {
		return index.hasOwnProperty(member.sys_id);
	},

	_difference: function (members, index, has) {
		var result = [];
		for (var i = 0; i < members.length; i++) {
			var member = members[i];
			if (!has(member, index))
				result.push(member);
		}
		return result;
	},

    type: 'OCGroup'
};
```