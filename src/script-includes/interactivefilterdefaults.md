---
title: "InteractiveFilterDefaults"
id: "interactivefilterdefaults"
---

API Name: global.InteractiveFilterDefaults

```js
var InteractiveFilterDefaults = Class.create();
InteractiveFilterDefaults.prototype = Object.extendsObject(AbstractAjaxProcessor, {
    checkCanvasAuthorization: function() {
        var dashboardId = this.getParameter('sysparm_dashboard_id');
        var authFlag = gs.getSession().getClientData(dashboardId);
        if (authFlag == true || authFlag == 'true')
            return true;

        this.setError('User is not authorised to perform this operation');
        return false;
    },
    setDefaultValue: function(canvasSysId, defaultValue) {
        if (!this.checkCanvasAuthorization())
            return;

        var userId = gs.getUserID();
        var grCanvasPreferences = new GlideRecord('sys_canvas_preferences');
        grCanvasPreferences.addQuery('canvas_page', canvasSysId);
        grCanvasPreferences.addQuery('user', userId);
        grCanvasPreferences.addQuery('widget_id', defaultValue.id);
        grCanvasPreferences.addQuery('name', defaultValue.name);
        grCanvasPreferences.query();

        if (grCanvasPreferences.hasNext()) {
            while (grCanvasPreferences.next()) {
                grCanvasPreferences.canvas_page = canvasSysId;
                grCanvasPreferences.user = userId;
                grCanvasPreferences.widget_id = defaultValue.id;
                grCanvasPreferences.name = defaultValue.name;
                grCanvasPreferences.value = JSON.stringify(defaultValue.filter);
                grCanvasPreferences.update();
            }
        } else {
            grCanvasPreferences.initialize();
            grCanvasPreferences.canvas_page = canvasSysId;
            grCanvasPreferences.user = userId;
            grCanvasPreferences.widget_id = defaultValue.id;
            grCanvasPreferences.name = defaultValue.name;
            grCanvasPreferences.value = JSON.stringify(defaultValue.filter);
            grCanvasPreferences.insert();
        }
        return {
            status: "ok"
        };

    },
    removeDefaultValue: function(canvasSysId, widgetId) {
        if (!this.checkCanvasAuthorization())
            return;

        var userId = gs.getUserID();
        var grCanvasPreferences = new GlideRecord('sys_canvas_preferences');
        grCanvasPreferences.addQuery('canvas_page', canvasSysId);
        grCanvasPreferences.addQuery('user', userId);
        grCanvasPreferences.addQuery('widget_id', widgetId);
        grCanvasPreferences.addQuery('name', "default_value");
        grCanvasPreferences.query();
        grCanvasPreferences.next();
        grCanvasPreferences.deleteRecord();
        return {
            status: "ok"
        };

    },
    removeAllDefaultValue: function(canvasSysId) {
        if (!this.checkCanvasAuthorization())
            return;

        var userId = gs.getUserID();
        var grCanvasPreferences = new GlideRecord('sys_canvas_preferences');
        grCanvasPreferences.addQuery('canvas_page', canvasSysId);
        grCanvasPreferences.addQuery('user', userId);
        grCanvasPreferences.addQuery('name', "default_value");
        grCanvasPreferences.deleteMultiple();
        return {
            status: "ok"
        };

    },
    saveDefaultValue: function() {
        var sysId = this.getParameter('sysparm_canvas_id');
        var defaultFilter = JSON.parse(this.getParameter('sysparm_default_filter'));

        this.sendUsage([defaultFilter], sysId, 'filter');

        return this.setDefaultValue(sysId, defaultFilter);
    },
    deleteDefaultValue: function() {
        var sysId = this.getParameter('sysparm_canvas_id');
        var widgetId = this.getParameter('sysparm_default_filter_id');
        return this.removeDefaultValue(sysId, widgetId);
    },
    deleteAllDefaultValue: function() {
        var sysId = this.getParameter('sysparm_canvas_id');
        return this.removeAllDefaultValue(sysId);
    },
    getDefaultValues: function(canvasSysId) {
        var canvasId = canvasSysId ? canvasSysId : this.getParameter('sysparm_canvas_id');
        if (!this.checkCanvasAuthorization())
            return;

        var userId = gs.getUserID();
        var grCanvasPreferences = new GlideRecord('sys_canvas_preferences');
        var defaultFilters = [];
        grCanvasPreferences.addQuery('canvas_page', canvasId);
        grCanvasPreferences.addQuery('user', userId);
        grCanvasPreferences.addQuery('name', 'default_value');
        grCanvasPreferences.query();
        while (grCanvasPreferences.next()) {
            defaultFilters.push(this.getFilterJSON(grCanvasPreferences));
        }
        var result = this.newItem("result");
        result.setAttribute("filters", JSON.stringify(defaultFilters));

        this.sendUsage(defaultFilters, canvasId, 'filters');

        return JSON.stringify(defaultFilters);
    },
    getFilterJSON: function(grCanvasPreference) {
        var defaultFilter = {};
        defaultFilter.id = grCanvasPreference.getValue("widget_id");
        defaultFilter.name = grCanvasPreference.getValue("name");
        defaultFilter.filters = JSON.parse(grCanvasPreference.getValue("value"));
        defaultFilter.queryParts = this.getQueryParts(grCanvasPreference.getValue("value"));
        return defaultFilter;
    },
    getQueryParts: function(conditions) {
        var self = this;
        var queryConditions = JSON.parse(conditions);
        var queryParts = queryConditions.map(self.getQueryPart);
        return queryParts;
    },
    getQueryPart: function(condition) {
        var queryPart = new SNC.InteractiveFilterUtils().getQueryPartForFilter(JSON.stringify(condition));
        return JSON.parse(queryPart);
    },
    getFilterJSONForQueryParts: function(key, filters) {
        var defaultFilter = {};
        defaultFilter.id = key;
        defaultFilter.filters = filters;
        defaultFilter.queryParts = this.getQueryParts(filters);
        return defaultFilter;
    },
    addQueryPartsToHomePageFilters: function(filter) {
        var result = this.newItem("result");
        var filterParam = this.getParameter('sysparm_homepage_filters');
        var homepageFilter = new SNC.InteractiveFilterUtils().getQueryPartsForFilter(filterParam);
        result.setAttribute("filters", homepageFilter);
        return homepageFilter;
    },
    sendUsage: function(defaultFilters, canvasId, filterAttr) {
        var licensingUtil = new PALicensingUtils('interactiveFilter');

        if (licensingUtil.connect()) {
            var sendJsonInit = {
                canvas_id: canvasId
            };
            for (var k = 0; k < defaultFilters.length; k++) {
                sendJsonInit.filter_id = defaultFilters[k].id;
                var filterList = defaultFilters[k][filterAttr];

                if (Array.isArray(defaultFilters[k][filterAttr])) {
                    for (var i = 0; i < filterList.length; i++) {
                        if (filterList[i].table)
                            licensingUtil.sendUsage(sendJsonInit, filterList[i].table);
                    }
                } else {
                    //group type filters contain filter object lists
                    for (var filterId in defaultFilters[k][filterAttr]) {
                        filterList = defaultFilters[k][filterAttr][filterId];
                        for (var j = 0; j < filterList.length; j++) {
                            if (filterList[j].table)
                                licensingUtil.sendUsage(sendJsonInit, filterList[j].table);
                        }
                    }
                }
            }
            licensingUtil.disconnect();
        }
    },

    type: 'InteractiveFilterDefaults'
});
```