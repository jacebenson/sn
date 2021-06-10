---
title: "CapabilityLevelManager"
id: "capabilitylevelmanager"
---

API Name: global.CapabilityLevelManager

```js
var CapabilityLevelManager = Class.create();
CapabilityLevelManager.prototype = {
	initialize: function() {
		this.restrictLevel = false;
	},
	checkCircularLoop: function(id, parentId) {
		if(id == parentId)
			return true;
		var gr = new GlideRecord("cmdb_ci_business_capability");
		gr.addQuery("parent", id);
		gr.query();
		while(gr.next()) {
			if(gr.parent!=null) {
				if(this.checkCircularLoop(gr.getUniqueValue(),parentId ))
					return true;
			}
		}
	},
	updateLevelsOnParentChange: function(current, previous) {
		this.restrictLevel = false;
		var currentParentLevel = 0;
		var previousParentLevel = 0;
		var leveldiff = 0;
		var nodesList = [];
		if(previous.parent && previous.parent.hierarchy_level>=0) {
			var previousParent = new GlideRecord("cmdb_ci_business_capability");
			previousParent.get(previous.parent);
			previousParentLevel = previousParent.hierarchy_level;
		}
		else
			previousParentLevel = -1;
		if(current.parent && current.parent.hierarchy_level>=0) {
			var currentParent = new GlideRecord("cmdb_ci_business_capability");
			currentParent.get(current.parent);
			currentParentLevel = currentParent.hierarchy_level;
			leveldiff = currentParentLevel - previousParentLevel;
		}
		else
			leveldiff = -previousParentLevel-1;
		//make all current node and its children level as per new parent
		if((current.hierarchy_level+leveldiff) <= 5) {
			nodesList.push(current.sys_id);
		}
		else {
			this.restrictLevel = true;
			return;
		}
		this.getAllChildren(current.sys_id, leveldiff,  nodesList);
		if(this.restrictLevel) {
			return this.restrictLevel;
		}
		else {
			var nodesSysIds = nodesList.join(',');
			var nodeGr = new GlideRecord("cmdb_ci_business_capability");
			nodeGr.addQuery("sys_id", "IN", nodesSysIds);
			nodeGr.query();
			while(nodeGr.next()) {
				nodeGr.setValue("hierarchy_level", nodeGr.hierarchy_level+leveldiff);
				nodeGr.update();
			}
			//see if old parent is valid leaf or not
			if(previous.parent!=null) {
				var children = new GlideRecord("cmdb_ci_business_capability");
				children.addQuery("parent", previous.parent);
				children.query();
				if(children.getRowCount() == 1) {
					children.next();
					if(children.getValue("sys_id") == current.sys_id) {
						var gr = new GlideRecord("cmdb_ci_business_capability");
						gr.get(previous.parent);
						gr.setValue("leaf_node", true);
						gr.update();
					}
				}
			}
			if(current.parent) {
				var currentParentGr = new GlideRecord("cmdb_ci_business_capability");
				currentParentGr.get(current.parent);
				currentParentGr.setValue("leaf_node", false);
				currentParentGr.update();
			}
		}
	},
	getAllChildren: function(nodeSysId, leveldiff, nodesList) {
		var nodeGr = new GlideRecord("cmdb_ci_business_capability");
		nodeGr.get(nodeSysId);
		if(nodeGr.hierarchy_level+leveldiff > 5) {
			msg = "Capability Hierarchy up to level-6 is supported. Cannot add the "+current.name+" Capability as a child of "+current.parent.name+" Capability which results in level-6 capability.";
			this.restrictLevel = true;
		}
		else {
			var nodeChildren = new GlideRecord("cmdb_ci_business_capability");
			nodeChildren.addQuery("parent", nodeSysId);
			nodeChildren.query();
			while(nodeChildren.next()) {
				nodesList.push(nodeChildren.getUniqueValue());
				this.getAllChildren(nodeChildren.sys_id, leveldiff, nodesList);
			}
		}
	},
	type: 'CapabilityLevelManager'
};
```