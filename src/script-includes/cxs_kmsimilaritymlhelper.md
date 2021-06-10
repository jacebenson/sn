---
title: "cxs_KMSimilarityMLHelper"
id: "cxs_kmsimilaritymlhelper"
---

API Name: global.cxs_KMSimilarityMLHelper

```js
var cxs_KMSimilarityMLHelper = Class.create();
cxs_KMSimilarityMLHelper.prototype = Object.extendsObject(cxs_MLSearchHelper, {

	getResultsGr: function (sysIds) {
		var gr = new GlideRecordSecure(this.tableName);
		gr.addQuery('sys_id', 'IN', sysIds);
		gr.addQuery("sys_class_name","!=","kb_knowledge_block");
		gr.query();
		return gr;
	},
	
	assimilateResults: function (formatedResults, resultsGr, sysIdsInOrder) {
		if (!formatedResults)
			return;

		var combinedResults = {};
		while (resultsGr.next()) {
			var sysId = resultsGr.getUniqueValue();
			if (sysId === this.request.formId)
				continue;

			var srdc = new SNC.SearchResultDisplayConfiguration(resultsGr.getTableName(), this.request.getUiType(), this.request.getFormTable());
			var res = new SNC.SearchResult();
			res[this.RESULT_TITLE] = srdc.getCardTitle(resultsGr);
			res[this.RESULT_SNIPPET] = srdc.getCardSnippet(resultsGr);
			res[this.ID] = resultsGr.getTableName() + ':' + resultsGr.getUniqueValue();
			res[this.RESULT_LINK] = "kb_view.do?sysparm_article="+resultsGr.getValue('number');
			res.meta[this.META_SCORE] = -1;
			res.meta[this.CONFIDENCE] = formatedResults[this.CONFIDENCE];
			res.meta.setDisplayConfiguration(srdc, resultsGr);
			combinedResults[sysId] = res;
		}

		for (var i = 0; i < sysIdsInOrder.length; i ++) {
			if (sysIdsInOrder[i] === this.request.formId)
				continue;

			var searchResult = combinedResults[sysIdsInOrder[i]];
			this.response.results.push(searchResult);
		}
	},

    type: 'cxs_KMSimilarityMLHelper'
});
```