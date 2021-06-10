---
title: "KBRelatedArticlesOrItemsSNC"
id: "kbrelatedarticlesoritemssnc"
---

API Name: global.KBRelatedArticlesOrItemsSNC

```js
var KBRelatedArticlesOrItemsSNC = Class.create();
KBRelatedArticlesOrItemsSNC.prototype = {
    initialize: function () {
    },

	/**
	 * User who can edit the knowledge article can only create relationships.
	 *
	 * @param GlideRecord: kb_2_kb/kb_2_sc
	 * @return Boolean: can logged in user create a m2m relationship with articles/catalog items.
	 */
    canCreate: function (knowledgeRef) {
        return this.canWriteArticle(knowledgeRef.kb_knowledge.getRefRecord());
    },

	/**
	 * User who can edit the knowledge article can only delete relationships.
	 *
	 * @param GlideRecord: kb_2_kb/kb_2_sc
	 * @return Boolean: can logged in user delete a m2m relationship with articles/catalog items.
	 */
    canDelete: function (knowledgeRef) {
        return this.canWriteArticle(knowledgeRef.kb_knowledge.getRefRecord());
    },

	/**
	 * User who can read the knowledge article can only read relationships.
	 *
	 * @param GlideRecord: kb_2_kb/kb_2_sc
	 * @return Boolean: can logged in user read a m2m relationship with articles/catalog items.
	 */
    canRead: function (knowledgeRef) {
        var knowledge = new KBKnowledge();
        if (knowledgeRef.kb_knowledge && !gs.nil(knowledgeRef.kb_knowledge))
            return knowledge.canRead(knowledgeRef.kb_knowledge.getRefRecord());
        else
            return knowledge.canCreate();
    },

	/**
	 * User who can edit the knowledge article can only write relationships.
	 *
	 * @param GlideRecord: kb_2_kb/kb_2_sc
	 * @return Boolean: can logged in user write a m2m relationship with articles/catalog items.
	 */
    canWrite: function (knowledgeRef) {
        return this.canWriteArticle(knowledgeRef.kb_knowledge.getRefRecord());
    },

	/**
	 * Whether a User can edit the article.
	 *
	 * @param GlideRecord: kb_2_kb/kb_2_sc
	 * @return Boolean: can logged in user edit the article.
	 */
    canWriteArticle: function (article) {
        var knowledge = new KBKnowledge();

        if (article && !gs.nil(article)) {
            if (article.workflow_state == "retired")
                return false;

            if (knowledge.isVersioningInstalled() && knowledge.isVersioningEnabled())
                if (article.workflow_state == 'published')
                    return new KBVersioning().canCheckout(article);
                else
                    return article.canWrite();
            else
                return article.canWrite();
        }
        else
            return knowledge.canCreate();
    },

    type: 'KBRelatedArticlesOrItemsSNC'
};
```