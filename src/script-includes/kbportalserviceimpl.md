---
title: "KBPortalServiceImpl"
id: "kbportalserviceimpl"
---

API Name: global.KBPortalServiceImpl

```js
var KBPortalServiceImpl = Class.create();
KBPortalServiceImpl.prototype = {

	LANGUAGE: gs.getProperty('glide.knowman.enable_multi_language_search','false') != 'true' ?  (gs.getProperty("glide.knowman.search.default_language") || gs.getUser().getLanguage() || 'en') : "",

	initialize: function() {

	},

	/**
	Calls SNC Class to evaluate the inputs and get all subscribed facets data
 	**/
	getAllFacets: function(keyword,language,variables,query,order,minCount,portalSuffix, parsed){

		try{
			language = language || this.LANGUAGE;
			portalSuffix = portalSuffix || "";
			var result = this._getAllFacets(
				keyword + '', language + '', variables + '', query + '', order + '', minCount + '', portalSuffix + '');
			if (parsed)
				return new JSON().decode(result + '');
			else
				return result;
		}catch(e){
			return [];
		}
	},

	/**
	Calls SNC Class to evaluate the inputs and get specific facet data
 	**/
	getFacetByName: function(name,value,keyword,language,variables,query,order,portalSuffix){

		try{
			language = language || this.LANGUAGE;
			portalSuffix = portalSuffix || "";
			return this._getFacetByName(
				name+'',value+'',keyword+'',language+'',this.str(variables),this.str(query),order+'',portalSuffix+'');
		}catch(e){
			return [];
		}
	},

	//Returns a JSONArray representation of accessible knowledge bases
	getMyKnowledgeBases:function(order,knowledgeBases){
		try{
			order = order || 'title';
			knowledgeBases = knowledgeBases || '';
			return this._getMyKnowledgeBases(order+"",knowledgeBases+"");
		}catch(e){
			return "";
		}
	},

	//Returns a JSONArray representation of keyword suggestions
	getKnowledgeSuggestions:function(keyword,language){
		try{
			language = language || this.LANGUAGE;
			return this._getKnowledgeSuggestions(keyword,language);
		}catch(e){
			return "";
		}
	},

	//Returns a JSONArray representation of accessible knowledge bases
	getFeaturedArticles:function(maxValue,displayField,secondaryFields,knowledgeBases){
		try{
			return this._getFeaturedArticles(maxValue,displayField,secondaryFields,knowledgeBases);
		}catch(e){
			return [];
		}
	},

	// Find a knowledge item by item number
	getKnowledgeSysIDByNumber: function (number) {
		var record = new KBCommon().getKnowledgeRecord(number);
		return record ? record.getUniqueValue() : null;
	},

	//Returns a JSONArray representation for Related articles
	getRelatedArticles:function(maxValue,displayField,secondaryFields,knowledgeBases,articleSysId,sourceId,sourceTable,sourceColumn,targetColumn,pageID){
		return this._getRelatedArticles(maxValue,displayField,secondaryFields,knowledgeBases,articleSysId,sourceId,sourceTable,sourceColumn,targetColumn,pageID);
	},

	//Returns a JSONArray representation of accessible knowledge bases
	getMostViewedArticles:function(maxValue,displayField,secondaryFields,knowledgeBases){
		try{
			return this._getMostViewedArticles(maxValue,displayField,secondaryFields,knowledgeBases);
		}catch(e){
			return [];
		}
	},

	//Returns a JSONArray representation of accessible knowledge bases
	getMostUsefulArticles:function(maxValue,displayField,secondaryFields,knowledgeBases){
		try{
			return this._getMostUsefulArticles(maxValue,displayField,secondaryFields,knowledgeBases);
		}catch(e){
			return [];
		}
	},

	//Return attachment link for given article id
	getAttachmentLink:function(articleId){
		try{
			return this._getAttachmentLink(articleId);
		}catch(e){
			return "";
		}
	},

	isValidFacetField:function(table,field,maxVal){
		var gr = new GlideRecord(table);
		gr.setLimit(1);
		if(gr.isValidField(field)){
			gr.query();
			if(gr.next()){
				var fieldType =  gr.getElement(field).getED().getInternalType();
				if(fieldType == 'boolean' || fieldType == 'reference' || (fieldType == 'glide_list' && gr.getElement(field).getED().getReference())){
					return true;
				}else if(fieldType == 'string' || fieldType == 'integer' || fieldType == 'workflow'){
					var fieldChoice = gr.getElement(field).getED().getChoice();
					if(fieldChoice == '1' || fieldChoice == '3' ||  gr.getElement(field).getED().getSqlLength() <= maxVal)
						return true;
				}
			}
		}
		return false;
	},

	isMobile: function() {
		return (GlideMobileExtensions.getDeviceType() == 'm' || GlideMobileExtensions.getDeviceType() == 'mobile');
	},


	getNestedCategories : function(parentCatId){
		return new SNC.KnowledgeHelper().getNestedCategoryList(parentCatId);
	},

	/*
 	* Payload parameters: start, end, keyword, language, variables, order, secondary_fields, resource, attachment
 	*/

	getResultData:function(input){

		try{

			if(typeof(input) != 'object')
				input = new JSON().decode(input);

			var queryParams = {};
			queryParams.portal_request = true;
			// Uncomment below line to get 'tags' in meta response. 
			//queryParams.portal_tags = true;
			queryParams.portal_suffix = input.portal_suffix ? input.portal_suffix : "";
			queryParams.variables = input.variables ? input.variables : "";
			queryParams.freetext = input.keyword ? input.keyword+'' : "";
			queryParams.knowledge_fields = input.knowledge_fields ? input.knowledge_fields+'' : "";
			queryParams.social_fields = input.social_fields ? input.social_fields+'' : "";
			queryParams.kb_knowledge_encoded_query = input.kb_query || "";
			queryParams.index_group = input.index_group || "";

			if(input.variables && input.variables.kb_category && input.category_as_tree){
				var catIds = this.getNestedCategories(input.variables.kb_category[0]);
				if(typeof(catIds) != 'object')
					catIds = new JSON().decode(catIds);
				catIds.push(input.variables.kb_category[0]);
				input.variables.kb_category = catIds;
			}

			if(input.result_limit)
				queryParams.result_limit = input.result_limit || gs.getProperty('glide.knowman.content_block_limit') || 5;

			queryParams.searchParameters = {};
			queryParams.searchParameters.knowledgeBase = input.knowledge_base ? input.knowledge_base+"" : "";
			queryParams.searchParameters.language = input.language ? input.language+'' : this.LANGUAGE;
			queryParams.searchParameters.socialqa_encoded_query = input.social_query ? input.social_query :  "";
			queryParams.searchParameters.pinned_encoded_query = input.kb_query ? input.kb_query : "";

			var orderdata = [];

			if(input.order){
				orderdata = input.order.toString().split(',');

				queryParams.order = orderdata[0] || "";
				queryParams.order_desc = orderdata[1] || false;
			}

			var resource = [];
			if(input.resource){
				if(input.resource.toLowerCase() != 'knowledge') {
					resource.push('social');

					if(input.resource.toLowerCase() == 'accepted')
						queryParams.acceptedAnswersOnly = true;
					if(input.resource.toLowerCase() == 'answered')
						queryParams.answeredQuestionsOnly = true;
					if(input.resource.toLowerCase() == 'unanswered')
						queryParams.unansweredQuestionsOnly = true;
				}else{
					resource.push('knowledge');
				}
			}

			var payload = {
				meta	: {
					window	: {
						'start'	: input.start ? parseInt(input.start) : 0,
						'end'	: input.end ? parseInt(input.end) : 30
					},
					includePinnedArticles: true,
					applyFilter			 : true,
					searchWhenEmpty		 : false,
					queryForAttachments	 : input.attachment
				},
				context	: input.context ? input.context : '03ddb541c31121005655107698ba8f7f',
				entity	: input.entity || '',
				query	: queryParams ,
				resources : resource || [],
				debug	: false,
				searchSource : 'sp_widget',
				searchType : 'kb_contextual_search'
			};

			if(input.ts_query_sysId && input.ts_query_sysId!=""){		
				payload.meta.ts_query_kbId = input.ts_query_sysId;		
			}		
			if(input.hasOwnProperty("metricEntryneeded")){		
				payload.meta.metricEntryneeded = input.metricEntryneeded;		
			}
			return this._getResult(new JSON().encode(payload));


		}catch(e){
			return [];
		}
	},

	getFetchCountResponse : function(input){
		var response =  this.getResultData(input);
		var modifiedResponse = {};
		if(response.meta)
			modifiedResponse.meta = response.meta;
		if(response.status)
			modifiedResponse.status = response.status;
		return modifiedResponse;
	},

	getAvailableLanguages:function(selectedLang){
		try{

			var selectLangArray = selectedLang.split(",");
			var selectedLangObj = {};
			for(var j=0;j<selectLangArray.length;j++){
				selectedLangObj[selectLangArray[j]]=true;
			}

			//Get laguages available in language choices in language field on user table
			var choiceList = new GlideChoiceList();
			var languages = [];
			var defaultLanguage = gs.getProperty('glide.knowman.search.default_language') || gs.getUser().getLanguage() || "en";
			var languageStr = "";

			if (new GlideRecord('kb_knowledge').isValidField('language')) {
				var clg = new GlideChoiceListGenerator('sys_user', 'preferred_language');
				clg.setCache(false);
				clg.setNone(false);
				clg.get(choiceList);
				choiceList.removeChoice('NULL_OVERRIDE');
			}

			if(choiceList){
				languageStr = choiceList.toString().replace('[','').replace(']','');
			}
			if(languageStr && languageStr != ""){
				var lanArry = languageStr.split(',');
				for(var i=0;i<lanArry.length;i++){
					var lang = lanArry[i].split(':');
					var obj = {};
					obj.label = lang[0].trim();
					obj.value = lang[1].trim();
					obj.id = lang[1].trim();
					if(selectedLangObj.hasOwnProperty(obj.id))
						obj.selected = true;
					else
						obj.selected = false;
					if(defaultLanguage.trim() == lang[1].trim())
						defaultLanguage = lang[0].trim();
					languages.push(obj);
				}
			}
			var result = {};
			result.languages = languages;
			result.default_language = defaultLanguage;
			return result;

		}catch(e){
			return [];
		}
	},

	canSubscribe:function(){

		if(gs.getSession().isLoggedIn() == false)
			return false;

		if (!GlidePluginManager().isActive('com.snc.knowledge_advanced'))
			return false;

		if(gs.getProperty('glide.knowman.enable_km_subscription', 'true') == 'false')
			return false;

		var roles = gs.getProperty('glide.knowman.enable_km_subscription.roles');
		if (roles != null && roles != '') {
			var hasRole = gs.hasRole(roles);
			if (hasRole == false)
				return false;
		}

		return true;
	},

	canCreateArticle: function(knowledgeBases) {
		if(gs.getSession().isLoggedIn() == false)
			return false;

		if(!new SNC.KnowledgeHelper().getWritableKnowledgeBaseIDs(knowledgeBases || ""))
			return false;

		return true;
	},

	canPostQuestion: function(knowledgeBases) {

		if(gs.getSession().isLoggedIn() == false)
			return false;

		if (!GlidePluginManager().isActive('com.snc.knowledge.social_qa.ui') && !GlidePluginManager().isActive('sn_kb_sqa_user_int'))
			return false;

		knowledgeBases = new SNC.KnowledgeHelper().getReadableKnowledgeBaseIDs(knowledgeBases || "");
		if(knowledgeBases){
			var kb = new GlideRecord("kb_knowledge_base");
			kb.addQuery('sys_id','IN',knowledgeBases);
			kb.addQuery('enable_socialqa', true);
			kb.addActiveQuery();
			kb.query();
			if(!kb.hasNext())
				return false;
		}else
			return false;

		return true;
	},

	// Functions to perform actions on comments
	getRootComments : function(articleId){
		return new JSON().decode(new SNC.KnowledgeHelper().getRootComments(articleId));
	},

	getAllComments : function(articleId){
		return new JSON().decode(new SNC.KnowledgeHelper().getAllComments(articleId));
	},

	addComment : function(commentText, articleId, parentId){

		if(!(this._checkUserAccess(articleId) && this._canUserAccessComments())) return "";

		var gr = new GlideRecord('kb_feedback');
		if(parentId)
			if(!gr.get(parentId)) return "INVALID_PARENT";

		gr.initialize();
		gr.user = gs.getUserID();
		gr.comments = commentText;
		gr.article = articleId;
		gr.session_id = gs.getSessionID();
		if(parentId) gr.parent_comment = parentId;
		var sys_id = gr.insert();
		return {
			"sys_id": sys_id,
			"created_on": new GlideDateTime().toString(),
			"comment_text": commentText,
			"likes": [],
			"user": this.getUserDetails(gs.getUserID()),
			"children": [],
			"attachments": [],
			"parent": parentId
		};
	},

	submitRating : function(rating, articleId){

		if(!this._checkUserAccess(articleId)) return false;

		var gr = new GlideRecord('kb_feedback');
		gr.user = gs.getUserID();
		gr.rating = rating;
		gr.article = articleId;
		gr.session_id = gs.getSessionID();
		return gr.insert();
	},

	deleteComment : function(commentId, articleId){
		if(!(this._checkUserAccess(articleId) && this._canUserAccessComments())) return false;   

		var gr = new GlideRecord("kb_feedback");
		var userId = gs.getUserID();
		if(!gr.get(commentId)) return true;
		if(userId == gr.user.getValue() || new KBCommon().isAdminUser(gr.article) || userId == gr.article.kb_knowledge_base.owner)
			return gr.deleteRecord();
		return false;
	},


	likeComment : function(commentId, articleId){
		if(!(this._checkUserAccess(articleId) && this._canUserAccessComments())) return false;   

		var commentGr = new GlideRecord("kb_feedback");
		if(!commentGr.get(commentId)) return false;

		var gr = new GlideRecord("m2m_kb_feedback_likes");
		gr.comment = commentId;
		gr.user = gs.getUserID();
		var sysId = gr.insert();
		if(sysId)
			return {
				"user": this.getUserDetails(gs.getUserID()),
				"sys_id": sysId
			};
		return false;
	},

	unLikeComment : function(commentId, articleId){
		if(!(this._checkUserAccess(articleId) && this._canUserAccessComments())) return false;    

		var gr = new GlideRecord("m2m_kb_feedback_likes");
		gr.addQuery("comment",commentId);
		gr.addQuery("user",gs.getUserID());
		gr.query();
		if(gr.next()) return gr.deleteRecord();
		return false;
	},


	getUserDetails: function(userId){
		return JSON.parse(new SNC.KnowledgeHelper().getUserDetails(userId));
	},

	isMemberOfAOG: function(current) {
		return current.isValidField("ownership_group") && GlidePluginManager.isActive('com.snc.knowledge_advanced') ? (new KBOwnershipGroup().isMemberOfValidOwnershipGroup(current)) : false;
	},

	saveUsefulWithParams: function(params) {
		return new KBAjax().saveUsefulWithParams(params);
	},

	kbWriteCommentWithParams: function(params) {
		return new KBAjax().kbWriteCommentWithParams(params);
	},

	saveStarRatingWithParams: function(params) {
		return new KBAjax().saveStarRatingWithParams(params);
	},

	_checkUserAccess: function(articleId){
		var article = new GlideRecord("kb_knowledge");
		if(!article.get(articleId)) {
			return false;
		}
		if(!(article.canRead())) {
			return false;
		}
		return true;
	},
	
	_canUserAccessComments: function() {
		if (gs.getProperty("glide.knowman.show_user_feedback", "onload") == "never")
			return false;
		var roles = gs.getProperty('glide.knowman.show_user_feedback.roles');
		if(!gs.nil(roles) && !gs.hasRole(roles)) {	
			return false;	
		}
		return true;
	},

	_getResult: function(data){
		var json = new JSON();
		var searchRequest = new SNC.SearchRequest().fromJSON(data);
		return json.decode(searchRequest.submit().toJSON());
	},

	_getMyKnowledgeBases:function(order,knowledgeBases){
		var json = new JSON();
		var kbData = json.decode(new SNC.KnowledgeHelper().getUserKnowledgeBases(order,knowledgeBases));

		if(this.canSubscribe()){
			var subs = new ActivitySubscriptionContext();
			var subscribedKBs = subs.getSubscriptionService().getSubscriptionsBySubscriber(gs.getUserID(),"722d67c367003200d358bb2d07415a9c","true");

			kbData.forEach(function(f){
				if(subscribedKBs && subscribedKBs.subscriptions && subscribedKBs.subscriptions.toString().indexOf(f.sys_id+'') > -1)
					f.subscribed = true;
				else
					f.subscribed = false;
			});
		}

		return kbData;
	},

	_getKnowledgeSuggestions:function(key,lang){
		var json = new JSON();
		var kbData = json.decode(new SNC.KnowledgeHelper().getJSONAlternatePhrases(key,lang));
		return kbData;
	},

	_getFeaturedArticles:function(maxValue,displayField,secondaryFields,knowledgeBases){
		var input = {};
		input.keyword = gs.getProperty("glide.knowman.default_keyword") || 'homepage';
		input.start = 0;
		input.end = maxValue || 30;
		input.result_limit = maxValue;
		if(secondaryFields)
			input.knowledge_fields = secondaryFields;

		if(displayField){
			input.knowledge_fields = input.knowledge_fields + "," + displayField;
		}
		input.attachment = false;
		input.entity = "pinnedArticles";
		input.context = "ac821f40bf003100216a85ce2c0739d2";
		if(knowledgeBases)
			input.knowledge_base = knowledgeBases || "";
		input.metricEntryneeded = false;
		return this.getResultData(input);
	},

	_getRelatedArticles:function(maxValue,displayField,secondaryFields,knowledgeBases,articleSysId,sourceId,sourceTable,sourceColumn,targetColumn,pageID){
		var relatedArticles = [];
		var sys_id_list=[];
		sys_id_list.push(articleSysId);
		knowledgeBases = new global.KBKnowledge().getReadableKnowledgeBaseIDs(knowledgeBases || "");

		try{
			this._getRelatedArticlesFromMapping(displayField,secondaryFields,maxValue,knowledgeBases,sourceId,sourceTable,sourceColumn,targetColumn,sys_id_list,relatedArticles,pageID);
			if(GlidePluginManager.isActive('com.snc.knowledge_ml') && relatedArticles.length<maxValue){
				this._getKnowledgeSimilarArticles(displayField,secondaryFields,maxValue,knowledgeBases,articleSysId,relatedArticles.length,sys_id_list,relatedArticles,pageID);
			}
			return relatedArticles;
		}
		catch(e){
			return relatedArticles;
		}
	},

	_getRelatedArticlesFromMapping:function(displayField,secondaryFields,maxValue,knowledgeBases,sourceId,sourceTable,sourceColumn,targetColumn,sys_id_list,relatedArticles,pageID) {
	var count = 0;
	var versioningEnabled = GlidePluginManager.isActive('com.snc.knowledge_advanced') && gs.getProperty("glide.knowman.versioning.enabled", "true") === "true";
    var relKB = new GlideRecord(sourceTable);
    relKB.addQuery(sourceColumn, sourceId);
    relKB.addActiveQuery();
    relKB.orderBy('order');
    relKB.query();
    var sysIdCount = 0;

    var relArtSysIds = [];
    var batchSize = maxValue * 4;
    while (relKB.next()) {
		if(relatedArticles.length >= maxValue )
			break;

		relArtSysIds.push(relKB[targetColumn] + '');
        sysIdCount++;
        if (sysIdCount < batchSize && relKB.hasNext()) {
            continue;
        }
        if (relArtSysIds.length <= 0)
            break;
        sysIdCount = 0;

        var articleGr = new GlideRecord('kb_knowledge');
        new global.KBKnowledge().addKnowledgeQueries(articleGr, knowledgeBases, true);
        articleGr.addQuery('sys_id', relArtSysIds);
        articleGr.addQuery('workflow_state', 'IN', 'outdated,published');
        articleGr.query();
        var curArticles = [];
        while (articleGr.next()) {	
            if (sys_id_list.indexOf(articleGr.getUniqueValue()) >= 0)
                continue;

            if (!articleGr.canRead())
                continue;
			var kbGR =null;
			if(articleGr.workflow_state == 'published') {
				sys_id_list.push(articleGr.getUniqueValue() + '');
				kbGR = articleGr;
			}
           
            if (versioningEnabled && articleGr.workflow_state != 'published') {
                var grsKbLatest = new GlideRecord("kb_knowledge");
                grsKbLatest.addQuery('article_id', articleGr.article_id);
                grsKbLatest.addQuery('workflow_state', 'published');
                grsKbLatest.addQuery("sys_created_on", ">=", articleGr.sys_created_on);
                grsKbLatest.orderByDesc('sys_created_on');
                grsKbLatest.setLimit(1);
                grsKbLatest.query();
                if (grsKbLatest.next() && grsKbLatest.canRead() && sys_id_list.indexOf(grsKbLatest.getUniqueValue() + '') === -1) {
                    kbGR = grsKbLatest;
					sys_id_list.push(grsKbLatest.getUniqueValue() + '');
                }
				else
					kbGR = null;
            }
			if(kbGR != null){
				curArticles[articleGr.getUniqueValue() + ''] = this._getJSONRecord(count, displayField, secondaryFields, kbGR, pageID);
				++count;
			}
        }

        relArtSysIds.forEach(function(sysId) {
            if (curArticles[sysId] && relatedArticles.length < maxValue){
				curArticles[sysId].order = relatedArticles.length;
				relatedArticles.push(curArticles[sysId]);
			}
                
        });

        relArtSysIds = [];
    }
},

	_getKnowledgeSimilarArticles:function(displayField,secondaryFields,maxValue,knowledgeBases,articleSysId,countFromMappedRelatedArticles,sys_id_list,relatedArticles,pageID){
		var gr = new GlideRecord("kb_knowledge");		
		gr.addQuery('sys_id', articleSysId);
		if(knowledgeBases)
			gr.addQuery('kb_knowledge_base','IN',knowledgeBases);
		gr.query();
		if(gr.next()){

			var solutionFinder = new sn_ml.SolutionFinder();
			var solution = solutionFinder.getSolution("ml_sn_global_knowledge_similar_articles");
			if(solution != null){
				var inputs = {};

				inputs["short_description"] = gr.short_description+"";
				var count = parseInt(2*maxValue)+1 + "";		//getting twice then the asked value to get actual count after canRead check
				var outcomeArr = solution.predictTextTopN(inputs, count);

				var mlPredictor = new MLPredictor();


				var articleList = [];
				for(var i=0;i<outcomeArr.length;++i){
					if(outcomeArr[i].confidence()<mlPredictor.__getPredictionThreshold(solution, outcomeArr[i]))
						break;
					articleList.push(outcomeArr[i].predictedValue()+"");
				}

				var article = new GlideRecord("kb_knowledge");
				article.addQuery('sys_id', 'IN', articleList);
				article.addQuery('sys_id','NOT IN',sys_id_list);
				article.addQuery("sys_class_name", "!=", "kb_knowledge_block");
				new global.KBKnowledge().addKnowledgeQueries(article, knowledgeBases);
				article.query();
				while(article.next()){
					if (!article.canRead())
						continue;
					var index=articleList.indexOf(article.sys_id+"");
					articleList[index]=this._getJSONRecord(countFromMappedRelatedArticles,displayField,secondaryFields,article,pageID);
				}
				for(var j=0;j<articleList.length && countFromMappedRelatedArticles<maxValue;++j){
					if(typeof articleList[j] != "string"){
						articleList[j].order = countFromMappedRelatedArticles-1;
						relatedArticles.push(articleList[j]);
						++countFromMappedRelatedArticles;
					}
				}
			}	
		}
	},

	_getJSONRecord:function(count,displayField,secondaryFields,articleGr,pageID){
		var record = {};
		record.id = articleGr.sys_id+"";
		pageID = pageID || "kb_article_view";
		record.link = "?id="+pageID+"&sys_kb_id=" + articleGr.sys_id + "";
		if (displayField){
			if(displayField == "short_description"){
				record.display_field = articleGr.getValue("short_description");
			}else{
				record.display_field = articleGr.getValue(displayField);
			}
		}
		record.order = count;

		record.secondary_fields = [];
		secondaryFields.forEach(function(key){

			var meta={};
			meta.name = key;
			meta.display_value = articleGr.getDisplayValue(key);

			if (articleGr.getElement(key).getED().getInternalType()) {

				meta.type = articleGr.getElement(key).getED().getInternalType();
				meta.label = articleGr.getElement(key).getED().getLabel();
				meta.value = articleGr.getValue(key);
				if(displayField != key){
					record.secondary_fields.push(meta);
				}
			}
		});


		return record;
	},

	_getMostViewedArticles:function(maxValue,displayField,secondaryFields,knowledgeBases){
		return new JSON().decode(new SNC.KnowledgeHelper().getMostViewedArticles(maxValue+"",displayField+"",secondaryFields+"",knowledgeBases+""));
	},

	_getMostUsefulArticles:function(maxValue,displayField,secondaryFields,knowledgeBases){
		return new JSON().decode(new SNC.KnowledgeHelper().getMostUsefulArticles(maxValue+"",displayField+"",secondaryFields+"",knowledgeBases+""));
	},

	_getAllFacets: function(keyword,language,variables,query,order,minCount,portalSuffix){
		return new SNC.KnowledgeHelper().getAllFacets(keyword,language,variables,query,order,minCount,portalSuffix);
	},

	_getFacetByName: function(name,value,keyword,language,variables,query,order,portalSuffix){
		return new SNC.KnowledgeHelper().getFacetByName(name,value,keyword,language,variables,query,order,portalSuffix);
	},

	_getAttachmentLink:function(articleId){
		return new SNC.KnowledgeHelper().getAttachmentLink(articleId);
	},

	//make sure we always get strings from the parameter map
	str:function(value) {
		if (value){
			if(typeof value === 'object')
				return new global.JSON().encode(value) + '';
			else
				return value+'';
		}
		return '';
	},

	getServicePortalKnowledgeBases: function(portal) {
		return new global.KBKnowledge().getServicePortalKnowledgeBases(portal);
	},

	getCaseInfo: function(caseSysId, data){
		new sn_customerservice.CaseAutoresponder().getCaseInfo(caseSysId, data);
	},

	performAction: function(input, data){
		new sn_customerservice.CaseAutoresponder().performAction(input, data);
	},

	type: 'KBPortalServiceImpl'
};
```