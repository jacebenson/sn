---
title: "ValidatorDecisionNode"
id: "validatordecisionnode"
---

API Name: sn_cs_builder.ValidatorDecisionNode

```js
var ValidatorDecisionNode = Class.create();
ValidatorDecisionNode.prototype = Object.extendsObject(ValidatorNode, {
	initialize : function(name, sys_id) {
		ValidatorNode.prototype.initialize.call(this, name, sys_id);
		this.children = [];
	},
	
	getChildren : function(map) {
		var childs = [];
		for (var i = 0; i < this.children.length; i++)
			childs.push(map[this.children[i]]);
		
		return childs;
	},

	setChildren : function(childArr) {
		this.children = childArr;
	},

	addChild : function(child) {
		this.children.push(child);
	},

	hasChild : function() {
		if (this.children && this.children.length > 0)
			return true;
	
		return false;
	},

	toString : function() {
		return  "Node: " + this.getName() + ", children: " + this.children.join(",");
	},

    type: 'ValidatorDecisionNode'
});
```