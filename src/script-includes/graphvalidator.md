---
title: "GraphValidator"
id: "graphvalidator"
---

API Name: sn_cs_builder.GraphValidator

```js
var GraphValidator = Class.create();
GraphValidator.prototype = {
    initialize: function() {
		this.explorer = new GraphExplorer();
		this.nodemap = {};
		this.outcome = null;
		this.top = "";
    },
	
	validateGoal : function(goal) {
		this.goal = goal;
		if (typeof goal == "string")
			this.topic = this._getTopicForGoal();
		else
			this.topic = goal.getValue("topic");
		
		this._getTopNodeId(goal);
		this._populateMap();
		
		this.outcome = this.explorer.traverse(this.nodemap, this.top, []);
	},
	
	getOutcome : function() {
		return this.outcome;
	},
	
	_populateMap : function() {
		var nodes = new NodeList().getNodesForTopicGoal(this.topic, this.goal);
		//populate the nodes first, then add the children
		for (var i = 0; i < nodes.length; i++) {
			var node, nodeL = nodes[i];
			if (nodeL.table == "sys_cb_decision")
				node = new ValidatorDecisionNode(nodeL.name, nodeL.sys_id);
			else
				node = new ValidatorNode(nodeL.name, nodeL.sys_id);

			this.nodemap[nodeL.sys_id] = node;
		}
		
		//add the children
		for (i = 0; i < nodes.length; i++) {
			var nodeFromList = nodes[i];
			var childId = null;
			var descendant = null;
			var nodeFromMap = null;
			
			nodeFromMap = this.nodemap[nodes[i].sys_id];
			//for decisions we have to loop over children
			if (nodeFromMap.type == "ValidatorDecisionNode") {
				for (var j = 0; j < nodeFromList.descendants.length; j++) {
					descendant = nodeFromList.descendants[j];
					nodeFromMap.addChild(descendant.sys_id);
				}
			} else {
				descendant = nodeFromList.descendants[0];
				if (descendant)
					childId = descendant.sys_id;
				
				if (childId)
					nodeFromMap.setChildNode(childId);
			}
		}
	},
	
	_getTopicForGoal : function(goal) {
		var goalGR = new GlideRecordSecure("sys_cb_goal");
		goalGR.get(this.goal);
		
		return goalGR.getValue("topic");
	},
	
	_getTopNodeId : function() {
		var nodeGR = new GlideRecordSecure("sys_cb_node");
		nodeGR.addQuery("topic_goal", this.goal);
		nodeGR.addQuery("sys_class_name", "!=", "sys_cb_collector");
		nodeGR.addNullQuery("parent");
		nodeGR.query();
		
		if (nodeGR.next())
			this.top = nodeGR.getValue("sys_id");
		
		else {
			nodeGR.initialize();
			nodeGR.addQuery("topic_goal", this.goal);
			nodeGR.addQuery("sys_class_name", "!=", "sys_cb_collector");
			nodeGR.addQuery("parent", "");
			nodeGR.query();
						
			if (nodeGR.next())
				this.top = nodeGR.getValue("sys_id");
		}
	},

    type: 'GraphValidator'
};
```