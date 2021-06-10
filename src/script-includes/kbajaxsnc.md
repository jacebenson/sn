---
title: "KBAjaxSNC"
id: "kbajaxsnc"
---

API Name: global.KBAjaxSNC

```js
var KBAjaxSNC = Class.create();

KBAjaxSNC.prototype = Object.extendsObject(AbstractAjaxProcessor, {

	saveUseful: function() {

		// (1) Declare helper variables
		var fields = {};
		fields.article = this.getParameter("sysparm_article_id") || "";
		fields.useful = this.getParameter("sysparm_useful") || "";
		fields.user = gs.getUserID();
		fields.query = this.getParameter("sysparm_query") || "";
		fields.search_id = this.getParameter("ts_queryId") || "";
		fields.session_id = gs.getSessionID();

		// (2) get results from helper method
		return this.saveUsefulWithParams(fields);

	},
	
	popOutFromStack : function(){
		var currentUrl = this.getParameter("sysparm_url") || "";
		var url = GlideSession.get().getStack().top();
		if(currentUrl.contains(url))
			GlideSession.get().getStack().pop();
		return url;
	},

	_canReadArticle: function(articleId){
		var gr = new GlideRecord('kb_knowledge');
		if(!gr.get(articleId) || !gr.canRead())
			return false;
		return true;
	},

	_validateProperty: function(property,defaultValue,expectedValue){
		var feedback_property = gs.getProperty(property, defaultValue);
		var show_user_feedback = (feedback_property.toLowerCase() == expectedValue);
		var feedbackRoles = gs.getProperty(property+'.roles');
		if (feedbackRoles != null && feedbackRoles != '' && !gs.hasRole(feedbackRoles))
			return false;

		if(!show_user_feedback)
			return false;
		return true;
	},

	saveUsefulWithParams: function(params){
		var passMessage = gs.getMessage("Submitted your helpful rating.");
		var failMessage = gs.getMessage("Could not submit your helpful rating.");
		var limitReachedMessage = gs.getMessage("You have reached the daily limit for comments a user can post while marking articles as useful.");

		// (1) Validate sampler parameter values		
		if (JSUtil.nil(params.article) || JSUtil.nil(params.useful) || JSUtil.nil(params.user))
			return this._encode({success: false, message: failMessage});		

		// (2) Validate User
		if(!this._validateProperty('glide.knowman.show_rating_options','true','true'))
			return this._encode({success: false, message: failMessage});
		if(!this._validateProperty('glide.knowman.show_yn_rating','true','true'))
			return this._encode({success: false, message: failMessage});
		if(!this._canReadArticle(params.article))
			return this._encode({success: false, message: failMessage});

		// (3) Insert a new kb_feedback record
		var kbFeedbackGr = new GlideRecord("kb_feedback");
		kbFeedbackGr.initialize();
		for (var name in params)
			kbFeedbackGr[name] = params[name];
		var recordId = kbFeedbackGr.insert();
		if (recordId) {
			return this._encode({success: true, message: passMessage, recordId:recordId});
		}


		// (4) Tell the caller that the request failed
		return this._encode({success: false, message: limitReachedMessage});
	},

	saveStarRatingWithParams: function(params){
		var passMessage = gs.getMessage("Submitted your helpful rating.");
		var failMessage = gs.getMessage("Could not submit your helpful rating.");

		// (1) Validate sampler parameter values		
		if (JSUtil.nil(params.article) || JSUtil.nil(params.rating) || JSUtil.nil(params.user))
			return this._encode({success: false, message: failMessage});		

		// (2) Validate User
		if(!this._validateProperty('glide.knowman.show_rating_options','true','true'))
			return this._encode({success: false, message: failMessage});
		if(!this._validateProperty('glide.knowman.show_star_rating','true','true'))
			return this._encode({success: false, message: failMessage});
		if(!this._canReadArticle(params.article))
			return this._encode({success: false, message: failMessage});

		// (3) Insert a new kb_feedback record
		var kbFeedbackGr = new GlideRecord("kb_feedback");
		kbFeedbackGr.initialize();
		for (var name in params)
			kbFeedbackGr[name] = params[name];
		var recordId = kbFeedbackGr.insert();
		if (recordId) {
			return this._encode({success: true, message: passMessage, recordId:recordId});
		}


		// (4) Tell the caller that the request failed
		return this._encode({success: false, message: failMessage});
	},

	saveStarRating: function() {

		// (1) Declare helper variables
		var fields = {};
		fields.article = this.getParameter("sysparm_id") || "";
		fields.rating = this.getParameter("sysparm_rating") || "";
		fields.user = gs.getUserID();
		fields.query = this.getParameter("sysparm_query") || "";
		fields.session_id = gs.getSessionID();
		fields.search_id = this.getParameter("ts_queryId") || "";

		var passMessage = gs.getMessage("Submitted your star rating.");
		var failMessage = gs.getMessage("Could not submit your star rating.");
		var limitReachedMessage = gs.getMessage("You have reached the daily limit for comments a user can post while rating articles.");

		// (2) Validate sampler parameter values		
		if (JSUtil.nil(fields.article) || JSUtil.nil(fields.rating) || JSUtil.nil(fields.user))
			return this._encode({success: false, message: failMessage});

		// (3) Validate User
		if(!this._validateProperty('glide.knowman.show_rating_options','true','true'))
			return this._encode({success: false, message: failMessage});
		if(!this._validateProperty('glide.knowman.show_star_rating','true','true'))
			return this._encode({success: false, message: failMessage});
		if(!this._canReadArticle(fields.article))
			return this._encode({success: false, message: failMessage});

		// (4) Insert a new kb_feedback record
		var kbFeedbackGr = new GlideRecord("kb_feedback");
		kbFeedbackGr.initialize();
		for (var name in fields)
			kbFeedbackGr[name] = fields[name];

		var recordId = kbFeedbackGr.insert();

		if (recordId)
			return this._encode({success: true, message: passMessage});

		// (5) Tell the caller that the request failed
		return this._encode({success: false, message: limitReachedMessage});
	},

	localizeCategoriesInKnowledgeBase: function() {

		// (1) Declare helper variables
		var kbId = this.getParameter("sysparm_id") || "";
		var passMessage = gs.getMessage("All Full Category paths for this Knowledge Base has been Localized based on the corresponding Category Label.");
		var failMessage = gs.getMessage("Could not Localize the Full Category paths for this Knowledge Base.");

		// (2) Validate sampler parameter values		
		if (JSUtil.nil(kbId))
			return this._encode({success: false, message: failMessage});

		// (3) Localize all Categories for this Knowledge Base
		var translate = new UpdateAllKnowledgeFullCategory();
		var translationSuccess = translate.updateFullCategoryForKnowledgeBase(kbId + "");

		if (translationSuccess)
			return this._encode({success: true, message: passMessage});

		// (4) Tell the caller that the request failed
		return this._encode({success: false, message: failMessage});
	},

	isPubVersion3: function() {
		return new KBCommon().isPubVersion3(this.getParameter("sysparm_pub"));
	},

	kbWriteCommentWithParams : function(params){
		if(!this._validateProperty('glide.knowman.show_user_feedback','onload','onload') && !this._validateProperty('glide.knowman.show_user_feedback','onload','onclick') && (params.sysparm_flag == "false" || params.sysparm_flag == false))
			return this._encode({success: false});
		if(!this._validateProperty('glide.knowman.show_flag','true','true') && (params.sysparm_flag == "true" || params.sysparm_flag == true))
			return this._encode({success: false});
		if(!this._canReadArticle(params.sysparm_id))
			return this._encode({success: false});
		if(this.isCommentingDisabled(params.sysparm_id) && params.sysparm_flag != "true")
			return this._encode({success: false});
		var fb = new GlideRecord('kb_feedback');
		if(params.view_id && params.view_id != "") {
			fb.addQuery("view_id",view_id);
			fb.query();
			if (!fb.next()) 
				params.view_id = gs.generateGUID();
		} else {
			params.view_id = gs.generateGUID();
		}
		fb.article = params.sysparm_id; 
		fb.user.setValue(gs.getUserID());
		fb.comments = params.feedback;
		fb.query = unescape(params.sysparm_search);
		if (params.sysparm_flag == "true" || params.sysparm_flag == true) {
			fb.flagged = "true";
			if(!params.isV3 && gs.getProperty("glide.knowman.feedback.enable_actionable_feedback_for_flag",'false') == 'true')
				fb.reason = "Flagged";
		}
		fb.view_id = params.view_id;
		fb.session_id = gs.getSessionID();
		fb.search_id = params.ts_queryId;
		if(params.reason){
			fb.reason = params.reason;
		}
		var fb_id = fb.insert();

		var item = this.newItem();
		item.setAttribute("id",fb_id);
		item.setAttribute("name", fb.user.getDisplayValue()); 
		item.setAttribute("date", fb.sys_created_on.getDisplayValue());
		item.setAttribute("comment", this._getFeedbackComment(fb.comments.getDisplayValue()));

		if (fb_id) {
			return this._encode({success: true});
		}
		if(fb.flagged){
			var limitReachedMessage = gs.getMessage("You have reached the daily limit for comments a user can post while flagging articles.");
			return this._encode({success: false, message: limitReachedMessage});
		}
		return this._encode({success: false});
	},

	kbWriteComment: function() {
		var params = {};

		params.feedback = unescape(this.getParameter("sysparm_feedback"));
		params.view_id = this.getParameter("view_id");
		params.sysparm_flag = this.getParameter('sysparm_flag');
		params.sysparm_search = this.getParameter("sysparm_search");
		params.sysparm_id = this.getParameter("sysparm_id");
		params.ts_queryId = this.getParameter("ts_queryId");
		params.isV3 = (this.getParameter("sysparm_isV3")) ? true:false;
		return this.kbWriteCommentWithParams(params);
		/*	
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
		if (this.getParameter("sysparm_flag") == "true")
			fb.flagged = "true";
		fb.view_id = view_id;
		fb.insert();

		var item = this.newItem();
		item.setAttribute("name", fb.user.getDisplayValue());
		item.setAttribute("date", fb.sys_created_on.getDisplayValue());
		item.setAttribute("comment", this._getFeedbackComment(fb.comments.getDisplayValue()));
		*/
	},

	_getFeedbackComment: function(feedback) {
		feedback = feedback.replace(/\n/g, "INSERTNEWLINE");
		feedback = GlideStringUtil.escapeHTML(feedback) + '';
		feedback = feedback.replace(/INSERTNEWLINE/g, "<br/>");
		return feedback;
	},

	/**
 	* Prevent public access to this script
 	*/
	isPublic: function() {
		return false;
	},

	process: function() {
		// Call method via reflection
		if (this[type])
			return this[type]();
	},

	_i18n: function(message, array) {
		message = message || "";
		var padded = " " + message + " ";
		var translated = gs.getMessage(padded, array);
		var trimmed = translated.trim();
		return trimmed;
	},

	_encode: function(object) {
		return new JSON().encode(object);
	},

	getKBReadWriteStatus: function() {
		//Check current user has access to create article before allowing them to check if the kb
		//read access is public.
		if(!new KBKnowledge().canCreate())
			return;
		var kbId = this.getParameter("sysparm_kbId") || "";
		if(!kbId)
			return;
		var kbCommon = new KBCommon();
		if(kbCommon.isAccessBlockedWithNoUC())
			return "secure";
		var read = kbCommon.isKBReadPublic(kbId);
		var write = kbCommon.isKBWritePublic(kbId);
		if(read && write)
			return "read_write_public";
		else if(read)
			return "read_public";
		else if(write)
			return "write_public";
		return "secure";
	},

	/**
	* Creates or updates Translation Tasks based on the language selection.
	**/
	requestTranslationTask: function(){
		var article = new GlideRecord('kb_knowledge');
		var article_sysid = this.getParameter('sysparm_article') || '';
		var selectedLanguages = this.getParameter('sysparm_languageArray') || '';
		var requestMode = this.getParameter('sysparm_mode') || '';
		var kbTranslationTask = new KBTranslationTask();
		if (JSUtil.notNil(article_sysid) && JSUtil.notNil(selectedLanguages) &&
			article.get(article_sysid) && kbTranslationTask.canRequestTranslation(article)) {
			if (kbTranslationTask.createOrUpdateTranslationTask(article, selectedLanguages.split(','), requestMode)) {
				return 'true';
			}
		}
		return 'false';
	},

	/**
    * Loads the Translation content on comparison form.
    **/
	loadTranslationContent: function() {
		var language = this.getParameter('sysparm_language') || '';
		var source_articleid = this.getParameter('sysparm_sourcearticle') || '';
		var tableName = this.getParameter('sysparm_table') || '';
		var responseObj = {};
		if (JSUtil.notNil(source_articleid) && JSUtil.notNil(language) && JSUtil.notNil(tableName)){
			var translation = new KBTranslationTask().getTranslatedArticleForLanguage(source_articleid, tableName, language);
			if (translation.isValidRecord() && translation.canRead()) {
				responseObj.translationObj = new KBTranslationTask().prepareArticleObjectForTranslation(translation);
			} else {
				var sourceBlocks = this.getParameter('sysparm_blocks') || '';
				if (JSUtil.notNil(sourceBlocks)) {
					responseObj.translatedBlockObj = new KBBlock().getTranslatedBlocks(sourceBlocks, language);
				}
			}
		}
		return new JSON().encode(responseObj);
	},

	//Checkout an outdated article to create a new version
	makeThisCurrent: function(){
		var kbId = this.getParameter('sysparm_kb_id') || '';
		var kbTable = this.getParameter('sysparm_kb_table') || '';

		if(kbId && kbTable && new KBCommon().isVersioningEnabled()){
			var kbGr = new GlideRecord(kbTable);
			if(kbGr.get(kbId)){
				var newRecord = new KBVersioning().makeThisCurrent(kbGr);
				if(newRecord && newRecord.sys_id)
					return newRecord.sys_id+'';
			}
		}

		return "";
	},

	/* Checkout article */
	checkoutArticle: function(){
		var kbId = this.getParameter('sysparm_kb_id') || '';
		var kbTable = this.getParameter('sysparm_kb_table') || '';

		if(kbId && kbTable && new KBCommon().isVersioningEnabled()){
			var kbGr = new GlideRecord(kbTable);
			if(kbGr.get(kbId)){
				var previous_valid_to = kbGr.getDisplayValue("valid_to");
				var newRecord = new KBVersioning().checkout(kbGr);
				if(newRecord && newRecord.sys_id){
					var current_valid_to = newRecord.getDisplayValue("valid_to");
					var message = "";
					if(previous_valid_to != current_valid_to){
						if(gs.nil(previous_valid_to))
							message = gs.getMessage("Valid to has been changed to {0}.",current_valid_to);
						else
							message = gs.getMessage("Valid to has been changed from {0} to {1}.",[previous_valid_to ,current_valid_to]);
					}
					return this._encode({
						sysId: newRecord.sys_id+'',
						message:message
					});
				}
			}
		}

		return "";
	},

	/**
    * Create or Checkout a translated article.
    **/
	createOrCheckoutTranslation: function() {
		var sysparm_translationobj = this.getParameter('sysparm_translationobj') || '';
		var newRecord = '';
		if (JSUtil.notNil(sysparm_translationobj)) {
			var translationObj = JSON.parse(sysparm_translationobj);
			var source_sysid = this.getParameter('sysparm_sourcesysid') || '';
			var source_table = this.getParameter('sysparm_sourcetable') || '';
			var translatedLanguage = this.getParameter('sysparm_language') || '';
			var source_article = new GlideRecord(source_table);
			var kbVersioning = new KBVersioning();
			if (JSUtil.notNil(source_sysid) && JSUtil.notNil(translatedLanguage) &&
				source_article.get(source_sysid) && source_article.canCreate()) {
				newRecord = kbVersioning.createOrCheckout(source_article, translatedLanguage, translationObj);
				if(!gs.nil(newRecord)) return newRecord.sys_id;
			} else {
				var sysparm_task = this.getParameter('sysparm_task') || '';
				var translationTask = new GlideRecord('kb_translation_task');
				if (JSUtil.notNil(sysparm_task) && translationTask.get(sysparm_task) &&
					new KBTranslationTask().canTranslateFromTask(translationTask)) {
					newRecord = kbVersioning.createOrCheckOutFromTask(translationTask, translationObj);
					if(!gs.nil(newRecord)) return newRecord.sys_id;
				}
			}
		}
		return newRecord;
    },

	getDefaultValidToDate: function() {	
		var knowledgeBaseSysId = this.getParameter('sysparm_base_sys_id');	
		var isNewRecord = this.getParameter('sysparm_is_new_record');	
		if(isNewRecord)
			return new KBCommon().getDefaultValidToDateFromCurrentDate(knowledgeBaseSysId);
		else{
			var gr = new GlideRecord("kb_knowledge_base");
			if(gr.get(knowledgeBaseSysId)){
				if(parseInt(gr.getValue("article_validity")) > 0)
					return new KBCommon().getDefaultValidToDateFromCurrentDate(knowledgeBaseSysId);
			}
			return null;
		}
	},
	
	getTableMappingAsQuery: function() {
		var query = '';
		var sourceTable = this.getParameter('sysparm_sourceTable') || '';
		var sourceId = this.getParameter('sysparm_sourceId') || '';
		var targetTable = this.getParameter('sysparm_targetTable') || '';
		var mapName = this.getParameter('sysparm_mapName') || '';
		var trackClicks = this.getParameter('sysparm_trackClicks') || '';
		if(sourceTable && sourceTable == 'sn_customerservice_case' && trackClicks && trackClicks == 'true') {
			var csmWorkspaceUAUtil = new sn_csm_workspace.CSMWorkspaceUAUtil();
			csmWorkspaceUAUtil.createKnowledgeClickCase();
		}
		if(sourceId && sourceTable) {
			var source = new GlideRecord(sourceTable);
			if(source.get(sourceId) && source.canRead()) {
				var map = new CSMTableMapUtil(source);
				if(mapName && mapName != '') {
					if(map.findMapByName(mapName)) {
						map.addMetaData();
						query = map.getTargetQuery();
						if(query) {
							query = JSON.stringify(query[0]);
							return query;
						}
					}
				}
				else {
					if(targetTable && map.findMapBySourceHierarchy(targetTable,1)) {
						query = map.getTargetQuery();
						if(query) {
							query = query.toString();
							return query;
						}
					}
				}
			}
		}
		return '';
    },
	
	isCommentingDisabled: function(articleId) {
		var gr = new GlideRecord('kb_knowledge');
		if(gr.get(articleId)) 
			return gr.disable_commenting;
	},
	
	getKnowledgeGapData: function() {
		var sysIds =  this.getParameter('sysparm_sys_ids') || '';
		var query = this.getParameter('sysparm_query') || '';

		var skippedTasks = [];
		var selectedTasks = [];
		
		if(sysIds) {
			var record = new GlideRecordSecure('kb_curation_task_cluster');
			record.addQuery('sys_id', 'IN', sysIds);
			record.query();

			while(record.next()) {
				if(record.kbcoverage_is_knowledge_gap_created)
					skippedTasks.push(record.kbcoverage_task.getDisplayValue());
				else
					selectedTasks.push(record.getValue('sys_id'));
			}			
		}
		
		var summary = '';
		
		if(query) {
			var cluster = new GlideRecord('ml_cluster_summary');
			var key = 'ml_cluster_id=';
			var clusterId = query.substring(query.indexOf(key) + key.length).split('^')[0];
			
			cluster.get(clusterId);			
			
			summary = cluster.cluster_concept ?  cluster.cluster_concept.split(' ').join(', ') : '';
		}

		return JSON.stringify({
			skippedTasks: skippedTasks,
			selectedTasks: selectedTasks,
			summary: summary
		});
	},
	
	type: "KBAjaxSNC"
});
```