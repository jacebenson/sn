---
title: "ConversationNodeUtil"
id: "conversationnodeutil"
---

API Name: global.ConversationNodeUtil

```js
var ConversationNodeUtil = Class.create();
ConversationNodeUtil.prototype = {
    ERROR_NO_SOURCE : "No source node provided. Unable to create a relationshsip without a source.",
    ERROR_NO_TARGET : "No target node provided. Unable to create a relationshsip without a target.",
	
	lastError : "",
	
	RuleRegistry : null,
	
	initialize: function() {
		this.RuleRegistry = NodeRuleRegistry.create();
		this.registerRules();
    },
	
	insertNode: function() {
		
	},
	
	update : function(record) {
		return record.update();
	},
	
	insert : function(record) {
		return record.insert();
	},
	
	connect : function(source, target) {

		var parents;
		gs.debug("Connecting {0} ({1}) to {2} ({3})", source.getValue("name"), source.getValue("sys_id"), target.getValue("name"), target.getValue("sys_id"));
		
		if (target.getRecordClassName() == "sys_cb_collector") {
			gs.debug("Parent is a merge, so add connection there.");
		
			parents = target.getValue("parent_nodes").split(",");
			gs.debug("Parents of target were {1}",parents.join(","));
			
			parents.push(source.getValue("sys_id"));
			target.setValue("parent_nodes", parents.join(","));
			gs.debug("Parents of target are {1}", parents.join(","));
			
			return !!target.update();
		} else if (target.parent.getRefRecord().getRecordClassName() == "sys_cb_collector") {
			gs.debug("Parent of target is a merge, so add the connection to the parent");
			
			var parent = target.parent.getRefRecord();
			parents = parent.getValue("parent_nodes").split(",");
			parents.push(source.getValue("sys_id"));
			parent.setValue("parent_nodes", parents.join(","));
			parent.setWorkflow(false);
			
			var updated = !!parent.update();
			if (updated)
				(new GlideUpdateManager2()).saveRecord(parent);
			
			return updated;
		} else {
			gs.debug("The target is not a merge, so we need to create one.");
			
			var newMerge = new GlideRecord("sys_cb_collector");
			newMerge.newRecord();
			newMerge.setValue("name", target.getValue("name") + " automerge");
			newMerge.setValue("topic_goal", target.getValue("topic_goal"));
			newMerge.setValue("variable_table", "var__m_topic_variable_" + target.getValue("topic_goal"));
			gs.debug("Possible scope collision.");
			if (newMerge.getValue("sys_scope") != source.getValue("sys_scope"))
				return false;
			
			gs.debug("Inserting new merge {0} ({1})", newMerge.getValue("name"), newMerge.getUniqueValue());
			
			newMerge.setWorkflow(false);
			newMerge.setValue("parent_nodes", [source.getValue("sys_id"), target.getValue("parent")].join());
			
			var inserted = !!newMerge.insert();
			if (inserted) {
				(new GlideUpdateManager2()).saveRecord(newMerge);
				gs.debug("New merge was inserted, reparent the target {0} ({1}) to the new merge {2} ({3})", target.getValue("name"),target.getValue("sys_id"), target.getValue("sys_id"));
				target.setValue("parent", newMerge.getUniqueValue());
				gs.debug("Target reparented to {0}", newMerge.getUniqueValue());
				target.setWorkflow(false);
				
				var updated = !!target.update();
				if (updated)
					(new GlideUpdateManager2()).saveRecord(target);

				return updated;
			}
						
			return false;
		}
		
	},
	
	disconnect : function (source, target) {
		var parents = [];
		var newParents = [];
		var found = false;
		var updated = false;
		//source is the OUT record, target is in the IN record
		if (target.getRecordClassName() != "sys_cb_collector") {
			var newTarget = target.parent.getRefRecord();
			if (!newTarget || newTarget.getRecordClassName() != "sys_cb_collector")
				return false;
			
			target = newTarget;
			gs.debug("New target node is {0} ({1})", target.getValue("name"), target.getValue("sys_id"));
		}
		
		//see if the parent list includes the source
		if (!target.parent_nodes.nil())
			parents = target.getValue("parent_nodes").split(",");
		
		gs.debug("Target's parent node list: {0}", parents.join(","));
		
		for (var i = 0; i< parents.length; i++) {
			var id = parents[i];
			if (id == source.getValue("sys_id"))
				found = true;
			else
				newParents.push(id);
		}
		
		
		
		if (found) {
			gs.debug("Found the connection between {0} and {1}, removing it", target.getValue("name"), source.getValue("name"));
			
			if (newParents.length > 0) {
				target.setValue("parent_nodes", newParents.join(","));
				updated = !!target.update();
			}	
		}
		
		//the parent is the record we disconnected from, or there is only one parent so delete the merge
		if (newParents.length < 2) {
			gs.debug("Deleting target record {0} because there is no need for a merge here anymore.", target.getValue("name"));
			updated = target.deleteRecord();
		}
		
		gs.debug("Target has been modified or deleted? {0}", updated +'');
		return updated;
	},
	
	getNode : function(id) {
		var sys_id;
		if (id && typeof id != "string")
			 sys_id = id.getValue("sys_id");
		else
			 sys_id = id;
		
		var baseGR = new GlideRecord("sys_cb_node");
		baseGR.get(sys_id);
		
		var type = baseGR.getRecordClassName();
		var nodeGR = new GlideRecord(type);
		nodeGR.get(sys_id);
		
		return nodeGR;
		
	},
	
	getChildForNode : function(node) {
		gs.debug("Looking up child for node {0} ({1}) of type {2}", node.getValue("name"), node.getValue("sys_id"), node.getRecordClassName());
		
		var sys_id = node.getValue("sys_id");
		
		var baseGR = new GlideRecord("sys_cb_node");
		baseGR.addQuery("parent", sys_id);
		baseGR.query();
		
		if (baseGR.next()) {
			var type = baseGR.getRecordClassName();
			var nodeGR = new GlideRecord(type);
			nodeGR.get(baseGR.getValue("sys_id"));
		
			return nodeGR;
		}
		
		var collectorGR = new GlideRecord("sys_cb_collector");
		collectorGR.addQuery("parent_nodes", "CONTAINS", sys_id);
		collectorGR.query();
		
		if (collectorGR.next())
			return collectorGR;
		
		return null;
		
	},
	
	canNodeBeDeleted : function(nodeGR) {
		//a node can be deleted if there are no children to it
		if (this._hasNoChildren(nodeGR))
			return true;
		
		//a node can be deleted if it's a decision, and it's children can be deleted
		if (this._decisionCanBeDeleted(nodeGR))
			return true;
		
		//a node can be deleted if it has a collector kid and we can unparent it
		if (this._collectorCanBeDeleted(nodeGR))
			return true;
		
		return false;
	},
	
	reparentNode : function(nodeGR, newParent) {
		if (nodeGR.getRecordClassName() == "sys_cb_collector")
			return this._reparentCollector(nodeGR, newParent);
			
		else
			nodeGR.setValue("parent", newParent);
		
		return nodeGR;
	},
	
	_reparentCollector : function(target, newParent) {
		var parents = [];
		var newParents = [newParent];
		
		//see if the parent list includes the source
		if (!target.parent_nodes.nil())
			parents = target.getValue("parent_nodes").split(",");
		
		gs.debug("Target's parent node list: {0}", parents.join(","));
		
		for (var i = 0; i< parents.length; i++) {
			if (parents[i] != newParent)
				newParents.push(parents[i]);
		}
		
		target.setValue("parent_nodes", newParents.join(","));
		
		return target;
	},
	
	_hasNoChildren : function(nodeGR) {
		var nodes = new GlideRecord("sys_cb_node");
		nodes.addQuery("parent", nodeGR.getValue("sys_id"));
		nodes.query();
		gs.debug("Number of child nodes for {0} ({1}): {2}", nodeGR.getValue("name"), nodeGR.getValue("sys_id"), nodes.getRowCount());
		
		if (nodes.hasNext())
			return false;
		
		var collectors = new GlideRecord("sys_cb_collector");
		collectors.addQuery("parent_nodes", "CONTAINS", nodeGR.getValue("sys_id"));
		collectors.query();
		
		gs.debug("Number of child collectors for {0} ({1}): {2}", nodeGR.getValue("name"), nodeGR.getValue("sys_id"), collectors.getRowCount());
		return !collectors.hasNext();
	},
	
	_decisionCanBeDeleted : function(nodeGR) {
		if (nodeGR.getRecordClassName() != "sys_cb_decision")
			return false;
		
		//decision can be deleted if all outcomes have same child
		var grandkids = [];
		
		var outcomes = new GlideRecord("sys_cb_outcome");
		outcomes.addQuery("parent", nodeGR.getValue("sys_id"));
		outcomes.query();
		
		while(outcomes.next()) {
			var child = this.getChildForNode(outcomes);
			gs.debug("Grandchild {0} ({1}) found.", child.getValue("name"), child.getValue("sys_id"));
			
			if (child && grandkids.indexOf(child.getValue("sys_id")) == -1)
				grandkids.push(child.getValue("sys_id"));
		}
		
		gs.debug("Number of grandkids found: {0}", grandkids.length);
		return (grandkids.length < 2);

	},
	
	_collectorCanBeDeleted : function(nodeGR) {
		if (nodeGR.getRecordClassName() != "sys_cb_collector")
			return false;
		
		var parents = [];
		var parent_id;
		var oldNode, newNode;
		
		//need to get real record
		var node = this.getNode(nodeGR);
		
		if (node.parent_nodes.nil())
			return false; //something is wrong, this merge is bad		
		
		var parent_nodes = node.getValue("parent_nodes").split(",");
		
		//if there is more than parent, and a child, we can't delete because we don't know where to reparent the child
		if (parent_nodes.length > 1 && this.getChildForNode(nodeGR) )
			return false;
		
		//can delete a collector if it has only one parent
		if (parent_nodes.length == 1)
			return true;
		
		//can delete if the collectors parents are solely outcomes to the same decision
		while (parent_nodes.length > 0 ) {
			parent_id = parent_nodes.pop();
			newNode = this._getNode(parent_id);
			
			if (oldNode && oldNode.getValue("sys_id") != newNode.getValue("sys_id"))
				return false;
			
			oldNode = newNode;
		}
		
		return true;
	},

	registerRules : function() {
		this.RuleRegistry.registerRule("sys_cb_node", {
			name : "One top-level node",
			takes : "node",
			rule : function(node) {
				var sibling = new GlideRecord("sys_cb_node");
				sibling.addNullQuery("parent");
				sibling.addQuery("topic_goal", node.getValue("topic_goal"));
				sibling.addQuery("sys_id", "!=", node.getValue("sys_id"));
				sibling.addQuery("sys_class_name", "!=", "sys_cb_collector");
				sibling.query();
	
				return !sibling.hasNext();
			},
			error : "There is already a top-level Prompt, Action, Decision or Collector. Please select an appropriate Parent for this record and resubmit."
		});
		
		this.RuleRegistry.registerRule("sys_cb_goal", {
			name : "Only one Primary goal",
			takes : "goal",
			rule : function(goal) {
				
				if (goal.getValue("applicability_type") != "primary")
					return true;
				
				var sibling = new GlideRecord("sys_cb_goal");
				sibling.addQuery("topic", goal.getValue("topic"));
				sibling.addQuery("applicability_type","primary");
				sibling.addQuery("sys_id", "!=", goal.getValue("sys_id"));
				sibling.addQuery("applicability_type","primary");
				sibling.addQuery("type", "consumer_to_system");
				sibling.query();
				
				return !sibling.hasNext();
			},
			error : "Only one primary Topic Goal can be configured per topic. Please choose a different Condition basis for this Topic Goal, or change the existing primary Topic Goal to have a different condition basis before saving this one."
		});
		this.RuleRegistry.registerRule("sys_cb_outcome", {
			name : "Outcomes can only have Decision parents",
			takes : "sys_cb_outcome",
			rule : function(node) {
				if (!node.getValue("parent"))
					return false;
				
				return node.parent.getRefRecord().getRecordClassName() == "sys_cb_decision";
			},
			error : "Outcome records may only have Decision records for parents. Please change the Parent to a valid Decision and resubmit."
		});
		this.RuleRegistry.registerRule("sys_cb_node", {
			name : "Only outcomes can be Decision children",
			takes : "sys_cb_node",
			rule : function(node) {
				if (current.getRecordClassName() == "sys_cb_outcome")
					return true;
				
				if (current.getValue("parent"))
					return current.parent.getRefRecord().getRecordClassName() != "sys_cb_decision";
				
				return true;

			},
			error : "Only Outcomes may have a Decision as a parent record. Please change the Parent to a valid, non-decision record and resubmit"
		});
		this.RuleRegistry.registerRule("sys_cb_collector", {
			name : "Collectors cannot be top node",
			takes : "sys_cb_collector",
			rule : function(node) {
				if (!node.getValue("parent_nodes"))
					return false;
				
				return true;
			},
			error : "Collectors may not be the top-level node in a goal. Please create a Prompt, Action, or Decision to be the top-level node first."
		});
	},
    type: 'ConversationNodeUtil'
};
```