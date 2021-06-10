---
title: "KBScopedKnowledgeSNC"
id: "kbscopedknowledgesnc"
---

API Name: global.KBScopedKnowledgeSNC

```js
var KBScopedKnowledgeSNC = Class.create();
KBScopedKnowledgeSNC.prototype = Object.extendsObject(KBCommon, {
	
    initialize: function() {
    },

	/**
	 * Can the logged in user create knowledge base.
	 *
	 * @param GlideRecord: kb_knowledge_base
	 * @return Boolean: true if logged in user can create knowledge base
	 */
	canCreateKnowledgeBase: function(knowledgeBaseGr) {
		var kbKnowledgeBase = new global.KBKnowledgeBaseSNC();
		return kbKnowledgeBase.canCreate(knowledgeBaseGr);
	},

	/**
	 * Can the logged in user read knowledge base contents.
	 *
	 * @param GlideRecord: kb_knowledge_base
	 * @return Boolean: true if logged in user can read knowledge base
	 */
	canReadKnowledgeBase: function(knowledgeBaseGr) {
		var kbKnowledgeBase = new global.KBKnowledgeBaseSNC();
		return kbKnowledgeBase.canRead(knowledgeBaseGr);
	},

	/**
	 * Only manager and owner of the knowledge base is allowed to update knowledge base
	 *
	 * @param GlideRecord: kb_knowledge_base
	 * @return Boolean: true if logged in user update knowledge base
	 */
	canWriteKnowledgeBase: function(knowledgeBaseGr) {
		var kbKnowledgeBase = new global.KBKnowledgeBaseSNC();
		return kbKnowledgeBase.canWrite(knowledgeBaseGr);
	},

	/**
	 * No one is allowed to allowed to delete a knowledge base.
	 *
	 * @param GlideRecord: kb_knowledge_base
	 * @return Boolean: true if logged in user can delete knowledge base
	 */
	canDeleteKnowledgeBase: function(knowledgeBaseGr) {
		var kbKnowledgeBase = new global.KBKnowledgeBaseSNC();
		return kbKnowledgeBase.canDelete(knowledgeBaseGr);
	},
	
	/**
	 * Determine if the logged in user has manager right to the knowledge base
	 *
	 * @param GlideRecord kb_knowledge_base or kb_knowledge
	 *
	 * @return boolean
	 */
	canManageKnowledgeBase: function(knowledgeBaseGr) {
		return new global.KnowledgeAccessSNC().managerRights(knowledgeBaseGr);
	},

	/**
	 * Can the logged in user create article.
	 *
	 * @param GlideRecord: kb_knowledge
	 * @return Boolean: true if logged in user can create article
	 */
	canCreateArticle: function(knowledgeGr) {
		var kbKnowledge = new global.KBKnowledgeSNC();
		return kbKnowledge.canCreate(knowledgeGr);
	},

	/**
	 * Can the logged in user read article.
	 *
	 * @param GlideRecord: kb_knowledge
	 * @return Boolean: true if logged in user can read article
	 */
	canReadArticle: function(knowledgeGr) {
		var kbKnowledge = new global.KBKnowledgeSNC();
		if(kbKnowledge.isMultipleKnowledgeUpdate())
			return true;
		else if (knowledgeGr.isNewRecord()) 
			return true;
		else if (!this.isPartialRecord(knowledgeGr))
			return kbKnowledge.canRead(knowledgeGr);
		else if(!gs.nil(knowledgeGr.sys_id)) {
			var article = new GlideRecord("kb_knowledge");
			if(article.get(knowledgeGr.sys_id))
				return kbKnowledge.canRead(article);
		}
		return false;
	},

	/**
	 * Can the logged in user update article.
	 *
	 * @param GlideRecord: kb_knowledge
	 * @return Boolean: true if logged in can user update article
	 */
	canWriteArticle: function(knowledgeGr) {
		var kbKnowledge = new global.KBKnowledgeSNC();
		if(kbKnowledge.isMultipleKnowledgeUpdate())
			return true;
		else 
			return kbKnowledge.canWrite(knowledgeGr);
	},

	/**
	 * Can the logged in user update article based on the user criteria configuration.
	 *
	 * @param GlideRecord: kb_knowledge_base
	 * @return Boolean: can logged in user update the kb_knowledge_base
	 */
	canDeleteArticle: function(knowledgeGr) {
		var kbKnowledge = new global.KBKnowledgeSNC();
		return kbKnowledge.canDelete(knowledgeGr);
	},
	
    type: 'KBScopedKnowledgeSNC'
});
```