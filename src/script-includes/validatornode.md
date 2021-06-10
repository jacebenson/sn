---
title: "ValidatorNode"
id: "validatornode"
---

API Name: sn_cs_builder.ValidatorNode

```js
var ValidatorNode = Class.create();
ValidatorNode.prototype = {
    initialize: function(name, sys_id) {
		this.childNode = null;
		this.nodename = name;
		this.sys_id = sys_id;
    },

	getChildNode : function(map) {
		return map[this.childNode];
	},

	setChildNode : function(childNode) {
		this.childNode = childNode;
	},

	getName : function() {
		return this.nodename;
	},

	setName : function(name) {
		this.nodename = name;
	},

	hasChild : function() {
		if(this.childNode == null) {
			return false;
		} else {
			return true;
		}
	},

	toString : function() {
		return "Node: " + this.getName() + ", child: " + this.childNode;
	},

	type: 'ValidatorNode'
}
```