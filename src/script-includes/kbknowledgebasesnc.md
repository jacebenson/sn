---
title: "KBKnowledgeBaseSNC"
id: "kbknowledgebasesnc"
---

API Name: global.KBKnowledgeBaseSNC

```js
KBKnowledgeBaseSNC = Class.create();

KBKnowledgeBaseSNC.prototype =  Object.extendsObject(KBCommon, {
	knowledgeHelper: new SNC.KnowledgeHelper(),
	PATH_TO_OWNER: "owner",
	PATH_TO_MANAGERS: "kb_managers",

	/**
	 * Only a knowledge_admin can create a kb_knowledge_base record.
	 *
	 * @param GlideRecord: kb_knowledge_base
	 * @return Boolean: can logged in user create a kb_knowledge_base
	 */
	canCreate: function(knowledgeBaseGr) {
		return this.isAdminUser(knowledgeBaseGr);
	},

	/**
	 * Can the current user read kb_knowledge_base contents
	 * based on the user criteria configuration.
	 *
	 * @param GlideRecord: kb_knowledge_base
	 * @return Boolean: can logged in user read the kb_knowledge_base
	 */
	canRead: function(knowledgeBaseGr) {
		if(knowledgeBaseGr.isNewRecord())
			return true;
		
		return this.safeExecute(this.knowledgeHelper.canRead, knowledgeBaseGr);
	},

	/**
	 * Providing user is a knowledge_admin, or is an owner/ manager
	 * of the kb_knowledge_base let them update the record.
	 *
	 * @param GlideRecord: kb_knowledge_base
	 * @return Boolean: can logged in user update the kb_knowledge_base
	 */
	canWrite: function(knowledgeBaseGr) {

		if (this.isAdminUser(knowledgeBaseGr))
			return true;

		if (this.isKnowledgeBaseOwner(knowledgeBaseGr, this.PATH_TO_OWNER))
			return true;

		if (this.isKnowledgeBaseManager(knowledgeBaseGr, this.PATH_TO_MANAGERS))
			return true;

		return false;
	},

	/**
	 * Stop any user from deleting the kb_knowledge_base without following procedure.
	 *
	 * @param GlideRecord: kb_knowledge_base
	 * @return Boolean: can logged in user delete the kb_knowledge_base
	 */
	canDelete: function(knowledgeBaseGr) {
		return false;
	},

	/**
	 * Checks to see if the specified user is a owner or manager of any knowledge base
	 * @param String: user's sys_id
	 * @return Boolean: true if user is owner or manager of any knowledge base, false otherwise
	 */
	isManagerOfAny: function(userId) {
		var kbGr = new GlideRecord("kb_knowledge_base");
		var qc = kbGr.addQuery("owner", "CONTAINS", userId);
		qc.addOrCondition("kb_managers", "CONTAINS", userId);
		kbGr.query();
		return kbGr.hasNext();
	},

	/**
	 * Get all the knowledge base sys ids that the current user is a manager or owner of
	 * Note: knowledge_admin gets all knowledge bases
	 *
	 * @return Array of sys ids
	 */
	getAllSysIds: function() {
		var kbGr = new GlideRecord("kb_knowledge_base");
		var userId = gs.getUserID();
		
		var qc = kbGr.addQuery("owner", "CONTAINS", userId);
		qc.addOrCondition("kb_managers", "CONTAINS", userId);
		if (this.isAdminUser(knowledgeBaseGr)) {
			qc.addOrCondition('application', '=', 'NULL');
			qc.addOrCondition('application', '=', 'global');
		}
		kbGr.query();

		var result = [];
		while (kbGr.next()) {
			result.push(kbGr.sys_id+"");
		}
		return result;
	},

	/**
	* Compares the Languages associated to Articles in the given Knowledge Base.
	* @returns an array of language codes missing on Knowledge Base.
	*/
	findMissingLanguages: function(knowledgeBaseGr){
		var articlelanguages = new GlideAggregate('kb_knowledge');
		articlelanguages.addQuery('kb_knowledge_base',knowledgeBaseGr.sys_id);
		articlelanguages.addNotNullQuery('language');
		articlelanguages.addQuery('language','NOT IN',knowledgeBaseGr.languages);
		articlelanguages.addAggregate('COUNT','language');
		articlelanguages.query();
		var missedLanguages=[];
		while(articlelanguages.next()){
			missedLanguages.push(''+articlelanguages.language);
		}
		return missedLanguages;
	},

	type: "KBKnowledgeBaseSNC"
});
```