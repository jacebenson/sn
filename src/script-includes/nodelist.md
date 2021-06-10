---
title: "NodeList"
id: "nodelist"
---

API Name: sn_cs_builder.NodeList

```js
var NodeList = Class.create();
NodeList.prototype = {
    initialize: function() {
		
    },
	
	getNodeForTopicGoal : function getNodeForTopicGoal(topic, goal, node) {
		var nodeObj = {};
		
		if (!topic || !goal || !node)
			return nodeObj;
		
		var goalGR = new GlideRecordSecure("sys_cb_goal");
		goalGR.addQuery("topic", topic);
		goalGR.addQuery("sys_id", goal);
		goalGR.query();
		
		if (!goalGR.hasNext())
			return nodeObj;
		
		var nodeGR = new GlideRecordSecure("sys_cb_node");
		nodeGR.addQuery("topic_goal", goal);
		nodeGR.addQuery("sys_id", node);
		nodeGR.query();
		
		if (nodeGR.next())
			nodeObj = this._getNodeObject(nodeGR);
		
		return nodeObj;
	},
	
	getNodesForTopicGoal: function getNodesForTopicGoal(/* String sys_id */topic, goal) {
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
			nodes.push(this._getNodeObject(nodeGR));
		
		return nodes;
	},
	
	_getNodeObject: function _getNodeObject(/* GlideRecord node */nodeGR) {
		var node = {};
		if (!nodeGR || !nodeGR.isValidRecord() || !nodeGR.canRead())
			return node;
		
		node.sys_id = nodeGR.getValue("sys_id");
		node.parents = [nodeGR.getValue("parent")];
		
		if (nodeGR.getRecordClassName() == "sys_cb_collector") {
			//re-query to get the parents
			var mergeGR = new GlideRecordSecure("sys_cb_collector");
			mergeGR.get(nodeGR.getValue("sys_id"));
			node.parents = (mergeGR.getValue("parent_nodes") || []).split(",");
		}
		
		node.table = nodeGR.getRecordClassName();
		node.name = nodeGR.getValue("name");
		node.descendants = this._getNodeDescendants(nodeGR);
		
		if (nodeGR.getRecordClassName() == "sys_cb_decision") {
			var decisionNode = new GlideRecordSecure("sys_cb_decision");
			decisionNode.get(nodeGR.getValue("sys_id"));
			node.decision_type = decisionNode.getValue("type") || "manual";
		}
			
		
		return node;
	},
	
	_getNodeDescendants: function _getNodeDescendants(/* GlideRecord node */ nodeGR) {
		var nodes = [];
		
		if (!nodeGR || !nodeGR.isValidRecord())
			return nodes;
		
		var parent_id = nodeGR.getValue("sys_id");
		var topic_goal = nodeGR.getValue("topic_goal");
		
		var desGR = new GlideRecordSecure("sys_cb_node");
		desGR.addQuery("parent", parent_id);
		desGR.addQuery("topic_goal", topic_goal);
		//merges have multiple parents in a glidelist
		desGR.addQuery("sys_class_name", "!=", "sys_cb_collector");
		desGR.query();
		
		while (desGR.next())
			nodes.push({
				table : desGR.getRecordClassName(),
				sys_id : desGR.getValue("sys_id")
			});
		
		var mergeGR = new GlideRecordSecure("sys_cb_collector");
		mergeGR.addQuery("parent_nodes", "CONTAINS", parent_id);
		mergeGR.addQuery("topic_goal", topic_goal);
		mergeGR.query();
		
		while (mergeGR.next())
			nodes.push({
				table : "sys_cb_collector",
				sys_id : mergeGR.getValue("sys_id")
			});
		
		return nodes;
	},
	
    type: 'NodeList'
};
```