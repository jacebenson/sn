---
title: "KnowledgeAjaxSNC"
id: "knowledgeajaxsnc"
---

API Name: global.KnowledgeAjaxSNC

```js
var KnowledgeAjaxSNC = Class.create();

KnowledgeAjaxSNC.prototype = Object.extendsObject(AbstractAjaxProcessor, {
	
	/**
 	* Prevent public access to this script
 	*/
	isPublic: function() {
		return false;
	},
	
	process: function() {
		if (type == "kbWriteComment")
			this.kbWriteComment();
		else if (type == "kbGetText")
			this.kbGetText(value);
		else if (type == "kbAttachArticle")
			this.kbAttachArticle(value);
		else if(type == 'subscribeKbArticle') {
			var sub_obj_id = this.getParameter("sysparm_article_id");
			var subs_obj_type_id = this.getParameter("sysparm_subs_obj_type_id");
			this.subscribeKbArticle(sub_obj_id,subs_obj_type_id);
		}
		else if(type == 'unsubscribeKbArticle') {
			var sub_obj_id = this.getParameter("sysparm_article_id");
			this.unsubscribeKbArticle(sub_obj_id);
		}
		else if(type == 'unsubscribeKB') {
			var sub_obj_id = this.getParameter("sysparm_article_id");
			var sub_obj_kb_id = this.getParameter("sysparm_kb_id"); 
			return this.unsubscribeKB(sub_obj_id,sub_obj_kb_id);
		}
		else if(type == 'verifyArticleTemplatesEnabled'){
			return this.verifyArticleTemplatesEnabled();
		}
		else if(type == 'getOwnershipGrpDetails'){
			var groupId = this.getParameter("sysparm_group_id");
			return this.getOwnershipGroupDetails(groupId);
		}
		else if(type == 'getAceessOfRequestOptions'){
			return this.verifyRequestTypeOptions();
		}
	},
	
	getOwnershipGroupDetails : function(groupId){
		var response ={};
		var users = [];
		if(pm.isActive("com.snc.knowledge_advanced")){
			var grp = new GlideRecord("sys_user_group");
			if(grp.get(groupId)){
				response.name =grp.getValue("name");
				response.email = grp.getValue("email");
				response.manager = grp.getValue("manager");
				response.description = grp.getValue("description");
			}
			
			if(gs.getUser().hasRole("knowledge_admin"))
				response.manager_edit = true;
			else
				response.manager_edit = false;
			
			var gr = new GlideRecord("sys_user_grmember");
			gr.addQuery('group',groupId);
			gr.query();
			while(gr.next()){
				users.push(gr.getValue("user"));
			}
			response.grpMembers = users.join();
		}
		return new JSON().encode(response);
	},
	
	
	verifyRequestTypeOptions : function(){
		var options ={};
		if(gs.getUser().hasRole("knowledge_domain_expert") || gs.getUser().hasRole("knowledge_admin")){
			options.create = true;
		}else{
			options.create = false;
		}
		if(gs.getUser().hasRole("knowledge_admin") || new KBOwnershipGroup().canEditOwnershipGroup()){
			options.edit = true;
		}else{
			options.edit = false;
		}
		return new JSON().encode(options);
	},
	
	unsubscribeUnpublishedArticle: function(sub_obj_id) {
		var gr = new GlideRecord('kb_knowledge');
		gr.get(sub_obj_id);
		if(gr.article_id.nil())
			return;
		if(!gr.canRead())
			return;
		
		var gr1 = new GlideRecord('kb_knowledge');
		gr1.addQuery('article_id',gr.article_id);
		gr1.addQuery('workflow_state','!=','published');
		gr1.addQuery('latest',true);
		gr1.query();
		if(gr1.next()) {
			if(new ActivitySubscriptionContext().getSubscriptionService().isSubscribed(gr1.sys_id).subscriptionId) {
				new ActivitySubscriptionContext().getSubscriptionService().unsubscribe(gr1.sys_id);
			}
		}
	},
	
	subscribeKbArticle: function(sub_obj_id,subs_obj_type_id) {
		if(!this._canReadArticle(sub_obj_id))
			return;
		return new ActivitySubscriptionContext().getSubscriptionService().subscribe(subs_obj_type_id,sub_obj_id);
	},
	
	unsubscribeKbArticle: function(sub_obj_id) {
		if(!this._canReadArticle(sub_obj_id))
			return;
		this.unsubscribeUnpublishedArticle(sub_obj_id);
		return new ActivitySubscriptionContext().getSubscriptionService().unsubscribe(sub_obj_id);
	},
	
	unsubscribeKB: function(sub_obj_id,sub_obj_kb_id) {
		if(!this._canReadArticle(sub_obj_id))
			return;
		new ActivitySubscriptionContext().getSubscriptionService().unsubscribe(sub_obj_kb_id);
		if(new ActivitySubscriptionContext().getSubscriptionService().isSubscribed(sub_obj_id).subscriptionId) {
			this.unsubscribeUnpublishedArticle(sub_obj_id);
			new ActivitySubscriptionContext().getSubscriptionService().unsubscribe(sub_obj_id);
			return "Article";
		}
		return "Knowledge Base";
	},
	
	_canReadArticle: function(articleId){
		var gr = new GlideRecord('kb_knowledge');
		if(!gr.get(articleId) || !gr.canRead())
			return false;
		
		return true;
	},
	
	kbWriteComment: function() {
		
		if(!this._canReadArticle(this.getParameter("sysparm_id")))
			return;
		var feedback = unescape(this.getParameter("sysparm_feedback"));
		var view_id = this.getParameter("view_id");
		var fb = new GlideRecord('kb_feedback');
		if(view_id && view_id != "") {
			fb.addQuery("view_id",view_id);
			fb.query();
			if (!fb.next()) 
				view_id = gs.generateGUID();
		} else {
			view_id = gs.generateGUID();
		}
		fb.article = this.getParameter("sysparm_id");
		fb.user.setValue(gs.getUserID());
		fb.comments = feedback;
		fb.query = unescape(this.getParameter("sysparm_search"));
		fb.search_id = this.getParameter("ts_queryId") || "";
		if (this.getParameter("sysparm_flag") == "true")
			fb.flagged = "true";
		fb.view_id = view_id;
		fb.session_id = gs.getSessionID();
		fb.useful="";
		fb.insert();
	},
	
	kbAttachArticleImpl: function(value,docUrl){
		var id = value.split(',');
		var articleID = id[0];
		var taskID = id[1];
		var tsQueryId = "";
		var rankId = "";
		if(docUrl && !gs.nil(docUrl)){
			var url = new GlideURL(docUrl);
			tsQueryId = url.get('sysparm_tsqueryId');
			rankId = url.get('sysparm_rank');
			if(tsQueryId && rankId && tsQueryId!=null && !gs.nil(tsQueryId)){
				var tsQueryKb = new GlideRecord('ts_query_kb');
				tsQueryKb.get(tsQueryId);
				var prevRank = tsQueryKb.top_click_rank;
				if(prevRank!=null && !gs.nil(prevRank)){
					try{
						if(parseInt(prevRank)>parseInt(rankId)){
							tsQueryKb.top_click_rank =rankId;
							tsQueryKb.update();
						}
					}catch(err){
						gs.log(err.message);
					}
				}else{
					tsQueryKb.top_click_rank = rankId;
					tsQueryKb.update();
				}
			}
		}
		var article = new GlideRecord('kb_knowledge');
		if (!article.get(articleID) || !article.canRead())
			return;
		
		var kbTask = new GlideRecord('m2m_kb_task');
		kbTask.addQuery("kb_knowledge",articleID);
		kbTask.addQuery("task",taskID);
		kbTask.query();
		if (!kbTask.next()) {
			kbTask.initialize();
			kbTask.kb_knowledge = articleID;
			kbTask.task = taskID;
			kbTask.insert();
		}
		
		var paramObj = {};
		paramObj["glideSessionId"] = gs.getSessionID();
		paramObj["displayVal"] = article.getDisplayValue();
		paramObj["isFromSearchView"] = true;
		paramObj["ts_query_id"]= tsQueryId;
		paramObj["domainId"] = gs.getSession().getCurrentDomainID();
		
		gs.eventQueue("kb.use", article,JSON.stringify(paramObj), gs.getUserID());
		
		var s = "Knowledge article " + article.number + ":\n";
		if (gs.getProperty("glide.ui.security.allow_codetag", "true") != "true")
			s += article.short_description;
		else {
			var displayValue = new KnowledgeHelp(article).findDisplayValue();
			s += "[code]" + displayValue + "[/code]";
		}
		
		return s;
	},
	
	kbAttachArticle: function(value,docUrl) {
		var s = this.kbAttachArticleImpl(value,docUrl);
		
		var item = this.newItem();
		item.setAttribute("name", "text");
		item.setAttribute("value", s);
	},
	
	kbGetText: function(value) {
		var articleID = this.getParameter("article_id");
		var rating = this.getParameter("used");
		var view_id = this.getParameter("view_id");
		if(!this._canReadArticle(articleID))
			return;
		if(gs.getProperty('glide.knowman.log_ratings','true') == 'true'){
			var fb = new GlideRecord('kb_feedback');
			fb.addQuery("view_id",view_id);
			fb.query();
			if (fb.next()) {
				if (rating == 'yes' || rating == 'no')
					fb.useful = rating;
				else {
					rating = Math.round(rating);
					fb.rating = rating;
				}
				fb.update();
			} else {
				fb.initialize();
				fb.article = articleID;
				fb.user = gs.getUserID();
				if (rating == 'yes' || rating == 'no')
					fb.useful = rating;
				else {
					rating = Math.round(rating);
					fb.rating = rating;
				}
				fb.view_id = view_id;
				fb.query = unescape(this.getParameter("sysparm_search"));
				fb.session_id = gs.getSessionID();
				fb.insert();
			}
		}
	},
	verifyArticleTemplatesEnabled : function(){
		var versioningEnabled = new KBCommon().isVersioningInstalled();
		if(versioningEnabled){
			return new ArticleTemplateUtil().canContributeToTemplates();
		}
		return false;
	},
	
	type: "KnowledgeAjaxSNC"
});
```