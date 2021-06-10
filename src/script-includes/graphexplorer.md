---
title: "GraphExplorer"
id: "graphexplorer"
---

API Name: sn_cs_builder.GraphExplorer

```js
var GraphExplorer = Class.create();
GraphExplorer.prototype = {
    initialize: function() {
    },

	State : {"HAS_EXIT" : "HAS_EXIT", "NO_EXIT": "NO_EXIT", "ENDLESS_LOOP": "ENDLESS_LOOP", "IS_ERROR" : "IS_ERROR" },

	PathState: function(node, state)  {
		var obj = {
				"state" : state,
				"node" : node,
					
				getState : function() {
					return this.state;
				},
					
				setState : function (state) {
					this.state = state;
				},
					
				getNode : function() {
					return this.node;
				},
					
				setNode : function(node) {
					this.node = node;
				}
			};
		
		return obj;
	},
	
	traverse : function(map, rootNodeId, visited, count) {		
		if (!count)
			count = 0;
		
		var rootNode = map[rootNodeId];
		var outcome =  this.PathState(rootNode, this.State.NO_EXIT);
		var hasBeenVisited = visited.indexOf(rootNodeId) > -1;
	
		if (hasBeenVisited || count > 500) {
			outcome.setState(this.State.ENDLESS_LOOP);
			gs.debug("Possible infinte loop, studying node {0}, ({1})", rootNodeId, rootNode.getName());
			
			return outcome;
		}
	
		if(!rootNode.hasChild()) {
			gs.debug("Leaf Node: {0}", rootNode.getName());
			outcome.setState(this.State.HAS_EXIT);
			
			return outcome;
		}
		
		visited.push(rootNodeId);
		
		if(rootNode.type == "ValidatorDecisionNode") {
			var childState = this.State.NO_EXIT;
			var children = rootNode.getChildren(map);
			for (var i = 0; i < children.length; i++) {
				var childNode = children[i];
				outcome = this.traverse(map, childNode.sys_id, visited, count + 1);
		
				if (outcome.getState() == this.State.ENDLESS_LOOP) {
					outcome.setState(this.State.NO_EXIT); // set state to NO_EXIT because we are at a decision node
				}

				if(outcome.getState() == this.State.IS_ERROR) {
					gs.error("Endless Loop: {0} ({1})", childNode.getName(), childNode.sys_id);

					return outcome;
				} else if (outcome.getState() == this.State.HAS_EXIT) {
					childState = this.State.HAS_EXIT;
				}
			}
			
			gs.debug("End of branch: {0}, state: {1}", rootNode.getName(), childState);
			outcome.setState(childState);
			
			return outcome;
		} else {
			// Not a decision node
			outcome = this.traverse(map, rootNode.getChildNode(map).sys_id, visited, count + 1);
			if (outcome.getState() == this.State.ENDLESS_LOOP && outcome.getNode().sys_id == rootNode.sys_id)
				outcome.setState(this.State.IS_ERROR);
				
			return outcome;
		}
		
	},
	
    type: 'GraphExplorer'
};
```