---
title: "NodeRuleRegistry"
id: "noderuleregistry"
---

API Name: global.NodeRuleRegistry

```js
var NodeRuleRegistry = {
	
	create : function createRegistry(defaultHandler) {
		
		var customRules = {};
		var defaultRules = [{
			name : "Same scope required",
			takes : "node",
			rule : function(node) {
				if (node.getValue("sys_scope") != node.getValue("topic_goal.sys_scope"))
					return false;
			},
			error : "The node's scope must be in the same scope as the goal it is part of."
		},
		{
			name : "Only one child",
			takes : "node",
			rule : function(node) {
				if (node.getRecordClassName() == "sys_cb_outcome")
					return true;
				
				var parent = node.getValue("parent");
				var siblings = new GlideRecord("sys_cb_node");
					siblings.addQuery("parent", parent);
					siblings.addQuery("topic_goal", node.getValue("topic_goal"));
					siblings.addQuery("sys_id", "!=", node.getValue("sys_id"));
					siblings.query();
				
				return siblings.hasNext();
			},
			error: "Another record already has this parent. Each record can only be the parent of one other record. Please choose a different parent and resubmit."
		}];
		
		function getRulesByKey(key) {
			if (!customRules[key])
				return defaultRules;
			
			return customRules[key];
		}

		function addRule(key, rule) {
			if (customRules[key])
				customRules[key] = rule;
			else
				customRules[key]= [rule];
		}
		
		return {
			registerRule : function(key, rule) {
				addRule(key, rule);
			},
			
			rulesForKey : function(key) {
				return getRulesByKey(key);
			}
		}
	}	
};
```