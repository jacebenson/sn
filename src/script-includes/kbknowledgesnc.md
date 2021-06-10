---
title: "KBKnowledgeSNC"
id: "kbknowledgesnc"
---

API Name: global.KBKnowledgeSNC

```js
KBKnowledgeSNC = Class.create();

KBKnowledgeSNC.prototype =  Object.extendsObject(KBCommon, {

	PATH_TO_OWNER: "kb_knowledge_base.owner",
	PATH_TO_MANAGERS: "kb_knowledge_base.kb_managers",
	OWNERSHIP_GROUP : "ownership_group",

	/**
	 * Can the current user create kb_knowledge records
	 *
     * @param GlideRecord: kb_knowledge
	 **/
	canCreate: function() {
		// if there is atleat 1 knowledge base the current user can contribute to
		// then they can create
		var kb = new GlideRecord("kb_knowledge_base");
		kb.addActiveQuery();
		kb.query();

		while(kb.next()) {
			//Ignore Checking for V2 Kb as there is no user criteria
			if(kb.kb_version == "2")
				continue;

			if(this.safeExecute(this._knowledgeHelper.canContribute, kb))
				return true;
		}

		return false;
	},

	canRead: function(knowledgeGR) {

		// Case1: User has passed in a new legacy record, so do not give them permission to read this record (Let existing legacy ACLs handle this instead)
		if (knowledgeGR.isNewRecord())
			return this.canCreate();

		// Case2: User has passed in an existing legacy record, so do not give them permission to read this record (Let existing legacy ACLs handle this instead)
		if (!this.isRecordVersion3(knowledgeGR))
			return false;

		// Case3: User has knowledge_admin role, so give them permission to read this record
		if (this.isAdminUser(knowledgeGR))
			return true;

		// Case4: User is knowledge base owner, so give them permission to read this record
		if (this.isKnowledgeBaseOwner(knowledgeGR, this.PATH_TO_OWNER))
			return true;

		// Case5: User is knowledge base manager, so give them permission to read this record
		if (this.isKnowledgeBaseManager(knowledgeGR, this.PATH_TO_MANAGERS))
			return true;

		if(this.isVersioningInstalled() && this.isMemberOfValidGroup(knowledgeGR,this.OWNERSHIP_GROUP))
			return true;

		//PRB752684 Fix
		//If article is not published or outdated additional roles may be required to view the article based on
		//property values and state of the article.

		// Case6: If user can only read from the knowledge base, show them published and outdated kb_knowledge
		if (this.safeExecute(this._knowledgeHelper.canRead, knowledgeGR)) {
			if((knowledgeGR.workflow_state == "published" || 
			knowledgeGR.workflow_state == "outdated"  || this.safeExecute(this._knowledgeHelper.canReadUnpublished, knowledgeGR))){
				// Use role based security on article if property is set to true
				var useRoleBasedSecurity = gs.getProperty("glide.knowman.search.apply_role_based_security", true);
				if(useRoleBasedSecurity && !knowledgeGR.roles.nil() && knowledgeGR.roles != ""){
					return gs.hasRole(knowledgeGR.roles);
				}
				return true;
			}
		}
		else {
			if(gs.getProperty("glide.knowman.apply_article_read_criteria", "false") == "true")
				return false;
		}

		// Case7: If the user can contribute to the knowledge base allow them to read the knowledge record
		if (this.safeExecute(this._knowledgeHelper.canContribute, knowledgeGR))
			return true;	

		// Default: User should NOT be given permission to read this record
		return false;
	},

	canWrite: function(knowledgeGR) {
		if(gs.getProperty('glide.knowman.allow_edit_global_articles')=='false' && this.isArticleReadOnlyBasedOnDomain(knowledgeGR))
			return false;

		if(this.isExternalArticle(knowledgeGR))
			return false;

		if(!gs.nil(knowledgeGR.kb_knowledge_base) && !this.isRecordVersion3(knowledgeGR))
			return false;

		if(knowledgeGR.isNewRecord())
			return this.canCreate();

		if(this.isVersioningInstalled()){
			if(this.isVersioningEnabled())
				return new KBVersioning().canWrite(knowledgeGR);

			if(this.isValidFieldWithValue(knowledgeGR,this.OWNERSHIP_GROUP))
				return this._canEditVersionWithOwnershipGroup(knowledgeGR);
		}

		return this.safeExecute(this._knowledgeHelper.canContribute, knowledgeGR);

	},

	canDelete: function(knowledgeGR) {

		if(this.isExternalArticle(knowledgeGR))
			return false;

		// Delegate to versioning if enabled
		if(this.isVersioningEnabled())
			return new KBVersioning().canDelete(knowledgeGR);
		return false;
	},

	canRetire: function(knowledgeGR) {

		if(this.isExternalArticle(knowledgeGR))
			return false;

		if (pm.isActive('com.snc.knowledge_kcs_capabilities') && !gs.hasRole('admin') && gs.getUser().hasRole('kcs_contributor,kcs_candidate'))
            return false;
            
		if(this.isVersioningInstalled()){
			if(this.isVersioningEnabled())
				return new KBVersioning().canRetire(knowledgeGR);

			if(this.isValidFieldWithValue(knowledgeGR,this.OWNERSHIP_GROUP))
				return this._canEditVersionWithOwnershipGroup(knowledgeGR);
		}

		return this.canRetireKnowledge(knowledgeGR);
	},

	canPublish: function(knowledgeGR) {

		if(this.isExternalArticle(knowledgeGR))
			return false;

		// Case 1: Pass in a valid value
		if (!knowledgeGR)
			return false;

		// Case 2: If the record is published continue
		if (knowledgeGR.workflow_state != "draft")
			return false;

		// If versioning enabled, delegate to versioning permissions
		if(this.isVersioningInstalled()){
			if(this.isVersioningEnabled())
				return new KBVersioning().canPublish(knowledgeGR);

			if(this.isValidFieldWithValue(knowledgeGR,this.OWNERSHIP_GROUP))
				return this._canEditVersionWithOwnershipGroup(knowledgeGR);
		}
		// Case 3: If user can contribute continue
		return this.safeExecute(this._knowledgeHelper.canContribute, knowledgeGR);
	},

	retire: function(knowledgeGR) {
		knowledgeGR.workflow_state = "retired";
		return knowledgeGR.update();
	},

	canRepublish: function(knowledgeGR) {
		if(this.isExternalArticle(knowledgeGR))
			return false;

		if(this.isVersioningEnabled())
			if(!new KBVersioning().isLatestVersion(knowledgeGR))
				return false;

		return this.canRepublishKnowledge(knowledgeGR);
	},

	republish: function(knowledgeGR){
		if(this.isVersioningEnabled())
			return new KBVersioning().republish(knowledgeGR);

		return this.republishKnowledge(knowledgeGR);
	},

	_canEditVersionWithOwnershipGroup: function(gr){

		// User has knowledge_admin role, so give them permission to edit
		if (this.isAdminUser(gr))
			return true;

		// User is knowledge base owner, so give them permission to edit
		if (this.isKnowledgeBaseOwner(gr, this.PATH_TO_OWNER))
			return true;

		// User is knowledge base manager, so give them permission to edit
		if (this.isKnowledgeBaseManager(gr, this.PATH_TO_MANAGERS))
			return true;

		// If ownership group exit and user is member give permission to edit
		if(this.isGroupMemberOrManager(gr[this.OWNERSHIP_GROUP])) 
			return true;
		
		//If override ownership group is enabled, give author/revisor permission to edit
		return (gs.getProperty("glide.knowman.ownership_group.override", "false") == "true" && new KBVersioning().isAuthorOrReviser(gr) && this.safeExecute(this._knowledgeHelper.canContribute, gr));
	},
	
	getRecentlyViewedArticles: function(){
		var articleArr = [];
		var recentViewedAggr = new GlideAggregate('kb_use');
		recentViewedAggr.addQuery("user",gs.getUserID());
		recentViewedAggr.addQuery("viewed","true");
		recentViewedAggr.addQuery("sys_created_on",">",gs.daysAgoStart(30));
		recentViewedAggr.addAggregate('MAX','sys_created_on');
		recentViewedAggr.orderByAggregate('MAX','sys_created_on');
		recentViewedAggr.groupBy('article');
		recentViewedAggr.setCategory("list");
		recentViewedAggr.query();
		var articleSysIds = [];
		var viewedDateToArticleMap = {};
		var cnt = 0;
		while(recentViewedAggr.next() && cnt<50){
			var max = recentViewedAggr.getAggregate('MAX','sys_created_on');
			var articleSysId = recentViewedAggr.getValue("article");
			articleSysIds.push(articleSysId);
			if(!viewedDateToArticleMap[articleSysId])
				viewedDateToArticleMap[articleSysId] = max;
			cnt++;
		}

		var kbGr = new GlideRecord("kb_knowledge");
		kbGr.addQuery("sys_id","IN",articleSysIds);
		var mespKBs = this.getServicePortalKnowledgeBases("mesp");
		this.addKnowledgeQueries(kbGr,mespKBs.join());
		kbGr.addQuery("sys_view_count",">",0);
		kbGr.setCategory("list");
		kbGr.query();
		while(kbGr.next()){
			if(kbGr.canRead()){
				var record = {};
				record.sys_id = kbGr.getValue("sys_id");
				record.short_description = kbGr.getValue("short_description");
				record.number = kbGr.getValue("number");
				record.sys_view_count = kbGr.getValue("sys_view_count");
				record.last_viewed = viewedDateToArticleMap[record.sys_id];
				articleArr.push(record);
			}
		}
		return articleArr;
	},
	

	getCategoriesAccessInfo:function(parent, childs, fetchAll, lastRow){
		return new global.JSON().decode(this._knowledgeHelper.getCategoriesAccessInfo(parent, childs, fetchAll, lastRow));
	},

	getKnowledgeEncodedQuery: function(portal){

		var portalKBs = [];
		if(portal)
			portalKBs = this.getServicePortalKnowledgeBases(portal);
		var getAccessibleKBs = this.getReadableKnowledgeBaseIDs(portalKBs.join());

		return "kb_knowledge_baseIN"+getAccessibleKBs+"^kb_knowledge_base.active=true^sys_class_name!=kb_knowledge_block^workflow_state=published^active=true^valid_to>javascript:gs.daysAgoEnd(1)";
	},
	
	//Apply all knowledge related quires like criteria(knowledge base level & article level), AOG check, state check & valid_to check to passed gliderecord
	//It takes knowledge bases as second input to add them to filter condition
	addKnowledgeQueries: function(knowledgeGR , knowledgeBases, ignoreStates){
		return this._knowledgeHelper.addKnowledgeQueries(knowledgeGR , knowledgeBases || "", ignoreStates || false);
	},

	getServicePortalKnowledgeBases: function(portal){
		var KBList = [];
		var portalKbGr = new GlideRecord("m2m_sp_portal_knowledge_base");
		portalKbGr.addActiveQuery();
		portalKbGr.addQuery("sp_portal.url_suffix",portal);
		portalKbGr.orderBy("order");
		portalKbGr.orderBy("kb_knowledge_base.title");
		portalKbGr.query();
		while(portalKbGr.next()){
			KBList.push(portalKbGr.getValue('kb_knowledge_base')+"");
		}
		return KBList;
	},

	getReadableKnowledgeBaseIDs: function(fromKBList){
		return this._knowledgeHelper.getReadableKnowledgeBaseIDs(fromKBList || "");
	},

	getWritableKnowledgeBaseIDs: function(fromKBList){
		return this._knowledgeHelper.getWritableKnowledgeBaseIDs(fromKBList || "");
	},

	processCapabilityClustering : function(solutionname){
		var solutionGR = new GlideRecord("ml_capability_definition_base");
		solutionGR.addQuery("solution_name",solutionname);
		solutionGR.query();
		if(solutionGR.next()){
			var solutionDefSysId = solutionGR.getValue("sys_id");
			if(!new global.MLRequestSchedule().isCapabilitySolutionCurrentlyTraining(solutionDefSysId)){
				new global.MLRequestSchedule().deleteExistingCapabilityTrainingRequestSchedule(solutionDefSysId);
				new global.MLRequestSchedule().insertCapabilityTrainingRequestSchedule(solutionDefSysId, solutionGR.solution_label, solutionGR.training_frequency.toString());
			}
		}
	},

	filterSimilarityPredictedTasks: function(solutionName, gr, batchTasks, batchTasksMap){
		var mlSolution = sn_ml.MLSolutionFactory.getSolution(solutionName);
		var options = {};
		options.top_n = 1;
		options.apply_threshold = true;
		var mlResults = mlSolution.predict(gr, options);
		var resultJSON = JSON.parse(mlResults);
		return batchTasks.filter(function(task){
			if(task["sys_id"] in resultJSON && resultJSON[task["sys_id"]].length>0){
				delete batchTasksMap[task["sys_id"]];
				return false;    //filter out the tasks for which similarity prediction was given in output.
			}
			else{
				return true;   
			}
		});
	},
	
	notifyForExpiringArticles: function() {
		if (gs.getProperty("glide.knowman.enable_article_expiry_notification", "false")==="true") {
			var userArticleMap = new function() {
				this._map = {};
				this.put = function(key, val) {
					if (!this.containsKey(key)) {
						this._map[key] = [];
						this._map[key].push(val);
					} else if (this._map[key].indexOf(val) == -1) {
						this._map[key].push(val);
					}
				};
				this.containsKey = function (key) {
					return this._map.hasOwnProperty(key);
				};
				this.get = function(key) {
					return this.containsKey(key) ? this._map[key] : null;
				};
				this.keys = function() {
					var keys = [];
					for (var key in this._map) {
						if (this._map.hasOwnProperty(key)) {
							keys.push(key);
						}
					}
					return keys;
				};
			};

			var isVersioningEnabled = pm.isActive('com.snc.knowledge_advanced') && gs.getProperty("glide.knowman.versioning.enabled", "true") === "true";
			var gr = new GlideRecord('kb_knowledge');
			gr.addEncodedQuery('workflow_stateINpublished^valid_toONNext month@javascript:gs.beginningOfNextMonth()@javascript:gs.endOfNextMonth()');
			gr.orderBy('valid_to');
			gr.query();

			var isAOGEnabled = pm.isActive('com.snc.knowledge_advanced') && gr.isValidField("ownership_group") && gs.getProperty("glide.knowman.ownership_group.enabled", "true") === "true";
			while (gr.next()) {

				userArticleMap.put(gr.author+'', gr.getUniqueValue());
				
				if (isVersioningEnabled && gr.revised_by) 
					userArticleMap.put(gr.revised_by+'', gr.getUniqueValue());

				if(gr.kb_knowledge_base){
					userArticleMap.put(gr.kb_knowledge_base.owner, gr.getUniqueValue());
					var kbManagers = gr.kb_knowledge_base.kb_managers;
					if(kbManagers){
						var kbManagersList = kbManagers.split(',');
						kbManagersList.map(function(kbmanager) {
							userArticleMap.put(kbmanager+'', gr.getUniqueValue());
						});
					}
				}

				if(isAOGEnabled && gr.ownership_group){
					var aogMembers = new KBOwnershipGroup().getOwnershipGroupMembers(gr);
					aogMembers.map(function(user) {
						userArticleMap.put(user+'', gr.getUniqueValue());
					});
				}
			}

			var maxArticleCount = 11;
			var users = userArticleMap.keys();
			var articleCount = 0;
			users.map(function(user) {
				var articleList = userArticleMap.get(user);
				articleCount = articleList.length;
				articleList= articleList.slice(0, maxArticleCount);
				var inputParam = { articleList: articleList, articleCount: articleCount, isVersioningEnabled: isVersioningEnabled, isAOGEnabled: isAOGEnabled };
				gs.eventQueue("kb.article.expiry.warning", null, user, JSON.stringify(inputParam)); //sending 11 articles displaying only 10 articles in email

			});
		}
	},
	

	/**
	 * Provides Confidence value based on workflow_state of an article and user roles.
     * @param GlideRecord: record 
     * @param Boolean: true if user role should be considered
     */
	getConfidenceValue: function(workflowState, currentConfidenceValue, authorOrRevisor){
		if(workflowState=='retired'){
			return 'archived';
		}	
		if(currentConfidenceValue=='work_in_progress' || currentConfidenceValue==''){
			var roleGr = new GlideRecord('sys_user_has_role');
			roleGr.addQuery('user', authorOrRevisor);
			var qc = roleGr.addQuery('role.name', 'kcs_contributor');
			qc.addOrCondition('role.name', 'kcs_publisher');
			qc.addOrCondition('role.name', 'knowledge_coach');
			qc.addOrCondition('role.name', 'admin');
			roleGr.query();
			if(roleGr.next())
				return 'validated';
			else
				return 'not_validated';
		}
		return currentConfidenceValue;
	},
	
	getNotificationObject: function(current) {
		var obj = {};
		var kb_id = current.document_id;
		var gr_kb = new GlideRecord(current.source_table);
		if(!gr_kb.get(kb_id))
			return obj;
		obj.number = gr_kb.number;
		obj.approval_link = gs.getProperty('glide.servlet.uri')+"nav_to.do?uri=sysapproval_approver.do?sys_id="+current.sys_id;
		obj.short_desc = gr_kb.short_description;
		obj.article_link = gs.getProperty('glide.servlet.uri')+"nav_to.do?uri=kb_knowledge.do?sys_id="+gr_kb.sys_id;
		obj.approver = current.approver.first_name;
		return obj;
	},
	
	getArticleExpiryContent: function(recepient,inputParams) {
		var date = new GlideDate();
		date.addMonths(1);
		var monthName = date.getByFormat("MMMM");
		var isAOGEnabled = inputParams.isAOGEnabled;
		var isVersioningEnabled = inputParams.isVersioningEnabled;
		var articleCount = inputParams.articleCount;
		var articleIDs = inputParams.articleList;
		if(articleIDs){
			var gr = new GlideRecord('kb_knowledge');
			gr.addQuery('sys_id', 'IN', articleIDs);
			gr.orderBy('valid_to');
			gr.query();
			var emailContentCountBased = (articleCount > 1) ? 
				articleCount +" articles are expiring in "+ monthName +". Please review and extend their <b>Valid to</b> date, if required. If the date is not extended, the articles will expire.<br/><br/>":
			"1 article is expiring in "+ monthName +". Please review and extend its <b>Valid to</b> date, if required. If the date is not extended, the article will expire.<br/><br/>";

			var emailContent = {};
			
			var userGr = new GlideRecord('sys_user');
			userGr.get(recepient);
			
			emailContent.templateContent = 
				"Hi "+ userGr.first_name +",<br/><br/>"+ emailContentCountBased; 

			var maxArticleCount = 11;
			if(articleCount < maxArticleCount){
				emailContent.templateContent += "<table style='border-collapse: collapse; height: 59px; width: 100%; table-layout: auto;' border='1'>" +
				"<tbody>" +
				"<tr style='height: 13px;'>" +
				"<td style='text-align: center; height: 13px;'><strong>&nbsp;Article number</strong></td>" +
				"<td style='text-align: center; height: 13px;'><strong>&nbsp;Short description</strong></td>" +
				"<td style='width: 10%; text-align: center; height: 13px;'><strong>&nbsp;Valid to</strong></td>" +
				"<td style='text-align: center; height: 13px;'><strong>&nbsp;Author</strong></td>";
				if(isVersioningEnabled) emailContent.templateContent += "<td style='text-align: center; height: 13px;'><strong>&nbsp;Reviser</strong></td>";
				emailContent.templateContent += "<td style='text-align: center; height: 13px;'><strong>&nbsp;Knowledge base</strong></td>";
				if(isAOGEnabled) emailContent.templateContent += "<td style='text-align: center; height: 13px;'><strong>&nbsp;Ownership group</strong></td>";
				emailContent.templateContent += "</tr>";

				var count = 0;
				while(gr.next()){
					emailContent.templateContent += "<tr style='height: 13px;'>" +
					"<td style='height: 13px;'><a title='"+ gr.number +"' href='/kb_knowledge.do?sys_id="+ gr.sys_id +"'>"+ gr.number +"</a></td>"+
					"<td style='height: 13px;'>"+ gr.short_description +"</td>" +
					"<td style='width: 10%; height: 13px;'>"+ gr.valid_to +"</td>" +
					"<td style='height: 13px;'>"+ gr.author.name +"</td>";
					if(isVersioningEnabled) emailContent.templateContent += "<td style='height: 13px;'>"+ gr.revised_by.name +"</td>";
					emailContent.templateContent += "<td style='height: 13px;'>"+ gr.kb_knowledge_base.title +"</td>";
					if(isAOGEnabled) emailContent.templateContent += "<td style='height: 13px;'>"+ gr.ownership_group.name +"</td>" ;
					emailContent.templateContent += "</tr>" ;
					++articleCount;
				}
				emailContent.templateContent += "</tbody>" +
			"</table>";
			}
			else{
				var reviserQuery = (isVersioningEnabled) ? "%5EORrevised_by=" + recepient + "" : "";
				var ownershipGroupQuery = isAOGEnabled ? "%5EORownership_group.manager="+ recepient+"%5EORownership_group=javascript:getMyGroups()" : "";
				var url= '/kb_knowledge_list.do?sysparm_query=workflow_stateINpublished%5Evalid_toONNext%20month@javascript:gs.beginningOfNextMonth()@javascript:gs.endOfNextMonth()%5Eauthor=' + recepient + reviserQuery +'%5EORkb_knowledge_base.owner='+ recepient +'%5EORkb_knowledge_base.kb_managersLIKE'+ recepient + ownershipGroupQuery;
				emailContent.templateContent += "<a title='here' href='"+ url +"'>View the list of expiring articles.</a>";
			}
		}
		return emailContent;
	},
	
	type: "KBKnowledgeSNC"
});
```