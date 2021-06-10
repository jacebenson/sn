---
title: "KBFeedbackTaskSNC"
id: "kbfeedbacktasksnc"
---

API Name: global.KBFeedbackTaskSNC

```js
var KBFeedbackTaskSNC = Class.create();
KBFeedbackTaskSNC.prototype = {
	initialize: function() {
		this.kbCommon = new KBCommon();
	},
	
	
	canEditArticle: function(feedbackTaskGr){
		
		if(feedbackTaskGr.state == 3 || gs.nil(feedbackTaskGr.feedback))
			return false;
		
		var article = feedbackTaskGr.feedback.article.getRefRecord();
		
		if(gs.nil(article) || this.kbCommon.isExternalArticle(article))
			return false;
		
		if(this.hasElevatedAccess(feedbackTaskGr))
			return true;
		
		if(feedbackTaskGr.assigned_to == gs.getUserID() && new SNC.KnowledgeHelper().canContribute(article))
			return true;
		
		return false;
	},
	
	hasElevatedAccess: function(feedbackTaskGr) {
		
		if((gs.nil(feedbackTaskGr.feedback) || gs.nil(feedbackTaskGr.feedback.article)) && this.kbCommon.isAdminUser(null))
			return true;
		
		//If feedback source is an article
		if(feedbackTaskGr.feedback) {
			var knowledgeGr = feedbackTaskGr.feedback.article.getRefRecord();
			
			if(this.kbCommon.isAdminUser(knowledgeGr))
				return true;
			
			if(this.kbCommon.isKnowledgeBaseOwner(knowledgeGr,"kb_knowledge_base.owner"))
				return true;
			
			else if(this.kbCommon.isKnowledgeBaseManager(knowledgeGr,"kb_knowledge_base.kb_managers"))
				return true;
		}
		
		//It feedback source is a task
		if(feedbackTaskGr.parent){
			return gs.hasRole("knowledge_manager") || gs.hasRole("knowledge_domain_expert");
		}
		
		return false;
	},
	
	hasElevatedAccessForOwnershipGroup: function(feedbackTaskGr) {
		//If there is no article associated with this feedback task and user user has knowledge_admin role then user
		//has elevated access to the ownership group.
		if((gs.nil(feedbackTaskGr.feedback) || gs.nil(feedbackTaskGr.feedback.article)) && this.kbCommon.isAdminUser(null))
			return true;
		
		//If feedback source is an article
		if(feedbackTaskGr.feedback && feedbackTaskGr.feedback.article) {
			var knowledgeGr = feedbackTaskGr.feedback.article.getRefRecord();
			
			if(this.kbCommon.isAdminUser(knowledgeGr))
				return true;
			
			if(this.kbCommon.isMemberOfValidGroup(knowledgeGr,"ownership_group")){
				return true;
			}
		}
		return this.hasElevatedAccess(feedbackTaskGr);
	},
	
	createFeedbackTask: function(feedbackObj, flagged) {
		var feedbackTaskGr = new GlideRecord("kb_feedback_task");
		feedbackTaskGr.initialize();
		for(var field in feedbackObj){
			if(feedbackTaskGr.isValidField(field))
				feedbackTaskGr[field] = feedbackObj[field];
		}
		feedbackTaskGr.feedback_task_type = flagged?'2':'1';
		return feedbackTaskGr.insert();
	},
	
	getReasonValues : function(){
		var reasons = [];
		
		var fb_reason = new GlideRecord('sys_choice');
		fb_reason.addQuery('name',"kb_feedback");
		fb_reason.addQuery('element',"reason");
		fb_reason.addQuery('language',gs.getSession().getLanguage());
		fb_reason.query();
		
		while(fb_reason.next()){
			var obj = {};
				obj.reason_desc = fb_reason.getDisplayValue('label');
				obj.reason_id = fb_reason.getValue('value');
				reasons.push(obj);
			}
			return new JSON().encode(reasons);
		},
		
		type: 'KBFeedbackTaskSNC'
	};
```