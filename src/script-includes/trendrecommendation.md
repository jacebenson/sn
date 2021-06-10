---
title: "TrendRecommendation"
id: "trendrecommendation"
---

API Name: sn_intel_analyzer.TrendRecommendation

```js
var TrendRecommendation = Class.create();
TrendRecommendation.prototype = {
	COMMON_VALUE: "common_value",
	COMMON_REFERENCE: "common_reference",
	COMMON_CONDITION: "common_condition",

	initialize: function () {
	},

	processTrendsWithString: function(trendJSONString) {
		if (typeof trendJSONString != 'string')
			return '';
			
		var trendJSON = JSON.parse(trendJSONString);
		this.processTrends(trendJSON);
		return JSON.stringify(this.resultsJSON);
	},
	
	// trendJSON includes request_table, record_list an array of record ids, trend_list an array of trends ids.
	processTrends: function (trendJSON) {
		
		this.request_table = trendJSON["request_table"];
		this.record_list = trendJSON["record_list"];
		this.trend_list = trendJSON["trend_list"];
		if (!this.request_table || !this.record_list || this.record_list.length == 0)
			return {
				"request_table": (this.request_table ? this.request_table : "" ),
				"state": "failed",
				"message": gs.getMessage("invalid table or record list"),
				"trends": [],
				"results": []
			};

		this.resultsJSON = {"request_table": this.request_table};
		this.trends = [];
		this.recommendObjs = [];
		this._buildRecordAgeMap();

		// if trendList exists, get the trends in list; if not, get all applicable trends
		var trendGr = new GlideRecord("trend_definition");
		trendGr.addQuery("table", this.request_table);
		if (this.trend_list)
			trendGr.addQuery("trend_id","IN", this.trend_list);
		trendGr.orderBy("order");
		trendGr.query();
		while (trendGr.next()) {
			var recommendObj = {};
			var trend_threshold = parseInt(trendGr.getValue("threshold"));

			recommendObj['trend_type'] = trendGr.getValue("trend_type");
			recommendObj['trend_id'] = trendGr.getValue("trend_id");
			recommendObj['trend_threshold'] = trend_threshold;

			switch (trendGr.getValue("trend_type")) {
				case this.COMMON_VALUE:
					this._processCommonValue(trendGr, recommendObj);
					break;
				case this.COMMON_REFERENCE:
					this._processCommonReference(trendGr, recommendObj);
					break;
				case this.COMMON_CONDITION:
					this._processCommonCondition(trendGr, recommendObj);
					break;
			}

			// if no result found in a trend, don't add the trend to resultsJSON
			if (recommendObj && recommendObj["common_results"] && recommendObj["common_results"].length > 0) {
				this.recommendObjs.push(recommendObj);
				this.trends.push(trendGr.getValue("trend_id"));
			}
		}

		if (!this.trends || this.trends.length == 0)
			return {
				"request_table": this.request_table,
				"state": "successful",
				"message": gs.getMessage("no recommendation was found"),
				"trends": [],
				"results": []
			};

		this.resultsJSON["state"] = "successful";
		this.resultsJSON["message"] = gs.getMessage("trends are executed succssfully");
		this.resultsJSON["trends"] = this.trends;
		this.resultsJSON["results"] = this.recommendObjs;

		return this.resultsJSON;
	},

	_processCommonValue: function (trendGr, recommendObj) {
		var trend_common_field = trendGr.getValue("common_field");
		recommendObj['source_table'] = this.request_table;
		recommendObj['trend_field'] = trend_common_field;
		this._buildGroupResultList(recommendObj, this.request_table, trend_common_field, "sys_id");
	},

	_processCommonReference: function (trendGr, recommendObj) {
		var trend_reference_type = trendGr.getValue("reference_type");

		if (trend_reference_type === "simple") {
			var trend_field = trendGr.getValue("trend_field");

			var reference_field = (new GlideRecord(this.request_table)).getElement(trend_field);
			if (reference_field === null || !reference_field.getReferenceTable())
				return;

			recommendObj['source_table'] = reference_field.getReferenceTable();   // get the reference table
			recommendObj['trend_field'] = trend_field;
			this._buildGroupResultList(recommendObj, this.request_table, trend_field, "sys_id");
		}
		else if (trend_reference_type === "m2m") {
			var trend_m2m_table = trendGr.getValue("m2m_table");
			var m2m_to_field = trendGr.getValue("m2m_to_field");
			var m2m_from_field = trendGr.getValue("m2m_from_field");

			if (!trend_m2m_table || !m2m_to_field || !m2m_from_field)
				return;

			var m2mGR = new GlideRecord(trend_m2m_table);
			if (m2mGR.getElement(m2m_to_field) === null || m2mGR.getElement(m2m_from_field) === null || !m2mGR.getElement(m2m_to_field).getReferenceTable() || !m2mGR.getElement(m2m_from_field).getReferenceTable())
				return;

			recommendObj['source_table'] = m2mGR.getElement(m2m_to_field).getReferenceTable();
			recommendObj['trend_field'] = "";
			this._buildGroupResultList(recommendObj, trend_m2m_table, m2m_to_field, m2m_from_field);
		}
	},

	_processCommonCondition: function (trendGr, recommendObj) {
		var trend_condition = trendGr.condition;
		this.recordMap = this._buildRecordMap(this.record_list);

		recommendObj['source_table'] = this.request_table;
		recommendObj['trend_field'] = "";

		var recordsGr = new GlideRecord(this.request_table);
		recordsGr.addQuery("sys_id", "IN", this.record_list);
		if (trend_condition)
			recordsGr.addEncodedQuery(trend_condition);
		recordsGr.query();

		if (recordsGr.getRowCount() >= recommendObj["trend_threshold"])
			this._buildResultList(recommendObj, recordsGr);
	},

	//build map to keep the input order of recordList
	_buildRecordMap: function (recordList) {
		var recordMapConstr = {};
		for (var i = 0; i < recordList.length; i++)
			recordMapConstr[recordList[i]] = i;
		return recordMapConstr;
	},

	// construct the result list by complying with the order of input records and adding count
	_buildResultList: function(recommendObj, recordsGr) {
		var resultListSorted = [];
		var resultListWithIdx = [];
		var trendOldest = (new GlideDateTime()).toString();

		while (recordsGr.next())
			resultListWithIdx.push({"id": recordsGr.getValue("sys_id"), "display_value": recordsGr.getDisplayValue(), "idx": this.recordMap[recordsGr.sys_id], "group_oldest": recordsGr.getValue("sys_created_on")});

		var resultListWithIdxSorted = resultListWithIdx.sort(function(a, b) {return a.idx - b.idx;});
		for (var j = 0; j < resultListWithIdxSorted.length; j++) {
			resultListSorted.push({
				"value": resultListWithIdxSorted[j].id,
				"display_value": resultListWithIdxSorted[j].display_value,
				"count": 1,   // hard code count
				"group_oldest": resultListWithIdxSorted[j].group_oldest
			});

			if (resultListWithIdxSorted[j].group_oldest < trendOldest)
				trendOldest = resultListWithIdxSorted[j].group_oldest;
		}

		recommendObj['group_count'] = resultListSorted.length;
		recommendObj['trend_oldest'] = trendOldest;
		recommendObj['common_results'] = resultListSorted;
	},

	// construct the result list, use flattened GlideRecord because need information for both group and each record
	_buildGroupResultList: function(recommendObj, query_table, group_field, query_field) {
		// build groupMap
		var groupMap = {};
		var destGr = new GlideRecord(query_table);
		destGr.addQuery(query_field, "IN", this.record_list);
		destGr.addNotNullQuery(group_field);
		destGr.query();
		while (destGr.next()) {
			var group_key = destGr.getValue(group_field);
			if (!groupMap[group_key])
				groupMap[group_key] = {"display_value": destGr.getDisplayValue(group_field), "ids": [], "count": 0};
			groupMap[group_key]['ids'].push(destGr.getValue(query_field));
			groupMap[group_key]['count']++;
		}

		// build commonValueLis and add since
		var trendOldest = (new GlideDateTime()).toString();
		var commonValueList = [];
		for (var key in groupMap) {
			if (groupMap[key]["count"] < recommendObj["trend_threshold"])
				continue;

			var groupOldest = (new GlideDateTime()).toString();
			var ids = groupMap[key]["ids"];
			for (var i = 0; i < ids.length; i++) {
				if (this.requestRecordsAgeMap[ids[i]] < groupOldest)
					groupOldest = this.requestRecordsAgeMap[ids[i]];
			}

			commonValueList.push({
				"value": key,
				"count": groupMap[key]["count"],
				"display_value": groupMap[key]["display_value"],
				"group_oldest": groupOldest
			});

			if (groupOldest < trendOldest)
				trendOldest = groupOldest;
		}

		//sorted map by count in DESC order
		var commonValueListSorted = commonValueList.sort(function(a, b) {return b.count - a.count;});

		// add to recommendObj
		recommendObj['group_count'] = commonValueListSorted.length;
		recommendObj['trend_oldest'] = trendOldest;
		recommendObj['common_results'] = commonValueListSorted;
	},

	//build map to keep the created time for recordList
	_buildRecordAgeMap: function (recordList) {
		this.requestRecordsAgeMap = {};

		var gr = new GlideRecord(this.request_table);
		gr.addQuery("sys_id", "IN", this.record_list);
		gr.query();

		while (gr.next())
			this.requestRecordsAgeMap[gr.getValue("sys_id")] = gr.getValue("sys_created_on");
	},

	type: 'TrendRecommendation'
};
```