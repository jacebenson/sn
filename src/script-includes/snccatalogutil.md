---
title: "SNCCatalogUtil"
id: "snccatalogutil"
---

API Name: global.SNCCatalogUtil

```js
var SNCCatalogUtil = Class.create();
SNCCatalogUtil.prototype = {
	initialize: function() {
	},
	//category/catalog field in related list
	getReferenceQual : function(prefix) {
		if(!gs.hasRole('catalog_admin') && (gs.hasRole('catalog_manager')||gs.hasRole('catalog_editor')))
			return prefix+'manager='+gs.getUserID()+'^OR'+prefix+'editorsCONTAINS'+gs.getUserID();
		return '';
	},
	//category field in cat item
	getReferenceQualItem : function(){
		if(!gs.hasRole('catalog_admin') && (gs.hasRole('catalog_manager')||gs.hasRole('catalog_editor')))
			return 'sc_catalog.manager='+gs.getUserID()+ '^ORsc_catalog.editorsCONTAINS'+gs.getUserID()+'^sc_catalogIN'+current.getValue('sc_catalogs') + '^sys_class_name!=sc_category_top_n';
		else
			return 'sc_catalogIN'+current.getValue('sc_catalogs')+'^sys_class_name!=sc_category_top_n';
	},
	//cat item field in related list
	getReferenceQualRlt : function(){
		if(!gs.hasRole('catalog_admin') && (gs.hasRole('catalog_manager')||gs.hasRole('catalog_editor'))){
			var result=[];
			var gr = new GlideRecord("sc_catalog");
			gr.addQuery('manager',gs.getUserID()).addOrCondition('editors','CONTAINS',gs.getUserID());
			gr.query();
			if(gr.hasNext())
				while(gr.next())
					result.push('sc_catalogsCONTAINS'+gr.getUniqueValue());
			else
				result.push('sc_catalogs=-1');
				
			return result.join('^OR');
		}
		else
			return '';
	},
	getReferenceQualCatalogClientScript : function() {
		gs.log("getReferenceQualCatalogClientScript api is deprecated, use getReferenceQualRltConditions instead");
		return getReferenceQualRltConditions();
	},
	getReferenceQualRltConditions : function() {
		var conditions = this.getReferenceQualRlt();
		if(conditions === '')
			return 'sc_ic_item_stagingISEMPTY^NQsc_ic_item_stagingISNOTEMPTY^active=true^EQ';
		else
			return conditions+'^sc_ic_item_stagingISEMPTY^NQsc_ic_item_stagingISNOTEMPTY^'+conditions+'^active=true^EQ';
	},
	canRead : function(cat_item, isNewRecord){
		return this.canWrite(cat_item, isNewRecord)
	},
	canWrite : function(cat_item, isNewRecord){
		if (cat_item) {
			if (cat_item.isNewRecord())
				return true;
			else if (JSUtil.notNil(cat_item.sc_catalogs.toString())) {
				var gr =new GlideRecord('sc_catalog');
				gr.addEncodedQuery('sys_idIN'+cat_item.sc_catalogs.toString());
				gr.addQuery('manager',gs.getUserID()).addOrCondition('editors','CONTAINS',gs.getUserID());
				gr.query();
				if(gr.next())
					return true;
			}
		} else if (isNewRecord)
			return true;
	},
	canCreate : function(cat_item){
		if(cat_item){
			if(cat_item.sc_catalogs.toString()){
				var gr =new GlideRecord('sc_catalog');
				gr.addEncodedQuery('sys_idIN'+cat_item.sc_catalogs.toString());
				gr.addQuery('manager',gs.getUserID()).addOrCondition('editors','CONTAINS',gs.getUserID());
				gr.query();
				if(gr.next())
					return true;
			}
		}
		else
			return true;
	},
	canDelete : function(cat_item){
		if(cat_item){
			if(cat_item.sc_catalogs.toString()){
				var gr =new GlideRecord('sc_catalog');
				gr.addEncodedQuery('sys_idIN'+cat_item.sc_catalogs.toString());
				gr.addQuery('manager',gs.getUserID()).addOrCondition('editors','CONTAINS',gs.getUserID());
				gr.query();
				if(gr.next())
					return true;
			}
		}
	},
	getActiveWorkFlows: function(tableName) {
	    var gr = GlideRecord('wf_workflow_version');
	    if (tableName)
        	gr.addQuery('table', tableName);
	    gr.addActiveQuery();
	    var qc = gr.addQuery('published', true);
	    qc.addOrCondition('checked_out_by', gs.getUserID());
	    gr.query();
	    var ids = [];
	    while (gr.next()) {
	        ids.push(gr.workflow + "");
	    }
	    return 'sys_idIN' + ids.join(',');
	},

	getCatalogIDFromURL : function() {
		 try {
			var uri = gs.action.getGlideURI();
			return GlideappCatalogItem.getCatalogID(uri.get('sysparm_collection'), uri.get('sysparm_collectionID'));
		 } catch (ex) {
			 gs.log('Error in retrieving CatalogID from URL');
		 }
	},

	getCategoryIDFromURL : function() {
		try {
			var uri = gs.action.getGlideURI();
			if (uri.get('sysparm_collection') == 'sc_category')
				return uri.get('sysparm_collectionID');
			return '';
		} catch (ex) {
			gs.log('Error in retrieving CategoryID from URL');
		}
	},

	getStagingItemsInDomain : function(currentDomain) {
		if (new CatalogDomainUtil().isDomainIsolationEnabled()) {
			var gr = new GlideRecord('sc_ic_item_staging');
			var ids = [];
			gr.query();
			while (gr.next()) {
				if (!gr.sc_cat_item || currentDomain == gr.sc_cat_item.sys_domain)
					ids.push(gr.sys_id);
			}
			return 'sys_idIN' + ids.join(',');
		}
		return '';
	}
};
```