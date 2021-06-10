---
title: "CSMAdvancedEmailSearchResultsHelperSNC"
id: "csmadvancedemailsearchresultshelpersnc"
---

API Name: global.CSMAdvancedEmailSearchResultsHelperSNC

```js
var CSMAdvancedEmailSearchResultsHelperSNC = Class.create();
CSMAdvancedEmailSearchResultsHelperSNC.prototype = {
	ARTICLE_VIEW_PAGE: "a60dcc050be432004ce28ffe15673a54", //sys_id of kb_article_view Page
	CATALOG_PAGE: "9f12251147132100ba13a5554ee490f4", // sys_id of sc_cat_item
	
    initialize: function(articleViewPage, catalogPage) {
		this._articleViewPage = articleViewPage || this.ARTICLE_VIEW_PAGE;
		this._catalogPage = catalogPage || this.CATALOG_PAGE;
		this._tablePageMap = {};
    },
	
	impersonateUser: function(sysId, contextConfigGr, tableName, endImpersonalization, userId){
		var tableGr = new GlideRecord(tableName);
		
		if(tableGr.get(sysId) && contextConfigGr.getTableName() == "cxs_context_config"){
			if(endImpersonalization)
				return new GlideImpersonate().impersonate("system");
			
			if(!gs.nil(userId))
				return new GlideImpersonate().impersonate(userId);
		}
		
		return null;
	},
	
	isView: function(gr){
		if(gr)
			return gr.isView();
		
		return false;
	},
	
	getPrimaryTableSysId: function(inputTable, viewSysId){
		return SNC.KnowledgeHelper.getPrimaryTableSysId(inputTable, viewSysId);
	},
	
	getViewTable: function(inputTable) {
        return SNC.KnowledgeHelper.getViewTable(inputTable);
    },
	
	buildTablePageMap: function(){
		var pageGr = new GlideRecord("sp_page");

		if(pageGr.get(this._articleViewPage))
			this._tablePageMap["kb_knowledge"] = pageGr.id;
		
		pageGr = new GlideRecord("sp_page");
		
		if(pageGr.get(this._catalogPage))
			this._tablePageMap["sc_cat_item"] = pageGr.id;
	},
	
	getTableToPageConfig: function(tableName){
		return this._tablePageMap[tableName];
	},

    type: 'CSMAdvancedEmailSearchResultsHelperSNC'
};
```