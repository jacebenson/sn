---
title: "QueryDependencyExporter"
id: "querydependencyexporter"
---

API Name: global.QueryDependencyExporter

```js
var QueryDependencyExporter = Class.create();

QueryDependencyExporter.prototype = {

    initialize: function(queryList, publisher, tracker, intervalPercent, logger) {
        this.queryList = queryList;
        this.publisher = publisher;
        this.logger = logger;
        this.tracker = tracker;
        this.intervalPercent = intervalPercent;
        this.exported = new Array();
    },

    exportData: function() {
       for(var queryIndex in this.queryList) {
           var querySysId = this.queryList[queryIndex];
           if (this._contains(querySysId)) continue;
		   this.logger.log("Exporting query: " + this._getQueryName(querySysId));
           this.tracker.incrementPercentComplete(this.intervalPercent);
           var record = this.getQueryRecord(querySysId);
           this.publisher.publishSingle(record);
           this.exported.push(querySysId);
           this.tracker.incrementPercentComplete(this.intervalPercent);
           record.next();
           this._exportDependentQuery(record.dependencies);
       }
    },

    getQueryRecord: function(queryId){
        var gr = new GlideRecord('qb_saved_query');
        gr.addQuery('sys_id', queryId);
        gr.query();
        return gr;
    },

    _exportDependentQuery: function(dependencies) {
        var queryID = dependencies.split(',');
        for (var i = 0; i < queryID.length; i++) {
            var id = queryID[i];
            if (this._contains(id)) continue;
 		    this.logger.log("Exporting query: " + this._getQueryName(id));
            this.tracker.incrementPercentComplete(this.intervalPercent);
            this.publisher.publishSingle(this.getQueryRecord(id));
            this.exported.push(id);
            this.tracker.incrementPercentComplete(this.intervalPercent);
        }
    },

    _contains: function(s) {
        for (var i = 0; i < this.exported.length; i++) {
            if (this.exported[i] == s) return true;
        }
        return false;
    },

	_getQueryName: function(queryId){
		var gr = new GlideRecord('qb_saved_query');
        if (gr.get(queryId))
			return gr.name;
		return null;
	},

    type: 'QueryDependencyExporter'
};

```