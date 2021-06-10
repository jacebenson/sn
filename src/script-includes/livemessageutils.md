---
title: "LiveMessageUtils"
id: "livemessageutils"
---

API Name: global.LiveMessageUtils

```js
var LiveMessageUtils = Class.create();
LiveMessageUtils.prototype = {
    initialize: function() {
    },
	
	getLiveMessages: function(groupId, profileID, timeAgo) {
		var messages = [];
		var grLiveMessage = new GlideRecord("live_message");
		grLiveMessage.addQuery("group", groupId);
		grLiveMessage.addQuery("profile", "!=", profileID);
		grLiveMessage.addQuery("sys_created_on", ">=", timeAgo);
		grLiveMessage.addQuery("internal", false);
		grLiveMessage.orderBy("sys_created_on");
		grLiveMessage.query();
		while(grLiveMessage.next())
			messages.push(grLiveMessage.getValue("sys_id"));
		return messages.join();
	},
	
	getGroup: function(id) {
		return this._getFieldFromLM(id,'group');
	},
	
	getProfile: function(id) {
		return this._getFieldFromLM(id,'profile');
	},
	
	getQueueID: function(profile) {
		var gr = new GlideRecord('live_group_profile');
		gr.get(profile);
		if (gr.getValue('type') == 'support')
			return gr.document.queue;
		return null;
	},

	getMessageDetails: function(ids) {
		var details = [];
		var grLiveMessage = new GlideRecord("live_message");
		grLiveMessage.addQuery("sys_id", "IN", ids);
		grLiveMessage.orderBy("sys_created_on");
		grLiveMessage.query();
		while(grLiveMessage.next()) {
			details.push({
				message: grLiveMessage.getValue("message"),
				profileID: grLiveMessage.getValue("profile"),
				profile: grLiveMessage.getDisplayValue("profile")
			});
		}
		return details;
	},
	
	getLiveMessageCount: function(messageTime, group) {
		var liveMessageAggregate = new GlideAggregate("live_message");
		liveMessageAggregate.addAggregate("COUNT");
		liveMessageAggregate.addQuery("sys_created_on", ">=", messageTime);
		liveMessageAggregate.addQuery("group", group);
		liveMessageAggregate.addQuery("internal", false);
		liveMessageAggregate.query();
		liveMessageAggregate.next();
		
		return liveMessageAggregate.getAggregate("COUNT");
	},
	
	_getFieldFromLM: function(id, field) {
		var grLiveMessage = new GlideRecord("live_message");
		if(grLiveMessage.get(id)) {
			return {
				displayValue: grLiveMessage.getDisplayValue(field),
				id : grLiveMessage.getValue(field)
			};	
		}
	},
	
    type: 'LiveMessageUtils'
};
```