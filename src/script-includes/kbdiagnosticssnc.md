---
title: "KBDiagnosticsSNC"
id: "kbdiagnosticssnc"
---

API Name: global.KBDiagnosticsSNC

```js
var KBDiagnosticsSNC = Class.create();
KBDiagnosticsSNC.prototype = {

	OVERRIDE_ACCESS : 0,
	READ_ACCESS : 1,
	CONTRIBUTE_ACCESS : 2,
	NO_ACCESS1 : 3,
	NO_ACCESS2 : 4,
	NO_DOMAIN_ACCESS : 5,

	/*
	Initializes all the necessary global variables
	*/
	initialize: function(isArticle,userId,recordId) {
		this.readAccess = gs.getMessage('Can Read');
		this.notReadAccess = gs.getMessage('Cannot Read');
		this.contributeAccess = gs.getMessage('Can Contribute');
		this.notContributeAccess = gs.getMessage('Cannot Contribute');
		this.articleLevel = gs.getMessage('Article');
		this.kbLevel = gs.getMessage('Knowledge Base');


		this.isArticle = isArticle;
		this.userId = userId;
		this.recordId = recordId;
		this._knowledgeHelper = new SNC.KnowledgeHelper();
		
		this.aog_property_link = '<a href="/sys_properties.do?sys_id=af77cc12b7120010733a08a9ee11a95b">glide.knowman.ownership_group.override</a>';
		
		this.uc_property_link = '<a href="/sys_properties.do?sys_id=c7f67284b7220010733a08a9ee11a91e">glide.knowman.apply_article_read_criteria</a>';
		
		var user = new GlideRecord('sys_user');

		if(user.get(userId))
			this.userlink = this.checkPropertyAndEscapeHtml(user.getDisplayValue('name'));

		if(isArticle){
			var article = new GlideRecord('kb_knowledge');
			this.articleId = recordId;

			if(article.get(this.articleId)){
				this.kbId = article.getValue('kb_knowledge_base');
				this.kbName = article.getDisplayValue('kb_knowledge_base');
				this.articleLink = this._createLink('kb_knowledge',recordId,article.getDisplayValue('number'));
				this.kbLink = this._createLink('kb_knowledge_base',article.kb_knowledge_base,article.getDisplayValue('kb_knowledge_base'));
			}
		}
		else{
			var kb = new GlideRecord('kb_knowledge_base');
			this.kbId = recordId;
			kb.get(this.recordId);
			this.kbLink = this._createLink('kb_knowledge_base',recordId,kb.getDisplayValue('title'));
		}
	},

	/*
	Runs the diagnostics on article or KB
	*/
	_checkUserCriteria: function(){
		var uclist = [];
		var obj = this._knowledgeHelper.getAllMatchingKnowledgeCriteria(this.userId);
		if(obj)		
			uclist = obj.split(",");
		if(this.isArticle)
			response = this._getResultsForArticle(uclist);
		else
			response = this._getResultsForKB(uclist);

		if(response.summary == 1){
			response.summary_header = gs.getMessage('Read Access');
		}
		else if(response.summary == 0 || response.summary == 2){
			response.summary_header = gs.getMessage('Read and Contribute Access');
		}
		else{
			response.summary_header = gs.getMessage('No Access');
		}

		return response;
	},

	/*
	Gets the results for the article's KB and creates the final results 
	based on the logic by which user criteria are evaluated given in the
	documentation. If the user doesn't have access, it returns the criteria
	the user needs to be a part of, to get access.
	*/	
	_getResultsForArticle: function(uclist){
		var response = {};
		
		var article = new GlideRecord('kb_knowledge');
		if(!article.get(this.articleId)){
			response.note = gs.getMessage('Article does not exist');
			return response;
		}

		var user = GlideUser.getUserByID(this.userId);
		var aog = article.ownership_group;
		
		if(aog){
			if(user.isMemberOf(aog) || aog.manager == this.userId){
				response.summary = this.OVERRIDE_ACCESS;
				response.note = gs.getMessage('{0} has contribute access to article ({1}), because the user is a member of the ownership group linked to the article.',[this.userlink, this.articleLink]);
				response.kbName = this.kbName;
				return response;
			}
			response = this._getResultsForKB(uclist);
			
			if(gs.getProperty("glide.knowman.ownership_group.override", "false") == "true" && (article.author == this.userId || (article.revised_by != null && article.revised_by== this.userId)) && response.summary == this.CONTRIBUTE_ACCESS){
				
				response.summary = this.OVERRIDE_ACCESS;
				response.note = gs.getMessage('{0} has contribute access to article ({1}), because the user is the author or reviser of the article and the property to override the ownership group is enabled. See the property {2}.',[this.userlink, this.articleLink, this.aog_property_link]);
				return response;
			}
		}
		else{
			response = this._getResultsForKB(uclist);
			
			if(article.author == this.userId && response.summary == this.CONTRIBUTE_ACCESS){
				response.summary = this.OVERRIDE_ACCESS;
				response.note = gs.getMessage('{0} has contribute access to article ({1}), because the user is the author of the article.',[this.userlink, this.articleLink]);
				return response;
			}
		}
		
		
		
		var canReadList = this._getUserCriteriaForArticle(article,'can_read_user_criteria');
		var cannotReadList = this._getUserCriteriaForArticle(article,'cannot_read_user_criteria');

		var map = this._getCommonCriteriaResults(uclist,canReadList,cannotReadList);
		var readResults = map.list;
		var canRead = map.canAccess;

		if(response.summary == this.READ_ACCESS){
			if(canRead == false && readResults.length>0){
				response.summary = this.NO_ACCESS1;
				response.note = gs.getMessage('{0} does not have access to article ({1}) in knowledge base ({2}).', [this.userlink,this.articleLink,this.kblink]);
				response.results=[];

				this._addResults(response,readResults,this.notReadAccess,this.articleLevel);
			}
			else if(canRead == false && readResults.length==0){
				response.summary = this.NO_ACCESS2;
				response.note = gs.getMessage('{0} does not have access to article ({1}) in knowledge base ({2}).', [this.userlink,this.articleLink,this.kblink]);
				response.results=[];

				this._addResults(response,canReadList,this.readAccess,this.articleLevel);
			}
			else{
				if(readResults.length > 0)
					response.note = gs.getMessage('{0} has read access to the article ({1}) in knowledge base ({2}).',[this.userlink,this.articleLink,this.kblink]);
				else if(response.results.length > 0)
					response.note = gs.getMessage('No user criteria is configured at article level. {0} has read access to article {1} in knowledge base {2}, because the user has read access to the knowledge base. ',[this.userlink,this.articleLink,this.kblink]);

				this._addResults(response,readResults,this.readAccess,this.articleLevel);
			}
		}
		else if(response.summary == this.CONTRIBUTE_ACCESS){
			
			if(aog){ // if aog is set on article
				if(!user.isMemberOf(aog)){  //user is not a member of aog then provide read access
					if(gs.getProperty("glide.knowman.ownership_group.override", "false") == "true")
						response.note = gs.getMessage('{0} has read access to article ({1}) in knowledge base ({2}) because {0} isn\'t the member of the associated ownership group, author, or reviser of the article. See the property {3}.', [this.userlink,this.articleLink,this.kblink,this.aog_property_link]);
					else
						response.note = gs.getMessage('{0} has read access to article ({1}) in knowledge base ({2}) because ownership group linked with the article prevents contribute access of non-members. See the property {3}.',[this.userlink,this.articleLink,this.kblink,this.aog_property_link]);
					response.summary = this.READ_ACCESS;

				}
			}
			else{    //if no aog is set on article
				
				if(gs.getProperty("glide.knowman.apply_article_read_criteria", "false") == "true" && canRead == false) {
					
					response.summary = this.NO_ACCESS1;
					response.note = gs.getMessage('{0} does not have access to article ({1}) in knowledge base ({2}). See the property {3}.', [this.userlink,this.articleLink,this.kblink,this.uc_property_link]);
					response.results=[];
					this._addResults(response,readResults,this.notReadAccess,this.articleLevel);
			}
				else {
					if(canRead == false)
						response.note = gs.getMessage('{0} has contribute access to article ({1}) in knowledge base ({2}). See the property {3}.',[this.userlink,this.articleLink,this.kblink,this.uc_property_link]);
					else
						response.note = gs.getMessage('{0} has contribute access to article ({1}) in knowledge base ({2}).',[this.userlink,this.articleLink,this.kblink]);
					if(canRead == true && readResults.length>0){
						this._addResults(response,readResults,this.readAccess,this.articleLevel);
					}
				}

			}
			
			
			
		}
		else if(response.summary == this.NO_ACCESS1){
			response.note = gs.getMessage('{0} does not have access to article ({1}) in knowledge base ({2}).', [this.userlink,this.articleLink,this.kblink]);
			if(canRead == false && readResults.length>0){
				this._addResults(response,readResults,this.notReadAccess,this.articleLevel);
			}
		}
		else if(response.summary == this.NO_ACCESS2){
			response.note = gs.getMessage('{0} does not have access to article ({1}) in knowledge base ({2}).', [this.userlink,this.articleLink,this.kblink]);
			if(canRead == false && readResults.length==0){
				this._addResults(response,canReadList,this.readAccess,this.articleLevel);
			}
		}
		response.state = this._getArticleState(this.articleId);
		return response;
	},

	/*
	Checks if user is sys_admin, knowledge_admin, kb owner or manager.
	If the user is not among them, then it evaluates the user criteria
	the user is in and creates results. If the user doesn't have access,
	it returns the criteria the user needs to be a part of, to get access.
	*/
	_getResultsForKB: function(uclist){
		var response = {};

		var kbase = new GlideRecord('kb_knowledge_base');
		if(!kbase.get(this.kbId)){
			response.note = gs.getMessage('Knowledge does not exist');
			return response;
		}
		var kbName = kbase.getDisplayValue('title');

		response.kbName = kbName;
		response.results=[];
		this.kblink = this._createLink('kb_knowledge_base',this.kbId,kbName);

		if(this._userHasRole(this.userId,'admin') || this._userHasRole(this.userId,'knowledge_admin')){
			if(this._knowledgeHelper.isKnowledgeBaseScoped(kbase)){
				var scopedAdminWarning = this.isArticle? 
				gs.getMessage('Knowledge base of the selected article is scoped. Knowledge admin who is not scoped admin or without adequate user criteria will not have read and contribute access to the articles in the Knowledge base.')
				:gs.getMessage('Selected knowledge base is scoped. Knowledge admin who is not scoped admin or without adequate user criteria will not have read and contribute access to the knowledge base.');
			
				gs.addInfoMessage(scopedAdminWarning);
			}
			response.summary = this.OVERRIDE_ACCESS;
		}
		if(new KBCommon().isKnowledgeBaseOwnerOrManager(kbase,'owner',this.userId) || new KBCommon().isKnowledgeBaseOwnerOrManager(kbase,'kb_managers',this.userId))
			response.summary = this.OVERRIDE_ACCESS;

		if(response.summary == this.OVERRIDE_ACCESS){
			if(this.articleId)
				response.note = gs.getMessage('{0} has contribute access to all articles in the knowledge base, because the user is the knowledge base owner, manager, or admin.',this.userlink);
			else
				response.note = gs.getMessage('{0} has contribute access to knowledge base ({1}), because the user is the knowledge base owner, manager, or admin.', [this.userlink,this.kblink]);
			return response;
		}

		var CAN_CONTRIBUTE_TABLE = 'kb_uc_can_contribute_mtom',
			CANNOT_CONTRIBUTE_TABLE = 'kb_uc_cannot_contribute_mtom',
			CAN_READ_TABLE = 'kb_uc_can_read_mtom',
			CANNOT_READ_TABLE = 'kb_uc_cannot_read_mtom';

		var criteriaTables = [CAN_CONTRIBUTE_TABLE,CANNOT_CONTRIBUTE_TABLE,CAN_READ_TABLE,CANNOT_READ_TABLE];
		var criteriaTypeList = [];
		for(var tableNo in criteriaTables){
			criteriaTypeList.push(this._getUserCriteriaForKb(this.kbId,criteriaTables[tableNo]));
		}

		var map1 = this._getCommonCriteriaResults(uclist,criteriaTypeList[0],criteriaTypeList[1]);
		var map2 = this._getCommonCriteriaResults(uclist,criteriaTypeList[2],criteriaTypeList[3]);
		var contributeResults = map1.list;
		var readResults = map2.list;

		var canContribute = map1.canAccess;
		var canRead = map2.canAccess;
		var noCriteriaAccessBlocked = gs.getProperty('glide.knowman.block_access_with_no_user_criteria',false) === 'true';

		if(canContribute == true && contributeResults.length>0){
			response.summary = this.CONTRIBUTE_ACCESS;
			response.note = gs.getMessage('{0} has contribute access to knowledge base ({1}). ',[this.userlink,this.kblink]);

			this._addResults(response,contributeResults,this.contributeAccess,this.kbLevel);
			if(canRead == true)
				this._addResults(response,readResults,this.readAccess,this.kbLevel);
			else
				this._addResults(response,readResults,this.notReadAccess,this.kbLevel);
		}
		else if(canContribute == true && !noCriteriaAccessBlocked && this._hasAtleastOneValidRole(this.userId)){
			response.summary = this.CONTRIBUTE_ACCESS;
			response.note = gs.getMessage('Can Contribute user criteria has not been defined. {0} has contribute access to knowledge base ({1}), because the user has at least one role that permits access. (other than snc_internal).',[this.userlink,this.kblink]);

			this._addResults(response,contributeResults,this.contributeAccess,this.kbLevel);
			if(canRead == true)
				this._addResults(response,readResults,this.readAccess,this.kbLevel);
			else
				this._addResults(response,readResults,this.notReadAccess,this.kbLevel);
		}
		else if(canRead == true){
			if(readResults.length>0){
				response.summary = this.READ_ACCESS;
				response.note = gs.getMessage('{0} has read access to knowledge base ({1}).',[this.userlink,this.kblink]);
			} else {
				response.summary = noCriteriaAccessBlocked? this.NO_ACCESS2: this.READ_ACCESS;
				var isAdmin = gs.hasRole('admin');
				var property_link = '<a href="/sys_properties.do?sys_id=b8a2fb1acbb400108ad442fcf7076d9d">glide.knowman.block_access_with_no_user_criteria</a>';
				
				var read_message = isAdmin?
					gs.getMessage('User allowed read access to the knowledge base because Can Read is not set. See the property {0}',property_link):
					gs.getMessage('User allowed read access to the knowledge base because Can Read is not set.');
				var no_access_message = isAdmin?
					gs.getMessage('User denied read access to the knowledge base because Can Read is not set. See the property {0}',property_link):
					gs.getMessage('User denied read access to the knowledge base because Can Read is not set.');
				
				response.note = noCriteriaAccessBlocked? no_access_message: read_message;
			}
			this._addResults(response,contributeResults,this.notContributeAccess,this.kbLevel);
			this._addResults(response,readResults,this.readAccess,this.kbLevel);
		}
		else if(canRead == false && readResults.length>0){
			response.summary = this.NO_ACCESS1;
			response.note = gs.getMessage('{0} does not have access to knowledge base ({1}).',[this.userlink,this.kblink]);

			this._addResults(response,contributeResults,this.notContributeAccess,this.kbLevel);
			this._addResults(response,readResults,this.notReadAccess,this.kbLevel);
		}
		else{
			response.summary = this.NO_ACCESS2;
			response.note = gs.getMessage('{0} does not have access to knowledge base ({1}).',[this.userlink,this.kblink]);

			this._addResults(response,criteriaTypeList[0],this.contributeAccess,this.kbLevel);
			this._addResults(response,criteriaTypeList[2],this.readAccess,this.kbLevel);
		}

		return response;
	},

	//checks if user has atleast one role other than snc_internal.
	_hasAtleastOneValidRole: function(userId){
		var user = GlideUser.getUserByID(userId);
		var roles = user.getRoles();
		roles.remove('snc_internal');
		var roleCount = roles.size();
		if(!roleCount || roles.contains('snc_external'))
			return false;
		return true;
	},

	//check if the user has a given role
	_userHasRole: function(userId,role){
		var uhrRec = new GlideRecord('sys_user_has_role');  

		uhrRec.addQuery('user', userId);  
		uhrRec.addQuery('role.name', role);  
		uhrRec.query();
		return uhrRec.hasNext();
	},

	//adds a list of rows to the response object
	_addResults: function(response,resultList,type,setAt){
		for(var uc in resultList){
			response.results.push(this._getJSONForUserCriteria(resultList[uc],this._getCriteriaName(resultList[uc]),type,setAt));
		}
	},

	//create a json object for a row in the results table
	_getJSONForUserCriteria: function(sysId,name,type,setAt){
		var result = {};
		result.sysId=sysId;
		result.name = name;
		result.type = type;
		result.setAt = setAt;
		return result;
	},

	//get the name of the user criteria, given a sys id of the criteria
	_getCriteriaName: function(sysId){
		var gr = new GlideRecord('user_criteria');
		if(gr.get(sysId))
			return this.checkPropertyAndEscapeHtml(gr.getDisplayValue('name'));
		else
			return '';
	},

	/*
	given a list of can and cannot criteria, and also the list of criteria user
	is in, it returns the list of criteria the user is a part of. If the user 
	is a part of some 'cannot' criteria, then it only returns them and not the
	can criteria, because 'cannot' takes precedence over 'can'.
	*/
	_getCommonCriteriaResults: function(uclist,canList,cannotList){
		var response = {};
		var commonNotList = [];
		var uchash = {};
		for(var i=0;i<uclist.length;i++){
			uchash[uclist[i]]=true;
		}
		for(var j=0;j<cannotList.length;j++)
			if(uchash[cannotList[j]] == true)
				commonNotList.push(cannotList[j]);

		if(commonNotList.length>0){
			response.list = commonNotList;
			response.canAccess = false;
			return response;
		}

		if(canList.length==0){
			response.canAccess = true;
			response.list = [];
			return response;
		}

		var commonlist = [];
		for(var k=0;k<canList.length;k++)
			if(uchash[canList[k]] == true)
				commonlist.push(canList[k]);

		if(commonlist.length == 0){
			response.canAccess = false;
			response.list = [];
		}
		else{
			response.canAccess = true;
			response.list = commonlist;
		}
		return response;
	},

	//returns a list of criteria of a specific type, for an article
	_getUserCriteriaForArticle: function(article,criteria){
		var ucs = article.getValue(criteria);
		if(ucs==null)
			return [];
		var results = [];
		var uclist = ucs.split(',');
		for(var uc in uclist){
			if(this._isCriteriaActive(uclist[uc])>0)
				results.push(uclist[uc]);
			
		}
		return results;
	},

	//return a list of criteria of a specific type, for a KB
	_getUserCriteriaForKb: function(kbId,criteriaTable){
		var uc = [];
		var uclist = new GlideRecord(criteriaTable);
		uclist.addQuery('kb_knowledge_base',kbId);
		uclist.query();
		while(uclist.next()){
			var criteria = uclist.getValue('user_criteria');
			if(this._isCriteriaActive(criteria)>0){
				uc.push(criteria);
			}
			
		}
		return uc;
	},

	//checks if a user criteria is active or not
	_isCriteriaActive: function(sysId){
		var gr = new GlideRecord('user_criteria');
		if(!gr.get(sysId))
			return false;
		var active = gr.getValue('active');
		
		return (active==='true') || active;
	},

	//returns the state of an article
	_getArticleState: function(articleId){
		var article = new GlideRecord('kb_knowledge');
		if(article.get(articleId))
			return article.getValue('workflow_state');
		return '';
	},

	checkPropertyAndEscapeHtml: function(str){
		str = GlideStringUtil.escapeHTML(str);
		if(gs.getProperty('glide.ui.escape_text','true')=='false')
			str = GlideStringUtil.escapeHTML(str);
		return str;
	},

	//Returns a hyperlink for a record with the name given in arguments.
	_createLink: function(table,sysid,name){
		var link = "<a class = \"linked formlink\" href=\"/"+table+".do?sys_id="+ sysid + "\">"+ this.checkPropertyAndEscapeHtml(name) + "</a>";
		return link;
	},
	
	
	
	/*
	Checks if the user has access to the KB or article via Domain Separation.
	After evaluating, appropriate messages are stored which will be displayed in ui page.
	IF the record type is article, the first access is checked for KB. Only if the user has access to KB, then we proceed to check access for aticle.
	*/

	_checkDomainAccess: function(){

		var  recordDomain, kbDomain, userDomain, recordGr,res={}, isAdmin = false;
		var userGr = new GlideRecord('sys_user');
		userGr.get(this.userId);
		userDomain = this.checkPropertyAndEscapeHtml(userGr.getDisplayValue('sys_domain'));
		
		isAdmin = gs.getUser().hasRole("admin");
		
		if(this.isArticle){
			recordGr = new GlideRecord('kb_knowledge');
			recordGr.get(this.recordId);	
			kbDomain = this.checkPropertyAndEscapeHtml(recordGr.kb_knowledge_base.sys_domain.name);
		}
		else{
			recordGr = new GlideRecord('kb_knowledge_base');
			recordGr.get(this.recordId);
			
		}
			
		recordDomain = this.checkPropertyAndEscapeHtml(recordGr.getDisplayValue('sys_domain'));
		

		if(this.isArticle){
			if(this._knowledgeHelper.checkDomainSeparation(this.userId, false, this.kbId)){
				if(this._knowledgeHelper.checkDomainSeparation(this.userId, true, this.recordId)){
					res.result = true; 
					res.summary_header = gs.getMessage("Has Access");
					if(isAdmin)
						res.note =gs.getMessage('{0}({1}) has access to article ({2})({3}) in knowledge base ({4}).',[this.userlink,userDomain,this.articleLink,recordDomain, this.kbLink]);
					else
						res.note =gs.getMessage('{0} has access to article ({1}) in knowledge base ({2}).',[this.userlink,this.articleLink, this.kbLink]);
				}
				else{
					res.result = false;
					res.summary_header = gs.getMessage("No Access");
					if(isAdmin){
						res.note = gs.getMessage('{0}({1}) does not have access to article ({2})({3}) in knowledge base ({4}), because the user and the article are in different domains.',[this.userlink,userDomain,this.articleLink,recordDomain, this.kbLink]);
						res.todo = gs.getMessage('To provide access, {0} a visibility domain of {1} to {2}.',[this._createLink("sys_user_visibility","","add"),recordDomain,this.userlink]);	
					}else{
						res.note = gs.getMessage('{0} does not have access to article ({1}) in knowledge base ({2}), because the user and the article are in different domains.',[this.userlink,this.articleLink, this.kbLink]);
						res.todo = gs.getMessage('To request access, contact your System Administrator.');
					}
					
				}
			}
			else{
				res.result = false;
				res.summary_header = gs.getMessage("No Access");
				if(isAdmin){
					res.note =gs.getMessage('{0} does not have access to article ({1})({2}) in knowledge base ({3})({4}), because user and knowledge base are in different domains.',[this.userlink,this.articleLink,recordDomain,this.kbLink,recordGr.kb_knowledge_base.sys_domain.name]);
					res.todo = gs.getMessage('To provide access, {0} a visibility domain of {1} to {2}.',[this._createLink("sys_user_visibility","","add"),kbDomain,this.userlink]);
				}else{
					res.note = gs.getMessage('{0} does not have access to article ({1}) in knowledge base ({2}), because user and knowledge base are in different domains.',[this.userlink,this.articleLink, this.kbLink]);
					res.todo = gs.getMessage('To request access, contact your System Administrator.');
				}
				
			}
		}
		else{
			if(this._knowledgeHelper.checkDomainSeparation(this.userId,false,this.recordId)){
				res.result = true;
				res.summary_header = gs.getMessage("Has Access");
				if(isAdmin)
					res.note = gs.getMessage('{0}({1}) has access to knowledge base ({2})({3}).',[this.userlink,userDomain,this.kbLink,recordDomain]);
				else
					res.note = gs.getMessage('{0} has access to knowledge base ({1}).',[this.userlink,this.kbLink]);
			}
			else{
				res.result = false;
				res.summary_header = gs.getMessage("No Access");
				if(isAdmin){
					res.note =gs.getMessage('{0}({1}) does not have access to knowledge base ({2})({3}), because the user and the knowledge base are in different domains.',[this.userlink,userDomain,this.kbLink,recordDomain]);
					res.todo = gs.getMessage('To provide access, {0} a visibility domain of {1} to {2}.',[this._createLink("sys_user_visibility","","add"),recordDomain,this.userlink]);
				}else{
					res.note = gs.getMessage('{0} does not have access to knowledge base ({1}), because user and knowledge base are in different domains.',[this.userlink, this.kbLink]);
					res.todo = gs.getMessage('To request access, contact your System Administrator.');
				}
				
			}
		}
		
		return res;
	},
	
	/*
	This function checks the overall access to the record based on domain separation and user criteria
	*/




	getDiagnostics: function(){

		var response = {};
		response.domainResults = {};
		response.userCriteriaResults = this._checkUserCriteria();
		var isActive = pm.isActive('com.glide.domain.msp_extensions.installer');
		response.isDomainSeparationActive = isActive;
		
		if(isActive){
			response.domainResults = this._checkDomainAccess();
			//domain separation is active and domain access = true
			if(response.domainResults.result){

				var uc = response.userCriteriaResults;
				response.summary = uc.summary;
				response.summary_header = uc.summary_header;

				if((uc.summary == this.NO_ACCESS1 || uc.summary == this.NO_ACCESS2)){
					if(this.isArticle)
						response.note = gs.getMessage('{0} does not have access to article ({1}) in knowledge base ({2}).',[this.userlink, this.articleLink, this.kbLink]);
					else
						response.note =  gs.getMessage('{0} does not have access to knowledge base({1}).',[this.userlink, this.kbLink]);
				}

				else if(uc.summary == this.READ_ACCESS ){
					if(this.isArticle)
						response.note = gs.getMessage('{0} has read access to article ({1}) in knowledge base ({2}).',[this.userlink, this.articleLink, this.kbLink]);
					else
						response.note =  gs.getMessage('{0} has read access to knowledge base ({1}).',[this.userlink, this.kbLink]);
				}
				else{
					if(this.isArticle)
						response.note = gs.getMessage('{0} has contribute access to article ({1}) in knowledge base ({2}).',[this.userlink, this.articleLink, this.kbLink]);
					else
						response.note =  gs.getMessage('{0} has contribute access to knowledge base ({1}).',[this.userlink, this.kbLink]);
				}
			}
			//domain separation is active and domain access = false
			else{
				response.summary = this.NO_DOMAIN_ACCESS;
				response.summary_header = gs.getMessage("No Access");
				if(this.isArticle)
					response.note = gs.getMessage('{0} does not have access to article ({1}) in knowledge base ({2}).',[this.userlink, this.articleLink, this.kbLink]);
				else
					response.note =  gs.getMessage('{0} does not have access to knowledge base ({1}).',[this.userlink, this.kbLink]);
			}
		}
		
		else{
			response.summary = response.userCriteriaResults.summary;
			response.summary_header = response.userCriteriaResults.summary_header;
			response.note = response.userCriteriaResults.note;
			
		}
		return response;


	},

	type: 'KBDiagnosticsSNC'
};
```