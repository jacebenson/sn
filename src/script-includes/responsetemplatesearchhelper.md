---
title: "ResponseTemplateSearchHelper"
id: "responsetemplatesearchhelper"
---

API Name: global.ResponseTemplateSearchHelper

```js
var ResponseTemplateSearchHelper = Class.create();
ResponseTemplateSearchHelper.prototype = {
    initialize: function(request, response) {
		this.request = request;
		this.response = response;
		
		this.DEFAULT_COUNT = 10;
		this.DEFAULT_OFFSET = 0;
    },

	processSearch: function() {
		var inputs = JSON.parse(arguments[0]);

		if (!inputs['tableName'])
			return;

		this.table = this.request.formTable;
		this.responseTable = inputs['tableName'].toString();
		this.sysId = this.request.formId;
		this.search = this.request.query && this.request.query.freetext ? this.request.query.freetext : '';
		this.count = Number(inputs['count'] ? inputs['count'].toString() : this.DEFAULT_COUNT) + 1;
		this.offset = Number(inputs['offset'] ? inputs['offset'].toString() : this.DEFAULT_OFFSET);

		var results = new sn_templated_snippets.ResponseTemplate().query(this.table, this.sysId, this.search, this.count, this.offset, true, '');

		this.formatResults(JSON.parse(results));
	},

	formatResults: function(results) {
		if (!results || !results.length)
			return;
		
		var sysIdResultsMap = {};
		
		for (var i = 0; i < results.length; i++) {
			var result = results[i];
			sysIdResultsMap[result.sys_id] = result;
		}

		var gr = new GlideRecordSecure(this.responseTable);
		gr.addQuery('sys_id', 'IN', Object.keys(sysIdResultsMap));
		gr.orderBy('name');
		gr.query();

		while (gr.next()) {
			var response = sysIdResultsMap[gr.getUniqueValue()];

			// Swap template with evaluated response
			gr.setValue('html_script_body', response.evaluated_response.evaluated_body);

			var srdc = new SNC.SearchResultDisplayConfiguration(gr.getTableName(), this.request.getUiType(), this.request.getFormTable());
			var res = new SNC.SearchResult();
			res['title'] = response.name;
			res['snippet'] = response.evaluated_response.evaluated_body;
			res['id'] = this.responseTable + ':' + response.sys_id;
			res.meta.setDisplayConfiguration(srdc, gr);

			this.response.results.push(res);
		}
	},

    type: 'ResponseTemplateSearchHelper'
};

```