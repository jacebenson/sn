---
title: "cxs_SearchResourceConfig"
id: "cxs_searchresourceconfig"
---

API Name: global.cxs_SearchResourceConfig

```js
var cxs_SearchResourceConfig = Class.create();
cxs_SearchResourceConfig.prototype = Object.extendsObject(cxs_Base, {
	// Get all active Search Resource Configs with certain conditions 
	// searcherSysId: the system ID of Searcher Configuration
	// searchResourceId: the ID of Search Resource
	getSearchResConfigs: function(searcherSysId, searchResourceId) {
		var grRightSearchResConfig = new GlideRecord("cxs_search_res_config");
		grRightSearchResConfig.addActiveQuery();
		grRightSearchResConfig.addQuery("cxs_searcher_config", searcherSysId);
		grRightSearchResConfig.addQuery("search_resource_id", searchResourceId);
		grRightSearchResConfig.query();
		return grRightSearchResConfig;
	},

	populateTable: function() {
		var tableName = new sn_cxs_int.CXSResourceUtils().getDefinedEncodedQueryTable(this._gr);
		if (tableName)
			this._gr.table = tableName;
	},
	
	supportsEncodedQuery: function() {
		return new sn_cxs_int.CXSResourceUtils().getDefinedSupportsEncodedQuery(this._gr);
	},
	
	supportsSearchAs: function() {
		return new sn_cxs_int.CXSResourceUtils().getDefinedSupportsSearchAs(this._gr);
	},
	
	updateContextConfigs: function() {
		if (!this._gr || !this._gr.getValue("cxs_searcher_config"))
			return;
		
		var contextConfigGr = new GlideRecord("cxs_context_config");
		contextConfigGr.addQuery("cxs_searcher_config", this._gr.getValue("cxs_searcher_config"));
		contextConfigGr.query();
		
		while (contextConfigGr.next())
			SNC.SearchService.updateContextProperties(contextConfigGr.getUniqueValue());
	},

    type: "cxs_SearchResourceConfig"
});
```