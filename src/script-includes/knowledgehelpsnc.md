---
title: "KnowledgeHelpSNC"
id: "knowledgehelpsnc"
---

API Name: global.KnowledgeHelpSNC

```js
var KnowledgeHelpSNC = Class.create();

KnowledgeHelpSNC.prototype = {
	initialize : function(kb) {
		this.kb = kb;
	},
	
	findArticle: function() {
		var kb = new GlideRecord('kb_knowledge');
		var roles = "";
		
		if (!gs.nil(jelly.sysparm_article)) {
			kb.addQuery('number', jelly.sysparm_article);
			kb.query();
			
			if (!kb.next()) {
				kb.number = jelly.sysparm_article;
				kb.short_description = gs.getMessage('UNKNOWN ARTICLE');
			} else 
				roles = kb.roles.toString();
			
		} else if (!gs.nil(jelly.sysparm_language)) {
			// Need to turn off workflow in order to override the Before query
			// BR that should normally restrict querying for articles in other languages
			kb.setWorkflow(false);
			kb.get(jelly.sys_kb_id);
		} else {
			kb.get(jelly.sys_kb_id);
			roles = kb.roles.toString();
		}
		
		// check if the current user has the persmission to view the given kb_knowledge article
		if (!this.hasRights(kb)) {
			kb.initialize();
			kb.number = jelly.sysparm_article;
			kb.short_description = gs.getMessage('INSUFFICIENT ROLES TO VIEW PROTECTED ARTICLE');
			
			// need to copy over the roles here so that even though we dont have 
			// the actual GlideRecord we can determine user permissions
			kb.roles = roles;
		}
		
		if (!kb.sys_id.isNil()) {
			var paramObj = {};
			var tsqueryId = RP.getParameterValue("sysparm_tsqueryId");
			paramObj["glideSessionId"] = gs.getSessionID();
			paramObj["displayVal"] = kb.getDisplayValue();
			if(tsqueryId && tsqueryId !=""){
				paramObj["ts_query_id"] = tsqueryId;
			}
			paramObj["domainId"] = gs.getSession().getCurrentDomainID();
			gs.eventQueue('user.view', kb, kb.getDisplayValue(), gs.getUserID());
			gs.eventQueue('kb.view', kb, JSON.stringify(paramObj), gs.getUserID());
		}
		
		return kb;
	},

	/**
	 * Determine whether the currently logged in user can access the given kb_knowledege article
	 * Users will only be able to access articles if they have the roles defined on the article,
	 * or the article roles are empty or they are a knowlege user (i.e. have the knowledge and/or the knowledge_admin role)
	 * 
	 * @param GlideRecord kb_knowledge
	 * @return boolean
	 */
	hasRights: function(kb) {
		//var isKnowledgeUser = gs.hasRole("knowledge_admin") || gs.hasRole("knowledge");
		//return gs.hasRole(kb.roles) || kb.roles.nil() || isKnowledgeUser;
		if(!kb.roles.nil() && kb.roles !="")
			return gs.hasRole(kb.roles);
		return kb.canRead();
		
	},
	
	isValidArticle: function() {
		return this.kb.getRowCount() > 0;
	},
	
	findDisplayCSS: function() {
		var displayField = this._getKBField();
		return "kb_" + displayField + ".css";
	},
	
	findDisplayClass: function() {
		var displayField = this._getKBField();
		return "kb_" + displayField;
	},
	
	findDisplayValue: function() {
		var displayField = this._getKBField();
		if (gs.getProperty("glide.knowman.text.check_can_read", "false") == "true" && !this.kb[displayField].canRead())
			return "";
		
		var kbview = new KBViewModel();		
		return kbview.getArticleContentBySysId(this.kb.getUniqueValue());
	},
	
	createEvents: function(kb) {
		var paramObj = {};
		var tsqueryId = RP.getParameterValue("sysparm_tsqueryId");
		paramObj["glideSessionId"] = gs.getSessionID();
		paramObj["displayVal"] = kb.getDisplayValue();
		if(tsqueryId && tsqueryId !=""){
			paramObj["ts_query_id"] = tsqueryId;
		}
		paramObj["domainId"] = gs.getSession().getCurrentDomainID();
		gs.eventQueue('user.view', kb, kb.getDisplayValue(), gs.getUserID());
		gs.eventQueue('kb.view', kb, JSON.stringify(paramObj), gs.getUserID());
	},
	
	_getKBField: function() {
		var displayField = "text";
		
		if (this.kb.isValidField("article_type") && !gs.nil(this.kb.article_type) && this.kb.isValidField(this.kb.article_type))
			displayField = this.kb.article_type;
		
		return displayField;
	},
	
	getViewedArticlesByCustomer: function(userSysId, historyDuration){
		var recentViewedArticle = new GlideAggregate('kb_use');
		recentViewedArticle.addQuery("user",userSysId);
		recentViewedArticle.addQuery("viewed","true");
		recentViewedArticle.addQuery("sys_created_on",">", gs.daysAgoStart(historyDuration));
		recentViewedArticle.groupBy('article');
		recentViewedArticle.query();
		
		var articleSysIds = [];
		while(recentViewedArticle.next())
			articleSysIds.push(recentViewedArticle.article + "");
		
		return articleSysIds;
	},
	
	type: "KnowledgeHelpSNC"
};
```