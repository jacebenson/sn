---
title: "KBCommonSNC"
id: "kbcommonsnc"
---

API Name: global.KBCommonSNC

```js
var KBCommonSNC = Class.create();

KBCommonSNC.prototype = {
	
	VERSIONING_PLUGIN : 'com.snc.knowledge_advanced',
	INTEGRATION_PLUGIN : 'com.snc.knowledge.external_integration',
	I18N2_PLUGIN : 'com.glideapp.knowledge.i18n2',
	BLOCKS_PLUGIN : 'com.snc.knowledge_blocks',
	WORD_ADDIN_PLUGIN: 'com.snc.knowledge.ms_word',
	TRANSLATION_TASK_NEW : 1,
	TRANSLAITON_TASK_IN_PROGRESS : 2,
	TRANSLATION_TASK_CLOSED : 3,
	TRANSLATION_TASK_CANCELLED : 4,
	INDEX_FILTER_ATTR_SYS_ID : 'dafb788eb7103300abfad298ee11a9c9',
	KNOWLEDGE_CONFIG_SYS_ID : '28eefe427320330003da83a9fdf6a794',
	KNOWLEDGE_INDEX_FILTER_VALUE : 'workflow_stateNOT INretired,outdated',
	
	initialize: function() {
		this._knowledgeHelper = new SNC.KnowledgeHelper();
	},

	/**
	 * GlideRecord.get() prints a warning message match could not be found.
	 * GlideRecord.next() does not. So this method is exposed for extending objects to use.
	 */
	_get: function(record, fieldName, fieldData) {
		if (record) {
			record.addQuery(fieldName, fieldData);
			record.query();
			if (record.next() && record.isValidRecord())
				return true;
		}
		return false;
	},

	/**
	 * Determines whether the current user is a manager or owner of the knowledge base associated with the passed in record
	 *
	 * @param user: userid of the user to be checked
	 * @param GlideRecord: record on which to search for managers to evaluate
	 * @param String: (optionally dotted) path to the managers field on the passed in record
	 * @return Boolean: whether the current user is a manager of the passed in record
	 */
	isKnowledgeBaseOwnerOrManager: function(record,pathToUser,user){
		var ownerOrManagers = this._getDotField(record, pathToUser);
		var isOwnerOrManager = (ownerOrManagers.indexOf(user) >= 0);
		return isOwnerOrManager;
	},
	
	/**
	 * Determines whether the current user is a manager of the knowledge base associated with the passed in record
	 *
	 * @param GlideRecord: record on which to search for managers to evaluate
	 * @param String: (optionally dotted) path to the managers field on the passed in record
	 * @return Boolean: whether the current user is a manager of the passed in record
	 */
	isKnowledgeBaseManager: function(record, pathToUser) {
		return this.isKnowledgeBaseOwnerOrManager(record,pathToUser,gs.getUserID());
	},

	/**
	 * Determines whether the current user is the owner of the knowledge base associated with the passed in record
	 *
	 * @param GlideRecord: record on which to search for owners to evaluate
	 * @param String: (optionally dotted) path to the owner field on the passed in record
	 * @return Boolean: whether the current user is the owner of the passed in record
	 */
	isKnowledgeBaseOwner: function(record, pathToUser) {
		return this.isKnowledgeBaseOwnerOrManager(record,pathToUser,gs.getUserID());
	},

	/**
	 * Determine if a user has the right to access kb_category record
	 *
	 * @param String kbCategoryId
	 * @return boolean
	 */
	managerRightToKnowledgeCategory: function(kbCategoryId) {
		var rootId = this._knowledgeHelper.getRootKBId(kbCategoryId);
		var pathToOwner = "owner";
		var pathToManagers = "kb_managers";
		var kbKnowledgeBase = new GlideRecord("kb_knowledge_base");
		if (kbKnowledgeBase.get(rootId))
			return this.isKnowledgeBaseManager(kbKnowledgeBase, pathToManagers) || this.isKnowledgeBaseOwner(kbKnowledgeBase, pathToOwner) || this.isAdminUser(kbKnowledgeBase);

		return false;
	},
	
	/**
 	 * Determine if a user has the right to access root knowledge base record
 	 *
 	 * @param String kbCategoryId
 	 * @return boolean
 	 */
	canReadRootKnowledgeBase: function(kbCategoryId) {
		var rootId = this._knowledgeHelper.getRootKBId(kbCategoryId);
		var kbKnowledgeBase = new GlideRecord("kb_knowledge_base");
		if (kbKnowledgeBase.get(rootId)){
			return kbKnowledgeBase.canRead();
		}

		return false;
	},

	/**
	 * Determines if a given knowledge category has children(categories or articles) or is empty
	 *
	 * @param String sys_id of a kb_category record
	 * @return boolean
	 */
	isEmptyCategory: function(kbCategoryId) {
		var kbKnowledge = new GlideRecord("kb_knowledge");
		var category = new GlideRecord("kb_category");

		// Check for any child categories or related knowledge articles
		if (kbKnowledge.get("kb_category", kbCategoryId) || category.get("parent_id", kbCategoryId))
			return false;

		return true;
	},

	/**
	 * Determines if the knowledge base is based on Knowledge Management V3.
	 *
	 * @param String: the sys_id of a knowledge base record to check
	 * @return Boolean: true if knowledge base version is Fuji release, false otherwise
	 */
	isKBVersion3: function(knowledgeBaseId) {
		// Check if preknowledge3 property has been set, if not, knowledge base must be latest
		var legacyKBVersion = gs.getProperty("glide.knowman.preknowledge3.kb_version", null);
		if (JSUtil.nil(legacyKBVersion))
			return true;

		// Check if the knowledge base version number matches Fuji release (version 3)
		return this._getKBVersion(knowledgeBaseId) === "3";
	},

	/**
	 * Determines if the knowledge base is based on Knowledge Management V2.
	 *
	 * @param String: the sys_id of a knowledge base record to check
	 * @return Boolean: true if knowledge base version is Fuji release, false otherwise
	 */
	isKBVersion2: function(knowledgeBaseId) {
		// Check if preknowledge3 property has been set, if not, knowledge base must be latest
		var legacyKBVersion = gs.getProperty("glide.knowman.preknowledge3.kb_version", null);
		if (JSUtil.nil(legacyKBVersion))
			return false;

		// Check if the knowledge base version number is pre Fuji (version 2)
		return this._getKBVersion(knowledgeBaseId) === "2";
	},

	/**
	 * Determines if a kb_knowledge record is based on Knowledge Management V3.
	 *
	 * @param GlideRecord: kb_knowledge record to evaluate
	 * @return Boolean: true if record is based on latest release, false otherwise
	 */
	isRecordVersion3: function(record) {
		var knowledgeBaseId = this._getDotField(record, "kb_knowledge_base");

		return this.isKBVersion3(knowledgeBaseId);
	},

	/**
	 * Determines if a record is displayed with a GlideDialogForm
	 *
	 * @return Boolean: true if the nameofstack is formDialog
	 */
	isStackNameDialog: function() {
		var stack = GlideTransaction.get().getRequestParameter("sysparm_nameofstack");
		return stack == "formDialog";
	},

	isStackNameDialogNavHandler: function(g_uri) {
		// Convert view name to lowercase
		var view = g_uri.get("sysparm_view");
		if (!JSUtil.nil(view))
			view = view.toLowerCase();

		// Case 1: Existing record provided
		var stack = g_uri.get("sysparm_nameofstack");
		if (stack == "formDialog" && !JSUtil.nil(view))
			return true;

		return false;
	},	
	
   /**
     * Can the user create a kb_knowledge record.
     * @param GlideRecord: kb_knowledge 
     * @return Boolean: can logged in user create a kb_knowledge
     */
	_canCreateKnowledge: function(gr){
        if (this.isAdminUser(gr))
            return true;

        if (gr.isNewRecord())
			gr = this._getKnowledgeBase(gr) || gr;

        if (this.isKnowledgeBaseOwner(gr, "kb_knowledge_base.owner"))
            return true;

        if (this.isKnowledgeBaseManager(gr, "kb_knowledge_base.kb_managers"))
            return true;

        if (this._knowledgeHelper.canContribute(gr))
            return true;

        return false;
	},
	
	
	canRetireKnowledge: function(itemGr) {
		// Case 1: Pass in a valid value
		if (!itemGr)
			return false;
    
		// Case 2: If the record is published continue
		if (itemGr.workflow_state != "published" && itemGr.workflow_state != "draft")
			return false;
		
		// Case 3: If user can contribute continue
		if (!new SNC.KnowledgeHelper().canContribute(itemGr))
			return false;
		
		// Default: Allow user to retire knowledge
		return true;
	},
	
	/** 
 	* Checks whether user can republish knowledge
 	*
 	* @param GlideRecord
 	* @return boolean
 	*/

	canRepublishKnowledge: function(itemGr) {
		// Case 1: Pass in a valid value
		if (!itemGr)
			return false;

		// Case 2: If the record is retired continue
		if (itemGr.workflow_state != "retired")
			return false;

		// Case 3: If user is admin continue
		if (!this.isAdminUser(itemGr))
			return false;

		// Default: Allow user to republish knowledge
		return true;
	},

	/** 
 	* Republishes an article
 	*
 	* @param GlideRecord
 	* @return GlideRecord
 	*/
	republishKnowledge: function(current){

		if(this.canRepublishKnowledge(current)){
			current.workflow_state = "published";
			current.published = new GlideDate(); current.retired= "";
			current.update();
			return current;
		}

		return false;
	},

	/** 
	* Checks whether versioning is enabled
	*
	*
	* @return boolean
	*/
	isVersioningEnabled: function(){
		return this._knowledgeHelper.isVersioningEnabled();
	},

	/** 
	* Checks whether versioning plugin is activated
	*
	*
	* @return boolean
	*/
	isVersioningInstalled : function(){
		if(gs.nil(this._knowledgeHelper))
			this._knowledgeHelper = new SNC.KnowledgeHelper();
		return this._knowledgeHelper.isVersioningInstalled();
	},

	/** 
	* Returns the physical record of the given article number
	* Used for global search exact matches
	*
	*
	* @return GlideRecord
	*/
	getKnowledgeRecord: function(articleNumber){
		if(this.isVersioningEnabled())
			return new KBVersioning().getLatestAccessibleVersion(articleNumber);
		else {
			var gr = new GlideRecord('kb_knowledge');
			gr.addQuery('number', articleNumber);
			gr.query();
			if (gr.next())
				return gr;
			else
				return false;
		}
	},

	/**
     * Gets the knowledge base whose id has been passed in the URI.
     *
     * @return A kb_knowledge_base record or null
     */
    _getKnowledgeBase: function(gr) {
		var kbId = gr.getValue("kb_knowledge_base");
		
        if (JSUtil.nil(kbId)) {
            gs.log("[KBCommonSNC] Error - No knowledge base id found");
            return null;
        }

		var kbGr = new GlideRecord("kb_knowledge_base");
		if (!this._get(kbGr, "sys_id", kbId)) {
            gs.log("[KBCommonSNC] Error - No knowledge base found matching id " + kbId);
            return null;
        }

        return kbGr;
    },

	_getKBVersion: function(knowledgeBaseId) {
		var gr = new GlideRecord("kb_knowledge_base");
		if (gr.get(knowledgeBaseId))
			return gr.kb_version + "";

		return null;
	},

	_getDotField: function(gr, pathToField) {
		if (JSUtil.nil(gr))
			return "";

		var arrFields = (pathToField || "").split(".");
		var element = gr;
		for (var i = 0; i < arrFields.length; i++) {
			element = element[arrFields[i]];
			if (!element)
				return "";
		}

		return element;
	},

	_encode: function(object) {
		return new JSON.encode(object);
	},

	_decode: function(string) {
		return new JSON.decode(string);
	},

	_i18n: function(message, array) {
		message = message || "";
		var padded =  message;
		var translated = gs.getMessage(padded, array);
		var trimmed = translated.trim();
		return trimmed;
	},

	setUniqueInfoMessage: function(message, key) {
		this._knowledgeHelper.addUniqueInfoMessage(message, key);
	},

	getStateMessage: function(state) {
		var message = {
			draft: "This knowledge item is in draft state and can be edited",
			review: "This knowledge item is in review",
			published: "This knowledge article has been published",
			scheduled_publish : "Article is approved and will be published on Scheduled Date",
			pending_retirement: "This knowledge item is pending retirement",
			retired: "This knowledge item has been retired"
		};

		return (this._i18n(message[state]) || "");
	},
	
	/**
	 * Is it a multi update form.
	 *
     * @param GlideRecord: kb_knowledge
	 **/
	isMultipleKnowledgeUpdate: function(knowledgeGR) {
		try{
			if(RP){
			var url = RP.getReferringURL();
			var sys_action = RP.getParameterValue('sys_action');
			var sysparm_multiple = RP.getParameterValue('sysparm_multiple');
		
			return url && url != null && !gs.nil(url) && (url.startsWith('kb_knowledge_update.do') || url.startsWith('kb_knowledge_base_update.do')) && sys_action == 'sysverb_multiple_update' && sysparm_multiple == 'true';
			}
		} catch(err) {
			//gs.log("Warning: KBCommonSNC.isMultipleKnowledgeUpdate(" + err.lineNumber + "): " + err.name + " - " + err.message);
		}
		return false;
	},

	/** 
	* Checks whether external integration plugin is enabled
	*
	*
	* @return boolean
	*/
	isExternalIntegrationInstalled: function(){
		return GlidePluginManager.isActive(this.INTEGRATION_PLUGIN);
	},

	isAccessBlockedWithNoUC: function(){
		if(gs.getProperty("glide.knowman.block_access_with_no_user_criteria",'false')=='true')
			return true;
		else
			return false;
	},
	/** 
	* Checks whether an article is externally sourced
	*
	*
	* @return boolean
	*/
	isExternalArticle: function(knowledgrGR){
		return knowledgrGR && this.isExternalIntegrationInstalled() && knowledgrGR.external;
	},
	
	isLinkedToWordDocument: function(knowledgeGR){
		return knowledgeGR && pm.isActive(this.WORD_ADDIN_PLUGIN) && knowledgeGR.getValue('office_doc_url');
	},
	
	//Return true if knowledge base Can Read user criteria list is empty 
	isKBReadPublic: function(kbSysId) {
		if(!kbSysId)
			return false;
		var canRead = new GlideRecord('kb_uc_can_read_mtom');
		canRead.addQuery('kb_knowledge_base', kbSysId);
		canRead.query();
		if(!canRead.next()) {
			return true;
		}

		return false;
	},
	
	//Return true if knowledge base Can Contribute user criteria list is empty
	isKBWritePublic: function(kbSysId) {
		if(!kbSysId)
			return false;
		var canWrite = new GlideRecord('kb_uc_can_contribute_mtom');
		canWrite.addQuery('kb_knowledge_base', kbSysId);
		canWrite.query();
		if(!canWrite.next()) {
			return true;
		}
		return false;
	},
	

	/**
 	* Check whether the field exist and has value
 	*
 	* @param GlideRecord
	* @param FieldName
 	**/
	isValidFieldWithValue: function(current,fieldName){
		return current.isValidField(fieldName) && current[fieldName];
	},
	
	/**
 	* Check whether the logged in user is a manager or a member of the group
 	*
 	* @param Gliderecord: group
 	**/
	isGroupMemberOrManager: function(group){
		return group.manager == gs.getUserID() || gs.getUser().isMemberOf(group);
	},
	
	/**
 	* Check whether the logged in user is a manager or a member of the group if the group is valid
 	*
 	* @param Gliderecord
	* @param GroupFieldName
 	**/
	isMemberOfValidGroup: function(current,groupfield){
		return this.isValidFieldWithValue(current,groupfield) && this.isGroupMemberOrManager(current[groupfield]);
	},
	
	/**
	* Checks whether translations can be created thru Translated Version related list.
	*
	**/
	canCreateTranslation: function(){
		if(pm.isActive(this.VERSIONING_PLUGIN) && pm.isActive(this.I18N2_PLUGIN))
			return gs.getProperty('glide.knowman.translation.enable_translation_task','false') == 'false';
		return true;
	},
	
	/** 
	* Constructs the link to a KB article
	*
	* @param articleId
	**/
	getArticleLink: function(articleId){
		var sp = pm.isActive("com.snc.knowledge_serviceportal");
		var url = gs.getProperty('glide.servlet.uri');
		if(!url.endsWith("/"))
			url = url + "/";
		if(sp == true)
			article_link = url+gs.getProperty('sn_km_portal.glide.knowman.serviceportal.portal_url', 'kb')+"?id=kb_article_view&sys_kb_id="+articleId;
		else
			article_link = url+"kb_view.do?sys_kb_id="+articleId;
		return article_link;
	},
	
	/** 
	* Checks if the user has access to edit article based on article's domain 
	*
	* @param Gliderecord
	**/
	isArticleReadOnlyBasedOnDomain: function(current){
		var articleDomain = current.sys_domain ? (current.sys_domain + "") : "global";
		var userDomain = gs.getSession().getCurrentDomainID() ? (gs.getSession().getCurrentDomainID() + "") : "global"; if(articleDomain=="global" && articleDomain != userDomain)
			return true;
		return false;
	},
	
	/*
	* Executes the method and restores the value of answer, so that it will not override the answer in ACL
	*/
	safeExecute: function(method, arg){		
		var kbACLAnswer = null;
		
		try {
			kbACLAnswer = typeof answer != 'undefined'? answer : 'BLANK';			
		} catch(error) {
			kbACLAnswer = answer;
		}

		var kbOperationResult = method(arg);
		if(kbACLAnswer !== 'BLANK')
			answer = kbACLAnswer;

		return kbOperationResult;
	},
	
	/**
	* Checks if approval notification property is set and article is in review
	*
	* @param GlideRecord : current
	**/
	canNotify: function(current) {
		if(gs.getProperty('glide.knowman.enable_approval_notification','false') == 'true') {
			if(current.document_id && current.document_id.workflow_state == 'draft') {
				return true;
			}
			else {
				return false;
			}
		}
		else {
			return false;
		}
        },

        /**
	 * Is the logged in user admin of the given record.
	 *
	 * @param GlideRecord: kb_knowledge_base/kb_knowledge, for other just returns false
	 * @return Boolean: true if logged in user has admin rights on the knowledge base or article
	 */
	isAdminUser: function(kbRec) {
		return this._knowledgeHelper.isAdminUser(kbRec);
	},
	
	getDefaultValidToDateFromDate: function(knowledgeBaseSysId, date) { 
		var knowledgeBase = new GlideRecord('kb_knowledge_base');
		var d = new GlideDate();
		d.setValue('2100-01-01');
		knowledgeBase.get(knowledgeBaseSysId);
		
		if(gs.nil(knowledgeBase.article_validity))
			return d.getDisplayValue();
		
		var validity = parseInt(knowledgeBase.article_validity);
		if(validity > 0) {
			date.addDays(validity);
			return date.getDisplayValue();			
		}

		return d.getDisplayValue();
	},
	
	getDefaultValidToDateFromCurrentDate: function(knowledgeBaseSysId) {
		return this.getDefaultValidToDateFromDate(knowledgeBaseSysId, new GlideDate());
	},
	
	isDefaultValidToSet: function(){
		return new GlideRecord("kb_knowledge").getElement("valid_to").getED().getDefault() == "javascript: current.kb_knowledge_base ? new global.KBCommon().getDefaultValidToDateFromCurrentDate(current.kb_knowledge_base) : '';";
	},
	
	getIndexFilterConfiguredForTable: function(tableName) {
		var tableAttrMap = new GlideRecord('ts_table_attribute_map');
		tableAttrMap.addQuery('ts_configuration', this.KNOWLEDGE_CONFIG_SYS_ID);
		tableAttrMap.addQuery('table', tableName);
		tableAttrMap.addQuery('name', this.INDEX_FILTER_ATTR_SYS_ID);
		tableAttrMap.query();
		if(tableAttrMap.next())
			return tableAttrMap.value + '';
		return null;
	},
	
	getIndexFilterForTable: function(tableName) {
		return this.KNOWLEDGE_INDEX_FILTER_VALUE;
	},
	
	installIndexFilterForTable: function(tableName, filterValue, overwrite) {
		if(gs.nil(tableName) || gs.nil(filterValue)) {
			gs.error('Table name or index filter value is empty');
			return;
		}
		var tableAttrMap = new GlideRecord('ts_table_attribute_map');
		tableAttrMap.addQuery('ts_configuration', this.KNOWLEDGE_CONFIG_SYS_ID);
		tableAttrMap.addQuery('table', tableName);
		tableAttrMap.addQuery('name', this.INDEX_FILTER_ATTR_SYS_ID);
		tableAttrMap.query();
		if(!tableAttrMap.next()) {
			gs.info('Adding index filter for ' + tableName);
			tableAttrMap.newRecord();
			tableAttrMap.ts_configuration = this.KNOWLEDGE_CONFIG_SYS_ID;
			tableAttrMap.table = tableName;
			tableAttrMap.name = this.INDEX_FILTER_ATTR_SYS_ID;
			tableAttrMap.value = filterValue;
			tableAttrMap.insert();
		}
		else if(overwrite) {
			gs.info('Updating index filter for ' + tableName + ' current value: ' + tableAttrMap.value + ', new value : ' + filterValue);
			tableAttrMap.value = filterValue;
			tableAttrMap.update();
		}
		else {
			gs.info(tableName + ' already has the index filter defined.');
		}
	},
	
	installIndexFiltersForKnowledge: function(overwrite) {
		//Make sure current scope is global same as the scope of kb_knowledge table.
		var userScopeID = gs.getCurrentApplicationId();
		if (userScopeID != 'global') {
			gs.error("The kb_knowledge table is in Global, but the current application is not Global. Please change application to Global before installing index filters.");
		} else {
			this.installIndexFilterForTable('kb_knowledge', this.getIndexFilterForTable('kb_knowledge'), overwrite);
			//Get kb_knowledge table extensions and add filter for each table in the hierarchy.
			var tables = new GlideRecord('sys_dictionary');
			tables.addQuery('name', 'IN', SNC.TableEditor.getTableExtensions('kb_knowledge'));
			tables.addQuery('internal_type', 'collection');
			tables.query();

			while (tables.next()) {
				var tableName = tables.name + '';
				this.installIndexFilterForTable(tableName, this.getIndexFilterForTable(tableName), overwrite);
			}
		}
	},
	
	calculateRating: function(article) {
		var isVersioningInstalled = this.isVersioningInstalled();
		var kbv = new GlideAggregate("kb_feedback");
		if(isVersioningInstalled && !article.article_id.nil()){

			kbv.addQuery("article.article_id",article.article_id);
			kbv.addQuery("article.sys_created_on","<=",article.sys_created_on);
		}
		else
			kbv.addQuery("article",article.sys_id);
		
		kbv.addQuery("rating",">","0");
		kbv.addAggregate("AVG","rating");
		kbv.setGroup(false);
		kbv.query();
		var totalCount = kbv.getRowCount();
		var num = 0;
		if (kbv.next()) {
			num = kbv.getAggregate("AVG","rating");
		}
		var dbu =  new GlideDBUpdate("kb_knowledge");
		dbu.setPrimaryKeyValue(article.sys_id);
		dbu.setValue("rating",num);
		dbu.setSystem(true);
		dbu.execute();
	},
	
	updateRating: function(kb_id,fb_id) {
		if(fb_id && fb_id != "") {
			var gr = new GlideRecord("kb_feedback");
			gr.addQuery("sys_id",fb_id);
			gr.query();
			if(gr.next())
				return;
		}
		var isVersioningInstalled = this.isVersioningInstalled();
		var article_gr = new GlideRecord("kb_knowledge");
		article_gr.get(kb_id);
		if(isVersioningInstalled && !article_gr.article_id.nil()){
			var versions = new GlideRecord('kb_knowledge');
			versions.addQuery('article_id',article_gr.article_id);
			versions.addQuery('sys_created_on','>=',article_gr.sys_created_on);
			versions.query();
			while(versions.next()){
				this.calculateRating(versions);
			}
		}
		else
			this.calculateRating(article_gr);
	},

	/**
	 * Checks if input record is partial since isValidRecord will return true even if it is a partial record. A use case is when dot walked fields are present in a
	 * list, a join is required to fetch data from two different tables, in such scenario referred record is partially loaded from DB. This is a temporary fix until
	 * a fix is provided by platform
     * @param GlideRecord: record 
     * @return Boolean: false if all fields are present otherwise true.
     */
	isPartialRecord: function(record) {
		return !(record != null && record.sys_id != undefined && record.sys_id.__parent__ instanceof GlideRecord);
	},

	//Public method to be called by 'Count Knowledge Use' job
    updateCount: function() {
		var isVersioningInstalled = this.isVersioningInstalled();
		var gr = new GlideRecord('kb_knowledge');
		gr.query();
		while (gr.next()) {
			var views = this._countViews(gr,days,isVersioningInstalled);
			this._updateKB(gr.sys_id, "sys_view_count", views);
			var uses = this._countUses(gr,isVersioningInstalled);
			this._updateKB(gr.sys_id,"use_count",uses);
		}
	},
	
	_countViews: function (gr,days,isVersioningInstalled) {
		var kbv = new GlideAggregate("kb_use");
		if(isVersioningInstalled && !gr.summary.nil()){
			// Count views happened on all versions less than or equal to this version.
			kbv.addQuery("article.summary",gr.summary);
			kbv.addQuery("article.sys_created_on","<=",gr.sys_created_on);
		}
		else
			kbv.addQuery("article",gr.sys_id);

		kbv.addQuery("viewed", "true");
		if (days > 0)
			kbv.addQuery("sys_created_on", ">=", gs.daysAgoStart(days));
		kbv.addAggregate("SUM", "times_viewed");
		kbv.setGroup(false);
		kbv.query();

		var views = 0;
		if (kbv.next())
			views = kbv.getAggregate("SUM", "times_viewed") - 0;
		return views;
	},

	_countUses: function (gr,isVersioningInstalled) {
		// Update knowledge uses
		var kbu = new GlideAggregate("kb_use");
		if(isVersioningInstalled && !gr.summary.nil()){
			// Count uses of all versions less than or equal to this version.
			kbu.addQuery("article.summary",gr.summary);
			kbu.addQuery("article.sys_created_on","<=",gr.sys_created_on);
		}
		else
			kbu.addQuery("article", gr.sys_id);
		kbu.addQuery("used", "true");
		kbu.addAggregate("COUNT");
		kbu.query();
		var num = 0;
		if (kbu.next())
			num = kbu.getAggregate("COUNT");
		return num;
	},
		
	_updateKB: function(sysId, field, value) {
		var dbu = new GlideDBUpdate("kb_knowledge");
		dbu.setPrimaryKeyValue(sysId);
		dbu.setValue(field, value + "");
		dbu.setSystem(true);
		dbu.execute();
	},
	
	getWordAddinContent: SNC.KnowledgeHelper.getWordAddinPageHTML,
	
	/**
	 * Is the action performed in Workspace or platform.
	 **/
	isWorkspaceURI: function(){
		return gs.action.getGlideURI().toString().contains('api/now');
	},
	
	type: "KBCommonSNC"
};
```