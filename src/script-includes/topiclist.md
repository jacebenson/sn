---
title: "TopicList"
id: "topiclist"
---

API Name: sn_cs_builder.TopicList

```js
var TopicList = Class.create();
TopicList.prototype = {
    initialize: function() {
    },

	getTopics : function getTopics() {
		var topics = [];
		
		var topicGR = new GlideRecordSecure("sys_cb_topic");
		topicGR.query();
		
		while (topicGR.next())
			topics.push(this._getTopicObject(topicGR));
		
		return topics;
	},
	
	getTopic : function getTopic(/*String sys_id */ topic_id) {
		var topic = {};
		
		var topicGR = new GlideRecordSecure("sys_cb_topic");
		topicGR.addQuery("sys_id", topic_id);
		topicGR.query();
		
		if (topicGR.next())
			topic = this._getTopicObject(topicGR);
			
		return topic;
	},
	
	_getTopicObject : function _getTopicObject(/* GlideRecord topic */ topicGR) {
		return {
				name : topicGR.getValue("name"),
				title : topicGR.getValue("name"),
				key_phrases : topicGR.getValue("key_phrases"),
				sys_id : topicGR.getValue("sys_id"),
				variables : this.getVariablesForTopic(topicGR.getValue("sys_id")),
				goals : this._getGoalIdsForTopic(topicGR.getValue("sys_id"))
			};
	},
	
	getVariablesForTopic : function getVariablesForTopic(/* String */ topic) {
		return new VariableList().getVariablesForTopic(topic);
	},
	
	_getGoalIdsForTopic : function _getGoalIdsForTopic(topic) {
		var goals = [];
		
		if (!topic)
			return goals;
		
		var goalGR = new GlideRecordSecure("sys_cb_goal");
		goalGR.addQuery("topic", topic);
		goalGR.query();
		
		while (goalGR.next())
			goals.push(goalGR.getValue("sys_id"));
		
		return goals;
	},
	
    type: 'TopicList'
};
```