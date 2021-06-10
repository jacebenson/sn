---
title: "GoalList"
id: "goallist"
---

API Name: sn_cs_builder.GoalList

```js
var GoalList = Class.create();
GoalList.prototype = {
    initialize: function() {
		
    },
	
	getGoalsForTopic: function getGoalsForTopic(topic) {
		var goals = [];
		
		if (!topic)
			return goals;
		
		var topicGR = new GlideRecordSecure("sys_cb_topic");
		if (!topicGR.get(topic) || !topicGR.canRead())
			return goals;
		
		var goalGR = new GlideRecordSecure("sys_cb_goal");
		goalGR.addQuery("topic", topic);
		goalGR.query();
		
		while (goalGR.next())
			goals.push(this._getGoalObject(goalGR));
		
		return goals;
		
	},
	
	_getGoalObject : function _getGoalObject(goalGR) {
		return {
				name : goalGR.getValue("name"),
				description : goalGR.getValue("description"),
				title : goalGR.getValue("name"),
				greeting : goalGR.getValue("greeting_msg"),
				confirmation : goalGR.getValue("confirmation_msg"),
				type : goalGR.getValue("type"),
				topic : goalGR.getValue("topic"),
				nodes : this.getNodeIdsForTopicGoal(goalGR.getValue("topic"), goalGR.getValue("sys_id")),
				sys_id : goalGR.getValue("sys_id")
			};
	},
	
	getGoal : function getGoal(goal) {
		var goalObj = {};
		
		if (!goal)
			return goalObj;
		
		var goalGR = new GlideRecordSecure("sys_cb_goal");
		if (!goalGR.get(goal))
			return goalObj;
		
		goalObj = this._getGoalObject(goalGR);
		
		return goalObj;
	},
	
	getNodeIdsForTopicGoal: function getNodeIdsForTopicGoal(topic, goal) {
		var nodes = [];
		
		if (!goal)
			return nodes;
		
		var goalGR = new GlideRecordSecure("sys_cb_goal");
		goalGR.addQuery("topic", topic);
		goalGR.addQuery("sys_id", goal);
		goalGR.query();
		
		if (!goalGR.hasNext())
			return nodes;
		
		var nodeGR = new GlideRecordSecure("sys_cb_node");
		nodeGR.addQuery("topic_goal", goal);
		nodeGR.query();
		
		while (nodeGR.next())
			nodes.push(nodeGR.getValue("sys_id"));
		
		return nodes;
	},
	
    type: 'GoalList'
};
```