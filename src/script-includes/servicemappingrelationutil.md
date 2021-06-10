---
title: "ServiceMappingRelationUtil"
id: "servicemappingrelationutil"
---

API Name: global.ServiceMappingRelationUtil

```js
var ServiceMappingRelationUtil = Class.create();
ServiceMappingRelationUtil.prototype = {
	initialize: function() {
	},
	
	getBs2EntryPointRelType: function(){
		var relTypeName = gs.getProperty('sa.bs2EpRelName', 'Depends on::Used by');
		var relGr = new GlideRecord('cmdb_rel_type');
		relGr.addQuery('name', relTypeName);
		relGr.query();
		if(relGr.next())
			return relGr.getUniqueValue();
		else
			return null;
	},
	
	createBs2EntryPointRel: function(bsSysId, epSysId){
		var relType = this.getBs2EntryPointRelType();
		if(JSUtil.nil(relType)){
			gs.info('A relation type between Business Service and Entry Point could not be found when attempting to create relation');
			return;
		}
		if(!this.bs2EntryPointRelExist(bsSysId, epSysId)){
			this.createRel(bsSysId, epSysId, relType);
		}
	},
	
	removeBs2EntryPointRel: function(bsSysId, epSysId){
		var relType = this.getBs2EntryPointRelType();
		if(JSUtil.nil(relType)){
			gs.info('A relation type between Business Service and Entry Point could not be found when attempting to remove relation');
			return;
		}
		this.deleteAllRels(bsSysId, epSysId, relType);
	},
	
	createRel: function(parent, child, type){
		var gr = new GlideRecord('cmdb_rel_ci');
		gr.initialize();
		gr.setValue('parent', parent);
		gr.setValue('type', type);
		gr.setValue('child', child);
		gr.insert();
		
	},
	
	deleteAllRels: function(parent, child, type){
		var gr = new GlideRecord('cmdb_rel_ci');
		gr.addQuery('parent', parent);
		gr.addQuery('type', type);
		gr.addQuery('child', child);
		gr.query();
		gr.deleteMultiple();
		
	},
	
	bs2EntryPointRelExist: function(bsSysId, epSysId){
		var relType = this.getBs2EntryPointRelType();
		var gr = new GlideRecord('cmdb_rel_ci');
		gr.addQuery('parent', bsSysId);
		gr.addQuery('type', relType);
		gr.addQuery('child', epSysId);
		gr.query();
		if(gr.next())
			return true;
		else
			return false;
	},
	
	type: 'ServiceMappingRelationUtil'
};
```