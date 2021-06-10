---
title: "CapabilityManageHierachy"
id: "capabilitymanagehierachy"
---

API Name: global.CapabilityManageHierachy

```js
var CapabilityManageHierachy = Class.create();
CapabilityManageHierachy.prototype = {
	initialize: function() {
	},
	
	processAddCapability: function(parentCapSysId, childCapSysId){
		//Fix Parent position
		var parentHierarchyId = this._fixParentPositionForAdd(parentCapSysId,childCapSysId);
		if (parentHierarchyId)
			this._insertAndMoveSiblings(parentCapSysId,childCapSysId,parentHierarchyId);
	},
	
	_insertAndMoveSiblings : function(parentCapSysId,childCapSysId,parentHierarchyId){
		var children = [];
		var childCount = this._getChildrenCount(childCapSysId);
		var capGR = new GlideRecord('cmdb_ci_business_capability');
		capGR.addQuery('sys_id','!=',childCapSysId);
		capGR.addQuery('parent',parentCapSysId);
		capGR.query();
		while (capGR.next()){
			var childCap = {};
			childCap.id = capGR.getUniqueValue();
			childCap.count = this._getChildrenCount(childCap.id);
			var hierId = capGR.getValue('hierarchy_id');
			childCap.seq = Number(hierId.substring(hierId.lastIndexOf('.')+1));
			children.push(childCap);
		}
		children.sort(function(a,b){
			if (a.count!=b.count)
				return a.count-b.count;
			return a.seq-b.seq;
		});
		var childFound = false;
		var suffix = null;
		//children.forEach(function(child)
		for (var i in children){
			var child = children[i];
			var hierarchyId = this._getHierarchyId(child.id);
			suffix = Number(hierarchyId.substring(hierarchyId.lastIndexOf('.')+1));
			if (!childFound){
				if (child.count>=childCount){
					this._setHierarchyId(childCapSysId,parentHierarchyId,suffix);
					this._setHierarchyId(child.id,parentHierarchyId,(suffix+1));
					childFound = true;
				}
				else
					this._setHierarchyId(child.id,parentHierarchyId,suffix);
			}
			else
				this._setHierarchyId(child.id,parentHierarchyId,(suffix+1));
		}
		if (!childFound)
			this._setHierarchyId(childCapSysId,parentHierarchyId,(suffix+1));
	},

	_getChildrenCount: function(capSysId){
		var childGR = new GlideRecord('cmdb_ci_business_capability');
		childGR.addQuery('parent',capSysId);
		childGR.query();
		return childGR.getRowCount();
	},

	_getHierarchyId: function(capSysId){
		var capGR = new GlideRecord('cmdb_ci_business_capability');
		if (!capGR.get(capSysId))
			return null;
		return this._resetHierarchyIdOfCBPUI(capGR);
	},

	_resetHierarchyIdOfCBPUI : function(capGR){
		var hierarchyId = capGR.getValue('hierarchy_id');
		if (!hierarchyId)
			return null;
		if (hierarchyId.startsWith("CBP_UI")){
			//capGR.setValue('hierarchy_id',hierarchyId.substring(6));
			//capGR.update();
			return hierarchyId.substring(6);
		}
		return hierarchyId;
	},
	
	_setHierarchyId: function(capSysId,hierarchyIdPrefix,hierarchyIdSuffix,skipSynchTree){
		var parentIndex = String(hierarchyIdPrefix).lastIndexOf('.0');
		hierarchyIdPrefix = hierarchyIdPrefix.substring(0,parentIndex >0 ? parentIndex : hierarchyIdPrefix.length);
		var capGR = new GlideRecord('cmdb_ci_business_capability');
		if (!capGR.get(capSysId))
			return null;
		capGR.setValue('hierarchy_id',hierarchyIdPrefix+"."+hierarchyIdSuffix);
		capGR.update();
		if (skipSynchTree)
			return;
		this._synchHierarchyOfTree(capSysId);
	},

	_getCapOfHierarchyId: function(hierarchyId,skipCapSysId){
		var childGR = new GlideRecord('cmdb_ci_business_capability');
		childGR.addQuery('hierarchy_id',hierarchyId);
		if (skipCapSysId)
			childGR.addQuery('sys_id','!=',skipCapSysId);
		childGR.query();
		if (!childGR.next())
			return null;
		return childGR;
	},

	_fixParentPositionForAdd: function(parentCapSysId,childCapSysId){
		//get hierarchyIds next to parent with same children.
		//Increment their hierarchyIds until we find child with more children.
		var childrenOfParent = this._getChildrenCount(parentCapSysId)-1;
		var parentHierarchyId = this._getHierarchyId(parentCapSysId);
		//If HierarchyId is null or if parent is root, no need to fix parent position
		if (!parentHierarchyId || parentHierarchyId.lastIndexOf('.0')>0)
			return parentHierarchyId;
		var suffixNum = Number(parentHierarchyId.substring(parentHierarchyId.lastIndexOf('.')+1));
		var prefix = parentHierarchyId.substring(0,parentHierarchyId.lastIndexOf('.'));
		var similarSibling = true;
		while (similarSibling){
			var siblingGR = this._getCapOfHierarchyId(prefix+"."+(++suffixNum),childCapSysId);
			if (siblingGR){
				var childCount = this._getChildrenCount(siblingGR.getUniqueValue());
				if (childCount==childrenOfParent)
					this._setHierarchyId(siblingGR.getUniqueValue(),prefix,suffixNum-1);
				else
					similarSibling= false;
			}
			else
				similarSibling = false;
		}
		this._setHierarchyId(parentCapSysId,prefix,(suffixNum-1),true);
		return prefix+"."+(suffixNum-1);
	},

	_synchHierarchyOfTree : function(capSysId){
		var childGR = new GlideRecord('cmdb_ci_business_capability');
		childGR.addQuery('parent',capSysId);
		childGR.query();
		var parentHierarchyId = null;
		while (childGR.next()){
			if (!parentHierarchyId){
				parentHierarchyId = String(childGR.parent.hierarchy_id);
				var parentIndex = parentHierarchyId.lastIndexOf('.0');
				parentHierarchyId = parentHierarchyId.substring(0,parentIndex >0 ? parentIndex : parentHierarchyId.length);
			}
			var hierarchyId = String(childGR.hierarchy_id);
			hierarchyId = hierarchyId.substring(hierarchyId.lastIndexOf('.'));
			hierarchyId = parentHierarchyId +hierarchyId;
			childGR.setValue('hierarchy_id',hierarchyId);
			childGR.update();
			this._synchHierarchyOfTree(childGR.getUniqueValue());
		}
	},
	processCapabilityDeletion: function(h_id, parent) {
		if (!h_id)
			return;
		var parentGr = new GlideRecord("cmdb_ci_business_capability");
		parentGr.get(parent);
		//check if parent position is affected
		if(parentGr.getValue("parent")) {
			var grandParent = parentGr.getValue("parent");
			var parentIndex = h_id.lastIndexOf('.');
			var parentHierarchyId = h_id.substring(0,parentIndex);
			this._processParentHierrachyOnDeletion(grandParent, parent, parentHierarchyId);
		}
		//change deleted node siblings id's accordingly
		this._processSiblingsHierarchyOnDeletion(h_id,parent);

	},
	_processParentHierrachyOnDeletion: function(grandParentId, parentId, parentHierarchyId) {
		var parentGr = new GlideRecord("cmdb_ci_business_capability");
		parentGr.addQuery("parent", parentId);
		parentGr.query();
		this._adjustParentPositionOnDelete(grandParentId, parentId,parentHierarchyId, parentGr.getRowCount());

	},
	_adjustParentPositionOnDelete: function(grandParentId, parentId,parentHierarchyId, childrencount) {
		var ids = parentHierarchyId.split(".");
		var parentPosition =ids[ids.length-1];
		var childrenList = [];
		var parentGr = new GlideRecord("cmdb_ci_business_capability");
		parentGr.addQuery("parent", grandParentId);
		parentGr.query();
		var newParentPosition = "";
		while(parentGr.next()) {
			var children = new GlideRecord("cmdb_ci_business_capability");
			children.addQuery("parent", parentGr.getUniqueValue());
			children.query();
			var child = {};
			child["id"] = parentGr.getUniqueValue();
			child["number"] = children.getRowCount();
			child["hierarchy_id"] =parentGr.getValue("hierarchy_id");
			childrenList.push(child);
		}
		childrenList.sort(function(a, b) {
			return b.number - a.number;
		});
		var length = childrenList.length;
		for(var i=0; i<childrenList.length; i++) {
			var siblingId =childrenList[i].hierarchy_id.split(".");
			var siblingposition = siblingId[siblingId.length-1];
			if(parentPosition > siblingposition) {
				//get children of sibling , and move parent accordingly
				if(childrencount < childrenList[i].number) {
					//shiftSiblingPositionByonetoRight
					var parentIndex = parentHierarchyId.lastIndexOf('.');
					var hId = parentHierarchyId.substring(0,parentIndex);
					var newHierarchyId = hId + "."+(parseInt(siblingposition)+1 );
					this._shiftPositionOfNode(childrenList[i].id, newHierarchyId);
					newParentPosition = hId + "."+siblingposition;
				}
				if(childrencount == childrenList[i].number &&  newParentPosition!= "")
					break;
				if(childrencount > childrenList[i].number && newParentPosition!= "") {
					//adjust parent after this sibling sibpos+1
					var parentIndex = parentHierarchyId.lastIndexOf('.');
					var  hId = parentHierarchyId.substring(0,parentIndex);
					newParentPosition = hId + "."+(parseInt(siblingposition)+1) ;
					break;
				}
			}
		}
		//change parent to correct position
		if(newParentPosition.length >0)
			this._shiftPositionOfNode(parentId, newParentPosition);
	},
	_shiftPositionOfNode: function(sysid, newHierarchyId) {
		var nodeGr = new GlideRecord("cmdb_ci_business_capability");
		nodeGr.get(sysid);
		nodeGr.setValue("hierarchy_id", newHierarchyId);
		nodeGr.update();
		this._synchHierarchyOfTree(sysid);

	},

	_processSiblingsHierarchyOnDeletion: function(h_id, parentId) {
		var rootGr = new GlideRecord("cmdb_ci_business_capability");
		rootGr.addQuery("parent", parentId);
		rootGr.query();
		while(rootGr.next()) {
			//get all siblings to the right and shift by one position
			if(this._isGreater(rootGr.getValue("hierarchy_id"), h_id)) {
				var id = rootGr.getValue("hierarchy_id").split(".");
				var position = parseInt(id[(id.length-1)]);
				var currentid = id[0];

				for(var i=1;i<id.length-1; i++)
					currentid +=("."+id[i]);
				currentid += ("." + (position-1));
				rootGr.setValue("hierarchy_id", currentid);
				rootGr.update();
				this._synchHierarchyOfTree(rootGr.getUniqueValue());
			}
		}
	},

	_isGreater: function(siblingId, currentId) {
		var siblingIdSplits = siblingId.split('.');
		var currentIdSplits = currentId.split('.');
		var i =siblingIdSplits.length;

		if(parseInt(siblingIdSplits[i-1]) > parseInt(currentIdSplits[i-1])) {
			return true;
		}
		return false;
	},
	
	processUpdateCapability : function(oldParentCapSysId, newParentCapSysId, capSysId){
		var hierarchyId = this._getHierarchyId(capSysId);
		if (!hierarchyId)
			 return;
		this.processCapabilityDeletion(hierarchyId,oldParentCapSysId);
		this.processAddCapability(newParentCapSysId,capSysId);
	},

    type: 'CapabilityManageHierachy'
};
```