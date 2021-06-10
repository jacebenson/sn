---
title: "BuildSuggestionsFromLogTable"
id: "buildsuggestionsfromlogtable"
---

API Name: global.BuildSuggestionsFromLogTable

```js
var BuildSuggestionsFromLogTable = Class.create();
BuildSuggestionsFromLogTable.prototype = {
    initialize: function(maxRecordsToBuild) {
        this.max = maxRecordsToBuild;
    },

    buildPortalSuggestions: function(appId, dataSource, searchSources, searchSourceSysIds) {
        var appTable = "sp_portal";
        this._seedAnalyticsAndBuildSuggestions(appId, appTable, dataSource, searchSources, searchSourceSysIds);
    },

    buildScopedSuggestions: function(configId) {
        var appTable = "sys_scope";
        var dataSource = "text_search";
        var mobileAppId = this._getApplicationId(configId);
        var searchSourceSysIds = this._getApplicationSearchSourceSysIds(configId);
        var searchSources = this._getSearchSources(searchSourceSysIds);
        this._seedAnalyticsAndBuildSuggestions(mobileAppId, appTable, dataSource, searchSources, searchSourceSysIds);
    },

    _seedAnalyticsAndBuildSuggestions: function(appId, appTable, dataSource, searchSources, searchSourceSysIds) {
        var currentDateTime = new GlideDateTime();
        var suggestionService = new SearchSuggestionService();
        var count = 0;
        var done = false;

        var dataSourceGr = new GlideRecord(dataSource);
        dataSourceGr.addQuery('sys_created_on', "<", currentDateTime);
        dataSourceGr.addQuery("table", "IN", searchSources);
        dataSourceGr.orderByDesc("sys_created_on");
        dataSourceGr.query();
        dataSourceGr.next();

        var totalRecordsToProcess = Math.min(dataSourceGr.getRowCount(), this.max);
        //PROCESS BUILDING SUGGESTIONS IN CHUNKS OF 5000 RECORDS
        var recordsToProcess = Math.min(totalRecordsToProcess, 5000);
        while (count < this.max && !done) {
            if (count + recordsToProcess >= totalRecordsToProcess) {
                dataSourceGr.chooseWindow(count, totalRecordsToProcess);
                done = true;
            } else
                dataSourceGr.chooseWindow(count, count + recordsToProcess);

            dataSourceGr.query();

            while (dataSourceGr.next()) {
                var searchTerm = "";
                var results = 0;

                if (dataSource == "text_search") {
                    searchTerm = dataSourceGr.getValue('search_term');
                    results = parseInt(dataSourceGr.getValue('results'));
                } else if (dataSource == "sp_log") {
                    searchTerm = dataSourceGr.getValue('text');
                    results = parseInt(dataSourceGr.getValue('count'));
                }

                var user = dataSourceGr.getValue('user');
                var sessionId = dataSourceGr.getValue('session_id');

                this._insertSearchEvents(appId, appTable, searchTerm, user, sessionId, results, searchSourceSysIds);
                suggestionService.build();
                count = count + recordsToProcess;
            }
        }
    },

    _insertSearchEvents: function(appId, appTable, searchTerm, user, sessionId, results, searchSourceSysIds) {
        var searchEventGr = new GlideRecord('sys_search_event');
        var userLanguage = this._getUserLanguage(user);

        searchEventGr.initialize();
        searchEventGr.application_id = appId;
        searchEventGr.application_table = appTable;
        searchEventGr.setValue('search_query', searchTerm);
        searchEventGr.setValue('user', user);
        searchEventGr.setValue('session_id', sessionId);
        searchEventGr.setValue('has_results', results);
        searchEventGr.setValue('language', userLanguage);
        searchEventGr.setValue('click_rank', 0);

        var sysId = searchEventGr.insert();
        for (var i = 0; i < searchSourceSysIds.length; i++) {
            this._insertSearchSourceEvents(sysId, searchSourceSysIds[i], searchTerm);
        }
    },

    _insertSearchSourceEvents: function(sysId, sourceId, searchTerm) {
        var searchSourceEventGr = new GlideRecord('sys_search_source_event');
        searchSourceEventGr.initialize();
        searchSourceEventGr.search_event = sysId;
        searchSourceEventGr.source = sourceId;
        searchSourceEventGr.search_query = searchTerm;
        searchSourceEventGr.has_results = false;
        searchSourceEventGr.insert();
    },

    _getApplicationId: function(searchContextConfigId) {
        var appId;
        var searchContextConfigGR = new GlideRecord('sys_search_context_config');
        searchContextConfigGR.addQuery("sys_id", searchContextConfigId);
        searchContextConfigGR.query();

        if (searchContextConfigGR.next())
            appId = searchContextConfigGR.getValue("application_id");

        return appId;
    },

    _getApplicationSearchSourceSysIds: function(searchContextConfigId) {
        var sysIds = [];
        var searchSourceGR = new GlideRecord('m2m_search_context_config_search_source');
        searchSourceGR.addQuery('search_context_config', searchContextConfigId);
        searchSourceGR.query();

        while (searchSourceGR.next()) {
            sysIds.push(searchSourceGR.getValue("source") + "");
        }

        return sysIds;
    },

    _getSearchSources: function(searchSourceSysIds) {
        var sources = [];
        var gr = new GlideRecord('sys_search_source');
        gr.addQuery('sys_id', 'IN', searchSourceSysIds);
        gr.query();

        while (gr.next()) {
            sources.push(gr.getValue("source_table"));
        }

        return sources;
    },

    _getUserLanguage: function(userId) {
        var userGr = new GlideRecord('sys_user');
        userGr.addQuery('sys_id', userId);
        userGr.query();
        userGr.next();

        var answer = userGr.getValue('preferred_language');
        if (answer) {
            gs.info("User Language: " + answer);
            return answer;
        } else {
            var defaultLanguage = gs.getProperty("glide.sys.language");
            gs.info("Default Language: " + defaultLanguage);
            return defaultLanguage;
        }
    },

    type: 'BuildSuggestionsFromLogTable'
};
```